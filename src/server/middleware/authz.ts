import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack/server';
import { ensureLocalUserForStack, requireAdminFromStackUser } from '../services/authMapping';

export async function requireStackUser() {
  const user = await stackServerApp.getUser({ or: 'return-null' });
  if (!user) return { error: NextResponse.json({ error: 'Auth required' }, { status: 401 }) };
  await ensureLocalUserForStack(user as any);
  return { user };
}

export async function requireAdmin() {
  const base = await requireStackUser();
  if ('error' in base) return base;
  const localAdmin = await requireAdminFromStackUser((base.user as any));
  if (!localAdmin) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  return { user: base.user, localAdmin };
}
