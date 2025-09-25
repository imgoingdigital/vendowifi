import { NextRequest, NextResponse } from 'next/server';
import { userBootstrapSchema } from '@/lib/validators';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { hashPassword } from '@/server/services/security';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = userBootstrapSchema.parse(body);
    const db = await getDb();
  const existing = (await db.select().from(users).where(eq(users.email, parsed.email)).limit(1))[0];
    if (existing) return NextResponse.json({ error: 'User exists' }, { status: 400 });
    const passwordHash = await hashPassword(parsed.password);
    const inserted = await db.insert(users).values({ email: parsed.email, passwordHash, role: 'admin' }).returning({ id: users.id, email: users.email });
    return NextResponse.json({ user: inserted[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
