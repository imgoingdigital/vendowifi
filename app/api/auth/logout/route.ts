import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logAudit } from '@/server/services/audit';

// Single canonical logout handler.
export async function POST() {
  const jar = await cookies();
  const cleared: string[] = [];
  for (const c of jar.getAll()) {
    if (/^stack/i.test(c.name) || /token/i.test(c.name)) {
      jar.set(c.name, '', { path: '/', maxAge: 0 });
      cleared.push(c.name);
    }
  }
  await logAudit({ action: 'auth.logout' });
  return NextResponse.json({ ok: true, cleared });
}

export async function GET() { return POST(); }
