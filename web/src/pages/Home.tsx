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

        <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
          <ImageControls
            night={night}
            onNightChange={setNight}
            refreshMs={refreshMs}
            onRefreshChange={setRefreshMs}
            lastUpdated={lastUpdated}
          />

          <div
            className="text-ink-dim text-sm text-center min-h-[1.25rem]"
            dangerouslySetInnerHTML={{ __html: message }}
          />

          <div className="flex-1 w-full flex items-center justify-center">
            {url ? (
              <img
                ref={imgRef}
                src={url}
                alt="Latest sky"
                onClick={goFullscreen}
                className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-md shadow-2xl cursor-zoom-in select-none"
              />
            ) : imageQ.isLoading || camerasQ.isLoading ? (
              <div className="text-ink-dim">Loading…</div>
            ) : (
              <div className="text-ink-dim">No image available</div>
            )}
          </div>

          {dims && dims.url && (
            <div className="text-[11px] text-ink-dim font-mono">
              {dims.width}×{dims.height}
            </div>
          )}
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
