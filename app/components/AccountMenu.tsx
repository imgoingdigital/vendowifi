"use client";
import { useState, useEffect, useRef } from 'react';
import { stackClientApp } from '../../stack/client';

export default function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onClick); window.removeEventListener('keydown', onKey); };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('logout failed');
      // Hard redirect to root to ensure server sees cleared cookies.
      window.location.assign('/');
    } catch (e) {
      // Fallback to built-in sign out page if manual cookie clear failed.
      window.location.href = '/stack-auth/sign-out?redirect=/';
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={()=> setOpen(o=>!o)} className="px-3 py-1 rounded border bg-white dark:bg-neutral-800 dark:border-neutral-700 flex items-center gap-2">
        <span className="font-medium max-w-[160px] truncate">{email}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="opacity-60"><path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 rounded-md border bg-white dark:bg-neutral-800 shadow-md text-xs py-1 z-50 animate-fade-in">
          <a href="/admin/plans" className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700">Admin Dashboard</a>
          <a href="/stack-auth/account" className="block px-3 py-2 hover:bg-gray-50 dark:hover:bg-neutral-700">Account Settings</a>
          <div className="border-t my-1" />
          <button onClick={handleSignOut} disabled={signingOut} className="w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-neutral-700 disabled:opacity-50">
            {signingOut ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      )}
    </div>
  );
}
