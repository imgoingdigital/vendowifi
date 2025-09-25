import { vouchers } from '../db/schema/vouchers';
import { plans } from '../db/schema/plans';
import { getDb } from '../db/client';
import { eq } from 'drizzle-orm';

export type VoucherStatus = 'unused' | 'active' | 'expired' | 'depleted' | 'revoked';

interface EvaluateOptions {
  voucherId: string;
  now?: Date;
}

// Evaluates a single voucher's status vs its plan (time + data) and updates if a terminal transition occurs.
export async function evaluateVoucherLifecycle(voucherId: string, nowOpt?: Date): Promise<{ changed: boolean; status: VoucherStatus; }>{
  const db = await getDb();
  const now = nowOpt ?? new Date();
  const row = (await db.select().from(vouchers).where(eq(vouchers.id, voucherId)).limit(1))[0];
  if(!row) throw new Error('voucher not found');
  if(['revoked','expired','depleted'].includes(row.status)) {
    return { changed: false, status: row.status as VoucherStatus };
  }
  const plan = (await db.select().from(plans).where(eq(plans.id, row.planId)).limit(1))[0];
  if(!plan) throw new Error('plan missing');
  let next: VoucherStatus = row.status as VoucherStatus;
  if(row.status === 'active') {
    // Time expiry check
    if(row.expiresAt && row.expiresAt <= now) {
      next = 'expired';
    } else if(plan.dataCapMb != null && row.dataUsedMb >= plan.dataCapMb) {
      next = 'depleted';
    }
  }
  if(next !== row.status){
    await db.update(vouchers).set({ status: next }).where(eq(vouchers.id, row.id));
    return { changed: true, status: next };
  }
  return { changed: false, status: row.status as VoucherStatus };
}

// Sweep helper (lazy background via endpoint touches)
export async function sweepVoucherLifecycle(limit = 200) {
  const db = await getDb();
  // Select candidate active vouchers with either potential expiry or data caps
  const candidates = await db.select().from(vouchers).where(eq(vouchers.status, 'active')).limit(limit);
  let expired = 0; let depleted = 0;
  for(const v of candidates){
    const res = await evaluateVoucherLifecycle(v.id);
    if(res.changed){
      if(res.status === 'expired') expired++; else if(res.status === 'depleted') depleted++;
    }
  }
  return { expired, depleted };
}
