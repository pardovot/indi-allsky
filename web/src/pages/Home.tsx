import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';

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

const REFRESH_MS = 15_000;

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function Home() {
  const [cameraId, setCameraId] = useState<number | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<Camera[]>('/cameras'),
  });

  useEffect(() => {
    if (cameraId === null && camerasQ.data && camerasQ.data.length > 0) {
      setCameraId(camerasQ.data[0].id);
    }
  }, [camerasQ.data, cameraId]);

  const imageQ = useQuery({
    queryKey: ['latest-image', cameraId],
    queryFn: () =>
      api<LatestImage>(`/latest-image?camera_id=${cameraId}&limit_s=900&night=1`),
    enabled: cameraId !== null,
    refetchInterval: REFRESH_MS,
  });

  const url = resolveImageUrl(imageQ.data?.latest_image.url ?? null);
  const message = imageQ.data?.latest_image.message || '';

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
    <div className="min-h-full flex flex-col">
      <Header
        cameras={camerasQ.data ?? []}
        cameraId={cameraId}
        onCameraChange={setCameraId}
      />

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4 gap-3">
        <div
          className="text-ink-dim text-sm text-center min-h-[1.25rem]"
          dangerouslySetInnerHTML={{ __html: message }}
        />

        {url ? (
          <img
            ref={imgRef}
            src={url}
            alt="Latest sky"
            onClick={goFullscreen}
            className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-md shadow-2xl cursor-zoom-in select-none"
          />
        ) : imageQ.isLoading || camerasQ.isLoading ? (
          <div className="text-ink-dim">Loading…</div>
        ) : (
          <div className="text-ink-dim">No image available</div>
        )}
      </main>
    </div>
  );
}
