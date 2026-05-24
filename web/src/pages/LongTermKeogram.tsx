import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface KeogramResp {
  url: string | null;
  age: string | null;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function LongTermKeogram() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight self-start max-w-7xl w-full">
            Long Term Keogram
          </h1>
          {cameraId !== null && <LongView cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function LongView({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['longterm-keogram', cameraId],
    queryFn: () => api<KeogramResp>(`/longterm-keogram?camera_id=${cameraId}`),
  });

  return (
    <div className="w-full max-w-7xl flex flex-col items-center gap-2">
      {q.data?.age && (
        <div className="text-xs text-ink-dim">{q.data.age}</div>
      )}
      {q.data?.url ? (
        <img
          src={resolveUrl(q.data.url)}
          alt="Long term keogram"
          className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-md ring-1 ring-edge"
        />
      ) : (
        <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30 text-center px-4">
          <div className="space-y-1">
            <div className="text-ink-dim text-sm">
              {q.isLoading ? 'Loading…' : 'No long-term keogram generated yet'}
            </div>
            <div className="text-ink-dim/70 text-xs max-w-md">
              Use the legacy generator at{' '}
              <a
                href="/indi-allsky/longtermkeogram"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                /indi-allsky/longtermkeogram ↗
              </a>{' '}
              to create one.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
