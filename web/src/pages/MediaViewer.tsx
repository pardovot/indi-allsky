import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';

interface MediaResp {
  kind: 'image' | 'video';
  type: string;
  id: number;
  url: string;
  date: string;
  timeofday: string;
}

interface MediaViewerProps {
  type: string;
  title: string;
}

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function MediaViewer({ type, title }: MediaViewerProps) {
  const [params] = useSearchParams();
  const id = Number(params.get('id') || 0);
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem('allsky_camera_id');
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const imgRef = useRef<HTMLImageElement>(null);
  const [copied, setCopied] = useState(false);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<{ id: number; name: string; friendlyName: string | null }[]>('/cameras'),
  });

  const mediaQ = useQuery({
    queryKey: ['media', type, id],
    queryFn: () => api<MediaResp>(`/media?type=${type}&id=${id}`),
    enabled: id > 0,
  });

  function copyLink() {
    const link = `${window.location.origin}${window.location.pathname}?id=${id}`;
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function goFullscreen() {
    const el = imgRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  const url = resolveUrl(mediaQ.data?.url || '');
  const kind = mediaQ.data?.kind;
  const dateLabel = mediaQ.data?.date || '';
  const timeofday = mediaQ.data?.timeofday || '';

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
        <div className="w-full max-w-7xl flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">
            {title}
            {dateLabel && (
              <span className="text-ink-dim text-sm font-normal ml-3">
                {dateLabel}
                {timeofday && ` · ${timeofday}`}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={copyLink}
              disabled={!id || !url}
              className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            {url && (
              <a
                href={url}
                download
                className="px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover text-bg-0 font-medium transition-colors"
              >
                Download
              </a>
            )}
          </div>
        </div>

        <div className="flex-1 w-full max-w-7xl flex items-center justify-center min-h-0">
          {mediaQ.isLoading ? (
            <div className="text-ink-dim text-sm">Loading…</div>
          ) : mediaQ.isError ? (
            <div className="text-danger text-sm">
              {(mediaQ.error as { body?: { error?: string } })?.body?.error || 'Failed to load'}
            </div>
          ) : !url ? (
            <div className="text-ink-dim text-sm">No media</div>
          ) : kind === 'video' ? (
            <video
              src={url}
              controls
              className="max-w-full max-h-[82vh] w-auto h-auto rounded-md ring-1 ring-edge bg-bg-0"
            />
          ) : (
            <img
              ref={imgRef}
              src={url}
              alt={dateLabel}
              onClick={goFullscreen}
              className="max-w-full max-h-[82vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
            />
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
