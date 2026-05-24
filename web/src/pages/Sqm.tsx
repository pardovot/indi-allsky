import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface SqmStat { min: number; max: number; avg: number; last: number; }

interface LoopResp {
  message: string;
  image_list: { url: string; width: number; height: number; timestamp: number }[];
  jsqm_data: SqmStat;
  stars_data: SqmStat;
  camera_sqm_mag_data: SqmStat;
  camera_sqm_adu_data: SqmStat;
  device_sqm_mag_data: SqmStat;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Sqm() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Sky Quality (SQM)</h1>
          {cameraId !== null && <SqmContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function SqmContent({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['sqm-loop', cameraId],
    queryFn: () => api<LoopResp>(`/loop?camera_id=${cameraId}&limit_s=1800`),
    refetchInterval: 60_000,
  });

  const latest = q.data?.image_list?.[0];
  const url = latest ? resolveUrl(latest.url) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <StatCard title="jSQM"             stat={q.data?.jsqm_data} unit="mag/arcsec²" />
        <StatCard title="Camera SQM (mag)" stat={q.data?.camera_sqm_mag_data} unit="mag/arcsec²" />
        <StatCard title="Camera SQM (ADU)" stat={q.data?.camera_sqm_adu_data} unit="ADU" />
        <StatCard title="Device SQM"       stat={q.data?.device_sqm_mag_data} unit="mag/arcsec²" />
        <StatCard title="Stars"            stat={q.data?.stars_data} unit="" />
      </div>

      <div className="flex justify-center">
        {url ? (
          <img
            src={url}
            alt="Latest"
            className="max-w-full max-h-[60vh] w-auto h-auto object-contain rounded-md ring-1 ring-edge"
          />
        ) : (
          <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30 text-ink-dim text-sm">
            {q.isLoading ? 'Loading…' : 'No recent image'}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, stat, unit }: { title: string; stat?: SqmStat; unit: string }) {
  const fmt = (v: number | undefined) =>
    v == null ? '—' : Number(v).toFixed(2);
  return (
    <div className="bg-bg-1 border border-edge rounded-lg p-3">
      <div className="text-xs uppercase tracking-wider text-ink-dim mb-1">{title}</div>
      <div className="text-2xl font-mono text-ink-bright">{fmt(stat?.last)}</div>
      <div className="text-[10px] text-ink-dim mb-2">{unit}</div>
      <div className="grid grid-cols-3 gap-1 text-[10px] text-ink-dim">
        <div><span className="block text-ink">min</span>{fmt(stat?.min)}</div>
        <div><span className="block text-ink">avg</span>{fmt(stat?.avg)}</div>
        <div><span className="block text-ink">max</span>{fmt(stat?.max)}</div>
      </div>
    </div>
  );
}
