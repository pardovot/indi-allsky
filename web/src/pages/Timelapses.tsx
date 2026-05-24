import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import Select from '@/components/Select';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface VideoItem {
  url: string;
  night: boolean;
  dayDate_long: string;
  keogram_id?: number;
  startrail_id?: number;
  startrail?: string;
  startrail_timelapse?: string;
  startrail_timelapse_id?: number;
  panorama_timelapse?: string;
  panorama_timelapse_id?: number;
  max_stars?: number;
  avg_stars?: number;
  max_kpindex?: number;
  max_ovation_max?: number;
  max_smoke_rating?: string;
  youtube_id?: string;
}

type SelectTuple = [string | number, string];

interface VideoResp {
  video_list?: VideoItem[];
  YEAR_SELECT?: SelectTuple[];
  MONTH_SELECT?: SelectTuple[];
  TIMEOFDAY_SELECT?: SelectTuple[];
}

const TIMEOFDAY_OPTIONS: SelectTuple[] = [
  ['', 'Both'],
  ['night', 'Night'],
  ['day', 'Day'],
];

interface TimelapsesProps {
  endpoint: string;
  queryKey: string;
  title: string;
  /** Mini timelapses don't have the time-of-day filter or sub-links */
  mini?: boolean;
}

const CAMERA_PREF_KEY = 'allsky_camera_id';

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Timelapses({ endpoint, queryKey, title, mini = false }: TimelapsesProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });

  const [yearOpts, setYearOpts] = useState<SelectTuple[]>([]);
  const [monthOpts, setMonthOpts] = useState<SelectTuple[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<string>('');

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<Camera[]>('/cameras'),
  });

  useEffect(() => {
    const list = camerasQ.data;
    if (!list || list.length === 0) return;
    if (cameraId === null || !list.some((c) => c.id === cameraId)) {
      setCameraId(list[0].id);
    }
  }, [camerasQ.data, cameraId]);

  const fetchVideos = useCallback(
    async (body: Record<string, unknown>) => {
      if (cameraId === null) return;
      setLoading(true);
      try {
        const data = await api<VideoResp>(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            CAMERA_ID: cameraId,
            ...(mini ? {} : { TIMEOFDAY_SELECT: timeOfDay }),
            ...body,
          }),
        });
        // Backend returns [['', 'None']] when no data exists — treat as empty.
        const realYears = (data.YEAR_SELECT ?? []).filter((t) => t[0] !== '' && t[0] != null);
        const realMonths = (data.MONTH_SELECT ?? []).filter((t) => t[0] !== '' && t[0] != null);

        if (data.YEAR_SELECT) {
          setYearOpts(realYears);
          if (realYears.length > 0) setYear(Number(realYears[0][0]));
          else setYear(null);
        }
        if (data.MONTH_SELECT) {
          setMonthOpts(realMonths);
          if (realMonths.length > 0) setMonth(Number(realMonths[0][0]));
          else setMonth(null);
        }
        if (data.video_list) setVideos(data.video_list);
      } finally {
        setLoading(false);
      }
    },
    [cameraId, endpoint, mini, timeOfDay],
  );

  useEffect(() => {
    if (cameraId === null) return;
    fetchVideos({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, timeOfDay]);

  function onYearChange(v: number) {
    setYear(v);
    fetchVideos({ YEAR_SELECT: v });
  }
  function onMonthChange(v: number) {
    setMonth(v);
    fetchVideos({ YEAR_SELECT: year, MONTH_SELECT: v });
  }

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
        <div className="flex items-center gap-2 flex-wrap text-xs text-ink-dim">
          <span className="text-ink-bright font-semibold text-base mr-2">{title}</span>

          {yearOpts.length > 0 && year !== null && (
            <Select
              label="Year"
              value={year}
              options={yearOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onYearChange}
            />
          )}
          {monthOpts.length > 0 && month !== null && (
            <Select
              label="Month"
              value={month}
              options={monthOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onMonthChange}
            />
          )}
          {!mini && (
            <Select
              label="Time"
              value={timeOfDay}
              options={TIMEOFDAY_OPTIONS.map(([v, l]) => ({ value: String(v), label: l }))}
              onChange={(v) => setTimeOfDay(String(v))}
            />
          )}

          {loading && <span>Loading…</span>}
          <span className="ml-auto">
            {videos.length} {videos.length === 1 ? 'video' : 'videos'}
          </span>
        </div>

        {videos.length === 0 && !loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-ink-dim text-sm gap-2 px-4 text-center">
            {mini ? (
              <>
                <div>No mini-timelapses yet</div>
                <div className="text-ink-dim/70 text-xs max-w-md">
                  Generate one from <span className="text-ink">Media → Images</span> by clicking
                  the <span className="text-ink">Mini Timelapse</span> button under an image.
                </div>
              </>
            ) : (
              <div>No videos for this period</div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {videos.map((v, i) => (
              <VideoCard key={i} item={v} mini={mini} />
            ))}
          </div>
        )}
      </main>

      <StatusPanel
        cameraId={cameraId}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}

function VideoCard({ item, mini }: { item: VideoItem; mini: boolean }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden flex flex-col">
      <video
        controls
        preload="metadata"
        src={resolveImageUrl(item.url)}
        className="w-full aspect-video bg-bg-0"
      />
      <div className="p-3 space-y-2 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-bright font-semibold text-sm">
            {item.dayDate_long}
          </span>
          {!mini && (
            <span
              className={[
                'text-[10px] px-1.5 py-0.5 rounded',
                item.night ? 'bg-bg-3 text-info' : 'bg-bg-3 text-warn',
              ].join(' ')}
            >
              {item.night ? 'Night' : 'Day'}
            </span>
          )}
        </div>

        {!mini && (
          <div className="flex flex-wrap gap-1">
            {item.keogram_id != null && (
              <Badge color="warn" href={`/view-keogram?id=${item.keogram_id}`} label="Keogram" />
            )}
            {item.night && item.startrail_id != null && item.startrail && item.startrail !== 'None' && (
              <Badge color="primary" href={`/view-startrail?id=${item.startrail_id}`} label="Star Trail" />
            )}
            {item.night && item.startrail_timelapse_id != null && item.startrail_timelapse && item.startrail_timelapse !== 'None' && (
              <Badge color="primary" href={`/watch-startrail?id=${item.startrail_timelapse_id}`} label="Star Trail Timelapse" />
            )}
            {item.panorama_timelapse_id != null && item.panorama_timelapse && item.panorama_timelapse !== 'None' && (
              <Badge color="success" href={`/watch-panorama?id=${item.panorama_timelapse_id}`} label="Panorama" />
            )}
          </div>
        )}

        {!mini && item.night && (
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-ink-dim">
            {item.max_stars != null && <span>Max ★ {item.max_stars}</span>}
            {item.avg_stars != null && <span>Avg ★ {item.avg_stars}</span>}
            {item.max_kpindex != null && <span>Kp {item.max_kpindex}</span>}
            {item.max_ovation_max != null && <span>Aurora {item.max_ovation_max}%</span>}
            {item.max_smoke_rating && <span>Smoke {item.max_smoke_rating}</span>}
          </div>
        )}

        {!mini && !item.night && item.max_smoke_rating && (
          <div className="text-ink-dim">Smoke {item.max_smoke_rating}</div>
        )}

        {item.youtube_id && (
          <a
            href={`https://youtu.be/${item.youtube_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info hover:underline text-xs"
          >
            YouTube ↗
          </a>
        )}
      </div>
    </div>
  );
}

type BadgeColor = 'info' | 'primary' | 'success' | 'warn';
const colorMap: Record<BadgeColor, string> = {
  info:    'bg-info/20 text-info border-info/30',
  primary: 'bg-accent/20 text-accent border-accent/30',
  success: 'bg-success/20 text-success border-success/30',
  warn:    'bg-warn/20 text-warn border-warn/30',
};
function Badge({ color, href, label }: { color: BadgeColor; href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={['px-2 py-0.5 rounded text-[10px] border hover:opacity-80', colorMap[color]].join(' ')}
    >
      {label}
    </a>
  );
}
