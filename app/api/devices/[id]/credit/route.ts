import { NextRequest, NextResponse } from 'next/server';
import { deviceCreditSchema } from '../../../../../src/lib/validators';
import { getDb } from '../../../../../src/server/db/client';
import { devices } from '../../../../../src/server/db/schema/devices';
import { vouchers } from '../../../../../src/server/db/schema/vouchers';
import { plans } from '../../../../../src/server/db/schema/plans';
import { eq } from 'drizzle-orm';
import { verifyDeviceKey } from '../../../../../src/server/services/security';
import { generateVoucherCode } from '../../../../../src/server/services/voucher';

// For MVP, simple mapping: 1 credit unit -> pick first plan with priceCents <= amount*100 (assuming amount is currency units) - simplistic
// Use a dedicated type for the route params to satisfy Next.js RouteContext expectations.
interface DeviceCreditRouteContext { params: { id: string } }

// Use (req, context) signature but relax typing with 'any' to satisfy evolving Next.js route type expectations.
export async function POST(req: NextRequest, context: any) {
  try {
  const body = await req.json();
    const parsed = deviceCreditSchema.parse(body);
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing API key' }, { status: 401 });

    const db = await getDb();
  const { id } = (context as DeviceCreditRouteContext).params;
    const device = (await db.select().from(devices).where(eq(devices.id, id)).limit(1))[0];
    if (!device || !device.active) return NextResponse.json({ error: 'Device not active' }, { status: 404 });
    if (!verifyDeviceKey(apiKey, device.apiKeyHash)) return NextResponse.json({ error: 'Invalid API key' }, { status: 403 });

    // Naive plan selection: cheapest plan whose priceCents <= amount*100
  const allPlans = await db.select().from(plans).where(eq(plans.archived, false));
    const selected = allPlans
      .filter(p => p.priceCents <= parsed.amount * 100)
      .sort((a, b) => b.priceCents - a.priceCents)[0];
    if (!selected) return NextResponse.json({ error: 'No plan matches credit' }, { status: 400 });

    const code = generateVoucherCode(10);
    const inserted = await db.insert(vouchers).values({ code, planId: selected.id, createdBy: null }).returning({ code: vouchers.code, id: vouchers.id });
    return NextResponse.json({ voucher: inserted[0], plan: { id: selected.id, name: selected.name } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
