import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface LoopImage {
  url: string;
  width: number;
  height: number;
  timestamp: number;
  jsqm?: number;
  stars?: number;
}

interface LoopResp {
  message: string;
  image_list: LoopImage[];
}

const CAMERA_PREF_KEY = 'allsky_camera_id';
const SETTINGS_KEY = 'allsky_loop_settings';

const HISTORY_OPTIONS = [
  { label: '15 Minutes', s: 900 },
  { label: '30 Minutes', s: 1800 },
  { label: '45 Minutes', s: 2700 },
  { label: '1 Hour', s: 3600 },
  { label: '2 Hours', s: 7200 },
  { label: '3 Hours', s: 10800 },
  { label: '4 Hours', s: 14400 },
];

const SPEED_OPTIONS = [
  { label: '50 FPS', ms: 20 },
  { label: '25 FPS', ms: 40 },
  { label: '10 FPS', ms: 100 },
  { label: '5 FPS', ms: 200 },
];

interface LoopSettings {
  history_seconds: number;
  frame_delay_ms: number;
  rock: boolean;
}

function loadSettings(): LoopSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as LoopSettings;
  } catch { /* ignore */ }
  return { history_seconds: 900, frame_delay_ms: 100, rock: false };
}

function resolveImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Loop() {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [settings, setSettings] = useState<LoopSettings>(() => loadSettings());
  const [playing, setPlaying] = useState(true);
  const [frameIdx, setFrameIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const directionRef = useRef<1 | -1>(-1); // -1 = oldest→newest (list is desc, so step backward)

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

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

  const loopQ = useQuery({
    queryKey: ['loop', cameraId, settings.history_seconds],
    queryFn: () =>
      api<LoopResp>(
        `/loop?camera_id=${cameraId}&limit_s=${settings.history_seconds}`,
      ),
    enabled: cameraId !== null,
    refetchInterval: 60_000,
  });

  const images = useMemo(() => loopQ.data?.image_list ?? [], [loopQ.data]);

  // Preload images so playback doesn't flicker
  useEffect(() => {
    images.forEach((img) => {
      const i = new Image();
      i.src = resolveImageUrl(img.url);
    });
  }, [images]);

  // Reset frame index when list changes
  useEffect(() => {
    if (images.length > 0 && frameIdx >= images.length) {
      setFrameIdx(images.length - 1);
    }
  }, [images.length, frameIdx]);

  // Playback loop
  useEffect(() => {
    if (!playing || images.length === 0) return;
    const id = setTimeout(() => {
      setFrameIdx((idx) => {
        const dir = directionRef.current;
        let next = idx + dir;
        if (next < 0) {
          if (settings.rock) {
            directionRef.current = 1;
            next = Math.min(1, images.length - 1);
          } else {
            next = images.length - 1; // wrap to start (oldest)
          }
        } else if (next >= images.length) {
          if (settings.rock) {
            directionRef.current = -1;
            next = Math.max(images.length - 2, 0);
          } else {
            next = images.length - 1;
          }
        }
        return next;
      });
    }, settings.frame_delay_ms);
    return () => clearTimeout(id);
  }, [playing, frameIdx, images.length, settings.frame_delay_ms, settings.rock]);

  const current = images[frameIdx];
  const message = loopQ.data?.message || '';

  function goFullscreen() {
    const el = imgRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
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

      <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
        <div className="w-full max-w-7xl flex items-center gap-3 flex-wrap text-xs text-ink-dim">
          <button
            onClick={() => setPlaying((v) => !v)}
            disabled={images.length === 0}
            className="px-3 py-1.5 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg-0 text-xs font-medium"
          >
            {playing ? 'Pause' : 'Play'}
          </button>

          <Field label="History">
            <select
              value={settings.history_seconds}
              onChange={(e) =>
                setSettings({ ...settings, history_seconds: Number(e.target.value) })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
            >
              {HISTORY_OPTIONS.map((o) => (
                <option key={o.s} value={o.s}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Speed">
            <select
              value={settings.frame_delay_ms}
              onChange={(e) =>
                setSettings({ ...settings, frame_delay_ms: Number(e.target.value) })
              }
              className="bg-transparent text-ink focus:outline-none cursor-pointer"
            >
              {SPEED_OPTIONS.map((o) => (
                <option key={o.ms} value={o.ms}>{o.label}</option>
              ))}
            </select>
          </Field>

          <label className="inline-flex items-center gap-1.5 rounded-md bg-bg-2 border border-edge px-2 py-1 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.rock}
              onChange={(e) =>
                setSettings({ ...settings, rock: e.target.checked })
              }
              className="accent-accent"
            />
            <span>Rock</span>
          </label>

          <div className="flex items-center gap-2 flex-1 min-w-[180px]">
            <input
              type="range"
              min={0}
              max={Math.max(0, images.length - 1)}
              value={frameIdx}
              onChange={(e) => setFrameIdx(Number(e.target.value))}
              className="flex-1 accent-accent"
            />
            <span className="font-mono tabular-nums whitespace-nowrap">
              {images.length === 0 ? '0/0' : `${frameIdx + 1}/${images.length}`}
            </span>
          </div>

          {message && (
            <span dangerouslySetInnerHTML={{ __html: message }} />
          )}
        </div>

        <div className="relative flex items-center justify-center w-full max-w-7xl flex-1 min-h-0">
          {current ? (
            <img
              ref={imgRef}
              src={resolveImageUrl(current.url)}
              alt="Loop frame"
              onClick={goFullscreen}
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
            />
          ) : (
            <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
              <div className="text-center space-y-1">
                <div className="text-ink-dim text-sm">
                  {loopQ.isLoading ? 'Loading…' : 'No loop data'}
                </div>
              </div>
            </div>
          )}
        </div>

        {current && (
          <div className="text-[11px] text-ink-dim font-mono">
            {new Date(current.timestamp * 1000).toLocaleString(undefined, {
              hour12: false,
            })}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md bg-bg-2 border border-edge px-2 py-1">
      <span>{label}</span>
      {children}
    </div>
  );
}
