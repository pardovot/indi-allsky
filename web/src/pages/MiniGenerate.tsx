import { FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';
import Select from '@/components/Select';

interface MediaResp {
  kind: string;
  url: string;
  date: string;
  timestamp: number | null;
  camera_id: number | null;
}

const SECONDS_OPTIONS = [
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 180, label: '3 minutes' },
  { value: 240, label: '4 minutes' },
  { value: 300, label: '5 minutes' },
  { value: 360, label: '6 minutes' },
  { value: 420, label: '7 minutes' },
  { value: 480, label: '8 minutes' },
  { value: 540, label: '9 minutes' },
  { value: 600, label: '10 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1200, label: '20 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 2700, label: '45 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 5400, label: '1.5 hours' },
  { value: 7200, label: '2 hours' },
  { value: 10800, label: '3 hours' },
  { value: 14400, label: '4 hours' },
];

const FRAMERATE_OPTIONS = [
  { value: '0.25', label: '0.25 FPS' },
  { value: '0.5', label: '0.5 FPS' },
  { value: '0.75', label: '0.75 FPS' },
  { value: '1', label: '1 FPS' },
  { value: '2', label: '2 FPS' },
  { value: '5', label: '5 FPS' },
  { value: '10', label: '10 FPS' },
  { value: '25', label: '25 FPS' },
];

function resolveUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function MiniGenerate() {
  const [params] = useSearchParams();
  const imageId = Number(params.get('image_id') || 0);
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [preSeconds, setPreSeconds] = useState(240);
  const [postSeconds, setPostSeconds] = useState(120);
  const [framerate, setFramerate] = useState('5');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<{ id: number; name: string; friendlyName: string | null }[]>('/cameras'),
  });

  const mediaQ = useQuery({
    queryKey: ['media', 'image', imageId],
    queryFn: () => api<MediaResp>(`/media?type=image&id=${imageId}`),
    enabled: imageId > 0,
  });

  const cameraId = mediaQ.data?.camera_id ?? null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!cameraId || !imageId) {
      setErrorMsg('Missing image or camera ID');
      return;
    }
    if (!note.trim()) {
      setErrorMsg('Description is required');
      return;
    }

    setSubmitting(true);
    try {
      const resp = await api<{ 'success-message'?: string; 'failure-message'?: string }>(
        '/generate-mini',
        {
          method: 'POST',
          body: JSON.stringify({
            IMAGE_ID: imageId,
            CAMERA_ID: cameraId,
            PRE_SECONDS: preSeconds,
            POST_SECONDS: postSeconds,
            FRAMERATE: framerate,
            NOTE: note,
          }),
        },
      );
      setSuccessMsg(resp['success-message'] || 'Job submitted');
      setNote('');
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { 'failure-message'?: string } | undefined;
        setErrorMsg(body?.['failure-message'] || `Error: ${err.message}`);
      } else {
        setErrorMsg('Submit failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 15_000);
    return () => clearTimeout(t);
  }, [successMsg]);

  return (
    <div className="min-h-full flex flex-col">
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <Header
        cameras={camerasQ.data ?? []}
        cameraId={cameraId}
        camerasLoading={camerasQ.isLoading}
        onCameraChange={() => { /* read-only here */ }}
        onToggleNav={() => setNavOpen((v) => !v)}
        onOpenStatus={() => setStatusOpen(true)}
      />

      <main className="flex-1 flex flex-col items-center px-4 py-4 gap-4">
        <div className="w-full max-w-4xl">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight mb-1">
            Generate Mini Timelapse
          </h1>
          {mediaQ.data && (
            <div className="text-ink-dim text-sm mb-4">
              Centered on image #{imageId} · {mediaQ.data.date}
            </div>
          )}

          <form
            onSubmit={onSubmit}
            className="bg-bg-1 border border-edge rounded-lg p-4 space-y-4"
          >
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                label="Pre"
                value={preSeconds}
                options={SECONDS_OPTIONS}
                onChange={setPreSeconds}
              />
              <Select
                label="Post"
                value={postSeconds}
                options={SECONDS_OPTIONS}
                onChange={setPostSeconds}
              />
              <Select
                label="Speed"
                value={framerate}
                options={FRAMERATE_OPTIONS}
                onChange={setFramerate}
              />
            </div>

            <label className="block">
              <span className="text-xs text-ink-dim uppercase tracking-wider">
                Description
              </span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Meteor at 03:42 UTC"
                className="mt-1 w-full bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-3 py-2 text-ink"
              />
            </label>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={submitting || !imageId || !cameraId}
                className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg-0 font-medium rounded-md px-4 py-2 text-sm transition-colors"
              >
                {submitting ? 'Submitting…' : 'Create'}
              </button>
              {successMsg && (
                <span className="text-success text-sm">{successMsg}</span>
              )}
              {errorMsg && (
                <span className="text-danger text-sm">{errorMsg}</span>
              )}
            </div>
          </form>

          {mediaQ.data?.url && (
            <div className="mt-6 flex justify-center">
              <img
                src={resolveUrl(mediaQ.data.url)}
                alt="Center image"
                className="max-w-full max-h-[55vh] object-contain rounded-md ring-1 ring-edge"
              />
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
