import { NextRequest, NextResponse } from 'next/server';
import { voucherGenerateSchema } from '../../../src/lib/validators';
import { bulkCreateVouchers } from '../../../src/server/services/voucher';
import { logAudit } from '../../../src/server/services/audit';
import { requireAdmin } from '../../../src/server/middleware/authz';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const body = await req.json();
    const parsed = voucherGenerateSchema.parse(body);
    const created = await bulkCreateVouchers(parsed);
    await logAudit({ action: 'voucher.bulk_create', targetType: 'plan', targetId: parsed.planId, meta: { quantity: parsed.quantity } });
    return NextResponse.json({ vouchers: created });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
