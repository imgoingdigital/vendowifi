import { NextRequest, NextResponse } from 'next/server';
import { voucherRedeemSchema } from '@/lib/validators';
import { getDb } from '@/server/db/client';
import { vouchers } from '@/server/db/schema/vouchers';
import { plans } from '@/server/db/schema/plans';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = voucherRedeemSchema.parse(body);
    const db = await getDb();
  const found = (await db.select().from(vouchers).where(eq(vouchers.code, parsed.code)).limit(1))[0];
    if (!found) return NextResponse.json({ error: 'Invalid voucher' }, { status: 404 });
    if (found.status !== 'unused') {
      return NextResponse.json({ error: 'Voucher not available', status: found.status }, { status: 400 });
    }

    const now = new Date();
    const update = await db.update(vouchers).set({ status: 'active', activatedAt: now }).where(eq(vouchers.id, found.id)).returning();
    const plan = (await db.select().from(plans).where(eq(plans.id, found.planId)).limit(1))[0];
    await logAudit({ action: 'voucher.redeem', targetType: 'voucher', targetId: found.id, meta: { mac: parsed.mac } });
    return NextResponse.json({
      voucher: update[0],
      plan: plan ? { name: plan.name, durationMinutes: plan.durationMinutes, dataCapMb: plan.dataCapMb, downKbps: plan.downKbps, upKbps: plan.upKbps } : null,
      activatedAt: now,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
