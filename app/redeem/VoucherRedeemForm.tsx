"use client";
import { useState, useEffect, useMemo } from 'react';

interface RedeemResult {
  voucher?: any;
  plan?: { name: string; durationMinutes: number; dataCapMb?: number | null; downKbps?: number | null; upKbps?: number | null } | null;
  activatedAt?: string;
  error?: string;
  status?: string;
}

export default function VoucherRedeemForm() {
  const [code, setCode] = useState('');
  const [mac, setMac] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RedeemResult | null>(null);
  const [now, setNow] = useState(Date.now());

  // Ticking timer for countdown (every 1s when active voucher displayed)
  useEffect(() => {
    if (!result?.voucher?.expiresAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [result?.voucher?.expiresAt]);

  const remaining = useMemo(() => {
    if (!result?.voucher?.expiresAt) return null;
    const diff = new Date(result.voucher.expiresAt).getTime() - now;
    if (diff <= 0) return 0;
    return diff;
  }, [result?.voucher?.expiresAt, now]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setResult(null);
    try {
      const res = await fetch('/api/vouchers/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), mac: mac.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 429) {
          data.error = data.error || 'Rate limit exceeded';
        }
        throw data;
      }
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.error || err.message || 'Redeem failed', status: err.status });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-neutral-900/70 border rounded-lg p-6 shadow-md">
        <div>
          <label className="block text-xs font-medium mb-1">Voucher Code</label>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required minLength={6} maxLength={24} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="ABC12345" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Device MAC (optional)</label>
          <input value={mac} onChange={e=>setMac(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="AA:BB:CC:DD:EE:FF" />
        </div>
        <div className="flex gap-2">
          <button disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded py-2 text-sm font-medium">
            {loading ? 'Redeeming...' : 'Redeem Voucher'}
          </button>
          {result?.voucher && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(result.voucher.code)}
              className="px-3 py-2 text-xs rounded border bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >Copy Code</button>
          )}
        </div>
      </form>
      {result && (
        <div className="mt-6 text-sm">
          {result.error && (
            <div className="rounded border border-red-300 bg-red-50 text-red-700 px-4 py-3">
              <p className="font-semibold mb-1">Redemption Failed</p>
              <p>{result.error}{result.status ? ` (status: ${result.status})` : ''}</p>
              {result.status === 'active' && <p className="mt-1">Already active.</p>}
              {result.status === 'expired' && <p className="mt-1">Voucher has expired. Request a new one.</p>}
              {result.status === 'revoked' && <p className="mt-1">This voucher was revoked by an administrator.</p>}
            </div>
          )}
          {!result.error && result.voucher && (
            <div className="rounded border border-green-300 bg-green-50 text-green-800 px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Voucher Active</p>
                <span className="font-mono text-xs bg-white/70 border px-2 py-0.5 rounded">{result.voucher.code}</span>
              </div>
              {result.plan && (
                <ul className="list-disc list-inside text-xs text-green-900 space-y-1">
                  <li>Plan: {result.plan.name}</li>
                  <li>Duration: {result.plan.durationMinutes} minutes</li>
                  {result.plan.dataCapMb && <li>Data Cap: {result.plan.dataCapMb} MB</li>}
                  {(result.plan.downKbps || result.plan.upKbps) && <li>Speed: {result.plan.downKbps || '—'} / {result.plan.upKbps || '—'} kbps</li>}
                </ul>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="font-medium">Activated</p>
                  <p>{result.voucher.activatedAt ? new Date(result.voucher.activatedAt).toLocaleTimeString() : 'now'}</p>
                </div>
                <div>
                  <p className="font-medium">Expires</p>
                  <p>{result.voucher.expiresAt ? new Date(result.voucher.expiresAt).toLocaleTimeString() : '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="font-medium">Time Remaining</p>
                  <p>{remaining === null ? '—' : remaining <= 0 ? 'Expired' : formatRemaining(remaining)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatRemaining(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s.toString().padStart(2,'0')}s`;
}
