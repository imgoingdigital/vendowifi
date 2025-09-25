"use client";
import { useState } from 'react';

interface PlanOpt { id: string; name: string; }
export default function VoucherGenerateForm({ plans }: { plans: PlanOpt[] }) {
  const [open, setOpen] = useState(false);
  const [planId, setPlanId] = useState(plans[0]?.id || '');
  const [quantity, setQuantity] = useState('10');
  const [codeLength, setCodeLength] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ code: string; id: string }[] | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setCreated(null);
    try {
      const res = await fetch('/api/vouchers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, quantity: parseInt(quantity,10), codeLength: parseInt(codeLength,10) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setCreated(data.vouchers || []);
      // Reload after a brief delay to show them in list
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-4 bg-white dark:bg-neutral-900/70 text-xs">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold">Bulk Generate</p>
        <button onClick={()=>setOpen(o=>!o)} className="text-[11px] underline">{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <form onSubmit={submit} className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="block mb-1 font-medium">Plan</label>
            <select required value={planId} onChange={e=>setPlanId(e.target.value)} className="w-full border rounded px-2 py-1">
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1 font-medium">Quantity</label>
            <input type="number" min={1} max={500} value={quantity} onChange={e=>setQuantity(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block mb-1 font-medium">Code Length</label>
            <input type="number" min={6} max={24} value={codeLength} onChange={e=>setCodeLength(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="col-span-4 flex items-center gap-3 mt-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1 disabled:opacity-50">{loading ? 'Generating...' : 'Generate'}</button>
            {error && <span className="text-red-600">{error}</span>}
            {created && <span className="text-green-600">Created {created.length}</span>}
          </div>
          {created && created.length > 0 && (
            <div className="col-span-4 mt-2 bg-green-50 border border-green-300 rounded p-2 font-mono text-[10px] max-h-40 overflow-auto">
              {created.map(v => <div key={v.id}>{v.code}</div>)}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
