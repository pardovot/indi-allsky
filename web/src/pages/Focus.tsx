import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface FocusResp {
  changed: boolean;
  frame_ts: number;
  image_b64?: string | null;
  blur_score?: number;
  star_count?: number;
  hfd?: number | null;
  hfd_samples?: number;
  histogram?: number[];
  mean?: number;
  max?: number;
  clipped_low_pct?: number;
  clipped_high_pct?: number;
  image_width?: number;
  image_height?: number;
  focus_mode: boolean;
}

interface FocusSession {
  active: boolean;
  camera_id: number;
  exposure: number;
  gain: number;
  binning: number;
  interval: number;
  expires: number;
}

interface CameraLimits {
  exposure_min: number;
  exposure_max: number;
  exposure_default: number;
  gain_min: number;
  gain_max: number;
  binning_min: number;
  binning_max: number;
  width: number;
  height: number;
}

interface SessionResp {
  session: FocusSession | null;
  limits: CameraLimits | Record<string, never>;
  defaults: SessionPatch;
  ttl: number;
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

interface SessionPatch {
  exposure?: number;
  gain?: number;
  binning?: number;
  interval?: number;
}

/** Sample of the focus metrics for one frame, used to draw the trend lines. */
interface MetricSample {
  ts: number;
  blur: number;
  stars: number;
  hfd: number | null;
}

const FRAME_POLL_MS = 1000;
const HISTORY_LENGTH = 90;

/** How long the view must hold still before the measured region is re-sent. */
const VIEW_SETTLE_MS = 400;

/** Slider changes fire continuously, so capture parameters are sent on a delay. */
const CONTROL_DEBOUNCE_MS = 250;

const MAG_MIN = 1;
const MAG_MAX = 40;
const MAG_PRESETS = [1, 2, 4, 8, 16, 32];

const EXPOSURE_PRESETS_S = [
  0.001, 0.002, 0.004, 0.008, 0.016, 0.032, 0.064, 0.125, 0.25, 0.5,
  1, 2, 5, 10, 15, 30,
];

const INTERVAL_PRESETS_S = [0.5, 1, 2, 5, 10];

/** One third of a stop, the finest step worth nudging an exposure by. */
const THIRD_STOP = Math.pow(2, 1 / 3);

const STEP_DEGREES_OPTIONS = [6, 12, 24, 45, 90, 180];

const AUTO_ENABLE_KEY = 'allsky_focus_auto_enable';
const LAST_SETTINGS_KEY = 'allsky_focus_settings';

const NO_VALUE = '--';

function clamp(value: number, lower: number, upper: number): number {
  if (upper < lower) return lower;
  return Math.max(lower, Math.min(upper, value));
}

/** Keep the viewed region inside the frame so zooming never reveals empty space. */
function clampCenter(value: number, magnification: number): number {
  const half = 0.5 / magnification;
  if (half >= 0.5) return 0.5;
  return clamp(value, half, 1 - half);
}

/** Position on a logarithmic slider, 0..1, for a value inside [min, max]. */
function toLogPosition(value: number, min: number, max: number): number {
  if (min <= 0 || max <= min) return 0;
  return Math.log(clamp(value, min, max) / min) / Math.log(max / min);
}

function fromLogPosition(position: number, min: number, max: number): number {
  if (min <= 0 || max <= min) return min;
  return min * Math.pow(max / min, clamp(position, 0, 1));
}

function formatExposure(seconds: number): string {
  if (seconds < 0.001) return `${(seconds * 1_000_000).toFixed(0)}us`;
  if (seconds < 1) return `${(seconds * 1000).toFixed(seconds < 0.01 ? 1 : 0)}ms`;
  return `${seconds.toFixed(seconds < 10 ? 2 : 1)}s`;
}

function readStoredSettings(): SessionPatch | null {
  const raw = localStorage.getItem(LAST_SETTINGS_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPatch;
  } catch {
    return null;
  }
}

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
  const queryClient = useQueryClient();

  const [mag, setMag] = useState(1);
  const [centerX, setCenterX] = useState(0.5);
  const [centerY, setCenterY] = useState(0.5);

  // zooming out has to pull the centre back towards the middle
  const magRef = useRef(mag);
  magRef.current = mag;

  const applyMag = useCallback((value: number) => {
    const bounded = clamp(value, MAG_MIN, MAG_MAX);
    setMag(bounded);
    setCenterX((prev) => clampCenter(prev, bounded));
    setCenterY((prev) => clampCenter(prev, bounded));
  }, []);

  const [autoEnable, setAutoEnable] = useState(
    () => localStorage.getItem(AUTO_ENABLE_KEY) === 'on',
  );

  const [history, setHistory] = useState<MetricSample[]>([]);
  const [sessionError, setSessionError] = useState<string | null>(null);

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

  const sessionQ = useQuery({
    queryKey: ['focus-session', cameraId],
    queryFn: () => api<SessionResp>(`/focus/session?camera_id=${cameraId}`),
    refetchInterval: 15_000,
  });

  const session = sessionQ.data?.session ?? null;
  const limits = (sessionQ.data?.limits ?? null) as CameraLimits | null;
  const hasLimits = !!limits && limits.exposure_max > 0;

  const setSession = useMutation({
    mutationFn: (patch: SessionPatch) =>
      api<{ session: FocusSession }>('/focus/session', {
        method: 'POST',
        body: JSON.stringify({ camera_id: cameraId, ...patch }),
      }),
    onSuccess: (data, patch) => {
      setSessionError(null);
      queryClient.setQueryData<SessionResp>(['focus-session', cameraId], (prev) =>
        prev ? { ...prev, session: data.session } : prev,
      );

      // drop the drafts this request carried so the values the camera accepted,
      // which may have been clamped, are what gets displayed
      setDraft((prev) => {
        const next = { ...prev };
        for (const key of Object.keys(patch) as (keyof SessionPatch)[]) {
          delete next[key];
        }
        return next;
      });

      localStorage.setItem(
        LAST_SETTINGS_KEY,
        JSON.stringify({
          exposure: data.session.exposure,
          gain: data.session.gain,
          binning: data.session.binning,
          interval: data.session.interval,
        }),
      );
    },
    onError: (err: unknown) => {
      setSessionError(err instanceof Error ? err.message : 'Could not update focus session');
    },
  });

  const stopSession = useMutation({
    mutationFn: () => api<{ session: null }>('/focus/session', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.setQueryData<SessionResp>(['focus-session', cameraId], (prev) =>
        prev ? { ...prev, session: null } : prev,
      );
    },
    onError: (err: unknown) => {
      setSessionError(err instanceof Error ? err.message : 'Could not stop focus session');
    },
  });

  // Draft values so a slider stays responsive while the capture worker catches up
  const [draft, setDraft] = useState<SessionPatch>({});
  const debounceRef = useRef<number | undefined>(undefined);

  const applySettings = useCallback(
    (patch: SessionPatch, immediate = false) => {
      setDraft((prev) => ({ ...prev, ...patch }));

      window.clearTimeout(debounceRef.current);
      const send = () => setSession.mutate(patch);

      if (immediate) {
        send();
      } else {
        debounceRef.current = window.setTimeout(send, CONTROL_DEBOUNCE_MS);
      }
    },
    [setSession],
  );

  useEffect(() => () => window.clearTimeout(debounceRef.current), []);

  const defaults = sessionQ.data?.defaults ?? {};

  const exposure =
    draft.exposure ?? session?.exposure ?? defaults.exposure ?? limits?.exposure_default ?? 0.1;
  const gain = draft.gain ?? session?.gain ?? defaults.gain ?? limits?.gain_min ?? 0;
  const binning = draft.binning ?? session?.binning ?? defaults.binning ?? 1;
  const frameInterval = draft.interval ?? session?.interval ?? 2;

  // Start a session on arrival so focusing does not begin with a config change
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!autoEnable || autoStarted.current) return;
    if (!isAdmin || !hasLimits || sessionQ.isLoading) return;
    if (session) {
      autoStarted.current = true;
      return;
    }

    autoStarted.current = true;
    setSession.mutate(readStoredSettings() ?? {});
  }, [autoEnable, isAdmin, hasLimits, sessionQ.isLoading, session, setSession]);

  // Refresh the expiration so the session survives while this page is open
  const sessionActiveRef = useRef(false);
  sessionActiveRef.current = !!session;

  const heartbeatRef = useRef(() => setSession.mutate({}));
  heartbeatRef.current = () => setSession.mutate({});

  useEffect(() => {
    if (!isAdmin) return;

    const ttl = sessionQ.data?.ttl ?? 90;
    const timer = window.setInterval(() => {
      if (sessionActiveRef.current) heartbeatRef.current();
    }, Math.max(15_000, (ttl * 1000) / 3));

    return () => window.clearInterval(timer);
  }, [isAdmin, sessionQ.data?.ttl]);

  // Leaving the page returns the camera to normal capture without waiting for the
  // session to expire
  useEffect(() => {
    return () => {
      autoStarted.current = false;

      if (sessionActiveRef.current) {
        api('/focus/session', { method: 'DELETE' }).catch(() => {
          // the session expires on its own if this never lands
        });
      }
    };
  }, []);

  // The image is always the whole frame and is magnified in the browser, so
  // panning costs nothing. Only the measured region has to reach the server, and
  // it is held back until the view stops moving.
  const [settledView, setSettledView] = useState({ mag: 1, centerX: 0.5, centerY: 0.5 });

  useEffect(() => {
    const timer = window.setTimeout(
      () => setSettledView({ mag, centerX, centerY }),
      VIEW_SETTLE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [mag, centerX, centerY]);

  const viewKey = `${settledView.mag.toFixed(3)}|${settledView.centerX.toFixed(4)}|${settledView.centerY.toFixed(4)}`;
  const lastFrame = useRef<{ viewKey: string; data: FocusResp } | null>(null);

  // scores from a different region are not comparable, so the trend starts over
  useEffect(() => {
    setHistory([]);
  }, [viewKey]);

  const frameQ = useQuery({
    queryKey: ['focus', cameraId, viewKey],
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({
        camera_id: String(cameraId),
        mag: '1',
        roi_mag: settledView.mag.toFixed(3),
        roi_cx: settledView.centerX.toFixed(4),
        roi_cy: settledView.centerY.toFixed(4),
      });

      const cached = lastFrame.current;
      if (cached) {
        params.set('since', String(cached.data.frame_ts));

        // the frame may be unchanged while the region we measure has moved
        if (cached.viewKey !== viewKey) {
          params.set('recompute', '1');
        }
      }

      const resp = await api<FocusResp>(`/focus?${params.toString()}`, { signal });

      if (!resp.changed && cached) return cached.data;

      // a region-only update carries no image, so keep the one already loaded
      const merged = resp.image_b64
        ? resp
        : { ...resp, image_b64: cached?.data.image_b64 ?? null };

      lastFrame.current = { viewKey, data: merged };
      return merged;
    },
    refetchInterval: FRAME_POLL_MS,
  });

  const frame = frameQ.data;

  useEffect(() => {
    if (!frame || !frame.changed || frame.blur_score === undefined) return;

    setHistory((prev) => {
      if (prev.length && prev[prev.length - 1].ts === frame.frame_ts) return prev;
      const next = [
        ...prev,
        {
          ts: frame.frame_ts,
          blur: frame.blur_score ?? 0,
          stars: frame.star_count ?? 0,
          hfd: frame.hfd ?? null,
        },
      ];
      return next.slice(-HISTORY_LENGTH);
    });
  }, [frame]);

  const hfdValues = useMemo(
    () => history.map((h) => h.hfd).filter((v): v is number => v !== null),
    [history],
  );

  const bestBlur = history.length ? Math.max(...history.map((h) => h.blur)) : null;
  const bestHfd = hfdValues.length ? Math.min(...hfdValues) : null;

  const toggleAutoEnable = (value: boolean) => {
    setAutoEnable(value);
    localStorage.setItem(AUTO_ENABLE_KEY, value ? 'on' : 'off');
  };

  return (
    <div className="flex flex-col gap-4">
      <SessionBar
        session={session}
        isAdmin={isAdmin}
        pending={setSession.isPending || stopSession.isPending}
        autoEnable={autoEnable}
        onAutoEnableChange={toggleAutoEnable}
        onStart={() => setSession.mutate(readStoredSettings() ?? {})}
        onStop={() => stopSession.mutate()}
        error={sessionError}
        onDismissError={() => setSessionError(null)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
        <div className="flex flex-col gap-4">
          <FocusView
            frame={frame}
            loading={frameQ.isLoading}
            error={!!frameQ.error}
            mag={mag}
            centerX={centerX}
            centerY={centerY}
            onPan={(dx, dy) => {
              setCenterX((prev) => clampCenter(prev + dx, magRef.current));
              setCenterY((prev) => clampCenter(prev + dy, magRef.current));
            }}
            onZoom={(factor) => applyMag(magRef.current * factor)}
          />

          <ZoomControls
            mag={mag}
            centerX={centerX}
            centerY={centerY}
            aspect={
              frame?.image_width && frame?.image_height
                ? frame.image_width / frame.image_height
                : 1.5
            }
            imageB64={frame?.image_b64}
            onMagChange={applyMag}
            onCenterChange={(x, y) => {
              setCenterX(clampCenter(x, magRef.current));
              setCenterY(clampCenter(y, magRef.current));
            }}
            onReset={() => {
              setMag(1);
              setCenterX(0.5);
              setCenterY(0.5);
            }}
          />
        </div>

        <div className="flex flex-col gap-4">
          <MetricsPanel
            frame={frame}
            history={history}
            bestBlur={bestBlur}
            bestHfd={bestHfd}
          />

          <HistogramPanel frame={frame} />
        </div>
      </div>

      {hasLimits && limits && (
        <CaptureControls
          limits={limits}
          exposure={exposure}
          gain={gain}
          binning={binning}
          interval={frameInterval}
          disabled={!isAdmin || !session}
          onChange={applySettings}
        />
      )}

      {hasFocuser && <FocuserPanel isAdmin={isAdmin} />}
    </div>
  );
}

function SessionBar({
  session,
  isAdmin,
  pending,
  autoEnable,
  onAutoEnableChange,
  onStart,
  onStop,
  error,
  onDismissError,
}: {
  session: FocusSession | null;
  isAdmin: boolean;
  pending: boolean;
  autoEnable: boolean;
  onAutoEnableChange: (value: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  error: string | null;
  onDismissError: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 bg-bg-1 border border-edge rounded-lg p-3">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!isAdmin || pending}
          onClick={() => (session ? onStop() : onStart())}
          className={[
            'px-4 py-2 rounded-md text-sm font-medium border disabled:opacity-50 disabled:cursor-not-allowed',
            session
              ? 'bg-warn/20 hover:bg-warn/30 border-warn/40 text-warn'
              : 'bg-info/15 hover:bg-info/25 border-info/40 text-info',
          ].join(' ')}
        >
          {session ? 'Stop focus mode' : 'Start focus mode'}
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span
            className={[
              'inline-block w-2 h-2 rounded-full',
              session ? 'bg-warn' : 'bg-ink-dim',
            ].join(' ')}
          />
          <span className={session ? 'text-warn' : 'text-ink-dim'}>
            {session ? 'Focus mode active' : 'Normal capture'}
          </span>
        </div>

        <label className="flex items-center gap-2 text-xs text-ink-dim ml-auto">
          <input
            type="checkbox"
            checked={autoEnable}
            onChange={(e) => onAutoEnableChange(e.target.checked)}
            className="accent-accent"
          />
          Enable automatically when this page opens
        </label>
      </div>

      {!isAdmin && (
        <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Read-only, admin required to change capture settings.
        </div>
      )}

      {session && (
        <div className="text-[11px] text-ink-dim">
          Focus mode skips image processing and stops saving timelapse frames. It ends on its
          own shortly after you leave this page.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
          <div className="flex-1">{error}</div>
          <button onClick={onDismissError} className="opacity-60 hover:opacity-100 text-base leading-none px-1">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}

function FocusView({
  frame,
  loading,
  error,
  mag,
  centerX,
  centerY,
  onPan,
  onZoom,
}: {
  frame: FocusResp | undefined;
  loading: boolean;
  error: boolean;
  mag: number;
  centerX: number;
  centerY: number;
  onPan: (dx: number, dy: number) => void;
  onZoom: (factor: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (mag <= 1) return;
    dragRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const start = dragRef.current;
    const img = imgRef.current;
    if (!start || !img) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    dragRef.current = { x: e.clientX, y: e.clientY };

    // offsetWidth is the untransformed layout size, so the drag scales with zoom
    // dragging right should reveal what is to the left of the view
    onPan(-dx / (img.offsetWidth * mag), -dy / (img.offsetHeight * mag));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;

    // registered here rather than via onWheel so preventDefault is honoured
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      onZoom(Math.exp(-e.deltaY * 0.002));
    };

    box.addEventListener('wheel', onWheel, { passive: false });
    return () => box.removeEventListener('wheel', onWheel);
  }, [onZoom]);

  return (
    <div
      ref={boxRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={[
        'relative flex items-center justify-center bg-bg-1 border border-edge rounded-lg p-2 h-[62vh] overflow-hidden touch-none select-none',
        mag > 1 ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
      ].join(' ')}
    >
      {loading && !frame ? (
        <div className="text-ink-dim text-sm">Loading...</div>
      ) : error || !frame ? (
        <div className="text-danger text-sm">Failed to load focus image</div>
      ) : frame.image_b64 ? (
        <img
          ref={imgRef}
          src={`data:image/jpeg;base64,${frame.image_b64}`}
          alt="Focus view"
          draggable={false}
          className="max-h-full max-w-full"
          style={{
            imageRendering: 'pixelated',
            // scaling about the element centre after shifting the target point
            // there puts the chosen region in the middle of the box
            transform: `scale(${mag}) translate(${(0.5 - centerX) * 100}%, ${(0.5 - centerY) * 100}%)`,
          }}
        />
      ) : (
        <div className="text-ink-dim text-sm">No image available</div>
      )}

      <div className="absolute top-3 left-3 flex gap-2 text-[11px] font-mono">
        <span className="px-2 py-1 rounded bg-bg-2/80 border border-edge text-ink-dim">
          {mag.toFixed(1)}x
        </span>
        {mag > 1 && (
          <span className="px-2 py-1 rounded bg-bg-2/80 border border-edge text-ink-dim">
            {(centerX * 100).toFixed(0)}%, {(centerY * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {mag > 1 && (
        <div className="absolute bottom-3 left-3 text-[11px] text-ink-dim px-2 py-1 rounded bg-bg-2/80 border border-edge">
          Drag to pan, scroll to zoom
        </div>
      )}
    </div>
  );
}

function ZoomControls({
  mag,
  centerX,
  centerY,
  aspect,
  imageB64,
  onMagChange,
  onCenterChange,
  onReset,
}: {
  mag: number;
  centerX: number;
  centerY: number;
  aspect: number;
  imageB64: string | null | undefined;
  onMagChange: (value: number) => void;
  onCenterChange: (x: number, y: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 bg-bg-1 border border-edge rounded-lg p-3">
      <div className="flex-1 min-w-[260px] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-ink-dim">
          <span>Zoom</span>
          <span className="font-mono text-ink">{mag.toFixed(1)}x</span>
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.001}
          value={toLogPosition(mag, MAG_MIN, MAG_MAX)}
          onChange={(e) => onMagChange(fromLogPosition(Number(e.target.value), MAG_MIN, MAG_MAX))}
          className="w-full accent-accent"
        />

        <div className="flex flex-wrap gap-1">
          {MAG_PRESETS.map((value) => (
            <PresetButton
              key={value}
              active={Math.abs(mag - value) < 0.05}
              onClick={() => onMagChange(value)}
            >
              {value === 1 ? 'Full' : `${value}x`}
            </PresetButton>
          ))}
          <PresetButton active={false} onClick={onReset}>
            Reset
          </PresetButton>
        </div>
      </div>

      <Locator
        aspect={aspect}
        mag={mag}
        centerX={centerX}
        centerY={centerY}
        imageB64={imageB64}
        onPick={onCenterChange}
      />
    </div>
  );
}

/** Frame outline with the viewed region marked, click to recentre. */
function Locator({
  aspect,
  mag,
  centerX,
  centerY,
  imageB64,
  onPick,
}: {
  aspect: number;
  mag: number;
  centerX: number;
  centerY: number;
  imageB64: string | null | undefined;
  onPick: (x: number, y: number) => void;
}) {
  const width = 132;
  const height = Math.round(width / (aspect || 1.5));

  const boxWidth = width / mag;
  const boxHeight = height / mag;
  const left = clamp(centerX * width - boxWidth / 2, 0, width - boxWidth);
  const top = clamp(centerY * height - boxHeight / 2, 0, height - boxHeight);

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-dim">Position</span>
      <div
        className="relative bg-bg-2 border border-edge rounded cursor-crosshair overflow-hidden"
        style={{ width, height }}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onPick((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
        }}
      >
        {/* the whole frame is already loaded, so the thumbnail costs no request */}
        {imageB64 && (
          <img
            src={`data:image/jpeg;base64,${imageB64}`}
            alt=""
            draggable={false}
            className="absolute inset-0 w-full h-full object-fill opacity-70"
          />
        )}

        <div
          className="absolute border border-accent bg-accent/20 pointer-events-none"
          style={{ left, top, width: boxWidth, height: boxHeight }}
        />
      </div>
    </div>
  );
}

function CaptureControls({
  limits,
  exposure,
  gain,
  binning,
  interval,
  disabled,
  onChange,
}: {
  limits: CameraLimits;
  exposure: number;
  gain: number;
  binning: number;
  interval: number;
  disabled: boolean;
  onChange: (patch: SessionPatch, immediate?: boolean) => void;
}) {
  const exposurePresets = EXPOSURE_PRESETS_S.filter(
    (value) => value >= limits.exposure_min && value <= limits.exposure_max,
  );

  const gainPresets = [0, 0.25, 0.5, 0.75, 1].map(
    (fraction) => limits.gain_min + (limits.gain_max - limits.gain_min) * fraction,
  );

  return (
    <div className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-col gap-5">
      <div className="text-ink-bright text-sm font-medium">Capture</div>

      {disabled && (
        <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Start focus mode to change exposure and gain.
        </div>
      )}

      <fieldset disabled={disabled} className="contents">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-ink-dim">
              <span>Exposure</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      { exposure: clamp(exposure / THIRD_STOP, limits.exposure_min, limits.exposure_max) },
                      true,
                    )
                  }
                  className="px-2 py-0.5 rounded bg-bg-2 border border-edge text-ink hover:border-accent disabled:opacity-40"
                >
                  -1/3
                </button>
                <span className="font-mono text-ink w-20 text-right">{formatExposure(exposure)}</span>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      { exposure: clamp(exposure * THIRD_STOP, limits.exposure_min, limits.exposure_max) },
                      true,
                    )
                  }
                  className="px-2 py-0.5 rounded bg-bg-2 border border-edge text-ink hover:border-accent disabled:opacity-40"
                >
                  +1/3
                </button>
              </div>
            </div>

            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={toLogPosition(exposure, limits.exposure_min, limits.exposure_max)}
              onChange={(e) =>
                onChange({
                  exposure: fromLogPosition(
                    Number(e.target.value),
                    limits.exposure_min,
                    limits.exposure_max,
                  ),
                })
              }
              className="w-full accent-accent"
            />

            <div className="flex flex-wrap gap-1">
              {exposurePresets.map((value) => (
                <PresetButton
                  key={value}
                  active={Math.abs(exposure - value) / value < 0.01}
                  onClick={() => onChange({ exposure: value }, true)}
                >
                  {formatExposure(value)}
                </PresetButton>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-ink-dim">
              <span>Gain</span>
              <span className="font-mono text-ink">{gain.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min={limits.gain_min}
              max={limits.gain_max}
              step={(limits.gain_max - limits.gain_min) / 200}
              value={gain}
              onChange={(e) => onChange({ gain: Number(e.target.value) })}
              className="w-full accent-accent"
            />

            <div className="flex flex-wrap gap-1">
              {gainPresets.map((value) => (
                <PresetButton
                  key={value}
                  active={Math.abs(gain - value) < 0.5}
                  onClick={() => onChange({ gain: value }, true)}
                >
                  {value.toFixed(0)}
                </PresetButton>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          {limits.binning_max > 1 && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-ink-dim">Binning</span>
              <div className="flex gap-1">
                {Array.from(
                  { length: limits.binning_max - limits.binning_min + 1 },
                  (_, index) => limits.binning_min + index,
                ).map((value) => (
                  <PresetButton
                    key={value}
                    active={binning === value}
                    onClick={() => onChange({ binning: value }, true)}
                  >
                    {value}x{value}
                  </PresetButton>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs text-ink-dim">
              Frame interval <span className="font-mono text-ink">{interval.toFixed(1)}s</span>
            </span>
            <div className="flex gap-1">
              {INTERVAL_PRESETS_S.map((value) => (
                <PresetButton
                  key={value}
                  active={Math.abs(interval - value) < 0.05}
                  onClick={() => onChange({ interval: value }, true)}
                >
                  {value}s
                </PresetButton>
              ))}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}

function MetricsPanel({
  frame,
  history,
  bestBlur,
  bestHfd,
}: {
  frame: FocusResp | undefined;
  history: MetricSample[];
  bestBlur: number | null;
  bestHfd: number | null;
}) {
  const hfdSeries = history.map((h) => h.hfd ?? 0);

  return (
    <div className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-col gap-3">
      <div className="text-ink-bright text-sm font-medium">Focus quality</div>

      <Metric
        label="HFD"
        hint="half flux diameter, lower is sharper"
        value={frame?.hfd != null ? frame.hfd.toFixed(2) : NO_VALUE}
        best={bestHfd != null ? `best ${bestHfd.toFixed(2)}` : null}
        series={hfdSeries}
        invert
        className="text-accent"
      />

      <Metric
        label="Score"
        hint="variance of laplacian, higher is sharper"
        value={frame?.blur_score != null ? frame.blur_score.toFixed(2) : NO_VALUE}
        best={bestBlur != null ? `best ${bestBlur.toFixed(2)}` : null}
        series={history.map((h) => h.blur)}
        className="text-danger"
      />

      <Metric
        label="Stars"
        hint={frame?.hfd_samples ? `${frame.hfd_samples} measured` : undefined}
        value={frame?.star_count != null ? String(frame.star_count) : NO_VALUE}
        best={null}
        series={history.map((h) => h.stars)}
        className="text-info"
      />
    </div>
  );
}

function Metric({
  label,
  hint,
  value,
  best,
  series,
  invert = false,
  className,
}: {
  label: string;
  hint?: string;
  value: string;
  best: string | null;
  series: number[];
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0">
        <div className="text-[11px] text-ink-dim">{label}</div>
        <div className={['font-mono text-lg leading-tight', className || 'text-ink'].join(' ')}>
          {value}
        </div>
        {best && <div className="text-[10px] text-ink-dim">{best}</div>}
      </div>

      <div className="flex-1 min-w-0">
        <Sparkline values={series} invert={invert} />
        {hint && <div className="text-[10px] text-ink-dim mt-1">{hint}</div>}
      </div>
    </div>
  );
}

function Sparkline({ values, invert }: { values: number[]; invert: boolean }) {
  const width = 180;
  const height = 34;

  const usable = values.filter((v) => Number.isFinite(v));
  if (usable.length < 2) {
    return <div className="h-[34px] flex items-center text-[10px] text-ink-dim">collecting...</div>;
  }

  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min || 1;

  const points = usable
    .map((value, index) => {
      const x = (index / (usable.length - 1)) * width;
      const normalized = (value - min) / span;
      // an inverted metric improves downward, so draw it rising as it improves
      const y = height - (invert ? 1 - normalized : normalized) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[34px]" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="text-accent"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function HistogramPanel({ frame }: { frame: FocusResp | undefined }) {
  const histogram = frame?.histogram;

  return (
    <div className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <div className="text-ink-bright text-sm font-medium">Histogram</div>
        {frame?.mean !== undefined && (
          <div className="text-[11px] text-ink-dim font-mono">
            mean {frame.mean.toFixed(1)}, peak {frame.max}
          </div>
        )}
      </div>

      {histogram && histogram.length ? (
        <HistogramChart bins={histogram} />
      ) : (
        <div className="h-[90px] flex items-center text-xs text-ink-dim">No data</div>
      )}

      {frame?.clipped_high_pct !== undefined && (
        <div className="flex gap-4 text-[11px]">
          <span className={frame.clipped_high_pct > 0.5 ? 'text-danger' : 'text-ink-dim'}>
            clipped white {frame.clipped_high_pct.toFixed(2)}%
          </span>
          <span className={(frame.clipped_low_pct ?? 0) > 50 ? 'text-warn' : 'text-ink-dim'}>
            black {(frame.clipped_low_pct ?? 0).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

function HistogramChart({ bins }: { bins: number[] }) {
  const height = 90;
  const width = bins.length;

  // counts span orders of magnitude, so a linear axis hides the star pixels
  const scaled = bins.map((count) => Math.log10(count + 1));
  const peak = Math.max(...scaled) || 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[90px]" preserveAspectRatio="none">
      {scaled.map((value, index) => {
        const barHeight = (value / peak) * height;
        return (
          <rect
            key={index}
            x={index}
            y={height - barHeight}
            width={1}
            height={barHeight}
            className="fill-ink-dim"
          />
        );
      })}
    </svg>
  );
}

function FocuserPanel({ isAdmin }: { isAdmin: boolean }) {
  const [degrees, setDegrees] = useState(24);
  const [stepsOffset, setStepsOffset] = useState(0);
  const [focusError, setFocusError] = useState<string | null>(null);

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

  return (
    <div className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-col gap-3 max-w-md">
      <div className="text-ink-bright text-sm font-medium">Focuser</div>

      {!isAdmin && (
        <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Read-only, admin required to move the focuser.
        </div>
      )}

      {focusError && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
          <div className="flex-1">{focusError}</div>
          <button
            onClick={() => setFocusError(null)}
            className="opacity-60 hover:opacity-100 text-base leading-none px-1"
          >
            &times;
          </button>
        </div>
      )}

      <div className="flex items-end gap-3">
        <button
          type="button"
          disabled={!isAdmin || move.isPending}
          onClick={() => {
            setFocusError(null);
            move.mutate({ DIRECTION: 'ccw', STEP_DEGREES: degrees });
          }}
          className="px-3 py-2 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Focus -
        </button>

        <label className="flex flex-col gap-1 text-xs text-ink-dim">
          Step
          <select
            value={degrees}
            onChange={(e) => setDegrees(Number(e.target.value))}
            className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-sm"
          >
            {STEP_DEGREES_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s} degrees
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          disabled={!isAdmin || move.isPending}
          onClick={() => {
            setFocusError(null);
            move.mutate({ DIRECTION: 'cw', STEP_DEGREES: degrees });
          }}
          className="px-3 py-2 rounded-md bg-danger/15 hover:bg-danger/25 border border-danger/40 text-danger text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Focus +
        </button>
      </div>

      <div className="text-[11px] text-ink-dim">{stepsOffset} Steps Offset</div>
    </div>
  );
}

function PresetButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-2 py-1 rounded text-[11px] border font-mono',
        active
          ? 'bg-accent/20 border-accent/50 text-accent'
          : 'bg-bg-2 border-edge text-ink-dim hover:text-ink hover:border-accent/40',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
