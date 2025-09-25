import { getDb } from '../db/client';
import { users } from '../db/schema/users';
import { eq } from 'drizzle-orm';
import { verifyPassword } from './security';
import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || 'dev_insecure_secret');

export async function authenticate(email: string, password: string) {
  const db = await getDb();
  const user = (await db.select().from(users).where(eq(users.email, email)).limit(1))[0];
  if (!user) return null;
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return null;
  const token = await new SignJWT({ sub: user.id, role: user.role, email: user.email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(SECRET);
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: [ALG] });
    return payload as { sub: string; role: string; email: string };
  } catch {
    return null;
  }
}
