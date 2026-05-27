import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

type StrOrTuple = string | string[];

interface Satellite {
  name: string;
  az: number;
  alt: number;
  elevation: number;
  eclipsed: boolean;
  rise: StrOrTuple;
  transit: StrOrTuple;
  set: StrOrTuple;
  duration: StrOrTuple;
}

interface AstroResp {
  latitude: number;
  longitude: number;
  elevation: number;

  polaris_hour_angle: number;
  polaris_next_transit: string;
  polaris_alt: number;

  moon_phase: string;
  moon_light: number;
  moon_rise: string;
  moon_transit: string;
  moon_set: string;
  moon_az: number;
  moon_alt: number;
  moon_ra: string;
  moon_dec: string;
  moon_new: string;
  moon_full: string;

  sun_at_start: string;
  sun_ct_start: string;
  sun_rise: string;
  sun_transit: string;
  sun_set: string;
  sun_ct_end: string;
  sun_at_end: string;
  sun_az: number;
  sun_alt: number;
  sun_ra: string;
  sun_dec: string;
  sun_equinox: string;
  sun_solstice: string;

  mercury_rise: string;
  mercury_transit: string;
  mercury_set: string;
  mercury_az: number;
  mercury_alt: number;
  venus_rise: string;
  venus_transit: string;
  venus_set: string;
  venus_az: number;
  venus_alt: number;
  mars_rise: string;
  mars_transit: string;
  mars_set: string;
  mars_az: number;
  mars_alt: number;
  jupiter_rise: string;
  jupiter_transit: string;
  jupiter_set: string;
  jupiter_az: number;
  jupiter_alt: number;
  saturn_rise: string;
  saturn_transit: string;
  saturn_set: string;
  saturn_az: number;
  saturn_alt: number;
  uranus_rise: string;
  uranus_transit: string;
  uranus_set: string;
  uranus_az: number;
  uranus_alt: number;
  neptune_rise: string;
  neptune_transit: string;
  neptune_set: string;
  neptune_az: number;
  neptune_alt: number;

  satellite_list: Satellite[];
}

const BODIES = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
] as const;

type BodyName = (typeof BODIES)[number];

const PREFIX: Record<BodyName, keyof AstroResp & string> = {
  Sun: 'sun',
  Moon: 'moon',
  Mercury: 'mercury',
  Venus: 'venus',
  Mars: 'mars',
  Jupiter: 'jupiter',
  Saturn: 'saturn',
  Uranus: 'uranus',
  Neptune: 'neptune',
} as unknown as Record<BodyName, keyof AstroResp & string>;

function field(d: AstroResp, prefix: string, key: string): string | number | undefined {
  return (d as unknown as Record<string, string | number | undefined>)[`${prefix}_${key}`];
}

/** Some satellite string fields serialize as 1-element tuples; render the first element. */
function unwrap(v: StrOrTuple): string {
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

function deg(v: number | string | undefined): string {
  return v == null ? '—' : `${v}°`;
}

function altClass(alt: number): string {
  if (alt > 25) return 'text-info';
  if (alt > 0) return 'text-warn';
  return 'text-ink-dim';
}

export default function Astropanel() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Astropanel</h1>
          {cameraId !== null && <AstroContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function AstroContent({ cameraId }: { cameraId: number }) {
  const q = useQuery({
    queryKey: ['astropanel', cameraId],
    queryFn: () => api<AstroResp>('/astropanel?camera_id=' + cameraId),
    refetchInterval: 60_000,
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error || !q.data) return <div className="text-danger text-sm">Failed to load</div>;

  const d = q.data;
  const sats = d.satellite_list ?? [];

  return (
    <div className="space-y-3">
      <BodiesTable d={d} />

      <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <Card title="Sun Twilights">
          <Row label="Astronomical start" value={d.sun_at_start} />
          <Row label="Civil start" value={d.sun_ct_start} />
          <Row label="Sunrise" value={d.sun_rise} />
          <Row label="Transit" value={d.sun_transit} />
          <Row label="Sunset" value={d.sun_set} />
          <Row label="Civil end" value={d.sun_ct_end} />
          <Row label="Astronomical end" value={d.sun_at_end} />
          <Row label="Right ascension" value={d.sun_ra} />
          <Row label="Declination" value={d.sun_dec} />
          <Row label="Next equinox" value={d.sun_equinox} />
          <Row label="Next solstice" value={d.sun_solstice} />
        </Card>

        <Card title="Moon">
          <Row label="Phase" value={`${d.moon_phase} (${d.moon_light}%)`} />
          <Row label="Right ascension" value={d.moon_ra} />
          <Row label="Declination" value={d.moon_dec} />
          <Row label="Next new moon" value={d.moon_new} />
          <Row label="Next full moon" value={d.moon_full} />
        </Card>

        <Card title="Polaris">
          <Row label="Hour angle" value={d.polaris_hour_angle} />
          <Row label="Next transit" value={d.polaris_next_transit} />
          <Row label="Altitude" value={deg(d.polaris_alt)} />
        </Card>

        <Card title="Observer">
          <Row label="Latitude" value={`${d.latitude} rad`} />
          <Row label="Longitude" value={`${d.longitude} rad`} />
          <Row label="Elevation" value={`${d.elevation} m`} />
        </Card>
      </div>

      {sats.length > 0 && <SatellitesTable sats={sats} />}
    </div>
  );
}

function BodiesTable({ d }: { d: AstroResp }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
        Bodies
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-1.5">Body</th>
              <th className="text-left px-3 py-1.5">Rise</th>
              <th className="text-left px-3 py-1.5">Transit</th>
              <th className="text-left px-3 py-1.5">Set</th>
              <th className="text-right px-3 py-1.5">Azimuth</th>
              <th className="text-right px-3 py-1.5">Altitude</th>
            </tr>
          </thead>
          <tbody>
            {BODIES.map((b) => {
              const p = PREFIX[b];
              const alt = field(d, p, 'alt');
              return (
                <tr key={b} className="border-t border-edge hover:bg-bg-2 transition-colors">
                  <td className="px-3 py-1 text-ink-bright">{b}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{field(d, p, 'rise')}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{field(d, p, 'transit')}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{field(d, p, 'set')}</td>
                  <td className="px-3 py-1 font-mono text-right text-ink">{deg(field(d, p, 'az'))}</td>
                  <td className={`px-3 py-1 font-mono text-right ${altClass(typeof alt === 'number' ? alt : -1)}`}>
                    {deg(alt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SatellitesTable({ sats }: { sats: Satellite[] }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
        Visual Satellites
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left px-3 py-1.5">Name</th>
              <th className="text-right px-3 py-1.5">Azimuth</th>
              <th className="text-right px-3 py-1.5">Altitude</th>
              <th className="text-right px-3 py-1.5">Elevation</th>
              <th className="text-left px-3 py-1.5">Rise</th>
              <th className="text-left px-3 py-1.5">Transit</th>
              <th className="text-left px-3 py-1.5">Set</th>
              <th className="text-right px-3 py-1.5">Duration</th>
              <th className="text-center px-3 py-1.5">Eclipsed</th>
            </tr>
          </thead>
          <tbody>
            {sats.map((s, i) => (
              <tr key={`${s.name}-${i}`} className="border-t border-edge hover:bg-bg-2 transition-colors">
                <td className="px-3 py-1 text-ink-bright">{s.name}</td>
                <td className="px-3 py-1 font-mono text-right text-ink">{deg(s.az)}</td>
                <td className={`px-3 py-1 font-mono text-right ${altClass(s.alt)}`}>{deg(s.alt)}</td>
                <td className="px-3 py-1 font-mono text-right text-ink">{s.elevation} km</td>
                <td className="px-3 py-1 font-mono text-ink-dim text-xs">{unwrap(s.rise)}</td>
                <td className="px-3 py-1 font-mono text-ink-dim text-xs">{unwrap(s.transit)}</td>
                <td className="px-3 py-1 font-mono text-ink-dim text-xs">{unwrap(s.set)}</td>
                <td className="px-3 py-1 font-mono text-right text-ink-dim text-xs">{unwrap(s.duration)} s</td>
                <td className="px-3 py-1 text-center text-ink-dim">
                  {s.alt >= 0 && s.eclipsed ? 'yes' : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
