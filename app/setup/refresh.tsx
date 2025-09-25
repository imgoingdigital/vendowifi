"use client";
import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export default function ChecklistRefresh() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(()=> router.refresh())}
      className="text-xs px-2 py-1 border rounded bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700"
      disabled={pending}
    >{pending ? 'Refreshing…' : 'Refresh'}</button>
  );
}
