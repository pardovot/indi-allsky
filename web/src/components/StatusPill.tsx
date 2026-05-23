import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface StatusData {
  status_text: string;
}

interface StatusPillProps {
  cameraId: number | null;
  onClick?: () => void;
}

const POLL_MS = 101_000;

// Pull the first non-empty line out of the HTML status_text to use as a short pill label.
function extractShort(html: string): string {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  for (const node of Array.from(tmp.children)) {
    const txt = (node.textContent || '').trim();
    if (txt) return txt.length > 60 ? txt.slice(0, 60) + '…' : txt;
  }
  return '';
}

export default function StatusPill({ cameraId, onClick }: StatusPillProps) {
  const q = useQuery({
    queryKey: ['status', cameraId],
    queryFn: () => api<StatusData>(`/status?camera_id=${cameraId}`),
    enabled: cameraId !== null,
    refetchInterval: POLL_MS,
  });

  const label = q.data ? extractShort(q.data.status_text) : '';

  return (
    <button
      onClick={onClick}
      title="Show full status"
      className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-xs text-ink-dim hover:text-ink transition-colors max-w-[280px]"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-success" />
      <span className="truncate">{label || (q.isLoading ? 'Loading…' : 'Status')}</span>
    </button>
  );
}
