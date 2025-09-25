import 'server-only';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { eq, or } from 'drizzle-orm';

/**
 * Ensure the authenticated Stack user has a corresponding local user row.
 * Call this right after a successful Stack sign-in (server-side) with the Stack user's id & email.
 *
 * Behavior:
 * 1. If a row exists by stack_user_id => return it.
 * 2. Else if a row exists by matching email and stack_user_id is null => update row to set stack_user_id.
 * 3. Else create a new row. Role logic:
 *    - If no existing admin rows -> new user becomes admin (bootstrap case)
 *    - Otherwise role 'operator'.
 * 4. Handles race conditions by catching unique violations and re-selecting.
 */
export async function ensureLinkedLocalUser(params: { stackUserId: string; email: string; }) {
  const { stackUserId, email } = params;
  if (!stackUserId || !email) throw new Error('stackUserId and email required');
  const db = await getDb();

  // 1. Lookup by stack_user_id
  const byStack = await db.select().from(users).where(eq(users.stackUserId, stackUserId)).limit(1);
  if (byStack.length) return { user: byStack[0], created: false, linked: true };

  // 2. Lookup by email (unlinked row)
  const byEmail = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (byEmail.length) {
    const u = byEmail[0];
    if (!(u as any).stackUserId) {
      // Attempt to link
      try {
        await db.update(users).set({ stackUserId }).where(eq(users.id, u.id));
        return { user: { ...u, stackUserId }, created: false, linked: true };
      } catch (e: any) {
        // Fallback reselect in case of race
        const again = await db.select().from(users).where(eq(users.stackUserId, stackUserId)).limit(1);
        if (again.length) return { user: again[0], created: false, linked: true };
        throw e;
      }
    }
    // Different stack id already linked to this email (rare) -> create a distinct row
  }

  // 3. Need to create a new row. Decide role.
  // Clarified requirement: first ever local user becomes admin, subsequent new users become regular (operator).
  const existingAdmin = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  const role = existingAdmin.length ? 'operator' : 'admin';

  try {
    const inserted = await db.insert(users).values({ email, passwordHash: '', stackUserId, role }).returning();
    return { user: inserted[0], created: true, linked: true };
  } catch (e: any) {
    // Handle possible unique collisions (email or stack_user_id) due to race: re-select
    const existing = await db.select().from(users)
      .where(or(eq(users.stackUserId, stackUserId), eq(users.email, email)))
      .limit(1);
    if (existing.length) return { user: existing[0], created: false, linked: true };
    throw e;
  }
}

/**
 * Optional helper: attempt to re-link silently; swallow schema drift (missing column) errors.
 * Returns null if cannot link due to drift; caller can trigger migration UI.
 */
export async function tryEnsureLinkedLocalUser(params: { stackUserId: string; email: string; }) {
  try {
    return await ensureLinkedLocalUser(params);
  } catch (e: any) {
    // If missing column (42703) or similar, surface null so upstream can prompt for migration
    if (e?.code === '42703' && /stack_user_id/.test(e.message || '')) {
      return null;
    }
    throw e; // propagate other errors
  }
}
