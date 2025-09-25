import { hasAdminUser } from '@/server/services/bootstrap';
import { stackServerApp } from '@/stack/server';
import { redirect } from 'next/navigation';
import { getSetupDiagnostics, type ChecklistItem } from '@/server/services/setupDiagnostics';
import { ensureLocalUserForStack } from '@/server/services/authMapping';
import ChecklistRefresh from './refresh';
import OperationsTabs from './ui/OperationsTabs';
import { EDITABLE_ENV_KEYS } from './ui/config/keys';

export const dynamic = 'force-dynamic'; // ensure fresh check during bootstrap

export default async function SetupPage() {
  const hasAdmin = await hasAdminUser();
  // Keep setup accessible even after admin exists for ops; remove redirect.
  const stackUser = await stackServerApp.getUser({ or: 'return-null' });
  if (stackUser) {
    // Ensure local linkage on visiting setup (covers sign-in flows that land here first)
    await ensureLocalUserForStack(stackUser as any);
  }
  const diagnostics = await getSetupDiagnostics(stackUser);
  const safeUser = stackUser ? {
    id: (stackUser as any).id,
    email: (stackUser as any).email || null,
    primaryEmail: (stackUser as any).primaryEmail || null
  } : null;

  // Collect current env values server-side (only keys we allow editing)
  const currentEnv: Record<string,string> = {};
  (EDITABLE_ENV_KEYS as readonly string[]).forEach((k: string) => { currentEnv[k] = process.env[k] || ''; });

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <h1 className="text-2xl font-semibold">Setup & Operations</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Use the tabs below to perform configuration, database provisioning, and admin promotion. The full checklist at right shows overall status.</p>
          <OperationsTabs diagnostics={diagnostics} stackUser={safeUser} hasAdmin={diagnostics.hasAdmin} currentEnv={currentEnv} />
        </div>
        <aside className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Full Checklist</h2>
            <ChecklistRefresh />
          </div>
          <ul className="text-xs divide-y rounded border bg-white dark:bg-neutral-900/70 max-h-[600px] overflow-auto">
            {diagnostics.flat.map(item => (
              <li key={item.id} className="p-3 flex gap-3">
                <span className={symbolClass(item.status)}>{statusSymbol(item.status)}</span>
                <div className="flex-1 space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    {item.label}
                    {item.actionHref && item.status !== 'ok' && (
                      <a href={item.actionHref} className="text-blue-600 underline">Go</a>
                    )}
                  </div>
                  {item.detail && <p className="text-gray-600 dark:text-gray-400 leading-snug">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function statusSymbol(status: ChecklistItem['status']) {
  switch (status) {
    case 'ok': return '✔';
    case 'error': return '✖';
    case 'pending': return '…';
    case 'action': return '!';
    case 'optional': return '○';
    default: return '·';
  }
}

function symbolClass(status: ChecklistItem['status']) {
  const map: Record<ChecklistItem['status'], string> = {
    ok: 'text-green-600',
    error: 'text-red-600',
    pending: 'text-amber-600',
    action: 'text-blue-600 animate-pulse',
    optional: 'text-gray-400'
  };
  return map[status];
}

