import { NextRequest, NextResponse } from 'next/server';
import { voucherRevokeSchema } from '@/lib/validators';
import { revokeVoucher } from '@/server/services/voucher';
import { requireAdmin } from '@/server/middleware/authz';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    let parsed;
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      parsed = voucherRevokeSchema.parse(body);
    } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      parsed = voucherRevokeSchema.parse({ code: form.get('code') });
    } else {
      const body = await req.json().catch(() => ({}));
      parsed = voucherRevokeSchema.parse(body);
    }
    const updated = await revokeVoucher(parsed.code);
    await logAudit({ action: 'voucher.revoke', targetType: 'voucher', targetId: updated.id });
    // If form submit, redirect back to admin page for better UX
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin/vouchers?revoked=1', req.url));
    }
    return NextResponse.json({ voucher: { id: updated.id, code: updated.code, status: updated.status, activatedAt: updated.activatedAt, expiresAt: updated.expiresAt } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
