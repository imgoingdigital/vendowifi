import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';

// Returns true if at least one admin user exists.
export async function hasAdminUser(): Promise<boolean> {
  try {
    const db = await getDb();
    const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
    return admin.length > 0;
  } catch (e) {
    // On DB/init error, treat as no-admin so setup flow can still guide the user.
    return false;
  }
}
