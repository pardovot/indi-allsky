import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

interface FitsImageEntry {
  id: number;
  url: string;
  fits: string | null;
  date: string;
  ts: number;
  width: number;
  height: number;
}

type SelectTuple = [string | number, string];

interface FitsViewerResp {
  IMAGE_DATA?: FitsImageEntry[];
  YEAR_SELECT?: SelectTuple[];
  MONTH_SELECT?: SelectTuple[];
  DAY_SELECT?: SelectTuple[];
  HOUR_SELECT?: SelectTuple[];
}

function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function FitsViewer() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight self-start">
            FITS Image Viewer
          </h1>
          <Content cameraId={cameraId} />
        </main>
      )}
    </PageShell>
  );
}

function Content({ cameraId }: { cameraId: number | null }) {
  const [yearOpts, setYearOpts] = useState<SelectTuple[]>([]);
  const [monthOpts, setMonthOpts] = useState<SelectTuple[]>([]);
  const [dayOpts, setDayOpts] = useState<SelectTuple[]>([]);
  const [hourOpts, setHourOpts] = useState<SelectTuple[]>([]);

  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);

  const [images, setImages] = useState<FitsImageEntry[]>([]);
  const [imageIdx, setImageIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const fetchImages = useCallback(
    async (body: Record<string, unknown>) => {
      if (cameraId === null) return;
      setLoading(true);
      try {
        const data = await api<FitsViewerResp>('/fitsimageviewer', {
          method: 'POST',
          body: JSON.stringify({ CAMERA_ID: cameraId, ...body }),
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
    [cameraId],
  );

  useEffect(() => {
    if (cameraId === null) return;
    fetchImages({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId]);

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
    fetchImages({ YEAR_SELECT: year, MONTH_SELECT: month, DAY_SELECT: day, HOUR_SELECT: v });
  }

  function stepImage(dir: 1 | -1) {
    setImageIdx((idx) => {
      const next = idx + dir;
      if (next < 0 || next >= images.length) return idx;
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
    } else {
      el.requestFullscreen?.();
    }
  }

  const current = images[imageIdx];

  useEffect(() => {
    if (!current) { setImgSrc(null); return; }
    let cancelled = false;
    setImgSrc(null);
    setImgErr(false);
    api<{ image_b64: string | null }>(`/fits2jpeg?id=${current.id}`)
      .then((d) => { if (!cancelled) setImgSrc(d.image_b64 ? `data:image/jpeg;base64,${d.image_b64}` : null); })
      .catch(() => { if (!cancelled) setImgErr(true); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  return (
    <>
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
        {loading && <span className="text-ink-dim">Loading…</span>}
      </div>

      <div className="text-[11px] text-ink-dim">
        ←/→ image · ↑/↓ hour · 0/G first/last
      </div>

      <div className="relative flex items-center justify-center w-full max-w-7xl flex-1 min-h-0">
        {current && imgSrc ? (
          <img
            ref={imgRef}
            src={imgSrc}
            alt={current.date}
            onClick={toggleFullscreen}
            className="max-w-full max-h-[78vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
          />
        ) : (
          <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
            <div className="text-ink-dim text-sm">
              {!current ? (loading ? 'Loading…' : 'No image') : imgErr ? 'Failed to load image' : 'Loading…'}
            </div>
          </div>
        )}
      </div>

      {current && (
        <div className="flex items-center justify-center flex-wrap gap-2 text-xs">
          {current.fits && (
            <a
              href={resolveImageUrl(current.fits)}
              download=""
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-md border text-xs hover:opacity-80 transition-opacity bg-danger/20 text-danger border-danger/30"
            >
              Download
            </a>
          )}
          <a
            href={`/processing?type=light&id=${current.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2 py-1 rounded-md border text-xs hover:opacity-80 transition-opacity bg-success/20 text-success border-success/30"
          >
            FITS Processing
          </a>
        </div>
      )}
    </>
  );
}
