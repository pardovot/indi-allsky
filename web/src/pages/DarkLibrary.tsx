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

type SortDir = 'asc' | 'desc' | null;

type ColKey =
  | 'id' | 'createDate' | 'active' | 'resolution' | 'bitdepth' | 'gain'
  | 'exposure' | 'binmode' | 'temp' | 'adu' | 'hot_pixels' | 'size_mb' | 'method';

interface Col {
  key: ColKey;
  label: string;
  right?: boolean;
  numeric?: boolean;
  getValue(r: DarkRow): string | number | null;
  render(r: DarkRow): React.ReactNode;
}

const COLS_BASE: Col[] = [
  { key: 'id',         label: 'ID',         numeric: true,
    getValue: (r) => r.id,
    render: (r) => <span className="font-mono text-ink-dim">{r.id}</span> },
  { key: 'createDate', label: 'Date',
    getValue: (r) => r.createDate,
    render: (r) => <span className="font-mono text-ink whitespace-nowrap">{r.createDate}</span> },
  { key: 'active',     label: 'Active',
    getValue: (r) => (r.active ? 'yes' : 'no'),
    render: (r) => (
      <span className={[
        'text-[10px] px-1.5 py-0.5 rounded',
        r.active ? 'bg-bg-3 text-info' : 'bg-bg-3 text-ink-dim',
      ].join(' ')}>{r.active ? 'Yes' : 'No'}</span>
    ) },
  { key: 'resolution', label: 'Resolution',
    getValue: (r) => `${r.width ?? ''}x${r.height ?? ''}`,
    render: (r) => <span className="font-mono text-ink-dim">{r.width}×{r.height}</span> },
  { key: 'bitdepth',   label: 'Bits',     right: true, numeric: true,
    getValue: (r) => r.bitdepth,
    render: (r) => <span className="font-mono">{r.bitdepth ?? '—'}</span> },
  { key: 'gain',       label: 'Gain',     right: true, numeric: true,
    getValue: (r) => r.gain,
    render: (r) => <span className="font-mono">{r.gain != null ? r.gain.toFixed(2) : '—'}</span> },
  { key: 'exposure',   label: 'Exp (s)',  right: true, numeric: true,
    getValue: (r) => r.exposure,
    render: (r) => <span className="font-mono">{r.exposure ?? '—'}</span> },
  { key: 'binmode',    label: 'Bin',      right: true, numeric: true,
    getValue: (r) => r.binmode,
    render: (r) => <span className="font-mono">{r.binmode ?? '—'}</span> },
  { key: 'temp',       label: 'Temp',     right: true, numeric: true,
    getValue: (r) => r.temp,
    render: (r) => <span className="font-mono">{r.temp != null ? r.temp.toFixed(2) : '—'}</span> },
  { key: 'adu',        label: 'ADU',      right: true, numeric: true,
    getValue: (r) => r.adu,
    render: (r) => <span className="font-mono">{r.adu != null ? r.adu.toFixed(1) : '—'}</span> },
  { key: 'hot_pixels', label: 'Hot px',   right: true, numeric: true,
    getValue: (r) => r.hot_pixels,
    render: (r) => <span className="font-mono">{r.hot_pixels ?? '—'}</span> },
  { key: 'size_mb',    label: 'Size (MB)',right: true, numeric: true,
    getValue: (r) => r.size_mb,
    render: (r) => <span className="font-mono">{r.size_mb != null ? r.size_mb.toFixed(1) : '—'}</span> },
];

const METHOD_COL: Col = {
  key: 'method', label: 'Method',
  getValue: (r) => r.method ?? '',
  render: (r) => <span className="text-ink-dim">{r.method || '—'}</span>,
};

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
  const q = useQuery({
    queryKey: ['darks', cameraId],
    queryFn: () => api<DarksResp>(`/darks?camera_id=${cameraId}`),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.isError) return <div className="text-danger text-sm">Failed to load darks: {String((q.error as Error)?.message ?? '')}</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <>
      <DarkTable title="Dark Frames" rows={q.data.darks} showMethod />
      <DarkTable title="Bad Pixel Maps" rows={q.data.bpm} />
    </>
  );
}

function DarkTable({ title, rows, showMethod }: { title: string; rows: DarkRow[]; showMethod?: boolean }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<ColKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const cols = useMemo(() => showMethod ? [...COLS_BASE, METHOD_COL] : COLS_BASE, [showMethod]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (s) {
        const any = cols.some((c) => String(c.getValue(r) ?? '').toLowerCase().includes(s)) ||
          (r.filename || '').toLowerCase().includes(s);
        if (!any) return false;
      }
      for (const [k, raw] of Object.entries(filters)) {
        const f = raw.trim().toLowerCase();
        if (!f) continue;
        const col = cols.find((c) => c.key === k);
        if (!col) continue;
        if (!String(col.getValue(r) ?? '').toLowerCase().includes(f)) return false;
      }
      return true;
    });
  }, [rows, cols, search, filters]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    const col = cols.find((c) => c.key === sortKey);
    if (!col) return filtered;
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.getValue(a);
      const bv = col.getValue(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filtered, sortKey, sortDir, cols]);

  function clickHeader(key: ColKey) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); return; }
    if (sortDir === 'asc')  { setSortDir('desc'); return; }
    setSortKey(null); setSortDir(null);
  }

  function reset() {
    setSearch(''); setFilters({}); setSortKey(null); setSortDir(null);
  }

  const dirty = !!sortKey || Object.values(filters).some((v) => v.trim()) || search.trim();

  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge flex items-center gap-3 flex-wrap">
        <div className="text-ink-bright text-sm font-medium">
          {title} <span className="text-ink-dim text-xs">({sorted.length}/{rows.length})</span>
        </div>
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-1 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-44"
        />
        {dirty && (
          <button onClick={reset}
            className="px-2.5 py-1 rounded-md bg-bg-1 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs">Reset</button>
        )}
        <button onClick={() => downloadCsv(title, sorted, cols)}
          className="px-2.5 py-1 rounded-md bg-bg-1 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs">Export CSV</button>
        <button onClick={() => copyTsv(sorted, cols)}
          className="px-2.5 py-1 rounded-md bg-bg-1 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs">Copy</button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              {cols.map((c) => (
                <th key={c.key}
                    onClick={() => clickHeader(c.key)}
                    className={[
                      'px-3 py-1.5 cursor-pointer select-none hover:bg-bg-3 transition-colors whitespace-nowrap',
                      c.right ? 'text-right' : 'text-left',
                    ].join(' ')}>
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <SortIndicator active={sortKey === c.key} dir={sortKey === c.key ? sortDir : null} />
                  </span>
                </th>
              ))}
              <th className="text-left px-3 py-1.5">File</th>
            </tr>
            <tr>
              {cols.map((c) => (
                <th key={`${c.key}-filter`} className="px-2 py-1 bg-bg-1 border-t border-edge">
                  <input
                    type="text"
                    value={filters[c.key] ?? ''}
                    onChange={(e) => setFilters((f) => ({ ...f, [c.key]: e.target.value }))}
                    placeholder="Filter"
                    className={[
                      'w-full bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-1.5 py-0.5 text-ink text-[11px]',
                      c.right ? 'text-right font-mono' : '',
                    ].join(' ')}
                  />
                </th>
              ))}
              <th className="px-2 py-1 bg-bg-1 border-t border-edge"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr><td colSpan={cols.length + 1} className="px-3 py-4 text-center text-ink-dim">No matching rows</td></tr>
            ) : sorted.map((r) => (
              <tr key={r.id} className="border-t border-edge hover:bg-bg-2 transition-colors">
                {cols.map((c) => (
                  <td key={c.key} className={['px-3 py-1', c.right ? 'text-right' : 'text-left'].join(' ')}>
                    {c.render(r)}
                  </td>
                ))}
                <td className="px-3 py-1">
                  {r.url
                    ? <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-info hover:text-accent transition-colors text-xs">Download</a>
                    : <span className="text-ink-dim text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortIndicator({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={['flex flex-col leading-none text-[8px]', active ? 'text-accent' : 'text-ink-dim/40'].join(' ')}>
      <span className={dir === 'asc' ? 'text-accent' : ''}>▲</span>
      <span className={dir === 'desc' ? 'text-accent' : ''}>▼</span>
    </span>
  );
}

function rowToValues(r: DarkRow, cols: Col[]): string[] {
  return cols.map((c) => {
    const v = c.getValue(r);
    return v == null ? '' : String(v);
  });
}

function downloadCsv(title: string, rows: DarkRow[], cols: Col[]) {
  const header = cols.map((c) => c.label).join(',');
  const body = rows.map((r) =>
    rowToValues(r, cols).map((v) => v.includes(',') || v.includes('"') ? '"' + v.replace(/"/g, '""') + '"' : v).join(','),
  ).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.toLowerCase().replace(/\s+/g, '-')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function copyTsv(rows: DarkRow[], cols: Col[]) {
  const header = cols.map((c) => c.label).join('\t');
  const body = rows.map((r) => rowToValues(r, cols).join('\t')).join('\n');
  navigator.clipboard.writeText(header + '\n' + body).catch(() => {});
}
