"use client";
import { useState } from 'react';

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || 'PHP';

export default function CreatePlanForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const [duration, setDuration] = useState('60');
  const [dataCap, setDataCap] = useState('');
  const [downKbps, setDownKbps] = useState('');
  const [upKbps, setUpKbps] = useState('');
  const [limitTime, setLimitTime] = useState(true);
  const [limitData, setLimitData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          priceCents: Math.round(parseFloat(price || '0') * 100),
          durationMinutes: limitTime ? parseInt(duration, 10) : undefined,
          dataCapMb: limitData && dataCap ? parseInt(dataCap, 10) : undefined,
          downKbps: downKbps ? parseInt(downKbps, 10) : undefined,
          upKbps: upKbps ? parseInt(upKbps, 10) : undefined,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setSuccess('Created');
  setName(''); setPrice('0'); setDuration('60'); setDataCap(''); setDownKbps(''); setUpKbps(''); setLimitTime(true); setLimitData(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <button onClick={() => setOpen(o=>!o)} className="text-xs border rounded px-3 py-1 bg-neutral-50 hover:bg-neutral-100">
        {open ? 'Hide Create Plan' : 'New Plan'}
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-2 gap-3 text-xs bg-white dark:bg-neutral-900/70 border rounded p-4">
          <div className="col-span-2">
            <label className="block font-medium mb-1">Name</label>
            <input required value={name} onChange={e=>setName(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block font-medium mb-1">Price ({CURRENCY})</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="col-span-2 flex gap-6 items-end">
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={limitTime} onChange={e=>setLimitTime(e.target.checked)} /> Time Limit</label>
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={limitData} onChange={e=>setLimitData(e.target.checked)} /> Data Cap</label>
            <span className="text-[10px] text-neutral-500">(Leave both unchecked for unlimited)</span>
          </div>
          {limitTime && (
            <div>
              <label className="block font-medium mb-1">Duration (min)</label>
              <input type="number" min="1" required value={duration} onChange={e=>setDuration(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
          )}
          {limitData && (
            <div>
              <label className="block font-medium mb-1">Data Cap (MB)</label>
              <input type="number" min="1" required value={dataCap} onChange={e=>setDataCap(e.target.value)} className="w-full border rounded px-2 py-1" />
            </div>
          )}
          <div>
            <label className="block font-medium mb-1">Down Kbps (optional)</label>
            <input type="number" min="1" value={downKbps} onChange={e=>setDownKbps(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block font-medium mb-1">Up Kbps (optional)</label>
            <input type="number" min="1" value={upKbps} onChange={e=>setUpKbps(e.target.value)} className="w-full border rounded px-2 py-1" />
          </div>
          <div className="col-span-2 flex items-center gap-3 mt-2">
            <button disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1 disabled:opacity-50">{loading ? 'Saving...' : 'Create'}</button>
            {error && <span className="text-red-600">{error}</span>}
            {success && <span className="text-green-600">{success}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
