import { NextResponse } from 'next/server';
import { sweepVoucherLifecycle } from '@/server/services/lifecycle';
import { getDb } from '@/server/db/client';
import { coinSessions } from '@/server/db/schema/coinSessions';
import { and, inArray, lt } from 'drizzle-orm';
import { requireAdmin } from '@/server/middleware/authz';

export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error as any;
  const voucherStats = await sweepVoucherLifecycle();
  const db = await getDb();
  const now = new Date();
  const expCandidates = await db.update(coinSessions)
    .set({ status: 'expired', updatedAt: now })
    .where(and(inArray(coinSessions.status, ['requested','claimed','depositing']), lt(coinSessions.expiresAt, now)))
    .returning({ id: coinSessions.id });
  return NextResponse.json({ vouchers: voucherStats, coinSessionsExpired: expCandidates.length });
}