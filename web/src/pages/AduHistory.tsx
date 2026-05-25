import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface AduRow {
  dt: string;
  i_count: number;
  exposure_avg: number | null;
  adu_avg: number | null;
  jsqm_avg: number | null;
  stars_avg: number | null;
}

interface AduResp { rows: AduRow[] }

export default function AduHistory() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">ADU History</h1>
          <p className="text-ink-dim text-xs">Image stats in 15 minute blocks (night hours).</p>
          {cameraId !== null && <AduContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function fmt(v: number | null, p: number): string {
  return v == null ? '—' : v.toFixed(p);
}

function AduContent({ cameraId }: { cameraId: number }) {
  const [search, setSearch] = useState('');

  const q = useQuery({
    queryKey: ['adu', cameraId],
    queryFn: () => api<AduResp>(`/adu?camera_id=${cameraId}`),
  });

  const rows = q.data?.rows ?? [];

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => r.dt.toLowerCase().includes(s));
  }, [rows, search]);

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!rows.length) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-ink-dim">Rows: <span className="text-ink-bright font-mono">{rows.length}</span></span>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Filter date…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-48"
        />
      </div>

      <div className="bg-bg-1 border border-edge rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-1.5">Date</th>
              <th className="text-right px-3 py-1.5">Count</th>
              <th className="text-right px-3 py-1.5">Exposure Avg</th>
              <th className="text-right px-3 py-1.5">ADU Avg</th>
              <th className="text-right px-3 py-1.5">jSQM Avg</th>
              <th className="text-right px-3 py-1.5">Stars Avg</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-3 py-4 text-center text-ink-dim">No matching rows</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={`${r.dt}-${i}`} className="border-t border-edge hover:bg-bg-2 transition-colors">
                <td className="px-3 py-1 font-mono text-ink">{r.dt}</td>
                <td className="px-3 py-1 text-right font-mono text-ink-dim">{r.i_count}</td>
                <td className="px-3 py-1 text-right font-mono text-ink">{fmt(r.exposure_avg, 4)}</td>
                <td className="px-3 py-1 text-right font-mono text-ink">{fmt(r.adu_avg, 2)}</td>
                <td className="px-3 py-1 text-right font-mono text-ink">{fmt(r.jsqm_avg, 2)}</td>
                <td className="px-3 py-1 text-right font-mono text-ink">{fmt(r.stars_avg, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
