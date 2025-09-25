import Link from 'next/link';
import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack/server';
import { ensureLocalUserForStack } from '@/server/services/authMapping';

// Server-side protected admin layout.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Fetch current Stack Auth user from cookie-based token store.
  const user = await stackServerApp.getUser();

  // If no authenticated (non-anonymous) user, send to Stack Auth sign-in.
  if (!user || (user as any).isAnonymous) {
    redirect('/stack-auth/sign-in');
  }

  // Ensure local user record (creates/link on first visit post sign-in)
  await ensureLocalUserForStack(user as any);
  // (Optional future) Role-based restriction: map Stack user -> local role table.
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="p-4 border-b flex gap-4 text-sm">
  <Link href="/admin/plans">Plans</Link>
  <Link href="/admin/users">Users</Link>
        <Link href="/admin/vouchers">Vouchers</Link>
        <Link href="/admin/audit">Audit Log</Link>
        <Link href="/stack-auth/sign-out" className="ml-auto text-red-600">Logout</Link>
      </nav>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
