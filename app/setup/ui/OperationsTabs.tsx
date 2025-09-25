"use client";
import { useState, useTransition } from 'react';
import type { SetupDiagnosticsResult, DiagnosticCategory } from '@/server/services/setupDiagnostics';
import ConfigForm from './config/ConfigForm';
import DatabaseActions from './database/DatabaseActions';
import { PromoteButton } from '../PromoteButton';

interface Props { diagnostics: SetupDiagnosticsResult; stackUser: { id: string; email: string | null; primaryEmail: string | null } | null; hasAdmin: boolean; currentEnv?: Record<string,string> }

const ORDER = ['prereq','config','database','admin'] as const;

export default function OperationsTabs({ diagnostics, stackUser, hasAdmin, currentEnv }: Props) {
  const ordered: DiagnosticCategory[] = ORDER.map(id => diagnostics.categories.find(c=>c.id===id)!).filter(Boolean);
  const [active, setActive] = useState(ordered[0]?.id);
  const [hiddenAll, setHiddenAll] = useState(true);
  const toggleAll = () => setHiddenAll(h => !h);
  return (
    <div className="border rounded bg-white dark:bg-neutral-900/70">
      <div className="flex border-b overflow-x-auto text-xs">
        {ordered.map(c => (
          <button key={c.id} onClick={()=> setActive(c.id)} className={`px-3 py-2 whitespace-nowrap border-r last:border-r-0 ${active===c.id ? 'bg-blue-50 dark:bg-neutral-800 font-semibold':'hover:bg-gray-50 dark:hover:bg-neutral-800'}`}>{c.label}</button>
        ))}
      </div>
      <div className="p-4 text-sm min-h-[380px] space-y-4">
        {ordered.map(c => active===c.id && (
          <div key={c.id} className="space-y-4">
            {c.id === 'prereq' && <PrereqPanel category={c} />}
            {c.id === 'config' && <ConfigForm diagnostics={diagnostics} initialEnv={currentEnv} globalToggle={{ hiddenAll, onToggleAll: toggleAll }} />}
            {c.id === 'database' && <DatabaseActions />}
            {c.id === 'admin' && <AdminPanel stackUser={stackUser} diagnostics={diagnostics} hasAdmin={hasAdmin} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrereqPanel({ category }: { category: DiagnosticCategory }) {
  return (
    <div>
      <h3 className="font-semibold mb-2">Pre-requisites</h3>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">Install or update items that are marked with ✖ outside this wizard (Node, system packages, etc.).</p>
      <ul className="text-xs divide-y rounded border bg-white dark:bg-neutral-900/50 overflow-hidden">
        {category.items.map(i => (
          <li key={i.id} className="flex gap-3 p-2">
            <span className={symbolClass(i.status)}>{statusSymbol(i.status)}</span>
            <div className="flex-1">
              <div className="font-medium">{i.label}</div>
              {i.detail && <div className="text-gray-500 dark:text-gray-400">{i.detail}</div>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AdminPanel({ stackUser, diagnostics, hasAdmin }: { stackUser: { id: string; email: string | null; primaryEmail: string | null } | null; diagnostics: SetupDiagnosticsResult; hasAdmin: boolean }) {
  const ready = diagnostics.flat.find(i=> i.id==='ready');
  return (
    <div>
      <h3 className="font-semibold mb-2">Admin & Promotion</h3>
      {!stackUser && <p className="text-xs text-red-600">Sign in to continue.</p>}
      {stackUser && (
        <div className="space-y-3">
          <p className="text-xs">Signed in as <strong>{stackUser.email || stackUser.primaryEmail}</strong></p>
          {!hasAdmin && <PromoteButton />}
          {hasAdmin && <p className="text-xs text-green-600">Admin already provisioned.</p>}
          {ready && <p className={`text-xs mt-2 ${ready.status==='ok'?'text-green-600':'text-amber-600'}`}>{ready.label}: {ready.detail}</p>}
        </div>
      )}
    </div>
  );
}

// (PromoteButton imported directly above)

function statusSymbol(status: string) {
  switch (status) {
    case 'ok': return '✔';
    case 'error': return '✖';
    case 'pending': return '…';
    case 'action': return '!';
    case 'optional': return '○';
    default: return '·';
  }
}
function symbolClass(status: string) {
  return {
    ok: 'text-green-600',
    error: 'text-red-600',
    pending: 'text-amber-600',
    action: 'text-blue-600',
    optional: 'text-gray-400'
  }[status] || 'text-gray-400';
}
