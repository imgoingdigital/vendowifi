import Link from 'next/link';
import { stackServerApp } from '../stack/server';
import AccountMenu from './components/AccountMenu';

// Server component navbar displayed globally.
export default async function Navbar() {
  const user = await stackServerApp.getUser({ or: 'return-null' });
  return (
    <header className="w-full border-b bg-white/70 backdrop-blur dark:bg-neutral-900/70 text-sm">
      <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 h-12">
        <Link href="/" className="font-semibold tracking-tight">VendoWiFi</Link>
        <nav className="flex gap-4 text-gray-600 dark:text-gray-300">
          <Link href="/admin/plans" className="hover:text-black dark:hover:text-white">Plans</Link>
          <Link href="/admin/vouchers" className="hover:text-black dark:hover:text-white">Vouchers</Link>
          <Link href="/admin/audit" className="hover:text-black dark:hover:text-white">Audit</Link>
          <Link href="/redeem" className="hover:text-black dark:hover:text-white">Redeem</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          {!user && (
            <>
              <Link href="/stack-auth/sign-in" className="px-3 py-1 rounded border hover:bg-gray-50 dark:hover:bg-neutral-800">Login</Link>
              <Link href="/stack-auth/sign-up" className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">Sign Up</Link>
            </>
          )}
          {user && <AccountMenu email={(user as any).email || (user as any).primaryEmail || 'Account'} />}
        </div>
      </div>
    </header>
  );
}

