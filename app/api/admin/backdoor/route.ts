import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { logAudit } from '@/server/services/audit';
import { rateLimit, rlKey } from '@/server/middleware/rateLimit';
import { logWarn, logInfo } from '@/server/services/logger';
import { eq, and, isNotNull } from 'drizzle-orm';

/* BACKDOOR RESET ENDPOINT
 * This endpoint resets ALL admin roles except the caller-specified target (or creates one) IF AND ONLY IF
 * a secret header X-ADMIN-RESET matches the BACKDOOR_RESET_SECRET env variable AND there are fewer than 2 admins.
 * Intentionally rate-limit use via infrastructure (not implemented here) and remove in production builds.
 */
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_BACKDOOR !== 'true') {
    return NextResponse.json({ error: 'Disabled' }, { status: 404 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = await rateLimit(rlKey(['backdoor', ip]), { windowMs: 60_000, max: 3 });
  if (!rl.allowed) {
    await logWarn('backdoor.rate_limited', { ip });
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  const secret = process.env.BACKDOOR_RESET_SECRET;
  if (!secret) return NextResponse.json({ error: 'Backdoor disabled (no secret)' }, { status: 403 });
  const provided = req.headers.get('x-admin-reset');
  if (provided !== secret) {
    await logWarn('backdoor.bad_secret', { ip });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const body = await req.json().catch(()=>({}));
  const email: string = body.email || 'admin@example.com';

  const admins = (await db.select().from(users).where(eq(users.role, 'admin')));
  // Safety: only allow if 0 or 1 admins exist currently (prevents hostile mass resets when system already has multiple admins)
  if (admins.length > 1) {
    await logWarn('backdoor.too_many_admins', { currentAdmins: admins.length });
    return NextResponse.json({ error: 'Too many admins exist; reset blocked' }, { status: 409 });
  }

  let target = admins.find(a => a.email === email);
  if (!target) {
    // Find existing user by email
    target = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  }
  if (!target) {
    // Create placeholder user (no password, must link via Stack later)
    const placeholder = await db.insert(users).values({ email, passwordHash: 'stack_managed', role: 'admin' }).returning();
    target = placeholder[0];
  } else if (target.role !== 'admin') {
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, target.id));
  }

  // Demote all others to operator (except target)
  const others = admins.filter(a => a.id !== target!.id);
  for (const o of others) {
    await db.update(users).set({ role: 'operator' }).where(eq(users.id, o.id));
  }

  await logAudit({ action: 'admin.backdoor_reset', targetType: 'user', targetId: target.id, meta: { email: target.email } });
  await logInfo('backdoor.success', { adminUserId: target.id, email: target.email });
  return NextResponse.json({ ok: true, adminUserId: target.id, email: target.email });
}
