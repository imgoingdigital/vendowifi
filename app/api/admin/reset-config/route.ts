import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/server/db/client';
import { plans } from '@/server/db/schema/plans';
import { logAudit } from '@/server/services/audit';
import { rateLimit, rlKey } from '@/server/middleware/rateLimit';
import { logInfo, logWarn } from '@/server/services/logger';
import { eq } from 'drizzle-orm';

/* restore recommended config
 * Recreates a default set of plans if missing. Requires X-CONFIG-RESET header to match CONFIG_RESET_SECRET.
 */
export async function POST(req: NextRequest) {
  if (process.env.ENABLE_CONFIG_RESET !== 'true') {
    return NextResponse.json({ error: 'Disabled' }, { status: 404 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const rl = await rateLimit(rlKey(['reset-config', ip]), { windowMs: 60_000, max: 5 });
  if (!rl.allowed) {
    await logWarn('reset_config.rate_limited', { ip });
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }
  const secret = process.env.CONFIG_RESET_SECRET;
  if (!secret) return NextResponse.json({ error: 'Reset disabled (no secret)' }, { status: 403 });
  if (req.headers.get('x-config-reset') !== secret) {
    await logWarn('reset_config.bad_secret', { ip });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const defaults = [
    { name: '30min Free Trial', priceCents: 0, durationMinutes: 30 },
    { name: '1hr Pass', priceCents: 500, durationMinutes: 60 },
    { name: '1 Day Unlimited', priceCents: 2000, durationMinutes: 24*60 },
  ];

  const existing = await db.select().from(plans);
  const existingNames = new Set(existing.map(p=>p.name));
  const toInsert = defaults.filter(d => !existingNames.has(d.name));
  if (toInsert.length) {
    await db.insert(plans).values(toInsert);
  }
  await logAudit({ action: 'admin.reset_config', meta: { inserted: toInsert.length } });
  await logInfo('reset_config.success', { inserted: toInsert.length });
  return NextResponse.json({ ok: true, inserted: toInsert.length });
}
