"use client";
import { useState, useTransition } from 'react';
import { runGrantAction, testDbAction, provisionDbAction, provisionDbEphemeralAction, runMigrationsAction, dropDatabaseAction, bootstrapDbEnvAction, bootstrapDbEphemeralAction } from '../../actions';

export default function DatabaseActions() {
  const [msg, setMsg] = useState<string>('');
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'none' | 'env' | 'ephemeral'>('none');
  const [confirm, setConfirm] = useState('');
  const [confirmDrop, setConfirmDrop] = useState('');
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="font-semibold">Database Provisioning</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">Choose a provisioning method (one-time). You only need to provision if roles / database do not yet exist.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" onClick={()=> setMode(m=> m==='env'?'none':'env')} className={`px-3 py-1.5 rounded border ${mode==='env'?'bg-blue-50 dark:bg-blue-900/30':''}`}>Env Superuser Mode</button>
        <button type="button" onClick={()=> setMode(m=> m==='ephemeral'?'none':'ephemeral')} className={`px-3 py-1.5 rounded border ${mode==='ephemeral'?'bg-blue-50 dark:bg-blue-900/30':''}`}>Ephemeral Superuser Mode</button>
      </div>
      {mode==='env' && <EnvProvision pending={pending} start={start} setMsg={setMsg} />}
      {mode==='ephemeral' && <EphemeralProv onResult={m=> setMsg(m)} />}
      <Separator />
      <div className="space-y-2">
        <h4 className="font-medium text-sm">Lifecycle / Maintenance</h4>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} onClick={()=> start(async ()=> { const r = await testDbAction(); setMsg(r.message); })} className="px-3 py-1.5 rounded border text-xs bg-white dark:bg-neutral-800 disabled:opacity-50">{pending ? 'Working…' : 'Test Connection'}</button>
          <button disabled={pending} onClick={()=> start(async ()=> { const r = await runGrantAction(); setMsg(r.message); })} className="px-3 py-1.5 rounded border text-xs bg-white dark:bg-neutral-800 disabled:opacity-50">{pending ? 'Working…' : 'Run Grants'}</button>
          <button disabled={pending || confirm!=='MIGRATE'} onClick={()=> start(async ()=> { const r = await runMigrationsAction(); setMsg(r.message); })} className="px-3 py-1.5 rounded border text-xs bg-white dark:bg-neutral-800 disabled:opacity-50" title="Type MIGRATE below to enable">{pending ? 'Working…' : 'Run Migrations'}</button>
          <button disabled={pending || confirmDrop!=='DROP'} onClick={()=> start(async ()=> { const r = await dropDatabaseAction(); setMsg(r.message); })} className="px-3 py-1.5 rounded border border-red-500 text-red-600 text-xs bg-white dark:bg-neutral-800 disabled:opacity-50" title="Type DROP below to enable">{pending ? 'Working…' : 'Drop Database'}</button>
        </div>
        <div className="grid md:grid-cols-2 gap-3 text-[10px]">
          <div className="space-y-1">
            <label className="font-medium block">Migration Confirmation</label>
            <input value={confirm} onChange={e=> setConfirm(e.target.value.trim().toUpperCase())} placeholder="Type MIGRATE to enable" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          </div>
          <div className="space-y-1">
            <label className="font-medium block">Drop Confirmation</label>
            <input value={confirmDrop} onChange={e=> setConfirmDrop(e.target.value.trim().toUpperCase())} placeholder="Type DROP to enable" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          </div>
        </div>
        <p className="text-[10px] text-gray-500">Drop uses the owner role (not superuser); it will fail if other sessions are connected. Purpose: clean dev reset without persisting superuser creds.</p>
      </div>
      {msg && <p className="text-xs text-blue-600 whitespace-pre-wrap break-all">{msg}</p>}
    </div>
  );
}

function EnvProvision({ pending, start, setMsg }: { pending: boolean; start: ReturnType<typeof useTransition>[1]; setMsg: (m: string)=> void }) {
  const [confirmProvision, setConfirmProvision] = useState('');
  const [confirmBootstrap, setConfirmBootstrap] = useState('');
  return (
    <div className="space-y-2 border p-3 rounded text-xs bg-white dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Env Superuser Provision</h4>
      </div>
      <p className="text-[10px] text-gray-500">Uses DB_SUPERUSER_* variables (not recommended for long-term storage). Creates roles, DB, pgcrypto extension.</p>
      <div className="grid gap-2 md:grid-cols-2">
        <div className="space-y-1">
          <input value={confirmProvision} onChange={e=> setConfirmProvision(e.target.value.trim().toUpperCase())} placeholder="Type PROVISION" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          <button disabled={pending || confirmProvision!=='PROVISION'} onClick={()=> start(async ()=> { const r = await provisionDbAction(); setMsg(r.message); })} className="w-full px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50">{pending ? 'Working…' : 'Provision Only'}</button>
        </div>
        <div className="space-y-1">
          <input value={confirmBootstrap} onChange={e=> setConfirmBootstrap(e.target.value.trim().toUpperCase())} placeholder="Type BOOTSTRAP" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          <button disabled={pending || confirmBootstrap!=='BOOTSTRAP'} onClick={()=> start(async ()=> { const r = await bootstrapDbEnvAction(); setMsg(r.message); })} className="w-full px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50">{pending ? 'Working…' : 'Bootstrap (Provision+Migrate+Grants)'}</button>
        </div>
      </div>
    </div>
  );
}

function EphemeralProv({ onResult }: { onResult: (m: string)=> void }) {
  const [pending, start] = useTransition();
  const [suUser, setSuUser] = useState('postgres');
  const [suPass, setSuPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState('5432');
  const [confirmProvision, setConfirmProvision] = useState('');
  const [confirmBootstrap, setConfirmBootstrap] = useState('');
  return (
    <div className="space-y-2 border p-3 rounded text-xs bg-white dark:bg-neutral-900">
      <h4 className="font-medium">Ephemeral Provision</h4>
      <p className="text-[10px] text-gray-500">Credentials never persist to disk. Creates roles + database + pgcrypto.</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-1">
          <label className="block text-[10px] font-medium">Superuser User</label>
          <input value={suUser} onChange={e=> setSuUser(e.target.value)} className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
        </div>
        <div className="space-y-1 col-span-1">
          <label className="flex items-center justify-between text-[10px] font-medium">
            <span>Superuser Password</span>
            <button type="button" onClick={()=> setShowPass(s=> !s)} className="px-1 py-0.5 border rounded text-[9px] bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700">{showPass ? 'Hide' : 'Show'}</button>
          </label>
          <input type={showPass ? 'text' : 'password'} value={suPass} onChange={e=> setSuPass(e.target.value)} className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-medium">Host</label>
          <input value={host} onChange={e=> setHost(e.target.value)} className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-medium">Port</label>
          <input value={port} onChange={e=> setPort(e.target.value)} className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        <div className="space-y-1">
          <input value={confirmProvision} onChange={e=> setConfirmProvision(e.target.value.trim().toUpperCase())} placeholder="Type EPHEMERAL" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          <button disabled={pending || !suPass || confirmProvision!=='EPHEMERAL'} onClick={()=> start(async ()=> { const r = await provisionDbEphemeralAction({ suUser, suPass, host, port }); onResult(r.message); })} className="w-full px-3 py-1.5 rounded bg-blue-600 text-white disabled:opacity-50">{pending ? 'Running…' : 'Provision Only'}</button>
        </div>
        <div className="space-y-1">
          <input value={confirmBootstrap} onChange={e=> setConfirmBootstrap(e.target.value.trim().toUpperCase())} placeholder="Type BOOTSTRAP" className="w-full px-2 py-1 rounded border bg-white dark:bg-neutral-800" />
          <button disabled={pending || !suPass || confirmBootstrap!=='BOOTSTRAP'} onClick={()=> start(async ()=> { const r = await bootstrapDbEphemeralAction({ suUser, suPass, host, port }); onResult(r.message); })} className="w-full px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50">{pending ? 'Running…' : 'Bootstrap (All Steps)'}</button>
        </div>
      </div>
    </div>
  );
}

function Separator() { return <div className="h-px w-full bg-gray-200 dark:bg-neutral-700" />; }
