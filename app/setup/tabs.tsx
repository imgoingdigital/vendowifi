"use client";
import { useState } from 'react';
import type { DiagnosticCategory } from '@/server/services/setupDiagnostics';

export default function SetupTabs({ categories }: { categories: DiagnosticCategory[] }) {
  const [active, setActive] = useState(categories[0]?.id);
  return (
    <div className="text-xs border rounded bg-white dark:bg-neutral-900/70 flex flex-col h-[520px]">
      <div className="flex border-b overflow-x-auto">
        {categories.map(c => (
          <button key={c.id} onClick={()=> setActive(c.id)} className={`px-3 py-2 whitespace-nowrap border-r last:border-r-0 ${active===c.id ? 'bg-blue-50 dark:bg-neutral-800 font-semibold':'hover:bg-gray-50 dark:hover:bg-neutral-800'}`}>{c.label}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {categories.map(c => active===c.id && (
          <ul key={c.id} className="divide-y">
            {c.items.length === 0 && <li className="p-3 text-gray-500">No items</li>}
            {c.items.map(item => (
              <li key={item.id} className="p-3 flex gap-3">
                <span className={symbolClass(item.status)}>{statusSymbol(item.status)}</span>
                <div className="flex-1 space-y-1">
                  <div className="font-medium flex items-center gap-2">
                    {item.label}
                    {item.actionHref && item.status !== 'ok' && (
                      <a href={item.actionHref} className="text-blue-600 underline">Go</a>
                    )}
                  </div>
                  {item.detail && <p className="text-gray-600 dark:text-gray-400 leading-snug">{item.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

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
    action: 'text-blue-600 animate-pulse',
    optional: 'text-gray-400'
  }[status] || 'text-gray-400';
}
