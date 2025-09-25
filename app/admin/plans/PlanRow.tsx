"use client";
import { useState } from 'react';

interface PlanRowProps {
  plan: any;
}
export default function PlanRow({ plan }: PlanRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const [archived, setArchived] = useState<boolean>(!!plan.archived);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name !== plan.name ? name : undefined, archived })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className={`border-t ${archived ? 'opacity-50' : ''}`}>
      <td className="p-2">
        {editing ? (
          <input value={name} onChange={e=>setName(e.target.value)} className="border rounded px-2 py-1 text-xs w-full" />
        ) : name}
        {error && <div className="text-red-600 text-[10px] mt-1">{error}</div>}
      </td>
      <td className="p-2">{(plan.priceCents/100).toFixed(2)}</td>
  <td className="p-2">{plan.durationMinutes ?? '—'}</td>
  <td className="p-2">{plan.dataCapMb ?? '—'}</td>
  <td className="p-2 text-xs">{plan.downKbps ? `${plan.downKbps}` : '—'}</td>
  <td className="p-2 text-xs">{plan.upKbps ? `${plan.upKbps}` : '—'}</td>
      <td className="p-2 text-xs">
        <label className="inline-flex items-center gap-1">
          <input type="checkbox" checked={archived} onChange={e=>setArchived(e.target.checked)} />
          <span>Archived</span>
        </label>
      </td>
      <td className="p-2 text-xs">
        {!editing && <button onClick={()=>setEditing(true)} className="text-blue-600 hover:underline mr-2">Edit</button>}
        {editing && (
          <>
            <button disabled={saving} onClick={save} className="text-green-600 hover:underline mr-2 disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
            <button disabled={saving} onClick={()=>{setEditing(false); setName(plan.name); setArchived(!!plan.archived);}} className="text-gray-500 hover:underline">Cancel</button>
          </>
        )}
      </td>
    </tr>
  );
}
