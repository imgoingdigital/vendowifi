import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { vouchers } from '@/server/db/schema/vouchers';
import { plans } from '@/server/db/schema/plans';
import { eq } from 'drizzle-orm';
import { evaluateVoucherLifecycle } from '@/server/services/lifecycle';
import { usageIncrementSchema } from '@/lib/validation/schemas';

// TODO: replace inline logic with centralized lifecycle evaluator once added.

// Increment data usage for DATA_LIMITED vouchers (MB granularity placeholder)
export async function POST(req: NextRequest) {
  try {
  const parsed = usageIncrementSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { code, mb } = parsed.data;
    const db = await getDb();
    const rows = await db.select().from(vouchers).where(eq(vouchers.code, code));
    const voucher = rows[0];
    if (!voucher) return NextResponse.json({ error: 'voucher not found' }, { status: 404 });
    if (voucher.status !== 'active') return NextResponse.json({ error: 'voucher not active' }, { status: 400 });
  // Need plan to determine mode
  const planRows = await db.select().from(plans).where(eq(plans.id, voucher.planId));
  const plan = planRows[0];
  if (!plan) return NextResponse.json({ error: 'plan not found' }, { status: 404 });
  if (plan.dataCapMb == null) return NextResponse.json({ error: 'plan has no data cap' }, { status: 400 });

    const newUsed = (voucher.dataUsedMb || 0) + mb;

    const limit = plan.dataCapMb ?? null;
    const depleted = limit !== null && newUsed >= limit;

    await db.update(vouchers)
      .set({ dataUsedMb: newUsed })
      .where(eq(vouchers.id, voucher.id));
    const evalResult = await evaluateVoucherLifecycle(voucher.id);
    return NextResponse.json({ code: voucher.code, dataUsedMb: newUsed, status: evalResult.status, changed: evalResult.changed });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
