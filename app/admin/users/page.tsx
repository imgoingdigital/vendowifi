import { stackServerApp } from '@/stack/server';
import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/server/middleware/authz';

export const dynamic = 'force-dynamic';

async function getAllUsers() {
  const db = await getDb();
  return await db.select().from(users);
}

export default async function UsersAdminPage() {
  const stackUser = await stackServerApp.getUser({ or: 'return-null' });
  if (!stackUser) redirect('/stack-auth/sign-in');
  // Basic admin check (enhanced requireAdmin may already link local user).
  const adminResult = await requireAdmin();
  if ('error' in adminResult || !('localAdmin' in adminResult)) redirect('/');
  const list = await getAllUsers();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Users</h1>
      <UserTable users={list as any} />
    </div>
  );
}

function UserTable({ users }: { users: any[] }) {
  return (
    <table className="w-full text-sm border rounded overflow-hidden">
      <thead className="bg-gray-100 dark:bg-neutral-800 text-xs uppercase tracking-wide">
        <tr>
          <th className="p-2 text-left">Email</th>
          <th className="p-2 text-left">Role</th>
          <th className="p-2 text-left">Stack ID</th>
          <th className="p-2 text-left">Created</th>
          <th className="p-2 text-left">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {users.map(u => <UserRow key={u.id} u={u} />)}
      </tbody>
    </table>
  );
}

function UserRow({ u }: { u: any }) {
  async function promote(formData: FormData) {
    'use server';
    const { getDb } = await import('@/server/db/client');
    const { users } = await import('@/server/db/schema/users');
    const { eq } = await import('drizzle-orm');
    const db = await getDb();
    await db.update(users).set({ role: 'admin' }).where(eq(users.id, u.id));
  }
  async function demote(formData: FormData) {
    'use server';
    const { getDb } = await import('@/server/db/client');
    const { users } = await import('@/server/db/schema/users');
    const { eq } = await import('drizzle-orm');
    const db = await getDb();
    await db.update(users).set({ role: 'operator' }).where(eq(users.id, u.id));
  }
  return (
    <tr className="text-xs">
      <td className="p-2 font-mono break-all">{u.email}</td>
      <td className="p-2">{u.role}</td>
      <td className="p-2 font-mono max-w-[160px] truncate" title={u.stackUserId || ''}>{u.stackUserId || '—'}</td>
      <td className="p-2">{new Date(u.createdAt).toLocaleString()}</td>
      <td className="p-2">
        <div className="flex gap-2">
          {u.role !== 'admin' && (
            <form action={promote}>
              <button className="px-2 py-0.5 rounded bg-green-600 text-white">Promote</button>
            </form>
          )}
          {u.role === 'admin' && (
            <form action={demote}>
              <button className="px-2 py-0.5 rounded bg-amber-600 text-white">Demote</button>
            </form>
          )}
        </div>
      </td>
    </tr>
  );
}
