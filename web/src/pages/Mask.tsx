import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface MaskResp {
  url: string;
  date: string;
  exists: boolean;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Mask() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Mask Base</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const q = useQuery({
    queryKey: ['mask'],
    queryFn: () => api<MaskResp>('/mask'),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error || !q.data) return <div className="text-danger text-sm">Failed to load</div>;

  if (!q.data.exists) {
    return (
      <div className="text-ink-dim text-sm">
        No mask base image has been generated yet (<code className="font-mono">mask_base.png</code>).
      </div>
    );
  }

  const src = `${resolveUrl(q.data.url)}?t=${encodeURIComponent(q.data.date)}`;

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-[11px] text-ink-dim">
        This image is the original camera output. It is not rotated, flipped, or cropped.
      </p>
      <img
        src={src}
        alt="Mask base"
        className="max-w-full max-h-[80vh] w-auto h-auto object-contain border border-edge rounded"
      />
      <div className="text-[11px] text-ink-dim">Generated: {q.data.date || '—'}</div>
      <a
        href={src}
        download="mask_base.png"
        rel="noopener noreferrer"
        className="text-xs px-2.5 py-1 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info"
      >Download mask base</a>
    </div>
  );
}
