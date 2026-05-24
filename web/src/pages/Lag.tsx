import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import Select from '@/components/Select';

interface LagEntry {
  id: number;
  createDate: string;
  exposure: number | null;
  lag_seconds: number | null;
}

interface LagResp {
  image_list: LagEntry[];
  count: number;
}

const HISTORY_OPTIONS = [
  { value: 900,   label: '15 Minutes' },
  { value: 3600,  label: '1 Hour' },
  { value: 7200,  label: '2 Hours' },
  { value: 14400, label: '4 Hours' },
  { value: 43200, label: '12 Hours' },
  { value: 86400, label: '24 Hours' },
];

const CAMERA_PREF_KEY = 'allsky_camera_id';

export default function Lag() {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [history, setHistory] = useState(3600);

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);

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

  const lagQ = useQuery({
    queryKey: ['lag', cameraId, history],
    queryFn: () => api<LagResp>(`/image-lag?camera_id=${cameraId}&limit_s=${history}`),
    enabled: cameraId !== null,
    refetchInterval: 60_000,
  });

  const rows = lagQ.data?.image_list ?? [];

  const stats = useMemo(() => {
    const lags = rows
      .map((r) => r.lag_seconds)
      .filter((l): l is number => l != null && l >= 0);
    if (lags.length === 0) return null;
    const sum = lags.reduce((a, b) => a + b, 0);
    return {
      min: Math.min(...lags),
      max: Math.max(...lags),
      avg: sum / lags.length,
    };
  }, [rows]);

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
          <span className="text-ink-bright font-semibold text-base mr-2">Image Lag</span>
          <Select label="History" value={history} options={HISTORY_OPTIONS} onChange={setHistory} />
          {lagQ.isLoading && <span>Loading…</span>}
          <span className="ml-auto">{rows.length} images</span>
          {stats && (
            <span className="font-mono text-ink">
              min {stats.min.toFixed(1)}s · avg {stats.avg.toFixed(1)}s · max {stats.max.toFixed(1)}s
            </span>
          )}
        </div>

        <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-ink-dim text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-right px-3 py-2">Exposure</th>
                <th className="text-right px-3 py-2">Lag (s)</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !lagQ.isLoading && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-ink-dim">
                    No data
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-edge hover:bg-bg-2 transition-colors">
                  <td className="px-3 py-1.5 font-mono text-ink">{r.createDate}</td>
                  <td className="px-3 py-1.5 text-right text-ink-dim font-mono">
                    {r.exposure != null ? r.exposure.toFixed(3) : '—'}
                  </td>
                  <td
                    className={[
                      'px-3 py-1.5 text-right font-mono',
                      r.lag_seconds == null ? 'text-ink-dim'
                        : r.lag_seconds > 60 ? 'text-danger'
                        : r.lag_seconds > 30 ? 'text-warn'
                        : 'text-ink',
                    ].join(' ')}
                  >
                    {r.lag_seconds != null ? r.lag_seconds.toFixed(1) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
