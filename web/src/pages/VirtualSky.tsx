import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { loadScript } from '@/lib/loadScript';
import Header from '@/components/Header';
import NavDrawer from '@/components/NavDrawer';
import StatusPanel from '@/components/StatusPanel';

interface Camera { id: number; name: string; friendlyName: string | null; }

interface LoopImage { url: string; width: number; height: number; timestamp: number; }
interface LoopResp { message: string; image_list: LoopImage[]; }

interface VsConfig {
  camera_latitude: number;
  camera_longitude: number;
  time_offset: number;
  defaults: {
    AZIMUTH_ANGLE: number;
    IMAGE_CIRCLE_DIAMETER: number;
    LATITUDE_OFFSET: number;
    LONGITUDE_OFFSET: number;
    OFFSET_X: number;
    OFFSET_Y: number;
    MAGNITUDE: number;
    CONSTELLATIONS: boolean;
    CONSTELLATIONLABELS: boolean;
    SHOWSTARS: boolean;
    SHOWSTARLABELS: boolean;
    SHOWPLANETS: boolean;
    SHOWPLANETLABELS: boolean;
  };
}

interface VsParams {
  AZIMUTH_ANGLE: number;
  IMAGE_CIRCLE_DIAMETER: number;
  LATITUDE_OFFSET: number;
  LONGITUDE_OFFSET: number;
  OFFSET_X: number;
  OFFSET_Y: number;
  MAGNITUDE: number;
  CONSTELLATIONS: boolean;
  CONSTELLATIONLABELS: boolean;
  SHOWSTARS: boolean;
  SHOWSTARLABELS: boolean;
  SHOWPLANETS: boolean;
  SHOWPLANETLABELS: boolean;
}

const CAMERA_PREF_KEY = 'allsky_camera_id';

function resolveImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

// Global handles attached by the legacy scripts
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { S?: any; html2canvas?: any; }
}

export default function VirtualSky() {
  const [params] = useSearchParams();
  const anchorTs = Number(params.get('timestamp') || 0);
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });
  const [scriptsReady, setScriptsReady] = useState(false);
  const [vsParams, setVsParams] = useState<VsParams | null>(null);
  const [downloading, setDownloading] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const starmapRef = useRef<HTMLDivElement>(null);
  const lastTsRef = useRef(0);

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);

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

  const configQ = useQuery({
    queryKey: ['vs-config', cameraId],
    queryFn: () => api<VsConfig>(`/virtualsky-config?camera_id=${cameraId}`),
    enabled: cameraId !== null,
  });

  // Populate form once config arrives
  useEffect(() => {
    if (!configQ.data || vsParams) return;
    setVsParams({ ...configQ.data.defaults });
  }, [configQ.data, vsParams]);

  const loopQ = useQuery({
    queryKey: ['vs-loop', cameraId, anchorTs],
    queryFn: () => {
      const ts = anchorTs > 0 ? `&timestamp=${anchorTs}` : '';
      return api<LoopResp>(`/loop?camera_id=${cameraId}&limit_s=900${ts}`);
    },
    enabled: cameraId !== null,
    refetchInterval: anchorTs > 0 ? false : 60_000,
  });

  // Load the legacy VirtualSky scripts once
  useEffect(() => {
    Promise.all([
      loadScript('/indi-allsky/static/virtualsky/stuquery.min.js'),
      loadScript('/indi-allsky/static/virtualsky/virtualsky.min.js'),
    ])
      .then(() => setScriptsReady(true))
      .catch((e) => console.error('VS script load failed', e));
  }, []);

  const latest = loopQ.data?.image_list?.[0];

  const renderPlanetarium = useCallback(() => {
    const cfg = configQ.data;
    const p = vsParams;
    if (!cfg || !p || !latest || !window.S || !imgRef.current || !starmapRef.current || !containerRef.current) return;

    const imageWidth = latest.width;
    const renderWidth = imgRef.current.clientWidth;
    const renderHeight = imgRef.current.clientHeight;
    if (!renderWidth || !renderHeight || !imageWidth) return;

    const imageScale = renderWidth / imageWidth;
    const biasLeft = (((p.IMAGE_CIRCLE_DIAMETER * imageScale - renderWidth) / 2) - (p.OFFSET_X * imageScale)) * -1;
    const biasTop  = (((p.IMAGE_CIRCLE_DIAMETER * imageScale - renderHeight) / 2) + (p.OFFSET_Y * imageScale)) * -1;

    containerRef.current.style.width = renderWidth + 'px';
    containerRef.current.style.height = renderHeight + 'px';
    starmapRef.current.style.left = biasLeft + 'px';
    starmapRef.current.style.top = biasTop + 'px';

    // VirtualSky reverses N/S and most allsky cameras are E/W reversed too.
    let vsAz = 180 - p.AZIMUTH_ANGLE;
    if (vsAz >= 360) vsAz -= 360;
    else if (vsAz < 0) vsAz += 360;
    vsAz = 360 - vsAz;

    const clock = new Date((latest.timestamp - cfg.time_offset) * 1000);

    starmapRef.current.innerHTML = '';
    starmapRef.current.id = 'starmap';

    window.S.virtualsky({
      id: 'starmap',
      projection: 'fisheye',
      live: false,
      clock,
      latitude: cfg.camera_latitude + p.LATITUDE_OFFSET,
      longitude: cfg.camera_longitude + p.LONGITUDE_OFFSET,
      az: vsAz,
      magnitude: p.MAGNITUDE,
      constellations: p.CONSTELLATIONS,
      constellationlabels: p.CONSTELLATIONLABELS,
      showstars: p.SHOWSTARS,
      showstarlabels: p.SHOWSTARLABELS,
      showplanets: p.SHOWPLANETS,
      showplanetlabels: p.SHOWPLANETLABELS,
      showgalaxy: true,
      gridstep: 30,
      gridlines_eq: true,
      gridlines_az: false,
      gridlines_gal: false,
      ecliptic: false,
      meridian: false,
      mouse: false,
      keyboard: false,
      showdate: false,
      showposition: false,
      gradient: false,
      transparent: true,
      cardinalpoints: true,
      credit: false,
      width: p.IMAGE_CIRCLE_DIAMETER * imageScale,
      height: p.IMAGE_CIRCLE_DIAMETER * imageScale,
    });

    lastTsRef.current = latest.timestamp;
  }, [configQ.data, vsParams, latest]);

  // Trigger render when image, params, or scripts ready change
  useEffect(() => {
    if (!scriptsReady) return;
    renderPlanetarium();
  }, [scriptsReady, renderPlanetarium]);

  // Re-render on window resize (debounced)
  useEffect(() => {
    let t: number | undefined;
    function onResize() {
      window.clearTimeout(t);
      t = window.setTimeout(renderPlanetarium, 200);
    }
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(t);
    };
  }, [renderPlanetarium]);

  async function downloadComposite() {
    if (downloading || !wrapRef.current) return;
    setDownloading(true);
    try {
      await loadScript('/indi-allsky/static/html2canvas/html2canvas.min.js');
      const html2canvas = window.html2canvas;
      if (!html2canvas) throw new Error('html2canvas not loaded');
      const canvas = await html2canvas(wrapRef.current, { backgroundColor: null, scale: 1, useCORS: true });
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `virtualsky_${Math.floor(Date.now() / 1000)}.png`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
      }, 'image/png');
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  }

  function update<K extends keyof VsParams>(key: K, val: VsParams[K]) {
    setVsParams((prev) => (prev ? { ...prev, [key]: val } : prev));
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
        <div className="w-full max-w-7xl">
          <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
            <h1 className="text-ink-bright text-lg font-semibold tracking-tight">VirtualSky</h1>
            <button
              onClick={downloadComposite}
              disabled={downloading || !scriptsReady || !latest}
              className="px-3 py-1 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg-0 text-xs font-medium"
            >
              {downloading ? 'Building…' : 'Download'}
            </button>
          </div>

          {vsParams && (
            <div className="bg-bg-1 border border-edge rounded-lg p-3 mb-3 grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 text-xs">
              <NumberField label="Azimuth"  value={vsParams.AZIMUTH_ANGLE} onChange={(v) => update('AZIMUTH_ANGLE', v)} step={0.1} />
              <NumberField label="Lat off."  value={vsParams.LATITUDE_OFFSET}  onChange={(v) => update('LATITUDE_OFFSET', v)} step={0.01} />
              <NumberField label="Lng off."  value={vsParams.LONGITUDE_OFFSET} onChange={(v) => update('LONGITUDE_OFFSET', v)} step={0.01} />
              <NumberField label="Circle Ø" value={vsParams.IMAGE_CIRCLE_DIAMETER} onChange={(v) => update('IMAGE_CIRCLE_DIAMETER', v)} step={10} />
              <NumberField label="Offset X" value={vsParams.OFFSET_X} onChange={(v) => update('OFFSET_X', v)} step={1} />
              <NumberField label="Offset Y" value={vsParams.OFFSET_Y} onChange={(v) => update('OFFSET_Y', v)} step={1} />
              <NumberField label="Magnitude" value={vsParams.MAGNITUDE} onChange={(v) => update('MAGNITUDE', v)} step={0.5} />

              <BoolField label="Constellations"       value={vsParams.CONSTELLATIONS}      onChange={(v) => update('CONSTELLATIONS', v)} />
              <BoolField label="Const. labels"        value={vsParams.CONSTELLATIONLABELS} onChange={(v) => update('CONSTELLATIONLABELS', v)} />
              <BoolField label="Stars"                value={vsParams.SHOWSTARS}           onChange={(v) => update('SHOWSTARS', v)} />
              <BoolField label="Star labels"          value={vsParams.SHOWSTARLABELS}      onChange={(v) => update('SHOWSTARLABELS', v)} />
              <BoolField label="Planets"              value={vsParams.SHOWPLANETS}         onChange={(v) => update('SHOWPLANETS', v)} />
              <BoolField label="Planet labels"        value={vsParams.SHOWPLANETLABELS}    onChange={(v) => update('SHOWPLANETLABELS', v)} />
            </div>
          )}

          <div className="text-[11px] text-ink-dim text-center mb-2">
            Latitude / Longitude / Azimuth / Image Circle / Offsets must be configured under Config → Location
          </div>

          <div className="flex justify-center">
            <div ref={wrapRef} className="relative inline-block">
              {latest ? (
                <img
                  ref={imgRef}
                  src={resolveImageUrl(latest.url)}
                  alt=""
                  onLoad={renderPlanetarium}
                  className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-md ring-1 ring-edge"
                />
              ) : (
                <div className="aspect-video w-[60vw] max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
                  <div className="text-ink-dim text-sm">
                    {loopQ.isLoading ? 'Loading…' : 'No image'}
                  </div>
                </div>
              )}
              <div
                ref={containerRef}
                className="absolute top-0 left-0 overflow-hidden pointer-events-none"
              >
                <div ref={starmapRef} className="relative" />
              </div>
            </div>
          </div>
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

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-ink-dim uppercase tracking-wider text-[10px]">{label}</span>
      <input
        type="number"
        value={value}
        step={step ?? 1}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-bg-2 border border-edge rounded px-2 py-1 text-ink focus:outline-none focus:border-accent"
      />
    </label>
  );
}

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent"
      />
      <span className="text-ink-dim">{label}</span>
    </label>
  );
}
