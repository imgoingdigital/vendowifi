import { getDb } from '@/server/db/client';
import { vouchers } from '@/server/db/schema/vouchers';
import { plans } from '@/server/db/schema/plans';
import { inArray } from 'drizzle-orm';
import VoucherGenerateForm from './VoucherGenerateForm';

export default async function AdminVouchersPage() {
  const db = await getDb();
  const list = await db.select().from(vouchers).limit(200);
  const planMap = new Map<string, string>();
  const planIds = Array.from(new Set(list.map(v => v.planId)));
  if (planIds.length) {
    const planRows = await db.select().from(plans).where(inArray(plans.id, planIds));
    planRows.forEach(p => planMap.set(p.id, p.name));
  }
  return (
    <div>
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Vouchers</h1>
          <form action="/api/admin/vouchers/expire-sweep" method="post">
            <button className="text-xs border rounded px-3 py-1 bg-neutral-50 hover:bg-neutral-100" type="submit">Run Expiry Sweep</button>
          </form>
        </div>
        <VoucherGenerateForm plans={[...planMap.entries()].map(([id,name]) => ({ id, name }))} />
      </div>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Code</th>
            <th className="p-2">Plan</th>
            <th className="p-2">Status</th>
            <th className="p-2">Activated</th>
            <th className="p-2">Expires</th>
            <th className="p-2">Created</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(v => (
            <tr key={v.id} className="border-t">
              <td className="p-2 font-mono text-[10px] tracking-wide">{v.code}</td>
              <td className="p-2">{planMap.get(v.planId) || v.planId}</td>
              <td className="p-2">{v.status}</td>
              <td className="p-2">{v.activatedAt ? new Date(v.activatedAt as any).toLocaleString() : '—'}</td>
              <td className="p-2">{v.expiresAt ? new Date(v.expiresAt as any).toLocaleString() : '—'}</td>
              <td className="p-2">{new Date(v.createdAt as any).toLocaleString()}</td>
              <td className="p-2">
                {v.status !== 'revoked' && v.status !== 'expired' && (
                  <form action="/api/vouchers/revoke" method="post" className="inline">
                    <input type="hidden" name="code" value={v.code} />
                    <button type="submit" className="text-red-600 hover:underline text-xs">Revoke</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
