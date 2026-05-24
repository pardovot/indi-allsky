import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface SensorRow {
  slot: string;
  index: number;
  label: string;
  value: number | string;
}

interface SensorResp {
  last_update: string | null;
  last_update_age_s: number | null;
  user_rows: SensorRow[];
  temp_rows: SensorRow[];
  show_all: boolean;
}

export default function SensorPanel() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Sensor Panel</h1>
          {cameraId !== null && <SensorContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function isZero(v: number | string): boolean {
  if (typeof v === 'number') return v === 0;
  if (v === '' || v == null) return true;
  return false;
}

function SensorContent({ cameraId }: { cameraId: number }) {
  const [showAll, setShowAll] = useState(false);
  const [hideZeros, setHideZeros] = useState(true);

  const q = useQuery({
    queryKey: ['sensor-panel', cameraId, showAll],
    queryFn: () =>
      api<SensorResp>(`/sensor-panel?camera_id=${cameraId}${showAll ? '&all=1' : ''}`),
    refetchInterval: 5_000,
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  const userRows = hideZeros ? q.data.user_rows.filter((r) => !isZero(r.value)) : q.data.user_rows;
  const tempRows = hideZeros ? q.data.temp_rows.filter((r) => !isZero(r.value)) : q.data.temp_rows;

  const hiddenCount =
    (q.data.user_rows.length + q.data.temp_rows.length) -
    (userRows.length + tempRows.length);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3 text-xs">
        <div className="text-ink-dim">
          {q.data.last_update
            ? <>Last update: <span className="font-mono text-ink">{q.data.last_update}</span>
                <span className="ml-2 text-ink-dim">({q.data.last_update_age_s ?? '–'}s ago)</span>
              </>
            : <span className="text-warn">No recent image metadata available</span>}
        </div>
        <div className="flex items-center gap-2">
          {hideZeros && hiddenCount > 0 && (
            <span className="text-ink-dim/70">{hiddenCount} hidden</span>
          )}
          <button
            onClick={() => setHideZeros((v) => !v)}
            className={[
              'px-2.5 py-1 rounded-md border transition-colors',
              hideZeros
                ? 'bg-accent/20 border-accent/40 text-accent hover:bg-accent/30'
                : 'bg-bg-2 border-edge text-ink-dim hover:text-ink hover:bg-bg-3',
            ].join(' ')}
          >
            {hideZeros ? 'Hide zeros: on' : 'Hide zeros: off'}
          </button>
          <button
            onClick={() => setShowAll((v) => !v)}
            className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink transition-colors"
          >
            {showAll ? 'Show used only' : 'Show all slots'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-1 xl:grid-cols-2">
        <SensorTable title="User Sensor Slots" rows={userRows} />
        <SensorTable title="Temperature Sensors" rows={tempRows} />
      </div>
    </div>
  );
}

function formatValue(v: number | string): string {
  if (typeof v === 'number') return v.toFixed(6);
  if (v === '' || v == null) return '—';
  return String(v);
}

function SensorTable({ title, rows }: { title: string; rows: SensorRow[] }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
        {title}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-1.5 w-32">Slot</th>
            <th className="text-left px-3 py-1.5">Label</th>
            <th className="text-right px-3 py-1.5 w-40">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={3} className="px-3 py-4 text-center text-ink-dim">No active sensors</td></tr>
          )}
          {rows.map((r) => (
            <tr key={r.slot} className="border-t border-edge hover:bg-bg-2 transition-colors">
              <td className="px-3 py-1 font-mono text-ink-dim text-xs">{r.slot}</td>
              <td className="px-3 py-1 text-ink">{r.label}</td>
              <td className="px-3 py-1 text-right font-mono text-warn">
                {formatValue(r.value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
