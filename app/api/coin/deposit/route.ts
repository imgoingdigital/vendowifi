import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { coinSessions } from '@/server/db/schema/coinSessions';
import { vouchers } from '@/server/db/schema/vouchers';
import { plans } from '@/server/db/schema/plans';
import { eq } from 'drizzle-orm';
import { coinSessionDepositSchema } from '@/lib/validation/schemas';
import { logAudit } from '@/server/services/audit';
import { randomBytes } from 'crypto';

function genVoucherCode(len = 10) {
  return randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len).toUpperCase();
}

// Deposit (add monetary value) into a claimed coin session.
// Auto-issues a voucher once inserted amount >= plan price.
// Input JSON: { requestCode: string, amountCents: number, planId?: string }
export async function POST(req: NextRequest) {
  try {
    const parsed = coinSessionDepositSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    const { requestCode, amountCents, planId } = parsed.data;
    const db = await getDb();
    const sessionRows = await db.select().from(coinSessions).where(eq(coinSessions.requestCode, requestCode));
    const session = sessionRows[0];
    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 });
    if (!['claimed', 'depositing', 'requested'].includes(session.status)) {
      return NextResponse.json({ error: 'session not accepting deposits' }, { status: 400 });
    }

    // Attach a plan if not already set (allow machine to decide at first deposit)
    let effectivePlanId = session.planId;
    if (!effectivePlanId) {
      if (!planId) return NextResponse.json({ error: 'planId required for first deposit' }, { status: 400 });
      effectivePlanId = planId;
    } else if (planId && planId !== effectivePlanId) {
      return NextResponse.json({ error: 'plan already chosen for session' }, { status: 400 });
    }

  const planRows = await db.select().from(plans).where(eq(plans.id, effectivePlanId!));
    const plan = planRows[0];
    if (!plan) return NextResponse.json({ error: 'plan not found' }, { status: 404 });

    const newAmount = session.amountInsertedCents + amountCents;
    const price = plan.priceCents;
    let voucherId: string | null = session.voucherId;
  let finalStatus: string = 'depositing';

    await db.transaction(async (tx) => {
      // Issue voucher if threshold reached and not already issued
      if (!voucherId && price > 0 && newAmount >= price) {
        const voucherCode = genVoucherCode();
        const insertedVoucher = await tx.insert(vouchers).values({
          code: voucherCode,
          planId: effectivePlanId!,
          status: 'active',
        }).returning();
        voucherId = insertedVoucher[0].id;
        finalStatus = 'completed';
      } else if (price === 0) {
        // Free plan edge-case: instant voucher
        if (!voucherId) {
          const voucherCode = genVoucherCode();
            const insertedVoucher = await tx.insert(vouchers).values({
              code: voucherCode,
              planId: effectivePlanId!,
              status: 'active',
            }).returning();
            voucherId = insertedVoucher[0].id;
        }
        finalStatus = 'completed';
      } else {
        finalStatus = ['requested','claimed'].includes(session.status) ? 'depositing' : finalStatus;
      }

      await tx.update(coinSessions)
        .set({
          amountInsertedCents: newAmount,
          status: finalStatus,
          planId: effectivePlanId!,
          voucherId: voucherId ?? session.voucherId,
          updatedAt: new Date(),
        })
        .where(eq(coinSessions.id, session.id));
    });

  const updated = (await db.select().from(coinSessions).where(eq(coinSessions.id, session.id)))[0];
  await logAudit({ action: 'coin_session.deposit', targetType: 'coin_session', targetId: session.id, meta: { amountCents, accumulated: updated.amountInsertedCents, status: updated.status, voucherId: updated.voucherId } });
    return NextResponse.json({ session: updated });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
