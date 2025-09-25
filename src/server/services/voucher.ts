import { randomBytes } from 'crypto';
import { getDb } from '../db/client';
import { vouchers } from '../db/schema/vouchers';
import { plans } from '../db/schema/plans';
import { and, eq, lt } from 'drizzle-orm';
import { evaluateVoucherLifecycle } from './lifecycle';

// --- Voucher Status Semantics ---
// unused   -> not yet redeemed
// active   -> redeemed and within validity window and (if data-limited) not yet depleted
// expired  -> time validity window passed (now >= expiresAt)
// depleted -> data cap reached before (or regardless of) time expiry (future lifecycle evaluator will enforce)
// revoked  -> manually revoked (terminal)
// Transitions:
// unused -> active (redeem)
// active -> expired (lazy transition on access / periodic job)
// unused|active -> revoked (admin explicit)
// expired|revoked -> (terminal)

export type VoucherLifecycleStatus = 'unused' | 'active' | 'expired' | 'depleted' | 'revoked';

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

/** Lazily mark any vouchers whose expiresAt is past as expired. */
export async function markExpiredVouchers(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const updated = await db.update(vouchers)
    .set({ status: 'expired' })
    .where(and(eq(vouchers.status, 'active'), lt(vouchers.expiresAt, now)))
    .returning({ id: vouchers.id });
  return updated.length;
}

let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000; // 1 minute minimal cadence
/** Run a sweep at most once per interval (best‑effort pseudo background). */
export async function maybeSweepExpired() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return 0;
  const count = await markExpiredVouchers();
  lastSweep = Date.now();
  return count;
}

/** Redeem a voucher code, returning updated voucher + plan or throwing. */
export async function redeemVoucher(code: string, mac?: string) {
  const db = await getDb();
  // Pseudo background sweep
  await maybeSweepExpired();
  const voucher = (await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1))[0];
  if (!voucher) throw new Error('Invalid voucher');
  if (voucher.status === 'revoked') throw new Error('Voucher revoked');
  if (voucher.status === 'expired') throw new Error('Voucher expired');
  if (voucher.status === 'active') {
    // Evaluate lifecycle (might flip to expired/depleted)
    await evaluateVoucherLifecycle(voucher.id);
    const fresh = (await db.select().from(vouchers).where(eq(vouchers.id, voucher.id)).limit(1))[0];
    if (fresh.status !== 'active') throw new Error(`Voucher ${fresh.status}`);
    const plan = (await db.select().from(plans).where(eq(plans.id, voucher.planId)).limit(1))[0];
    return { voucher: fresh, plan };
  }
  if (voucher.status !== 'unused') throw new Error('Voucher not available');

  const plan = (await db.select().from(plans).where(eq(plans.id, voucher.planId)).limit(1))[0];
  if (!plan) throw new Error('Plan missing');
  const now = new Date();
  // Determine expiry if a time component is set (independent of data cap presence)
  let expiresAt: Date | null = null;
  if (plan.durationMinutes != null) {
    expiresAt = new Date(now.getTime() + plan.durationMinutes * 60_000);
  }

  // Attempt atomic update only if still unused to minimize race window
  const updated = await db.update(vouchers)
    .set({ status: 'active', activatedAt: now, expiresAt })
    .where(and(eq(vouchers.id, voucher.id), eq(vouchers.status, 'unused')))
    .returning();
  if (!updated[0]) {
    // Race: someone else redeemed; re-fetch and surface state
    const current = (await db.select().from(vouchers).where(eq(vouchers.id, voucher.id)).limit(1))[0];
    if (current?.status === 'active') throw new Error('Already redeemed');
    throw new Error('Voucher not available');
  }
  // Post-activation lifecycle (covers immediate depletion if dataCap 0 etc.)
  await evaluateVoucherLifecycle(updated[0].id);
  const latest = (await db.select().from(vouchers).where(eq(vouchers.id, updated[0].id)).limit(1))[0];
  if (latest.status !== 'active') throw new Error(`Voucher ${latest.status}`);
  return { voucher: latest, plan };
}

/** Revoke a voucher (unused or active) making it immediately unusable. */
export async function revokeVoucher(code: string) {
  const db = await getDb();
  const voucher = (await db.select().from(vouchers).where(eq(vouchers.code, code)).limit(1))[0];
  if (!voucher) throw new Error('Invalid voucher');
  if (voucher.status === 'revoked') return voucher; // idempotent
  if (voucher.status === 'expired') throw new Error('Already expired');
  const updated = await db.update(vouchers)
    .set({ status: 'revoked' })
    .where(and(eq(vouchers.id, voucher.id), eq(vouchers.status, voucher.status)))
    .returning();
  return updated[0] || voucher;
}
