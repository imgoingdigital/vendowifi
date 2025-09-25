import { getDb } from '@/server/db/client';
import { users } from '@/server/db/schema/users';
import { eq } from 'drizzle-orm';
import os from 'os';

export interface DiagnosticCategory {
  id: string;
  label: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'pending' | 'error' | 'action' | 'optional';
  detail?: string;
  docHint?: string;
  actionHref?: string;
}

export interface SetupDiagnosticsResult {
  categories: DiagnosticCategory[];
  flat: ChecklistItem[]; // flattened for legacy / quick loops
  hasAdmin: boolean;
  currentUserEmail: string | null;
}

export async function getSetupDiagnostics(stackUser: any | null): Promise<SetupDiagnosticsResult> {
  const prereq: ChecklistItem[] = [];
  const config: ChecklistItem[] = [];
  const dbCat: ChecklistItem[] = [];
  const adminCat: ChecklistItem[] = [];
  let dbOk = false; let baselineOk = false; let grantsOk = false; let hasAdmin = false;
  const currentUserEmail = stackUser ? (stackUser.email || stackUser.primaryEmail || null) : null;

  // 1. Environment vars
  // System runtime
  prereq.push({ id: 'node-version', label: `Node.js >=18`, status: parseInt(process.versions.node.split('.')[0],10) >= 18 ? 'ok':'error', detail: process.versions.node });
  prereq.push({ id: 'platform', label: `Platform (${os.platform()})`, status: 'ok', detail: `${os.platform()} ${os.release()}` });

  const synthApp = (process.env.DB_APP_USER && process.env.DB_APP_PASSWORD) ? true : false;
  const synthOwner = (process.env.DB_OWNER_USER && process.env.DB_OWNER_PASSWORD) ? true : false;
  const hasDbUrl = !!process.env.DATABASE_URL || (synthApp && !!process.env.DB_NAME);
  const hasMigUrl = !!process.env.MIGRATION_DATABASE_URL || (synthOwner && !!process.env.DB_NAME);
  config.push({ id: 'env-db', label: 'App DB connection (URL or components)', status: hasDbUrl ? 'ok' : 'error', detail: hasDbUrl ? undefined : 'Set DATABASE_URL or DB_APP_* + DB_NAME', docHint: 'DB_SETUP.md#roles--urls' });
  config.push({ id: 'env-mig', label: 'Owner DB connection (URL or components)', status: hasMigUrl ? 'ok' : 'pending', detail: hasMigUrl ? undefined : 'Optional: set MIGRATION_DATABASE_URL or DB_OWNER_* for role separation.' });
  if (!process.env.DATABASE_URL && synthApp) {
    config.push({ id: 'env-synth-app', label: 'Synthesized app URL', status: 'ok', detail: `${process.env.DB_APP_USER}@${process.env.DB_HOST||'localhost'}/${process.env.DB_NAME||'vendowifi'}` });
  }
  if (!process.env.MIGRATION_DATABASE_URL && synthOwner) {
    config.push({ id: 'env-synth-owner', label: 'Synthesized owner URL', status: 'ok', detail: `${process.env.DB_OWNER_USER}@${process.env.DB_HOST||'localhost'}/${process.env.DB_NAME||'vendowifi'}` });
  }

  const stackVars = ['NEXT_PUBLIC_STACK_PROJECT_ID','STACK_SECRET_SERVER_KEY'];
  for (const v of stackVars) {
    const present = !!process.env[v];
    config.push({ id: `env-${v.toLowerCase()}`, label: `${v} configured`, status: present ? 'ok' : 'error', detail: present ? undefined : `Set ${v} in .env` });
  }

  // 2. DB connectivity & baseline
  try {
    const db = await getDb();
    dbOk = true;
    // Attempt selects to ensure tables & columns exist
    await db.select({ id: users.id }).from(users).limit(1); // users table
    baselineOk = true;
    // Admin presence
    const admin = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
    hasAdmin = admin.length > 0;
    grantsOk = true; // If select succeeded without permission error we assume grants are minimally OK.
  } catch (e: any) {
    const msg = e?.message || 'Unknown DB error';
    if (!dbOk) {
      dbCat.push({ id: 'db-conn', label: 'Database connection', status: 'error', detail: msg, docHint: 'DB_SETUP.md' });
    }
    if (dbOk && !baselineOk) {
      dbCat.push({ id: 'db-baseline', label: 'Baseline schema', status: 'error', detail: msg, docHint: 'drizzle/0000_init.sql' });
    }
  }
  if (dbOk) {
      dbCat.push({ id: 'db-conn-ok', label: 'Database connection', status: 'ok' });
      dbCat.push({ id: 'db-baseline-ok', label: 'Baseline schema present', status: baselineOk ? 'ok' : 'error', detail: baselineOk ? undefined : 'Run baseline init SQL' });
      dbCat.push({ id: 'db-grants', label: 'App role grants', status: grantsOk ? 'ok' : 'error', detail: grantsOk ? undefined : 'Run npm run db:grant' });
  }

  // 3. Auth / user stage
  if (!stackUser) {
    adminCat.push({ id: 'auth-signin', label: 'Sign in / create account', status: 'action', actionHref: '/stack-auth/sign-up', detail: 'Sign up then return here.' });
  } else {
    adminCat.push({ id: 'auth-signed', label: `Signed in as ${currentUserEmail}`, status: 'ok' });
  }

  if (stackUser && !hasAdmin) {
    adminCat.push({ id: 'promote', label: 'Promote first admin', status: 'action', actionHref: '/setup#promote', detail: 'Promote your account to unlock admin dashboard.' });
  }
  if (hasAdmin) {
    adminCat.push({ id: 'admin-present', label: 'Admin account exists', status: 'ok' });
  }

  // 4. Ready summary
  const ready = dbOk && baselineOk && grantsOk && hasAdmin;
  adminCat.push({ id: 'ready', label: ready ? 'System ready' : 'System not ready', status: ready ? 'ok' : 'pending', detail: ready ? 'All critical steps complete.' : 'Complete remaining actions above.' });
  const categories: DiagnosticCategory[] = [
    { id: 'prereq', label: 'Pre-requisites', items: prereq },
    { id: 'config', label: 'Config', items: config },
    { id: 'database', label: 'Database', items: dbCat },
    { id: 'admin', label: 'Admin & Promotion', items: adminCat },
  ];
  const flat = [...prereq, ...config, ...dbCat, ...adminCat];
  return { categories, flat, hasAdmin, currentUserEmail };
}
