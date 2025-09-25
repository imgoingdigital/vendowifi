"use client";
import { useState, useTransition } from 'react';
import { updateEnvAction } from '../../actions';
import type { SetupDiagnosticsResult } from '@/server/services/setupDiagnostics';

import { EDITABLE_ENV_KEYS } from './keys';

export default function ConfigForm({ diagnostics, initialEnv, globalToggle }: { diagnostics: SetupDiagnosticsResult; initialEnv?: Record<string,string>; globalToggle?: { hiddenAll: boolean; onToggleAll: ()=> void } }) {
  const [state, setState] = useState<Record<string,string>>(()=> {
    const r: Record<string,string> = {};
  EDITABLE_ENV_KEYS.forEach(k => r[k] = initialEnv?.[k] ?? (typeof process !== 'undefined' ? (process.env[k] || '') : ''));
    return r;
  });
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string| null>(null);
  const [hidden, setHidden] = useState<Record<string, boolean>>(()=> {
    const m: Record<string, boolean> = {};
  EDITABLE_ENV_KEYS.forEach(k => { m[k] = true; });
    return m;
  });

  function toggleVisibility(k: string) {
    setHidden(h => ({ ...h, [k]: !h[k] }));
  }

  function onChange(k: string, v: string) { setState(s => ({ ...s, [k]: v })); }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Config (.env)</h3>
        {globalToggle && (
          <button type="button" onClick={globalToggle.onToggleAll} className="text-[10px] px-2 py-1 rounded border bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700">
            {globalToggle.hiddenAll ? 'Show All' : 'Hide All'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">Update selected environment variables. Changes write to <code>.env</code> and require a server restart to fully apply.</p>
      <form className="space-y-3" onSubmit={e => { e.preventDefault(); start(async ()=> { const r = await updateEnvAction(state); setResult(r.message); }); }}>
        <div className="grid md:grid-cols-2 gap-3">
          {EDITABLE_ENV_KEYS.map(k => {
            const isSecret = /PASSWORD|SECRET|KEY|URL/i.test(k) || k.includes('STACK_SECRET');
            // Global hiddenAll=true forces hide for all non-empty values.
            // When hiddenAll=false we respect individual toggle (hidden[k]).
            const hide = globalToggle?.hiddenAll ? !!state[k] : (hidden[k] && !!state[k]);
            return (
              <div key={k} className="space-y-1 group">
                <label className="text-[10px] font-medium tracking-wide flex items-center justify-between gap-2">
                  <span>{k}</span>
                  <button
                    type="button"
                    onClick={()=> toggleVisibility(k)}
                    className="text-[9px] px-1 py-0.5 rounded border bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700"
                    title={hide ? 'Show value' : 'Hide value'}
                  >{hide ? 'Show' : 'Hide'}</button>
                </label>
                <input
                  type={hide ? 'password' : 'text'}
                  value={state[k]}
                  onChange={e=> onChange(k, e.target.value)}
                  className={`w-full text-xs px-2 py-1 rounded border bg-white dark:bg-neutral-800 ${hide?'tracking-wider':''}`}
                  placeholder={`Set ${k}`}
                  autoComplete="off"
                />
                {isSecret && <p className="text-[9px] text-gray-400">{hide ? 'Value hidden' : 'Visible'}</p>}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">Leave DATABASE_URL / MIGRATION_DATABASE_URL empty to let the system synthesize them from DB_* variables.</p>
        <button disabled={pending} className="px-3 py-1.5 rounded bg-blue-600 text-white text-xs disabled:opacity-50">{pending ? 'Saving...' : 'Save Env Changes'}</button>
        {result && <p className="text-xs text-green-600">{result}</p>}
      </form>
    </div>
  );
}
