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

type SortKey = keyof AduRow;
type SortDir = 'asc' | 'desc' | null;

const COLS: { key: SortKey; label: string; right?: boolean; precision?: number }[] = [
  { key: 'dt',           label: 'Date' },
  { key: 'i_count',      label: 'Count',         right: true },
  { key: 'exposure_avg', label: 'Exposure Avg',  right: true, precision: 4 },
  { key: 'adu_avg',      label: 'ADU Avg',       right: true, precision: 2 },
  { key: 'jsqm_avg',     label: 'jSQM Avg',      right: true, precision: 2 },
  { key: 'stars_avg',    label: 'Stars Avg',     right: true, precision: 1 },
];

export default function AduHistory() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">ADU History</h1>
          <p className="text-ink-dim text-xs">Image stats in 15-minute blocks (night hours).</p>
          {cameraId !== null && <AduContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function AduContent({ cameraId }: { cameraId: number }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  // sortKey null = default order (server-given). sortDir cycles asc → desc → reset.
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const q = useQuery({
    queryKey: ['adu', cameraId],
    queryFn: () => api<AduResp>(`/adu?camera_id=${cameraId}`),
  });

  const rows = q.data?.rows ?? [];

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (s && !Object.values(r).some((v) => String(v ?? '').toLowerCase().includes(s))) return false;
      for (const [k, raw] of Object.entries(filters)) {
        const filt = raw.trim().toLowerCase();
        if (!filt) continue;
        const v = r[k as SortKey];
        if (!String(v ?? '').toLowerCase().includes(filt)) return false;
      }
      return true;
    });
  }, [rows, search, filters]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  function clickHeader(key: SortKey) {
    // cycle: not sorted → asc → desc → not sorted
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc')  { setSortDir('desc'); return; }
    if (sortDir === 'desc') { setSortKey(null); setSortDir(null); return; }
    setSortDir('asc');
  }

  function resetAll() {
    setSearch('');
    setFilters({});
    setSortKey(null);
    setSortDir(null);
  }

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!rows.length) return <div className="text-ink-dim text-sm">No data</div>;

  const dirty = !!sortKey || Object.values(filters).some((v) => v.trim()) || search.trim();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap text-xs">
        <span className="text-ink-dim">Showing <span className="text-ink-bright font-mono">{sorted.length}</span> / {rows.length}</span>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search all columns…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-56"
        />
        {dirty && (
          <button
            onClick={resetAll}
            className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs"
          >Reset</button>
        )}
        <button
          onClick={() => downloadCsv(sorted)}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs"
        >Export CSV</button>
        <button
          onClick={() => copyTsv(sorted)}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs"
        >Copy</button>
      </div>

      <div className="bg-bg-1 border border-edge rounded-lg overflow-x-auto">
        <table className="w-full text-base">
          <thead className="bg-bg-2 text-ink-dim text-xs uppercase tracking-wider">
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  onClick={() => clickHeader(c.key)}
                  className={[
                    'px-4 py-2.5 cursor-pointer select-none hover:bg-bg-3 transition-colors whitespace-nowrap',
                    c.right ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <SortIndicator active={sortKey === c.key} dir={sortKey === c.key ? sortDir : null} />
                  </span>
                </th>
              ))}
            </tr>
            <tr>
              {COLS.map((c) => (
                <th key={`${c.key}-filter`} className="px-3 py-1.5 bg-bg-1 border-t border-edge">
                  <input
                    type="text"
                    value={filters[c.key] ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                    placeholder="Filter…"
                    className={[
                      'w-full bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs',
                      c.right ? 'text-right font-mono' : '',
                    ].join(' ')}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={COLS.length} className="px-4 py-6 text-center text-ink-dim">No matching rows</td></tr>
            ) : sorted.map((r, i) => (
              <tr key={`${r.dt}-${i}`} className="border-t border-edge hover:bg-bg-2 transition-colors">
                <td className="px-4 py-2 font-mono text-ink text-sm">{r.dt}</td>
                <td className="px-4 py-2 text-right font-mono text-ink-dim">{r.i_count}</td>
                <td className="px-4 py-2 text-right font-mono text-ink">{fmt(r.exposure_avg, 4)}</td>
                <td className="px-4 py-2 text-right font-mono text-ink">{fmt(r.adu_avg, 2)}</td>
                <td className="px-4 py-2 text-right font-mono text-ink">{fmt(r.jsqm_avg, 2)}</td>
                <td className="px-4 py-2 text-right font-mono text-ink">{fmt(r.stars_avg, 1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(v: number | null, p: number): string {
  return v == null ? '—' : v.toFixed(p);
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={['flex flex-col leading-none text-[8px]', active ? 'text-accent' : 'text-ink-dim/40'].join(' ')}>
      <span className={dir === 'asc' ? 'text-accent' : ''}>▲</span>
      <span className={dir === 'desc' ? 'text-accent' : ''}>▼</span>
    </span>
  );
}

function downloadCsv(rows: AduRow[]) {
  const header = COLS.map((c) => c.label).join(',');
  const body = rows.map((r) =>
    COLS.map((c) => {
      const v = r[c.key];
      if (v == null) return '';
      if (typeof v === 'string') return '"' + v.replace(/"/g, '""') + '"';
      return String(v);
    }).join(','),
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'adu.csv'; a.click();
  URL.revokeObjectURL(url);
}

function copyTsv(rows: AduRow[]) {
  const header = COLS.map((c) => c.label).join('\t');
  const body = rows.map((r) => COLS.map((c) => String(r[c.key] ?? '')).join('\t')).join('\n');
  navigator.clipboard.writeText(header + '\n' + body).catch(() => {});
}
