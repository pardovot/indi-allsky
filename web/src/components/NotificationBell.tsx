import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Notification {
  id: number;
  createDate?: string;
  category?: string;
  notification?: string;
}

interface NotificationBellProps {
  cameraId: number | null;
}

const POLL_MS = 60_000;

export default function NotificationBell({ cameraId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['notification', cameraId],
    queryFn: () => api<Notification>(`/notifications?camera_id=${cameraId}`),
    enabled: cameraId !== null,
    refetchInterval: POLL_MS,
  });

  const ackMut = useMutation({
    mutationFn: (ack_id: number) =>
      api<Notification>(`/notifications/ack`, {
        method: 'POST',
        body: JSON.stringify({ camera_id: cameraId, ack_id }),
      }),
    onSuccess: (next) => {
      qc.setQueryData(['notification', cameraId], next);
    },
  });

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const active = q.data && q.data.id !== 0 ? q.data : null;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-ink-dim hover:text-ink-bright p-2 rounded-md hover:bg-bg-2 transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <BellIcon />
        {active && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger ring-2 ring-bg-1" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-bg-1 border border-edge rounded-md shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-edge text-xs uppercase tracking-wider text-ink-dim">
            Notifications
          </div>
          {active ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs px-2 py-0.5 rounded bg-bg-3 text-ink-bright">
                  {active.category}
                </span>
                <span className="text-[11px] text-ink-dim">{active.createDate}</span>
              </div>
              <div className="text-sm text-ink whitespace-pre-wrap break-words">
                {active.notification}
              </div>
              <button
                disabled={ackMut.isPending}
                onClick={() => ackMut.mutate(active.id)}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-bg-0 text-sm font-medium rounded-md py-1.5 transition-colors"
              >
                {ackMut.isPending ? 'Acknowledging…' : 'Acknowledge'}
              </button>
            </div>
          ) : (
            <div className="p-4 text-sm text-ink-dim text-center">No notifications</div>
          )}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
