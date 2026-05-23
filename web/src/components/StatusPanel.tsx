import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface StatusData {
  status_text: string;
}

interface StatusPanelProps {
  cameraId: number | null;
  open: boolean;
  onClose: () => void;
}

export default function StatusPanel({ cameraId, open, onClose }: StatusPanelProps) {
  const q = useQuery({
    queryKey: ['status', cameraId],
    queryFn: () => api<StatusData>(`/status?camera_id=${cameraId}`),
    enabled: cameraId !== null,
    refetchInterval: 101_000,
  });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 right-0 z-40 w-full sm:w-96 bg-bg-1 border-l border-edge overflow-y-auto',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Status"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-edge sticky top-0 bg-bg-1">
          <h2 className="text-ink-bright font-semibold tracking-tight">Status</h2>
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-ink-bright p-1 rounded-md hover:bg-bg-2"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        <div className="p-4">
          {q.isLoading && <div className="text-ink-dim text-sm">Loading…</div>}
          {q.data?.status_text ? (
            <div
              className="status-html text-sm text-ink space-y-1 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: q.data.status_text }}
            />
          ) : !q.isLoading ? (
            <div className="text-ink-dim text-sm">No status available</div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
