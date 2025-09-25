import { describe, it, expect } from 'vitest';
import { getDb } from '@/server/db/client';
import { plans } from '@/server/db/schema/plans';
import { vouchers } from '@/server/db/schema/vouchers';
import { bulkCreateVouchers, redeemVoucher } from '@/server/services/voucher';
import { eq } from 'drizzle-orm';

// NOTE: This uses the real DB connection defined by env DATABASE_URL.
// For CI, point DATABASE_URL to a test database.

describe('redeem flow', () => {
  it('creates plan, voucher and redeems it', async () => {
    const db = await getDb();
    const plan = (await db.insert(plans).values({ name: 'TestPlan_'+Date.now(), priceCents: 0, durationMinutes: 30 }).returning())[0];
    const created = await bulkCreateVouchers({ planId: plan.id, quantity: 1, codeLength: 10 });
    const voucherRow = (await db.select().from(vouchers).where(eq(vouchers.id, created[0].id)).limit(1))[0];
    expect(voucherRow.status).toBe('unused');
    const redeemed = await redeemVoucher(created[0].code);
    expect(redeemed.voucher.status).toBe('active');
    const after = (await db.select().from(vouchers).where(eq(vouchers.id, created[0].id)).limit(1))[0];
    expect(after.status).toBe('active');
  });
});
