import { getDb } from '../db/client';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';

// Promote first user to admin if no admin exists; returns promoted user id or null if not needed.
export async function promoteFirstUserIfNone() {
  const db = await getDb();
  const admins = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  if (admins.length) return null;
  const all = await db.select().from(users);
  if (!all.length) return null;
  const first = all.sort((a,b)=> (a.createdAt as any) - (b.createdAt as any))[0];
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, first.id));
  return first.id;
}
