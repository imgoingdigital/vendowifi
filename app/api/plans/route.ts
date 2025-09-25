import { NextRequest, NextResponse } from 'next/server';
import { planCreateSchema } from '../../../src/lib/validators';
import { getDb } from '../../../src/server/db/client';
import { plans } from '../../../src/server/db/schema/plans';
import { logAudit } from '../../../src/server/services/audit';
import { requireAdmin } from '../../../src/server/middleware/authz';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth) return auth.error;
    const body = await req.json();
    const parsed = planCreateSchema.parse(body);
    const db = await getDb();
    const inserted = await db.insert(plans).values(parsed).returning();
    await logAudit({ action: 'plan.create', targetType: 'plan', targetId: inserted[0].id });
    return NextResponse.json({ plan: inserted[0] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function GET() {
  const db = await getDb();
  const all = await db.select().from(plans).where(eq(plans.archived, false));
  return NextResponse.json({ plans: all });
}
