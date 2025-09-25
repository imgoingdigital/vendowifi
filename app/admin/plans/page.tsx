import { getDb } from '@/server/db/client';
import { plans } from '@/server/db/schema/plans';

export default async function AdminPlansPage() {
  const db = await getDb();
  const list = await db.select().from(plans).limit(100);
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Plans</h1>
      <table className="w-full text-sm border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Name</th>
            <th className="p-2">Price</th>
            <th className="p-2">Duration (min)</th>
            <th className="p-2">Data Cap MB</th>
          </tr>
        </thead>
        <tbody>
          {list.map(p => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.name}</td>
              <td className="p-2">{(p.priceCents/100).toFixed(2)}</td>
              <td className="p-2">{p.durationMinutes}</td>
              <td className="p-2">{p.dataCapMb ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
