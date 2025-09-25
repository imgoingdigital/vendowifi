import { NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';

export async function GET() {
  const start = Date.now();
  try {
    const db = await getDb();
    // simple query to validate connection
    await db.execute("SELECT 1");
    const latencyMs = Date.now() - start;
    return NextResponse.json({ db: 'ok', redis: process.env.REDIS_URL ? 'unknown' : 'disabled', latencyMs, time: new Date().toISOString() });
  } catch (e:any) {
    return new NextResponse(JSON.stringify({ db: 'fail', error: e.message, time: new Date().toISOString() }), { status: 503 });
  }
}