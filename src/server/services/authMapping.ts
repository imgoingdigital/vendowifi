import { getDb } from '../db/client';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { ensureLinkedLocalUser } from '@/server/auth/linkUser';

export interface LocalUserRecord {
  id: string;
  email: string;
  role: string;
  stackUserId: string | null;
}

// Ensure a local user row exists for a Stack Auth user. If one doesn't, create minimal placeholder (no password).
export async function ensureLocalUserForStack(stackUser: { id: string; primaryEmail?: string | null; email?: string | null; }) {
  const email = (stackUser as any).email || (stackUser as any).primaryEmail || 'unknown@example.com';
  const { user } = await ensureLinkedLocalUser({ stackUserId: stackUser.id, email });
  return user as any;
}

export async function getLocalUserByStackId(stackUserId: string) {
  const db = await getDb();
  return (await db.select().from(users).where(eq(users.stackUserId, stackUserId)).limit(1))[0] || null;
}

export async function requireAdminFromStackUser(stackUser: { id: string; }) {
  const dbUser = await getLocalUserByStackId(stackUser.id);
  if (!dbUser) return null;
  if (dbUser.role !== 'admin') return null;
  return dbUser;
}
