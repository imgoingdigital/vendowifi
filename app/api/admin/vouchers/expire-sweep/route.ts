import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/server/middleware/authz';
import { markExpiredVouchers } from '@/server/services/voucher';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  try {
    const count = await markExpiredVouchers();
    if (count > 0) {
      await logAudit({ action: 'voucher.expire_sweep', targetType: 'voucher', targetId: 'bulk', meta: { count } });
    }
    return NextResponse.json({ expired: count });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
