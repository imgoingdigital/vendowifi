import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { coinSessions } from '@/server/db/schema/coinSessions';
import { eq, and } from 'drizzle-orm';
import { coinSessionClaimSchema } from '@/lib/validation/schemas';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest) {
  try {
  const parsed = coinSessionClaimSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { requestCode, machineId } = parsed.data;
    const db = await getDb();
    const now = new Date();
    const updated = await db.update(coinSessions)
      .set({ status: 'claimed', machineId, updatedAt: now })
      .where(and(eq(coinSessions.requestCode, requestCode), eq(coinSessions.status, 'requested')))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: 'invalid or already claimed' }, { status: 400 });
  await logAudit({ action: 'coin_session.claim', targetType: 'coin_session', targetId: updated[0].id, meta: { machineId } });
  return NextResponse.json({ session: updated[0] });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
