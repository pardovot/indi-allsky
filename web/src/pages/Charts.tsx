import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import Select from '@/components/Select';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, TimeScale,
  Title, Tooltip, Legend,
);

interface DataPoint { x: number; y: number; }

interface ChartData {
  jsqm?: DataPoint[];
  jsqm_d?: DataPoint[];
  stars?: DataPoint[];
  temp?: DataPoint[];
  gain?: DataPoint[];
  exp?: DataPoint[];
  detection?: DataPoint[];
  custom_1?: DataPoint[];
  custom_2?: DataPoint[];
  custom_3?: DataPoint[];
  custom_4?: DataPoint[];
  custom_5?: DataPoint[];
  custom_6?: DataPoint[];
  custom_7?: DataPoint[];
  custom_8?: DataPoint[];
  custom_9?: DataPoint[];
  custom_10?: DataPoint[];
}

interface ChartResp {
  chart_data: ChartData;
  message: string;
}

const HISTORY_OPTIONS = [
  { value: 900,   label: '15 Minutes' },
  { value: 1800,  label: '30 Minutes' },
  { value: 2700,  label: '45 Minutes' },
  { value: 3600,  label: '1 Hour' },
  { value: 7200,  label: '2 Hours' },
  { value: 10800, label: '3 Hours' },
  { value: 14400, label: '4 Hours' },
  { value: 21600, label: '6 Hours' },
  { value: 43200, label: '12 Hours' },
  { value: 86400, label: '24 Hours' },
];

const CAMERA_PREF_KEY = 'allsky_camera_id';
const HISTORY_PREF_KEY = 'allsky_chart_history';

interface SeriesConfig {
  key: keyof ChartData;
  label: string;
  color: string;
}

const PANELS: { title: string; series: SeriesConfig[] }[] = [
  { title: 'Sky Quality (jSQM)', series: [
    { key: 'jsqm',   label: 'jSQM',   color: '#fb923c' },
    { key: 'jsqm_d', label: 'jSQM δ', color: '#facc15' },
  ]},
  { title: 'Stars / Detection', series: [
    { key: 'stars',     label: 'Stars',      color: '#60a5fa' },
    { key: 'detection', label: 'Detections', color: '#f43f5e' },
  ]},
  { title: 'Sensor Temperature (°C)', series: [
    { key: 'temp', label: 'Temp', color: '#4ade80' },
  ]},
  { title: 'Exposure / Gain', series: [
    { key: 'exp',  label: 'Exposure', color: '#a78bfa' },
    { key: 'gain', label: 'Gain',     color: '#22d3ee' },
  ]},
];

const baseOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  parsing: false as unknown as ChartOptions<'line'>['parsing'],
  plugins: {
    legend: { labels: { color: '#888890' } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: {
      type: 'time',
      time: { unit: 'minute' },
      ticks: { color: '#888890' },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
    y: {
      ticks: { color: '#888890' },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  },
  elements: {
    point: { radius: 2 },
    line:  { tension: 0.1, borderWidth: 1.5 },
  },
};

function getPrefNumber(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function Charts() {
  const [params] = useSearchParams();
  const timestamp = Number(params.get('timestamp') || 0);

  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() =>
    getPrefNumber(CAMERA_PREF_KEY, NaN) || null,
  );
  const [history, setHistory] = useState(() =>
    getPrefNumber(HISTORY_PREF_KEY, 3600),
  );

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);
  useEffect(() => {
    localStorage.setItem(HISTORY_PREF_KEY, String(history));
  }, [history]);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<{ id: number; name: string; friendlyName: string | null }[]>('/cameras'),
  });

  useEffect(() => {
    const list = camerasQ.data;
    if (!list || list.length === 0) return;
    if (cameraId === null || !list.some((c) => c.id === cameraId)) {
      setCameraId(list[0].id);
    }
  }, [camerasQ.data, cameraId]);

  const chartQ = useQuery({
    queryKey: ['charts', cameraId, history, timestamp],
    queryFn: () => {
      const ts = timestamp > 0 ? `&timestamp=${timestamp}` : '';
      return api<ChartResp>(`/charts?camera_id=${cameraId}&limit_s=${history}${ts}`);
    },
    enabled: cameraId !== null,
    refetchInterval: timestamp > 0 ? false : 60_000,
  });

  const data = chartQ.data?.chart_data;
  const message = chartQ.data?.message || '';

  // Pull custom sensors that actually have data
  const customPanels = data
    ? Array.from({ length: 10 }).flatMap((_, i) => {
        const key = `custom_${i + 1}` as keyof ChartData;
        const series = data[key];
        if (!series || series.length === 0) return [];
        return [{
          title: `Custom ${i + 1}`,
          series: [{ key, label: `Custom ${i + 1}`, color: '#fb923c' }],
        }];
      })
    : [];

  const allPanels = [...PANELS, ...customPanels];

  return (
    <div className="min-h-full flex flex-col">
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <Header
        cameras={camerasQ.data ?? []}
        cameraId={cameraId}
        camerasLoading={camerasQ.isLoading}
        onCameraChange={setCameraId}
        onToggleNav={() => setNavOpen((v) => !v)}
        onOpenStatus={() => setStatusOpen(true)}
      />

      <main className="flex-1 flex flex-col px-4 py-4 gap-3">
        <div className="flex items-center gap-3 flex-wrap text-xs text-ink-dim">
          <span className="text-ink-bright font-semibold text-base mr-2">Charts</span>
          <Select label="History" value={history} options={HISTORY_OPTIONS} onChange={setHistory} />
          {chartQ.isLoading && <span>Loading…</span>}
          {message && <span>{message}</span>}
          {timestamp > 0 && (
            <span className="text-accent">
              Anchored to {new Date(timestamp * 1000).toLocaleString(undefined, { hour12: false })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {allPanels.map((panel) => (
            <div key={panel.title} className="bg-bg-1 border border-edge rounded-lg p-3">
              <div className="text-ink-bright text-sm font-medium mb-2">{panel.title}</div>
              <div className="h-64">
                <Line
                  options={baseOptions}
                  data={{
                    datasets: panel.series.map((s) => ({
                      label: s.label,
                      data: (data?.[s.key] as DataPoint[] | undefined) ?? [],
                      backgroundColor: s.color,
                      borderColor: s.color,
                      pointBackgroundColor: s.color,
                    })),
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </main>

      <StatusPanel
        cameraId={cameraId}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}
