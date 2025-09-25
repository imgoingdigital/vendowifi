import { getDb } from '@/server/db/client';
import { auditLogs } from '@/server/db/schema/auditLogs';

export default async function AuditLogPage() {
  const db = await getDb();
  const logs = await db.select().from(auditLogs).limit(200);
  return (
    <div>
      <h1 className="text-xl font-semibold mb-4">Audit Log</h1>
      <table className="w-full text-xs border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2">Time</th>
            <th className="p-2">Action</th>
            <th className="p-2">User</th>
            <th className="p-2">Target</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(l => (
            <tr key={l.id} className="border-t">
              <td className="p-1 whitespace-nowrap">{new Date(l.createdAt as any).toLocaleString()}</td>
              <td className="p-1">{l.action}</td>
              <td className="p-1">{l.userId || '—'}</td>
              <td className="p-1">{l.targetType ? `${l.targetType}:${l.targetId}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
