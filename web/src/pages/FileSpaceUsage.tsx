import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend, ChartOptions,
} from 'chart.js';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface CategoryEntry { count: number; fileSize: number }
interface TodBucket {
  [category: string]: CategoryEntry | number; // categories OR tod_count/tod_fileSize meta
}
interface SpaceResp {
  days: Record<string, Record<string, TodBucket>>;
}

const CATEGORY_ORDER = [
  'Images',
  'Panoramas',
  'Timelapses',
  'Panorama Timelapses',
  'Star Trail Timelapses',
  'FITS',
  'Raw Images',
  'Thumbnails',
];

const CATEGORY_COLORS: Record<string, string> = {
  'Images':                '#fb923c',
  'Panoramas':             '#facc15',
  'Timelapses':            '#60a5fa',
  'Panorama Timelapses':   '#22d3ee',
  'Star Trail Timelapses': '#a78bfa',
  'Star Trails':           '#c4b5fd',
  'Keograms':              '#f472b6',
  'FITS':                  '#f43f5e',
  'Raw Images':            '#4ade80',
  'Thumbnails':            '#94a3b8',
};

const META_KEYS = new Set(['tod_count', 'tod_fileSize']);

function humanBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(Math.abs(bytes)) / 3));
  return `${(bytes / Math.pow(1000, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

const baseOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    legend: { labels: { color: '#888890', font: { size: 11 } }, position: 'bottom' },
    tooltip: {
      callbacks: {
        label(c) {
          const v = c.parsed.y as number;
          return `${c.dataset.label}: ${humanBytes(v)}`;
        },
        footer(items) {
          const total = items.reduce((s, it) => s + (it.parsed.y as number), 0);
          return `Total: ${humanBytes(total)}`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: true,
      ticks: { color: '#888890', maxRotation: 0, autoSkip: true, maxTicksLimit: 14 },
      grid: { display: false },
    },
    y: {
      stacked: true,
      ticks: { color: '#888890', callback: (v) => humanBytes(Number(v)) },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  },
};

interface Row {
  date: string;
  tod: string;
  cats: Record<string, CategoryEntry>;
  totalSize: number;
  totalCount: number;
}

export default function FileSpaceUsage() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">File Space Usage</h1>
          {cameraId !== null && <FileSpaceContent />}
        </main>
      )}
    </PageShell>
  );
}

function FileSpaceContent() {
  const [search, setSearch] = useState('');
  const [showChart, setShowChart] = useState(true);

  const q = useQuery({
    queryKey: ['file-space'],
    queryFn: () => api<SpaceResp>('/file-space-usage'),
  });

  const built = useMemo(() => {
    const days = q.data?.days ?? {};

    // Per-date+ToD row + global stats
    const rows: Row[] = [];
    const catTotals: Record<string, number> = {};
    let totalSize = 0;
    let totalCount = 0;

    const dates = Object.keys(days).sort().reverse(); // newest first

    for (const date of dates) {
      const todBuckets = days[date];
      // Order: Night first, then Day (matching original screenshot)
      const todsSorted = Object.keys(todBuckets).sort((a, b) => {
        if (a === b) return 0;
        if (a === 'Night') return -1;
        if (b === 'Night') return 1;
        return a.localeCompare(b);
      });
      for (const tod of todsSorted) {
        const buckets = todBuckets[tod];
        const cats: Record<string, CategoryEntry> = {};
        let rowSize = 0;
        let rowCount = 0;
        for (const [cat, val] of Object.entries(buckets)) {
          if (META_KEYS.has(cat)) continue;
          if (typeof val !== 'object' || val == null) continue;
          cats[cat] = val;
          rowSize += val.fileSize || 0;
          rowCount += val.count || 0;
          catTotals[cat] = (catTotals[cat] || 0) + (val.fileSize || 0);
        }
        totalSize += rowSize;
        totalCount += rowCount;
        rows.push({ date, tod, cats, totalSize: rowSize, totalCount: rowCount });
      }
    }

    // Columns: known order first, then any extras (Star Trails, Keograms, etc.) sorted by total size desc
    const knownSet = new Set(CATEGORY_ORDER);
    const extras = Object.keys(catTotals)
      .filter((c) => !knownSet.has(c))
      .sort((a, b) => catTotals[b] - catTotals[a]);
    const columns = [...CATEGORY_ORDER, ...extras].filter(
      (c) => catTotals[c] !== undefined,
    );

    // Build chart datasets aggregating Day + Night per date
    const chartDates = Array.from(new Set(rows.map((r) => r.date))).sort();
    const chartMatrix: Record<string, Record<string, number>> = {};
    for (const r of rows) {
      chartMatrix[r.date] = chartMatrix[r.date] || {};
      for (const c of Object.keys(r.cats)) {
        chartMatrix[r.date][c] = (chartMatrix[r.date][c] || 0) + (r.cats[c].fileSize || 0);
      }
    }
    const chartCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
    const datasets = chartCats.map((cat) => ({
      label: cat,
      backgroundColor: CATEGORY_COLORS[cat] || '#888890',
      borderColor: CATEGORY_COLORS[cat] || '#888890',
      data: chartDates.map((d) => chartMatrix[d]?.[cat] || 0),
    }));

    return { rows, columns, catTotals, totalSize, totalCount, chartDates, datasets };
  }, [q.data]);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return built.rows;
    const s = search.toLowerCase();
    return built.rows.filter(
      (r) => r.date.toLowerCase().includes(s) || r.tod.toLowerCase().includes(s),
    );
  }, [built.rows, search]);

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!built.rows.length) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 flex-wrap text-sm">
        <Stat label="Total"      value={humanBytes(built.totalSize)} />
        <Stat label="Files"      value={built.totalCount.toLocaleString()} />
        <Stat label="Days"       value={String(built.chartDates.length)} />
        <Stat label="Rows"       value={String(built.rows.length)} />
        <div className="flex-1" />
        <input
          type="text"
          placeholder="Filter date / ToD…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs w-48"
        />
        <button
          onClick={() => setShowChart((v) => !v)}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-xs text-ink-dim hover:text-ink transition-colors"
        >
          {showChart ? 'Hide chart' : 'Show chart'}
        </button>
      </div>

      {/* MAIN per-row table */}
      <div className="bg-bg-1 border border-edge rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <Th>Date</Th>
              <Th>ToD</Th>
              {built.columns.map((c) => <Th key={c} right>{c}</Th>)}
              <Th right>Total</Th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={built.columns.length + 3} className="px-3 py-4 text-center text-ink-dim">
                  No matching rows
                </td>
              </tr>
            ) : filteredRows.map((r) => (
              <tr key={`${r.date}-${r.tod}`} className="border-t border-edge hover:bg-bg-2 transition-colors">
                <Td><span className="font-mono">{r.date}</span></Td>
                <Td>
                  <span
                    className={[
                      'text-[10px] px-1.5 py-0.5 rounded',
                      r.tod === 'Night' ? 'bg-bg-3 text-info' : 'bg-bg-3 text-warn',
                    ].join(' ')}
                  >
                    {r.tod}
                  </span>
                </Td>
                {built.columns.map((c) => {
                  const cell = r.cats[c];
                  return (
                    <Td key={c} right>
                      <CategoryCell entry={cell} />
                    </Td>
                  );
                })}
                <Td right>
                  <span className="font-mono text-ink-bright">{humanBytes(r.totalSize)}</span>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-[11px] text-ink-dim">
        Reported space is the sum of individual file sizes; actual disk usage may differ slightly due to filesystem block sizes.
      </div>

      {showChart && (
        <div className="bg-bg-1 border border-edge rounded-lg p-3">
          <div className="text-ink-bright text-sm font-medium mb-2">By day (stacked)</div>
          <div className="h-72">
            <Bar
              options={baseOptions}
              data={{ labels: built.chartDates, datasets: built.datasets }}
            />
          </div>
        </div>
      )}

      <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
          Totals by category
        </div>
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(built.catTotals)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, size]) => {
                const pct = built.totalSize ? (size / built.totalSize) * 100 : 0;
                return (
                  <tr key={cat} className="border-t border-edge first:border-t-0">
                    <Td>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm inline-block"
                          style={{ backgroundColor: CATEGORY_COLORS[cat] || '#888890' }}
                        />
                        {cat}
                      </span>
                    </Td>
                    <Td right><span className="font-mono">{humanBytes(size)}</span></Td>
                    <Td right>
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-1.5 bg-bg-3 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: CATEGORY_COLORS[cat] || '#888890',
                            }}
                          />
                        </div>
                        <span className="text-ink-dim w-12 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </Td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CategoryCell({ entry }: { entry: CategoryEntry | undefined }) {
  if (!entry || (entry.fileSize === 0 && entry.count === 0)) {
    return <span className="text-ink-dim/50 font-mono">—</span>;
  }
  return (
    <span className="font-mono">
      <span className="text-ink">{humanBytes(entry.fileSize)}</span>
      <span className="text-ink-dim ml-1">[{entry.count}]</span>
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-ink-dim">{label}: </span>
      <span className="text-ink-bright font-mono">{value}</span>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={['px-3 py-1.5 whitespace-nowrap', right ? 'text-right' : 'text-left'].join(' ')}>
      {children}
    </th>
  );
}

function Td({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <td className={['px-3 py-1.5 whitespace-nowrap', right ? 'text-right' : 'text-left'].join(' ')}>
      {children}
    </td>
  );
}
