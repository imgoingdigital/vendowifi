import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { ensureLocalUserForStack } from '@/server/services/authMapping';

export async function POST() {
  const stackUser = await stackServerApp.getUser({ or: 'return-null' });
  if (!stackUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  try {
    const local = await ensureLocalUserForStack(stackUser as any);
    return NextResponse.json({ ok: true, localUserId: (local as any).id, role: (local as any).role });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Link error' }, { status: 500 });
  }
}
