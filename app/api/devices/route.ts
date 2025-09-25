import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../src/server/db/client';
import { devices } from '../../../src/server/db/schema/devices';
import { randomBytes } from 'crypto';
import { hashDeviceKey } from '../../../src/server/services/security';
import { requireAdmin } from '../../../src/server/middleware/authz';

export async function POST() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error as any;
  const rawKey = randomBytes(24).toString('base64url');
  const hash = hashDeviceKey(rawKey);
  const db = await getDb();
  const inserted = await db.insert(devices).values({ name: 'Device ' + new Date().toISOString(), apiKeyHash: hash }).returning({ id: devices.id });
  return NextResponse.json({ device: { id: inserted[0].id, apiKey: rawKey } });
}

export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error as any;
  const db = await getDb();
  const list = await db.select().from(devices).limit(100);
  return NextResponse.json({ devices: list });
}
