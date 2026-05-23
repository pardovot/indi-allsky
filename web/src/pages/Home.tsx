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
  const [refreshMs, setRefreshMs] = useState<number>(() =>
    getPrefNumber(REFRESH_PREF_KEY, 15_000),
  );
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);
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

  // night=1 lets the backend skip "daytime capture disabled" messaging and always return latest.
  const imageQ = useQuery({
    queryKey: ['latest-image', cameraId],
    queryFn: () =>
      api<LatestImage>(`/latest-image?camera_id=${cameraId}&limit_s=900&night=1`),
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
  const noCameras = !camerasQ.isLoading && (camerasQ.data?.length ?? 0) === 0;

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
        <div className="w-full flex items-center justify-between gap-3 flex-wrap max-w-7xl">
          <ImageControls
            refreshMs={refreshMs}
            onRefreshChange={setRefreshMs}
            lastUpdated={lastUpdated}
            dimensions={url && dims ? { width: dims.width, height: dims.height } : null}
          />
          {message && (
            <div
              className="text-ink-dim text-sm text-right"
              dangerouslySetInnerHTML={{ __html: message }}
            />
          )}
        </div>

        <div className="relative flex items-center justify-center w-full max-w-7xl flex-1 min-h-0">
          {noCameras ? (
            <div className="aspect-video w-full max-w-3xl border border-danger/40 rounded-lg flex items-center justify-center bg-danger/5">
              <div className="text-center space-y-2 px-4">
                <div className="text-danger text-base font-medium">
                  No cameras connected
                </div>
                <div className="text-ink-dim text-sm max-w-md">
                  No cameras have been registered yet. Connect a camera and
                  start the indi-allsky service, then refresh.
                </div>
              </div>
            </div>
          ) : url ? (
            <img
              ref={imgRef}
              src={url}
              alt="Latest sky"
              onClick={goFullscreen}
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
            />
          ) : (
            <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
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
