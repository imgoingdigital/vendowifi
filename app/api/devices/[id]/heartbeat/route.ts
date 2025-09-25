import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { devices } from '@/server/db/schema/devices';
import { eq } from 'drizzle-orm';
import { logAudit } from '@/server/services/audit';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = params.id;
    const updated = await db.update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, id))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: 'device not found' }, { status: 404 });
  await logAudit({ action: 'device.heartbeat', targetType: 'device', targetId: updated[0].id, meta: { lastSeenAt: updated[0].lastSeenAt } });
  return NextResponse.json({ device: updated[0] });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}