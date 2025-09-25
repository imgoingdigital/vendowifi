import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { devices } from '@/server/db/schema/devices';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = params.id;
    const updated = await db.update(devices)
      .set({ lastSeenAt: new Date() })
      .where(eq(devices.id, id))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: 'device not found' }, { status: 404 });
    return NextResponse.json({ device: updated[0] });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}