import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { coinSessions } from '@/server/db/schema/coinSessions';
import { eq, and } from 'drizzle-orm';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest) {
  try {
    const { requestCode } = await req.json();
    if (!requestCode) return NextResponse.json({ error: 'requestCode required' }, { status: 400 });
    const db = await getDb();
    const updated = await db.update(coinSessions)
      .set({ status: 'canceled', updatedAt: new Date() })
      .where(and(eq(coinSessions.requestCode, requestCode), eq(coinSessions.status, 'requested')))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: 'cannot cancel (not found or already claimed)' }, { status: 400 });
  await logAudit({ action: 'coin_session.cancel', targetType: 'coin_session', targetId: updated[0].id });
  return NextResponse.json({ session: updated[0] });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}