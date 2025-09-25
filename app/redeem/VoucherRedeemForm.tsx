"use client";
import { useState } from 'react';

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
      if (!res.ok) throw data;
      setResult(data);
    } catch (err: any) {
      setResult({ error: err.error || err.message || 'Redeem failed', status: err.status });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-neutral-900/70 border rounded p-6 shadow">
        <div>
          <label className="block text-xs font-medium mb-1">Voucher Code</label>
          <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} required minLength={6} maxLength={24} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="ABC12345" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Device MAC (optional)</label>
          <input value={mac} onChange={e=>setMac(e.target.value)} className="w-full border rounded px-3 py-2 text-sm font-mono" placeholder="AA:BB:CC:DD:EE:FF" />
        </div>
        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded py-2 text-sm font-medium">
          {loading ? 'Redeeming...' : 'Redeem Voucher'}
        </button>
      </form>
      {result && (
        <div className="mt-6 text-sm">
          {result.error && (
            <div className="rounded border border-red-300 bg-red-50 text-red-700 px-4 py-3">
              <p className="font-semibold mb-1">Redemption Failed</p>
              <p>{result.error}{result.status ? ` (status: ${result.status})` : ''}</p>
            </div>
          )}
          {!result.error && result.voucher && (
            <div className="rounded border border-green-300 bg-green-50 text-green-800 px-4 py-3 space-y-2">
              <p className="font-semibold">Voucher Activated</p>
              {result.plan && (
                <ul className="list-disc list-inside text-xs text-green-900 space-y-1">
                  <li>Plan: {result.plan.name}</li>
                  <li>Duration: {result.plan.durationMinutes} minutes</li>
                  {result.plan.dataCapMb && <li>Data Cap: {result.plan.dataCapMb} MB</li>}
                  {(result.plan.downKbps || result.plan.upKbps) && <li>Speed: {result.plan.downKbps || '—'} / {result.plan.upKbps || '—'} kbps</li>}
                </ul>
              )}
              <p className="text-xs">Activated at: {result.activatedAt ? new Date(result.activatedAt).toLocaleString() : 'now'}</p>
              <p className="text-xs">Status: {result.voucher.status}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
