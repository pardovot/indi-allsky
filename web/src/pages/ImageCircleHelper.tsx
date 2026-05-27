import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface LatestResp {
  latest_image: { url: string | null; width?: number; height?: number; message?: string };
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

export default function ImageCircleHelper() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Image Circle Helper</h1>
          <p className="text-[11px] text-ink-dim max-w-3xl">
            Adjust the overlay to find the lens image-circle diameter, offsets, and keogram angle for the latest image.
            These values are not saved here — copy them into Config → Camera / Processing.
          </p>
          {cameraId !== null && <Content cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function Content({ cameraId }: { cameraId: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [diameter, setDiameter] = useState(3000);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [angle, setAngle] = useState(90);
  const [showKeogram, setShowKeogram] = useState(true);
  const [lineWidth, setLineWidth] = useState(3);
  const [lineColor, setLineColor] = useState('#ff0000');

  const q = useQuery({
    queryKey: ['latest-image', cameraId],
    queryFn: () => api<LatestResp>(`/latest-image?camera_id=${cameraId}`),
  });

  const url = q.data?.latest_image.url ? resolveUrl(q.data.latest_image.url) : null;

  // (re)load the image whenever the URL changes
  useEffect(() => {
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = url;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // redraw on any control change
  useEffect(() => { draw(); });

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const ratio = Math.min(cw / img.width, ch / img.height);
    const shiftX = (cw - img.width * ratio) / 2;
    const shiftY = (ch - img.height * ratio) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, img.width, img.height, shiftX, shiftY, img.width * ratio, img.height * ratio);

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.globalCompositeOperation = 'source-atop';

    ctx.beginPath();
    ctx.arc(
      ((img.width / 2 + offsetX) * ratio) + shiftX,
      ((img.height / 2 - offsetY) * ratio) + shiftY,
      (diameter / 2) * ratio,
      0, 2 * Math.PI, false,
    );
    ctx.stroke();

    if (showKeogram) {
      const opp = Math.tan(angle * (Math.PI / 180)) * (ch / 2);
      ctx.beginPath();
      ctx.moveTo((cw / 2) + opp + offsetX * ratio, 0 - offsetY * ratio);
      ctx.lineTo((cw / 2) - opp + offsetX * ratio, ch - offsetY * ratio);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  const azimuth = angle < 0 ? 360 + angle : angle;

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!url) return <div className="text-ink-dim text-sm">{q.data?.latest_image.message || 'No image available'}</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="flex-1 min-w-0">
        <canvas ref={canvasRef} width={1280} height={960} className="w-full h-auto bg-bg-1 border border-edge rounded" />
      </div>
      <div className="lg:w-72 shrink-0 space-y-4 bg-bg-1 border border-edge rounded-lg p-4">
        <Range label="Image circle diameter" value={diameter} min={100} max={6000} step={5} onChange={setDiameter} suffix="px" />
        <Range label="Offset X" value={offsetX} min={-2000} max={2000} step={1} onChange={setOffsetX} suffix="px" />
        <Range label="Offset Y" value={offsetY} min={-2000} max={2000} step={1} onChange={setOffsetY} suffix="px" />
        <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
          <input type="checkbox" checked={showKeogram} onChange={(e) => setShowKeogram(e.target.checked)} className="accent-info" />
          Show keogram line
        </label>
        <Range label="Keogram angle" value={angle} min={-90} max={90} step={0.5} onChange={setAngle} suffix="°" />
        <div className="text-[11px] text-ink-dim">Azimuth: <span className="font-mono text-ink">{azimuth}°</span></div>
        <Range label="Line width" value={lineWidth} min={1} max={15} step={1} onChange={setLineWidth} suffix="px" />
        <div className="space-y-1">
          <div className="text-[11px] uppercase tracking-wider text-ink-dim">Line color</div>
          <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} className="h-8 w-full bg-bg-2 border border-edge rounded cursor-pointer" />
        </div>
      </div>
    </div>
  );
}

function Range({
  label, value, min, max, step, onChange, suffix,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-ink-dim">{label}</span>
        <span className="text-xs font-mono text-ink">{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-info"
      />
    </div>
  );
}
