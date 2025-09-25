import { getDb } from '../db/client';
import { auditLogs } from '../db/schema/auditLogs';

export async function logAudit(entry: { userId?: string | null; action: string; targetType?: string; targetId?: string; meta?: Record<string, unknown>; }) {
  const db = await getDb();
  await db.insert(auditLogs).values({
    userId: entry.userId || null,
    action: entry.action,
    targetType: entry.targetType || null,
    targetId: entry.targetId || null,
    meta: entry.meta ? JSON.stringify(entry.meta) : null,
  });
}
