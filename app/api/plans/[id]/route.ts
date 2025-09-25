import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { plans } from '@/server/db/schema/plans';
import { eq } from 'drizzle-orm';
import { planUpdateSchema } from '@/lib/validators';
import { requireAdmin } from '@/server/middleware/authz';
import { logAudit } from '@/server/services/audit';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const body = await req.json();
    const parsed = planUpdateSchema.parse(body);
    const db = await getDb();
    const updated = await db.update(plans).set(parsed).where(eq(plans.id, params.id)).returning();
    if (!updated[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await logAudit({ action: 'plan.update', targetType: 'plan', targetId: params.id, meta: parsed });
    return NextResponse.json({ plan: updated[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
