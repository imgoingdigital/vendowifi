import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { logAudit } from '@/server/services/audit';
import { eq } from 'drizzle-orm';

// Idempotent endpoint: promote the first (or only) existing user to admin if no admin exists.
export async function POST() {
  const db = await getDb();
  let existingAdmins: any[] = [];
  try {
    existingAdmins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  } catch (e: any) {
    // Detect missing column (likely schema drift / migrations not applied)
    if (e?.code === '42703' && /stack_user_id/.test(e.message)) {
      return NextResponse.json({
        error: 'Database schema out of date (missing stack_user_id column). Run migrations from /setup (type MIGRATE) or execute: ALTER TABLE users ADD COLUMN stack_user_id varchar(64); CREATE UNIQUE INDEX IF NOT EXISTS users_stack_user_id_uq ON users(stack_user_id);'
      }, { status: 500 });
    }
    throw e; // rethrow other errors
  }
  if (existingAdmins.length) {
    return NextResponse.json({ ok: true, message: 'Admin already exists' });
  }
  // Pick earliest created user
  const allUsers = await db.select().from(users);
  if (!allUsers.length) {
    return NextResponse.json({
      error: 'No users exist. Sign in via Stack; first successful sign-in creates an admin automatically.'
    }, { status: 400 });
  }
  const first = allUsers.sort((a,b)=> (a.createdAt as any) - (b.createdAt as any))[0];
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, first.id));
  await logAudit({ action: 'admin.promote_first', targetType: 'user', targetId: first.id });
  return NextResponse.json({ ok: true, promotedUserId: first.id });
}
