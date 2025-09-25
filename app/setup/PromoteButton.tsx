"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function PromoteButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/promote-first', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      router.push('/admin/plans');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button disabled={loading} onClick={handleClick} className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm">
        {loading ? 'Promoting...' : 'Promote my account to Admin'}
      </button>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <p className="text-xs text-gray-500">This idempotent action only works while no admin exists.</p>
    </div>
  );
}
