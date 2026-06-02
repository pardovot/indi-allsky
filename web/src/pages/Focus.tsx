import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface FocusResp {
  image_b64: string | null;
  blur_score: number;
  star_count: number;
  focus_mode: boolean;
}

interface FocusControllerResp {
  steps: number;
}

interface FocusControllerError {
  focuser_error?: string[];
  DIRECTION?: string[];
  STEP_DEGREES?: string[];
}

interface ConfigResp {
  config: { FOCUSER?: { CLASSNAME?: string } };
}

const ZOOM_OPTIONS = [
  { value: 2, label: 'Off' },
  { value: 5, label: 'Low' },
  { value: 10, label: 'Medium' },
  { value: 20, label: 'High' },
  { value: 40, label: 'Extreme' },
  { value: 60, label: 'Ridiculous' },
  { value: 80, label: 'Ludicrous' },
  { value: 100, label: 'Plaid' },
];

const REFRESH_OPTIONS = [2, 3, 4, 5, 10, 15];
const STEP_DEGREES_OPTIONS = [6, 12, 24, 45, 90, 180];

export default function Focus() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Focus</h1>
          {cameraId !== null && <Content cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function Content({ cameraId }: { cameraId: number }) {
  const [zoom, setZoom] = useState(2);
  const [xOffset, setXOffset] = useState(0);
  const [yOffset, setYOffset] = useState(0);
  const [refresh, setRefresh] = useState(3000);

  const [degrees, setDegrees] = useState(24);
  const [stepsOffset, setStepsOffset] = useState(0);
  const [focusError, setFocusError] = useState<string | null>(null);

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const configQ = useQuery({
    queryKey: ['config'],
    queryFn: () => api<ConfigResp>('/config'),
    staleTime: 5 * 60_000,
  });
  const hasFocuser = !!configQ.data?.config?.FOCUSER?.CLASSNAME;

  const params = new URLSearchParams({
    camera_id: String(cameraId),
    zoom: String(zoom),
    x_offset: String(xOffset),
    y_offset: String(yOffset),
  });

  const q = useQuery({
    queryKey: ['focus', cameraId, zoom, xOffset, yOffset],
    queryFn: () => api<FocusResp>(`/focus?${params.toString()}`),
    refetchInterval: refresh,
  });

  const move = useMutation({
    mutationFn: (body: { DIRECTION: string; STEP_DEGREES: number }) =>
      api<FocusControllerResp>('/focus/controller', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setFocusError(null);
      setStepsOffset((prev) => prev + data.steps);
    },
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as FocusControllerError | null) : null;
      const msg =
        body?.focuser_error?.[0] ||
        body?.DIRECTION?.[0] ||
        body?.STEP_DEGREES?.[0] ||
        (err instanceof Error ? err.message : 'Focuser error');
      setFocusError(msg);
    },
  });

  const d = q.data;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4 bg-bg-1 border border-edge rounded-lg p-3">
        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Zoom
          <select
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm"
          >
            {ZOOM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Refresh
          <select
            value={refresh}
            onChange={(e) => setRefresh(Number(e.target.value))}
            className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm"
          >
            {REFRESH_OPTIONS.map((s) => (
              <option key={s} value={s * 1000}>{s}s</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          X Offset
          <input
            type="number"
            value={xOffset}
            onChange={(e) => setXOffset(Number(e.target.value) || 0)}
            className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm w-28"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Y Offset
          <input
            type="number"
            value={yOffset}
            onChange={(e) => setYOffset(Number(e.target.value) || 0)}
            className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm w-28"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        <Metric label="Score" value={d ? d.blur_score.toFixed(2) : '—'} className="text-danger" />
        <Metric label="Stars" value={d ? String(d.star_count) : '—'} className="text-info" />
        <Metric label="Focus Mode" value={d ? (d.focus_mode ? 'On' : 'Off') : '—'} className="text-ink" />
      </div>

      {d && !d.focus_mode && (
        <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Enable <b>Focus Mode</b> in the configuration and reload the configuration for best results.
        </div>
      )}

      <div className="flex items-center justify-center bg-bg-1 border border-edge rounded-lg p-2 h-[70vh]">
        {q.isLoading ? (
          <div className="text-ink-dim text-sm">Loading…</div>
        ) : q.error || !d ? (
          <div className="text-danger text-sm">Failed to load focus image</div>
        ) : d.image_b64 ? (
          <img
            src={`data:image/jpeg;base64,${d.image_b64}`}
            alt="Focus crop"
            className="h-full w-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        ) : (
          <div className="text-ink-dim text-sm">No image available</div>
        )}
      </div>

      {hasFocuser && (
        <div className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-col gap-3 max-w-md">
          <div className="text-ink-bright text-sm font-medium">Focuser</div>

          {!isAdmin && (
            <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
              Read-only — admin required to move the focuser.
            </div>
          )}

          {focusError && (
            <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
              <div className="flex-1">{focusError}</div>
              <button onClick={() => setFocusError(null)} className="opacity-60 hover:opacity-100 text-base leading-none px-1">×</button>
            </div>
          )}

          <div className="flex items-end gap-3">
            <button
              type="button"
              disabled={!isAdmin || move.isPending}
              onClick={() => { setFocusError(null); move.mutate({ DIRECTION: 'ccw', STEP_DEGREES: degrees }); }}
              className="px-3 py-2 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Focus −
            </button>

            <label className="flex flex-col gap-1 text-xs text-ink-dim">
              Step
              <select
                value={degrees}
                onChange={(e) => setDegrees(Number(e.target.value))}
                className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm"
              >
                {STEP_DEGREES_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s} degrees</option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={!isAdmin || move.isPending}
              onClick={() => { setFocusError(null); move.mutate({ DIRECTION: 'cw', STEP_DEGREES: degrees }); }}
              className="px-3 py-2 rounded-md bg-danger/15 hover:bg-danger/25 border border-danger/40 text-danger text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Focus +
            </button>
          </div>

          <div className="text-[11px] text-ink-dim">{stepsOffset} Steps Offset</div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg px-4 py-2">
      <div className="text-[11px] text-ink-dim">{label}</div>
      <div className={['font-mono text-lg', className || 'text-ink'].join(' ')}>{value}</div>
    </div>
  );
}
