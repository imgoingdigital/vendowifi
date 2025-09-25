import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/services/auth';
import { logAudit } from '@/server/services/audit';
import { rateLimit } from '@/server/middleware/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limiter = await rateLimit('login:' + ip, { windowMs: 60_000, max: 10 });
  if (!limiter.allowed) return NextResponse.json({ error: 'Too many attempts' }, { status: 429 });
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    const result = await authenticate(email, password);
    if (!result) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    await logAudit({ action: 'auth.login', userId: result.user.id });
    const res = NextResponse.json({ user: result.user });
    res.cookies.set('auth_token', result.token, { httpOnly: true, path: '/', sameSite: 'lax', secure: false });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
