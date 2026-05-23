import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

interface User {
  id: number;
  username: string;
  name: string | null;
  email: string;
  admin: boolean;
  staff: boolean;
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const nav = useNavigate();

  const q = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('/auth/me'),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    auth.clear();
    nav('/login', { replace: true });
  }

  const label = q.data?.name || q.data?.username || '…';
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-bg-2 transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        <span className="w-7 h-7 rounded-full bg-bg-3 text-ink-bright text-xs font-medium flex items-center justify-center">
          {initial}
        </span>
        <span className="hidden sm:inline text-sm text-ink-dim">{label}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-1 border border-edge rounded-md shadow-2xl z-50 overflow-hidden">
          {q.data && (
            <div className="px-3 py-2 border-b border-edge">
              <div className="text-sm text-ink-bright">{q.data.name || q.data.username}</div>
              <div className="text-xs text-ink-dim">{q.data.email}</div>
              <div className="mt-1 flex gap-1">
                {q.data.admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent">admin</span>}
                {q.data.staff && !q.data.admin && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-3 text-ink-dim">staff</span>}
              </div>
            </div>
          )}
          <a
            href="/indi-allsky/user"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 text-sm text-ink hover:bg-bg-3 transition-colors"
          >
            <span>Account</span>
            <span className="text-ink-dim text-xs">↗</span>
          </a>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-bg-3 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
