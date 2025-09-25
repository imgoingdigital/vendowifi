import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { devices } from '@/server/db/schema/devices';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

const PEPPER = process.env.DEVICE_KEY_PEPPER || '';

function generateKey(length = 32) {
  return randomBytes(length).toString('base64url');
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = await getDb();
    const id = params.id;
    const newKey = generateKey();
    const hash = await bcrypt.hash(newKey + PEPPER, 12);
    const updated = await db.update(devices)
      .set({ apiKeyHash: hash })
      .where(eq(devices.id, id))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: 'device not found' }, { status: 404 });
    return NextResponse.json({ deviceId: id, apiKey: newKey });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}