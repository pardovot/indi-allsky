import { useCallback, useEffect, useRef, useState } from 'react';
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

interface ImageEntry {
  id: number;
  url: string;
  date: string;
  ts: number;
  exclude?: boolean;
  fits?: string | null;
  fits_id?: number | null;
  raw?: string | null;
  raw_id?: number | null;
  panorama?: string | null;
  panorama_id?: number | null;
}

type SelectTuple = [string | number, string];

interface ImagesResp {
  IMAGE_DATA?: ImageEntry[];
  YEAR_SELECT?: SelectTuple[];
  MONTH_SELECT?: SelectTuple[];
  DAY_SELECT?: SelectTuple[];
  HOUR_SELECT?: SelectTuple[];
}

const CAMERA_PREF_KEY = 'allsky_camera_id';

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Images() {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [filterDetections, setFilterDetections] = useState(false);

  const [yearOpts, setYearOpts] = useState<SelectTuple[]>([]);
  const [monthOpts, setMonthOpts] = useState<SelectTuple[]>([]);
  const [dayOpts, setDayOpts] = useState<SelectTuple[]>([]);
  const [hourOpts, setHourOpts] = useState<SelectTuple[]>([]);

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const [images, setImages] = useState<ImageEntry[]>([]);
  const [imageIdx, setImageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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

  const fetchImages = useCallback(
    async (body: Record<string, unknown>) => {
      if (cameraId === null) return;
      setLoading(true);
      try {
        const data = await api<ImagesResp>('/imageviewer', {
          method: 'POST',
          body: JSON.stringify({
            CAMERA_ID: cameraId,
            FILTER_DETECTIONS: filterDetections,
            ...body,
          }),
        });
        if (data.YEAR_SELECT) {
          setYearOpts(data.YEAR_SELECT);
          if (data.YEAR_SELECT.length > 0) setYear(Number(data.YEAR_SELECT[0][0]));
        }
        if (data.MONTH_SELECT) {
          setMonthOpts(data.MONTH_SELECT);
          if (data.MONTH_SELECT.length > 0) setMonth(Number(data.MONTH_SELECT[0][0]));
        }
        if (data.DAY_SELECT) {
          setDayOpts(data.DAY_SELECT);
          if (data.DAY_SELECT.length > 0) setDay(Number(data.DAY_SELECT[0][0]));
        }
        if (data.HOUR_SELECT) {
          setHourOpts(data.HOUR_SELECT);
          if (data.HOUR_SELECT.length > 0) setHour(Number(data.HOUR_SELECT[0][0]));
        }
        if (data.IMAGE_DATA) {
          setImages(data.IMAGE_DATA);
          setImageIdx(0);
        }
      } finally {
        setLoading(false);
      }
    },
    [cameraId, filterDetections],
  );

  useEffect(() => {
    if (cameraId === null) return;
    fetchImages({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, filterDetections]);

  function onYearChange(v: number) {
    setYear(v);
    fetchImages({ YEAR_SELECT: v });
  }
  function onMonthChange(v: number) {
    setMonth(v);
    fetchImages({ YEAR_SELECT: year, MONTH_SELECT: v });
  }
  function onDayChange(v: number) {
    setDay(v);
    fetchImages({ YEAR_SELECT: year, MONTH_SELECT: month, DAY_SELECT: v });
  }
  function onHourChange(v: number) {
    setHour(v);
    fetchImages({
      YEAR_SELECT: year,
      MONTH_SELECT: month,
      DAY_SELECT: day,
      HOUR_SELECT: v,
    });
  }

  function stepImage(dir: 1 | -1) {
    setImageIdx((idx) => {
      const next = idx + dir;
      if (next < 0) return idx;
      if (next >= images.length) return idx;
      return next;
    });
  }
  function stepHour(dir: 1 | -1) {
    if (hourOpts.length === 0 || hour === null) return;
    const i = hourOpts.findIndex((o) => Number(o[0]) === hour);
    if (i < 0) return;
    const next = Math.max(0, Math.min(hourOpts.length - 1, i + dir));
    if (next === i) return;
    onHourChange(Number(hourOpts[next][0]));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;

      if (['ArrowLeft', 'a', 'h'].includes(e.key)) { e.preventDefault(); stepImage(-1); }
      else if (['ArrowRight', 'd', 'l'].includes(e.key)) { e.preventDefault(); stepImage(1); }
      else if (['ArrowUp', 'w', 'k'].includes(e.key)) { e.preventDefault(); stepHour(-1); }
      else if (['ArrowDown', 's', 'j'].includes(e.key)) { e.preventDefault(); stepHour(1); }
      else if (e.key === 'Home' || e.key === '0') { e.preventDefault(); setImageIdx(0); }
      else if (e.key === 'End' || e.key === 'g') { e.preventDefault(); setImageIdx(Math.max(0, images.length - 1)); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length, hourOpts, hour]);

  function toggleFullscreen() {
    const el = imgRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
    } else {
      el.requestFullscreen?.();
      setFullscreen(true);
    }
  }

  const current = images[imageIdx];
  const ts = current?.ts;

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

      <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
        <div className="w-full max-w-7xl flex items-center gap-2 flex-wrap text-xs text-ink-dim">
          {yearOpts.length > 0 && year !== null && (
            <Select label="Year" value={year}
              options={yearOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onYearChange} />
          )}
          {monthOpts.length > 0 && month !== null && (
            <Select label="Month" value={month}
              options={monthOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onMonthChange} />
          )}
          {dayOpts.length > 0 && day !== null && (
            <Select label="Day" value={day}
              options={dayOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onDayChange} />
          )}
          {hourOpts.length > 0 && hour !== null && (
            <Select label="Hour" value={hour}
              options={hourOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onHourChange} />
          )}
          {images.length > 0 && (
            <Select
              label="Image"
              value={imageIdx}
              options={images.map((img, i) => ({ value: i, label: img.date }))}
              onChange={(v) => setImageIdx(v)}
            />
          )}

          <label className="inline-flex items-center gap-1.5 rounded-md bg-bg-2 border border-edge px-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={filterDetections}
              onChange={(e) => setFilterDetections(e.target.checked)}
              className="accent-accent"
            />
            <span>Filter Detections</span>
          </label>

          {loading && <span className="text-ink-dim">Loading…</span>}
        </div>

        <div className="text-[11px] text-ink-dim">
          ←/→ image · ↑/↓ hour · 0/G first/last
        </div>

        <div className="relative flex items-center justify-center w-full max-w-7xl flex-1 min-h-0">
          {current ? (
            <img
              ref={imgRef}
              src={resolveImageUrl(current.url)}
              alt={current.date}
              onClick={toggleFullscreen}
              className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
            />
          ) : (
            <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
              <div className="text-ink-dim text-sm">
                {loading ? 'Loading…' : 'No image'}
              </div>
            </div>
          )}
        </div>

        {current && (
          <div className="flex items-center justify-center flex-wrap gap-2 text-xs">
            <ActionBadge color="info"      label="Image"          href={`/view-image?id=${current.id}`} />
            <ActionBadge color="primary"   label="Loop"           href={`/loop?timestamp=${ts}`} />
            <ActionBadge color="success"   label="Mini Timelapse" href={`/generate-mini?image_id=${current.id}`} />
            <ActionBadge color="secondary" label="Chart"          href={`/charts?timestamp=${ts}`} />
            <ActionBadge color="warn"      label="Lag"            href={`/lag`} />
            <ActionBadge color="dark"      label="VirtualSky"     href={`/indi-allsky/virtualsky?timestamp=${ts}`} />
            {current.fits_id && (
              <ActionBadge color="danger" label="FITS" href={resolveImageUrl(current.fits || '')} download />
            )}
            {current.fits_id && (
              <ActionBadge color="success" label="FITS Processing" href={`/indi-allsky/processing?type=light&id=${current.fits_id}`} />
            )}
            {current.raw_id && (
              <ActionBadge color="warn" label="RAW" href={`/view-raw?id=${current.raw_id}`} />
            )}
            {current.panorama_id && (
              <ActionBadge color="success" label="Panorama" href={`/view-panorama?id=${current.panorama_id}`} />
            )}
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

type BadgeColor = 'info' | 'primary' | 'success' | 'secondary' | 'warn' | 'dark' | 'danger';

const colorMap: Record<BadgeColor, string> = {
  info:      'bg-info/20 text-info border-info/30',
  primary:   'bg-accent/20 text-accent border-accent/30',
  success:   'bg-success/20 text-success border-success/30',
  secondary: 'bg-bg-3 text-ink border-edge',
  warn:      'bg-warn/20 text-warn border-warn/30',
  dark:      'bg-bg-2 text-ink-dim border-edge',
  danger:    'bg-danger/20 text-danger border-danger/30',
};

function ActionBadge({
  label, href, color, download,
}: { label: string; href: string; color: BadgeColor; download?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      {...(download ? { download: '' } : {})}
      className={[
        'px-2 py-1 rounded-md border text-xs hover:opacity-80 transition-opacity',
        colorMap[color],
      ].join(' ')}
    >
      {label}
    </a>
  );
}
