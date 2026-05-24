import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface KeogramResp {
  url: string;
  refresh_ms: number;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function RealtimeKeogram() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight self-start max-w-7xl w-full">
            Realtime Keogram
          </h1>
          {cameraId !== null && <KeogramView cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function KeogramView({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['realtime-keogram', cameraId],
    queryFn: () => api<KeogramResp>(`/realtime-keogram?camera_id=${cameraId}`),
  });

  const refresh = q.data?.refresh_ms ?? 15_000;
  // Cache-bust by appending current timestamp every refresh window
  const tickQ = useQuery({
    queryKey: ['rt-keogram-tick', cameraId],
    queryFn: () => Date.now(),
    refetchInterval: refresh,
    enabled: !!q.data?.url,
  });

  const url = q.data?.url ? `${resolveUrl(q.data.url)}?t=${tickQ.data ?? Date.now()}` : null;

  return (
    <div className="w-full max-w-7xl flex flex-col items-center gap-2">
      {url ? (
        <img
          src={url}
          alt="Realtime keogram"
          className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-md ring-1 ring-edge"
        />
      ) : (
        <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30 text-ink-dim text-sm">
          {q.isLoading ? 'Loading…' : 'No keogram yet'}
        </div>
      )}
      <div className="text-[11px] text-ink-dim font-mono">
        Refreshes every {Math.round(refresh / 1000)}s
      </div>
    </div>
  );
}
