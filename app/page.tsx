import Image from 'next/image';
// Use relative path to avoid path alias resolution quirk during bootstrap
import { hasAdminUser } from '../src/server/services/bootstrap';
import { redirect } from 'next/navigation';

export default async function Home() {
  const hasAdmin = await hasAdminUser();
  if (!hasAdmin) {
    redirect('/setup');
  }
  // Placeholder dashboard / landing once system initialized.
  return (
    <div className="min-h-screen p-10 flex flex-col gap-10">
      <div className="flex items-center gap-4">
        <Image src="/next.svg" alt="Logo" width={120} height={28} />
        <h1 className="text-2xl font-semibold">VendoWifi Admin Portal</h1>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xl">
        System initialized. Use the navigation bar ( /admin ) to manage plans, vouchers and review audit logs.
      </p>
      <div>
        <a href="/admin/plans" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm">Go to Admin</a>
      </div>
    </div>
  );
}
