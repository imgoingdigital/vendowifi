import { NextRequest, NextResponse } from 'next/server';
import { voucherRedeemSchema } from '@/lib/validators';
import { redeemVoucher } from '@/server/services/voucher';
import { logAudit } from '@/server/services/audit';
import { rateLimit, rlKey } from '@/server/middleware/rateLimit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = voucherRedeemSchema.parse(body);
    // Basic rate limits: IP window, and per IP+code to slow brute-force
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const ipLimit = await rateLimit(rlKey(['redeem', ip]), { windowMs: 60_000, max: 20 }); // 20 attempts / min per IP
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts, slow down' }, { status: 429, headers: { 'Retry-After': '60' } });
    }
    const codeLimit = await rateLimit(rlKey(['redeem-code', ip, parsed.code]), { windowMs: 300_000, max: 5 }); // 5 tries per code per 5 min
    if (!codeLimit.allowed) {
      return NextResponse.json({ error: 'Too many attempts for this code' }, { status: 429, headers: { 'Retry-After': '300' } });
    }
    const { voucher, plan } = await redeemVoucher(parsed.code, parsed.mac);
    await logAudit({ action: 'voucher.redeem', targetType: 'voucher', targetId: voucher.id, meta: { mac: parsed.mac } });
    return NextResponse.json({
      voucher: {
        id: voucher.id,
        code: voucher.code,
        status: voucher.status,
        activatedAt: voucher.activatedAt,
        expiresAt: voucher.expiresAt,
      },
      plan: plan ? {
        name: plan.name,
        durationMinutes: plan.durationMinutes,
        dataCapMb: plan.dataCapMb,
        downKbps: plan.downKbps,
        upKbps: plan.upKbps,
      } : null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
