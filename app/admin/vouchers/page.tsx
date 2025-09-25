import { getDb } from '@/server/db/client';
import { vouchers } from '@/server/db/schema/vouchers';
import { plans } from '@/server/db/schema/plans';
import { inArray } from 'drizzle-orm';

export default async function AdminVouchersPage() {
  const db = await getDb();
  // Simple join in two queries for now
  const list = await db.select().from(vouchers).limit(100);
  const planMap = new Map<string, string>();
  const planIds = Array.from(new Set(list.map(v => v.planId)));
  if (planIds.length) {
    const planRows = await db.select().from(plans).where(inArray(plans.id, planIds));
    planRows.forEach(p => planMap.set(p.id, p.name));
  }
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Vouchers</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Code</th>
            <th className="p-2">Plan</th>
            <th className="p-2">Status</th>
            <th className="p-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {list.map(v => (
            <tr key={v.id} className="border-t">
              <td className="p-2 font-mono text-xs">{v.code}</td>
              <td className="p-2">{planMap.get(v.planId) || v.planId}</td>
              <td className="p-2">{v.status}</td>
              <td className="p-2">{new Date(v.createdAt as any).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
