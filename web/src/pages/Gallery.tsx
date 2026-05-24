import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import Select from '@/components/Select';
import Lightbox, { LightboxImage } from '@/components/Lightbox';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface GalleryImage {
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
  date: string;
  ts: number;
  id: number;
  exclude?: boolean;
}

type SelectTuple = [string | number, string];

interface GalleryResp {
  IMAGE_DATA?: GalleryImage[];
  YEAR_SELECT?: SelectTuple[];
  MONTH_SELECT?: SelectTuple[];
  DAY_SELECT?: SelectTuple[];
  HOUR_SELECT?: SelectTuple[];
}

const CAMERA_PREF_KEY = 'allsky_camera_id';

type Field = 'YEAR_SELECT' | 'MONTH_SELECT' | 'DAY_SELECT' | 'HOUR_SELECT';

export default function Gallery() {
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

  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

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

  const fetchGallery = useCallback(
    async (body: Record<string, unknown>) => {
      if (cameraId === null) return;
      setLoading(true);
      try {
        const data = await api<GalleryResp>('/gallery', {
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
        }
      } finally {
        setLoading(false);
      }
    },
    [cameraId, filterDetections],
  );

  // Initial / camera change / filter change → reload everything from scratch
  useEffect(() => {
    if (cameraId === null) return;
    fetchGallery({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, filterDetections]);

  // Each select change sends only the levels above it; server fills in the rest.
  function onYearChange(v: number) {
    setYear(v);
    fetchGallery({ YEAR_SELECT: v });
  }
  function onMonthChange(v: number) {
    setMonth(v);
    fetchGallery({ YEAR_SELECT: year, MONTH_SELECT: v });
  }
  function onDayChange(v: number) {
    setDay(v);
    fetchGallery({ YEAR_SELECT: year, MONTH_SELECT: month, DAY_SELECT: v });
  }
  function onHourChange(v: number) {
    setHour(v);
    fetchGallery({
      YEAR_SELECT: year,
      MONTH_SELECT: month,
      DAY_SELECT: day,
      HOUR_SELECT: v,
    });
  }

  // Keyboard nav: arrow up/down or w/s or j/k = hour +/-
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxIdx !== null) return; // lightbox owns keys when open
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      let dir = 0;
      if (['ArrowUp', 'w', 'k'].includes(e.key)) dir = -1; // newer (toward index 0)
      else if (['ArrowDown', 's', 'j'].includes(e.key)) dir = 1; // older

      if (!dir || hourOpts.length === 0 || hour === null) return;

      const idx = hourOpts.findIndex((o) => Number(o[0]) === hour);
      if (idx < 0) return;
      const nextIdx = Math.max(0, Math.min(hourOpts.length - 1, idx + dir));
      if (nextIdx === idx) return;
      e.preventDefault();
      onHourChange(Number(hourOpts[nextIdx][0]));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hourOpts, hour, lightboxIdx]);

  const lightboxImages: LightboxImage[] = images.map((i) => ({
    url: resolveImageUrl(i.url),
    width: i.width,
    height: i.height,
    date: i.date,
    id: i.id,
    ts: i.ts,
  }));

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
          {dayOpts.length > 0 && day !== null && (
            <Select
              label="Day"
              value={day}
              options={dayOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onDayChange}
            />
          )}
          {hourOpts.length > 0 && hour !== null && (
            <Select
              label="Hour"
              value={hour}
              options={hourOpts.map(([v, l]) => ({ value: Number(v), label: l }))}
              onChange={onHourChange}
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

          <span className="ml-auto text-ink-dim">
            {images.length} image{images.length === 1 ? '' : 's'} · ↑/↓ navigate hours
          </span>
        </div>

        {images.length === 0 && !loading ? (
          <div className="flex-1 flex items-center justify-center text-ink-dim text-sm">
            No images for this period
          </div>
        ) : (
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {images.map((img, i) => (
              <button
                key={img.id ?? img.url}
                onClick={() => setLightboxIdx(i)}
                className="group relative aspect-square overflow-hidden rounded-md border border-edge bg-bg-1 hover:border-accent transition-colors"
                title={img.date}
              >
                <img
                  src={resolveImageUrl(img.thumbnail_url || img.url)}
                  alt={img.date}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                {img.exclude && (
                  <span className="absolute top-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-danger/80 text-bg-0">
                    excl
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {lightboxIdx !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIdx}
          onIndexChange={setLightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}

      <StatusPanel
        cameraId={cameraId}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}

function resolveImageUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}
