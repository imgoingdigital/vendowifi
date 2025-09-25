import { randomBytes } from 'crypto';
import { getDb } from '../db/client';
import { vouchers } from '../db/schema/vouchers';
import { plans } from '../db/schema/plans';
import { eq } from 'drizzle-orm';

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed easily confused chars

export function generateVoucherCode(length: number) {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
}

export async function bulkCreateVouchers(opts: { planId: string; quantity: number; codeLength: number; createdBy?: string; }) {
  const db = await getDb();
  // Validate plan exists
  const plan = (await db.select().from(plans).where(eq(plans.id, opts.planId)).limit(1))[0];
  if (!plan) throw new Error('Plan not found');

  const rows = Array.from({ length: opts.quantity }).map(() => ({
    code: generateVoucherCode(opts.codeLength),
    planId: opts.planId,
    createdBy: opts.createdBy || null,
  }));
  // Insert sequentially with small batches if you want collision re-check
  // Simplistic approach here; let DB unique constraint enforce uniqueness
  const inserted = await db.insert(vouchers).values(rows).returning({ id: vouchers.id, code: vouchers.code });
  return inserted;
}
