import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import ImageControls from '@/components/ImageControls';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
  width: number | null;
  height: number | null;
}

interface LatestImage {
  latest_image: {
    url: string | null;
    message: string;
    width: number;
    height: number;
  };
}

const CAMERA_PREF_KEY = 'allsky_camera_id';
const NIGHT_PREF_KEY = 'allsky_night';
const REFRESH_PREF_KEY = 'allsky_refresh_ms';

function getPrefNumber(key: string, fallback: number): number {
  const v = localStorage.getItem(key);
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Home() {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() =>
    getPrefNumber(CAMERA_PREF_KEY, NaN) || null,
  );
  const [night, setNight] = useState<boolean>(() => {
    const v = localStorage.getItem(NIGHT_PREF_KEY);
    return v === null ? true : v === '1';
  });
  const [refreshMs, setRefreshMs] = useState<number>(() =>
    getPrefNumber(REFRESH_PREF_KEY, 15_000),
  );
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);
  useEffect(() => {
    localStorage.setItem(NIGHT_PREF_KEY, night ? '1' : '0');
  }, [night]);
  useEffect(() => {
    localStorage.setItem(REFRESH_PREF_KEY, String(refreshMs));
  }, [refreshMs]);

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

  const imageQ = useQuery({
    queryKey: ['latest-image', cameraId, night],
    queryFn: () =>
      api<LatestImage>(
        `/latest-image?camera_id=${cameraId}&limit_s=900&night=${night ? 1 : 0}`,
      ),
    enabled: cameraId !== null,
    refetchInterval: refreshMs,
  });

  const url = resolveImageUrl(imageQ.data?.latest_image.url ?? null);
  const message = imageQ.data?.latest_image.message || '';
  const dims = imageQ.data?.latest_image;
  const lastUpdated = useMemo(
    () => (imageQ.dataUpdatedAt ? new Date(imageQ.dataUpdatedAt) : null),
    [imageQ.dataUpdatedAt],
  );

  function goFullscreen() {
    const el = imgRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen?.();
    }
  }

  const loading = imageQ.isLoading || camerasQ.isLoading;
  const showPlaceholder = !url;

  return (
    <div className="min-h-full flex">
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          cameras={camerasQ.data ?? []}
          cameraId={cameraId}
          onCameraChange={setCameraId}
          onToggleNav={() => setNavOpen((v) => !v)}
          onOpenStatus={() => setStatusOpen(true)}
        />

        <main className="flex-1 flex flex-col items-center px-4 py-4">
          <div className="w-full max-w-5xl flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <ImageControls
                night={night}
                onNightChange={setNight}
                refreshMs={refreshMs}
                onRefreshChange={setRefreshMs}
                lastUpdated={lastUpdated}
              />
              {message && (
                <div
                  className="text-ink-dim text-sm flex-1 min-w-[200px] text-right"
                  dangerouslySetInnerHTML={{ __html: message }}
                />
              )}
            </div>

            <div className="relative w-full bg-bg-1 border border-edge rounded-lg overflow-hidden">
              {url ? (
                <img
                  ref={imgRef}
                  src={url}
                  alt="Latest sky"
                  onClick={goFullscreen}
                  className="block w-full h-auto max-h-[78vh] object-contain cursor-zoom-in select-none"
                />
              ) : (
                <div className="aspect-video w-full flex items-center justify-center">
                  <div className="text-center space-y-1">
                    <div className="text-ink-dim text-sm">
                      {loading ? 'Loading…' : 'No image available'}
                    </div>
                    {!loading && (
                      <div className="text-ink-dim/60 text-xs">
                        Capture may be paused or down
                      </div>
                    )}
                  </div>
                </div>
              )}

              {dims && dims.url && (
                <div className="absolute bottom-2 right-2 text-[11px] text-ink-dim font-mono bg-bg-0/70 backdrop-blur px-2 py-0.5 rounded">
                  {dims.width}×{dims.height}
                </div>
              )}

              {showPlaceholder && (
                <div className="absolute top-2 right-2 text-[11px] text-ink-dim font-mono bg-bg-0/70 backdrop-blur px-2 py-0.5 rounded">
                  no signal
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <StatusPanel
        cameraId={cameraId}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}
