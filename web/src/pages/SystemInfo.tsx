import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface Service { active: string | null; unit: string | null }
interface FsEntry { mountpoint: string; total_mb: number; percent: number }
interface NetEntry { name: string; inet4: string[]; inet6: string[] }
interface TempEntry { name: string; temp: number | string }
interface CpuUsage {
  user: number; system: number; idle: number; nice: number;
  iowait: number; irq: number; softirq: number;
}
interface MemUsage { user_percent: number; cached_percent: number }
interface SysResp {
  release: string;
  uptime: string;
  system_type: string;
  systemd_target: string;
  cpu_count: number;
  cpu_usage: CpuUsage;
  cpu_bits: number;
  cpu_load5: number;
  cpu_load10: number;
  cpu_load15: number;
  mem_total: number;
  mem_usage: MemUsage;
  swap_total: number;
  swap_usage: number;
  fs_data: FsEntry[];
  temp_list: TempEntry[];
  fan_list: TempEntry[];
  net_list: NetEntry[];
  python_version: string;
  python_platform: string;
  flask_version: string;
  gunicorn_version: string;
  cv2_version: string;
  numpy_version: string;
  astropy_version: string;
  ephem_version: string;
  cryptography_version: string;
  dbus_version: string;
  pycurl_version: string;
  pahomqtt_version: string;
  skyfield_version: string;
  indiserver_service: Service;
  indiserver_timer: Service;
  allsky_service: Service;
  allsky_timer: Service;
  gunicorn_service: Service;
  gunicorn_socket: Service;
  indiserver_next_trigger: string;
  allsky_next_trigger: string;
  now: string | null;
  timezone: string | null;
  timedate1: Record<string, string>;
}

export default function SystemInfo() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">System Info</h1>
          <SystemContent />
        </main>
      )}
    </PageShell>
  );
}

function SystemContent() {
  const q = useQuery({
    queryKey: ['system-info'],
    queryFn: () => api<SysResp>('/system-info'),
    refetchInterval: 15_000,
  });
  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;
  const d = q.data;

  return (
    <div className="space-y-3">
      <Section title="Overview">
        <KV label="Release" value={d.release} />
        <KV label="System" value={d.system_type} />
        <KV label="Uptime" value={d.uptime} />
        <KV label="Target" value={d.systemd_target} />
        <KV label="Now" value={d.now ?? '—'} />
        <KV label="Timezone" value={d.timezone ?? '—'} />
      </Section>

      <Section title="CPU">
        <KV label="Count" value={`${d.cpu_count}`} />
        <KV label="Arch" value={`${d.python_platform} [${d.cpu_bits}-bit]`} />
        <KV label="Load 5/10/15" value={`${d.cpu_load5.toFixed(2)} / ${d.cpu_load10.toFixed(2)} / ${d.cpu_load15.toFixed(2)}`} />
        <div className="md:col-span-3">
          <Bar
            segments={[
              { label: 'User',    pct: d.cpu_usage.user,    color: '#60a5fa' },
              { label: 'System',  pct: d.cpu_usage.system,  color: '#f43f5e' },
              { label: 'Nice',    pct: d.cpu_usage.nice,    color: '#4ade80' },
              { label: 'I/O Wait',pct: d.cpu_usage.iowait,  color: '#facc15' },
            ]}
          />
        </div>
      </Section>

      <Section title="Memory">
        <div className="md:col-span-3 space-y-2">
          <div>
            <div className="text-xs text-ink-dim mb-0.5">RAM ({d.mem_total} MB)</div>
            <Bar segments={[
              { label: 'Used',  pct: d.mem_usage.user_percent,   color: '#4ade80' },
              { label: 'Cache', pct: d.mem_usage.cached_percent, color: '#888890' },
            ]} />
          </div>
          <div>
            <div className="text-xs text-ink-dim mb-0.5">Swap ({d.swap_total} MB)</div>
            <Bar segments={[{ label: 'Swap', pct: d.swap_usage, color: '#f43f5e' }]} />
          </div>
        </div>
      </Section>

      <Section title="Filesystems">
        <div className="md:col-span-3 space-y-1.5">
          {d.fs_data.map((fs) => (
            <div key={fs.mountpoint} className="flex items-center gap-3">
              <div className="w-40 font-mono text-ink-dim text-xs">{fs.mountpoint}</div>
              <div className="w-20 text-right font-mono text-ink-dim text-xs">{fs.total_mb.toFixed(0)} MB</div>
              <div className="flex-1"><Bar segments={[{ label: 'Used', pct: fs.percent, color: '#facc15' }]} /></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Network">
        <div className="md:col-span-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-1.5">Interface</th>
                <th className="text-left px-3 py-1.5">IPv4</th>
                <th className="text-left px-3 py-1.5">IPv6</th>
              </tr>
            </thead>
            <tbody>
              {d.net_list.map((n) => (
                <tr key={n.name} className="border-t border-edge">
                  <td className="px-3 py-1 font-mono text-ink">{n.name}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{n.inet4.join(', ') || '—'}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{n.inet6.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {(d.temp_list.length > 0 || d.fan_list.length > 0) && (
        <Section title="Temperature / Fans">
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {d.temp_list.length > 0 && <TempTable rows={d.temp_list} title="Temperatures" />}
            {d.fan_list.length > 0 && <TempTable rows={d.fan_list} title="Fans" />}
          </div>
        </Section>
      )}

      <Section title="Services">
        <div className="md:col-span-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-1.5">Service</th>
                <th className="text-left px-3 py-1.5">Active</th>
                <th className="text-left px-3 py-1.5">Unit</th>
              </tr>
            </thead>
            <tbody>
              <ServiceRow name="indiserver"        s={d.indiserver_service} />
              <ServiceRow name="indiserver timer"  s={d.indiserver_timer}   trigger={d.indiserver_next_trigger} />
              <ServiceRow name="allsky"            s={d.allsky_service} />
              <ServiceRow name="allsky timer"      s={d.allsky_timer}       trigger={d.allsky_next_trigger} />
              <ServiceRow name="gunicorn"          s={d.gunicorn_service} />
              <ServiceRow name="gunicorn socket"   s={d.gunicorn_socket} />
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Versions">
        <KV label="Python"  value={d.python_version} />
        <KV label="Flask"   value={d.flask_version} />
        <KV label="gunicorn" value={d.gunicorn_version} />
        <KV label="OpenCV"  value={d.cv2_version} />
        <KV label="NumPy"   value={d.numpy_version} />
        <KV label="Astropy" value={d.astropy_version} />
        <KV label="Ephem"   value={d.ephem_version} />
        <KV label="cryptography" value={d.cryptography_version} />
        <KV label="dbus"    value={d.dbus_version} />
        <KV label="pycurl"  value={d.pycurl_version} />
        <KV label="paho-mqtt" value={d.pahomqtt_version} />
        <KV label="skyfield" value={d.skyfield_version} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">{title}</div>
      <div className="p-3 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
        {children}
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <span className="text-ink-dim text-xs whitespace-nowrap">{label}</span>
      <span className="font-mono text-ink truncate">{value}</span>
    </div>
  );
}

function Bar({ segments }: { segments: { label: string; pct: number; color: string }[] }) {
  return (
    <div>
      <div className="h-3 bg-bg-3 rounded-sm overflow-hidden flex">
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${s.pct.toFixed(1)}%`}
            style={{ width: `${Math.max(0, Math.min(100, s.pct))}%`, backgroundColor: s.color }}
            className="h-full"
          />
        ))}
      </div>
      <div className="mt-1 flex gap-3 text-[10px] text-ink-dim">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="w-2 h-2 inline-block rounded-sm" style={{ backgroundColor: s.color }} />
            {s.label} {s.pct.toFixed(1)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function TempTable({ title, rows }: { title: string; rows: TempEntry[] }) {
  return (
    <div className="border border-edge rounded-md overflow-hidden">
      <div className="px-3 py-1.5 bg-bg-2 text-ink-bright text-xs font-medium">{title}</div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.name}-${i}`} className="border-t border-edge">
              <td className="px-3 py-1 text-ink-dim text-xs">{r.name}</td>
              <td className="px-3 py-1 text-right font-mono">
                {typeof r.temp === 'number' ? r.temp.toFixed(1) : r.temp}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ServiceRow({ name, s, trigger }: { name: string; s: Service; trigger?: string }) {
  const active = (s.active || '').toLowerCase();
  const tone =
    active === 'active' ? 'text-info' :
    active === 'inactive' ? 'text-ink-dim' :
    active === 'failed' ? 'text-danger' :
    'text-warn';
  return (
    <tr className="border-t border-edge">
      <td className="px-3 py-1 text-ink">{name}</td>
      <td className={['px-3 py-1 font-mono text-xs', tone].join(' ')}>{s.active || '—'}</td>
      <td className="px-3 py-1 font-mono text-ink-dim text-xs">
        {s.unit || '—'}{trigger ? ` · next: ${trigger}` : ''}
      </td>
    </tr>
  );
}
