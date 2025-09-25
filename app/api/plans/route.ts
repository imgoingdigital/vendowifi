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
    // Derive mode for legacy column based on provided limits.
    let mode: string = 'UNLIMITED';
    const hasTime = parsed.durationMinutes != null;
    const hasData = parsed.dataCapMb != null;
    if (hasTime && hasData) mode = 'MIXED';
    else if (hasTime) mode = 'TIME_LIMITED';
    else if (hasData) mode = 'DATA_LIMITED';
    const inserted = await db.insert(plans).values({
      name: parsed.name,
      priceCents: parsed.priceCents,
      planMode: mode,
      durationMinutes: parsed.durationMinutes ?? null,
      dataCapMb: parsed.dataCapMb ?? null,
      downKbps: parsed.downKbps ?? null,
      upKbps: parsed.upKbps ?? null,
    }).returning();
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
