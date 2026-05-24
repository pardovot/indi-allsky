import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface SensorResp {
  last_update: string | null;
  last_update_age_s: number | null;
  sensor_user: number[];
  sensor_temp: number[];
}

export default function SensorPanel() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Sensor Panel</h1>
          {cameraId !== null && <SensorTables cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function SensorTables({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['sensor-panel', cameraId],
    queryFn: () => api<SensorResp>(`/sensor-panel?camera_id=${cameraId}`),
    refetchInterval: 30_000,
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-3">
      <div className="text-xs text-ink-dim">
        {q.data.last_update
          ? <>Last update: {q.data.last_update} ({q.data.last_update_age_s}s ago)</>
          : 'No recent image'}
      </div>

      <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
        <SensorGrid title="User Sensors (sensor_user)" values={q.data.sensor_user} />
        <SensorGrid title="Temperature Sensors (sensor_temp)" values={q.data.sensor_temp} />
      </div>
    </div>
  );
}

function SensorGrid({ title, values }: { title: string; values: number[] }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 text-ink-bright text-sm font-medium border-b border-edge bg-bg-2">
        {title}
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-px bg-edge">
        {values.map((v, i) => (
          <div key={i} className="bg-bg-1 p-2 text-center">
            <div className="text-[10px] text-ink-dim uppercase tracking-wider">{i}</div>
            <div
              className={[
                'font-mono text-sm',
                v === 0 ? 'text-ink-dim/50' : 'text-ink-bright',
              ].join(' ')}
            >
              {typeof v === 'number' ? v.toFixed(2) : v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
