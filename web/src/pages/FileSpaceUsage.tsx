import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend, ChartOptions,
} from 'chart.js';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface DayBucket {
  [category: string]: {
    size: number;
    count: number;
  };
}

interface SpaceResp {
  days: Record<string, DayBucket>;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Images':              '#fb923c',
  'Panoramas':           '#facc15',
  'Timelapses':          '#60a5fa',
  'Panorama Timelapses': '#22d3ee',
  'Star Trail Timelapses': '#a78bfa',
  'FITS':                '#f43f5e',
  'Raw Images':          '#4ade80',
};

function humanBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log10(bytes) / 3));
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
      },
    },
  },
  scales: {
    x: { stacked: true, ticks: { color: '#888890', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }, grid: { display: false } },
    y: {
      stacked: true,
      ticks: { color: '#888890', callback: (v) => humanBytes(Number(v)) },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  },
};

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
  const q = useQuery({
    queryKey: ['file-space'],
    queryFn: () => api<SpaceResp>('/file-space-usage'),
  });

  const { dates, categories, datasets, totalSize, totalCount } = useMemo(() => {
    const days = q.data?.days ?? {};
    const sortedDates = Object.keys(days).sort();
    const catSet = new Set<string>();
    for (const d of sortedDates) for (const cat of Object.keys(days[d])) catSet.add(cat);
    const cats = Array.from(catSet);

    const ds = cats.map((cat) => ({
      label: cat,
      backgroundColor: CATEGORY_COLORS[cat] || '#888890',
      borderColor: CATEGORY_COLORS[cat] || '#888890',
      data: sortedDates.map((d) => days[d]?.[cat]?.size ?? 0),
    }));

    let total = 0;
    let count = 0;
    for (const d of sortedDates) {
      for (const cat of Object.keys(days[d])) {
        total += days[d][cat].size || 0;
        count += days[d][cat].count || 0;
      }
    }

    return { dates: sortedDates, categories: cats, datasets: ds, totalSize: total, totalCount: count };
  }, [q.data]);

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!dates.length) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <div>
          <span className="text-ink-dim">Total: </span>
          <span className="text-ink-bright font-mono">{humanBytes(totalSize)}</span>
        </div>
        <div>
          <span className="text-ink-dim">Files: </span>
          <span className="text-ink-bright font-mono">{totalCount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-ink-dim">Days: </span>
          <span className="text-ink-bright font-mono">{dates.length}</span>
        </div>
        <div>
          <span className="text-ink-dim">Categories: </span>
          <span className="text-ink-bright font-mono">{categories.length}</span>
        </div>
      </div>

      <div className="bg-bg-1 border border-edge rounded-lg p-3">
        <div className="h-96">
          <Bar options={baseOptions} data={{ labels: dates, datasets }} />
        </div>
      </div>
    </div>
  );
}
