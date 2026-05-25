import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface DarkRow {
  id: number;
  camera_name: string;
  createDate: string;
  active: boolean;
  bitdepth: number | null;
  gain: number | null;
  exposure: number | null;
  binmode: number | null;
  width: number | null;
  height: number | null;
  temp: number | null;
  adu: number | null;
  filename: string | null;
  url: string | null;
  hot_pixels: number | null;
  method?: string;
  size_mb: number | null;
}

interface DarksResp { darks: DarkRow[]; bpm: DarkRow[] }

export default function DarkLibrary() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Dark Library</h1>
          {cameraId !== null && <DarksContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function DarksContent({ cameraId }: { cameraId: number }) {
  const [search, setSearch] = useState('');
  const q = useQuery({
    queryKey: ['darks', cameraId],
    queryFn: () => api<DarksResp>(`/darks?camera_id=${cameraId}`),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <>
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-ink-dim">Darks: <span className="text-ink-bright font-mono">{q.data.darks.length}</span></span>
        <span className="text-ink-dim">BPMs: <span className="text-ink-bright font-mono">{q.data.bpm.length}</span></span>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Filter…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-48"
        />
      </div>
      <DarkTable title="Dark Frames" rows={q.data.darks} search={search} showMethod />
      <DarkTable title="Bad Pixel Maps" rows={q.data.bpm} search={search} />
    </>
  );
}

function DarkTable({ title, rows, search, showMethod }: { title: string; rows: DarkRow[]; search: string; showMethod?: boolean }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      r.createDate.toLowerCase().includes(s) ||
      (r.filename || '').toLowerCase().includes(s) ||
      String(r.id) === s
    );
  }, [rows, search]);

  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
        {title} <span className="text-ink-dim text-xs">({filtered.length}/{rows.length})</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-1.5">ID</th>
              <th className="text-left px-3 py-1.5">Date</th>
              <th className="text-left px-3 py-1.5">Active</th>
              <th className="text-left px-3 py-1.5">Resolution</th>
              <th className="text-right px-3 py-1.5">Bits</th>
              <th className="text-right px-3 py-1.5">Gain</th>
              <th className="text-right px-3 py-1.5">Exp (s)</th>
              <th className="text-right px-3 py-1.5">Bin</th>
              <th className="text-right px-3 py-1.5">Temp</th>
              <th className="text-right px-3 py-1.5">ADU</th>
              <th className="text-right px-3 py-1.5">Hot px</th>
              <th className="text-right px-3 py-1.5">Size (MB)</th>
              {showMethod && <th className="text-left px-3 py-1.5">Method</th>}
              <th className="text-left px-3 py-1.5">File</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={showMethod ? 14 : 13} className="px-3 py-4 text-center text-ink-dim">No matching rows</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t border-edge hover:bg-bg-2 transition-colors">
                <td className="px-3 py-1 font-mono text-ink-dim">{r.id}</td>
                <td className="px-3 py-1 font-mono text-ink whitespace-nowrap">{r.createDate}</td>
                <td className="px-3 py-1">
                  <span className={[
                    'text-[10px] px-1.5 py-0.5 rounded',
                    r.active ? 'bg-bg-3 text-info' : 'bg-bg-3 text-ink-dim',
                  ].join(' ')}>{r.active ? 'Yes' : 'No'}</span>
                </td>
                <td className="px-3 py-1 font-mono text-ink-dim">{r.width}×{r.height}</td>
                <td className="px-3 py-1 text-right font-mono">{r.bitdepth ?? '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.gain != null ? r.gain.toFixed(2) : '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.exposure ?? '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.binmode ?? '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.temp != null ? r.temp.toFixed(2) : '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.adu != null ? r.adu.toFixed(1) : '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.hot_pixels ?? '—'}</td>
                <td className="px-3 py-1 text-right font-mono">{r.size_mb != null ? r.size_mb.toFixed(1) : '—'}</td>
                {showMethod && <td className="px-3 py-1 text-ink-dim">{r.method || '—'}</td>}
                <td className="px-3 py-1">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer"
                       className="text-info hover:text-accent transition-colors text-xs">
                      Download
                    </a>
                  ) : <span className="text-ink-dim text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
