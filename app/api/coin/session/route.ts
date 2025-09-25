import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { coinSessions } from '@/server/db/schema/coinSessions';
import { randomBytes } from 'crypto';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/server/services/audit';

function code() { return randomBytes(4).toString('hex').slice(0,6).toUpperCase(); }

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    // Basic session; user linking later (auth optional)
    const requestCode = code();
  const expiresAt = new Date(Date.now() + 120_000); // 2 min window
  const inserted = await db.insert(coinSessions).values({ requestCode, expiresAt, status: 'requested' }).returning();
  await logAudit({ action: 'coin_session.create', targetType: 'coin_session', targetId: inserted[0].id, meta: { requestCode } });
  return NextResponse.json({ session: { id: inserted[0].id, requestCode, expiresAt, status: 'requested' } });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = await getDb();
  const row = (await db.select().from(coinSessions).where(eq(coinSessions.id, id)).limit(1))[0];
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  // Lazy expire
  if (row.expiresAt && row.expiresAt < new Date() && ['requested','claimed','depositing'].includes(row.status)) {
    const db2 = await getDb();
    const expired = (await db2.update(coinSessions).set({ status: 'expired' }).where(eq(coinSessions.id, row.id)).returning())[0];
    return NextResponse.json({ session: expired });
  }
  return NextResponse.json({ session: row });
}
