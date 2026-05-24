import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface CameraInfoResp {
  name: string;
  friendlyName: string | null;
  driver: string | null;
  owner: string | null;
  cfa: string | null;
  width: number | null;
  height: number | null;
  pixelSize: number | null;
  bits: number | null;
  minGain: number | null;
  maxGain: number | null;
  minExposure: number | null;
  maxExposure: number | null;
  lensName: string | null;
  lensFocalLength: number | null;
  lensFocalRatio: number | null;
  lensAperture: number | null;
  lensImageCircle: number | null;
  latitude: number | null;
  longitude: number | null;
  elevation: number | null;
  tz: string | null;
  camera_width_mm: number | null;
  camera_height_mm: number | null;
  camera_diagonal_mm: number | null;
  arcsec_pixel: number | null;
  arcsec_um: number | null;
  deg2_px: number | null;
  image_circle_diameter: number | null;
  image_circle_diameter_mm: number | null;
  deg_fov_width: number | null;
  deg_fov_height: number | null;
  deg_fov_diagonal: number | null;
  createDate: string | null;
  connectDate: string | null;
}

function fmt(v: unknown, digits = 2, suffix = ''): string {
  if (v == null || v === '') return '—';
  if (typeof v === 'number') return `${v.toFixed(digits)}${suffix}`;
  return `${v}${suffix}`;
}

export default function CameraInfo() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Camera/Lens Info</h1>
          {cameraId !== null && <InfoContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function InfoContent({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['camera-info', cameraId],
    queryFn: () => api<CameraInfoResp>(`/camera-info?camera_id=${cameraId}`),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  const d = q.data;

  return (
    <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      <Card title="Camera">
        <Row label="Name"       value={d.friendlyName || d.name} />
        <Row label="Driver"     value={d.driver} />
        <Row label="Owner"      value={d.owner} />
        <Row label="CFA"        value={d.cfa} />
        <Row label="Resolution" value={d.width && d.height ? `${d.width} × ${d.height} px` : '—'} />
        <Row label="Pixel size" value={fmt(d.pixelSize, 2, ' μm')} />
        <Row label="Bit depth"  value={d.bits ? `${d.bits}-bit` : '—'} />
        <Row label="Sensor"     value={d.camera_width_mm && d.camera_height_mm
          ? `${d.camera_width_mm.toFixed(2)} × ${d.camera_height_mm.toFixed(2)} mm (Ø ${d.camera_diagonal_mm?.toFixed(2)} mm)`
          : '—'} />
      </Card>

      <Card title="Range">
        <Row label="Gain"     value={d.minGain != null && d.maxGain != null ? `${d.minGain} → ${d.maxGain}` : '—'} />
        <Row label="Exposure" value={d.minExposure != null && d.maxExposure != null
          ? `${d.minExposure}s → ${d.maxExposure}s`
          : '—'} />
      </Card>

      <Card title="Lens">
        <Row label="Name"          value={d.lensName} />
        <Row label="Focal length"  value={fmt(d.lensFocalLength, 1, ' mm')} />
        <Row label="Focal ratio"   value={d.lensFocalRatio ? `f/${d.lensFocalRatio.toFixed(1)}` : '—'} />
        <Row label="Aperture"      value={fmt(d.lensAperture, 1, ' mm')} />
        <Row label="Image circle"  value={d.image_circle_diameter
          ? `${d.image_circle_diameter} px (${d.image_circle_diameter_mm?.toFixed(2)} mm)`
          : '—'} />
      </Card>

      <Card title="Field of View">
        <Row label="Width"    value={fmt(d.deg_fov_width, 2, '°')} />
        <Row label="Height"   value={fmt(d.deg_fov_height, 2, '°')} />
        <Row label="Diagonal" value={fmt(d.deg_fov_diagonal, 2, '°')} />
        <Row label="arcsec / pixel" value={fmt(d.arcsec_pixel, 3)} />
        <Row label="arcsec / μm"    value={fmt(d.arcsec_um, 3)} />
        <Row label="deg² / pixel"   value={fmt(d.deg2_px, 6)} />
      </Card>

      <Card title="Location">
        <Row label="Latitude"  value={fmt(d.latitude, 4, '°')} />
        <Row label="Longitude" value={fmt(d.longitude, 4, '°')} />
        <Row label="Elevation" value={d.elevation != null ? `${d.elevation} m` : '—'} />
        <Row label="Timezone"  value={d.tz} />
      </Card>

      <Card title="Dates">
        <Row label="Created"   value={d.createDate} />
        <Row label="Connected" value={d.connectDate} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
        {title}
      </div>
      <div className="p-3 space-y-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-ink-dim text-xs">{label}</span>
      <span className="text-ink font-mono text-right">
        {value === null || value === undefined || value === '' ? '—' : value}
      </span>
    </div>
  );
}
