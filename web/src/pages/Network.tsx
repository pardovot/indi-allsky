import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

// ─── Types ─────────────────────────────────────────────────────────────────
// Each select choice is a [value, label] tuple, mirroring the legacy form.
type Choice = [string, string];

interface NetworkResp {
  hostname: string;
  nm_installed: boolean;
  docker: boolean;
  // Connections grouped by category (Wi-Fi / Ethernet / Other), each a list of
  // [uuid, label] tuples — exactly what IndiAllskyNetworkManagerForm builds.
  connections: Record<string, Choice[]>;
  // [interface-name, description] tuples.
  wifi_devices: Choice[];
}

interface ActionResp {
  'success-message'?: string;
  'failure-message'?: string;
}

interface AccessPoint {
  path: string;
  ssid: string;
  ap_hwaddress: string;
  desc: string;
  strength: number;
  frequency: number;
}

interface ScanResp extends ActionResp {
  data: AccessPoint[];
}

type Tab = 'connections' | 'wifi' | 'hotspot';
type Msg = { kind: 'ok' | 'err'; text: string } | null;

const HOTSPOT_BANDS: Choice[] = [
  ['bg', '802.11b/g [2.4Ghz]'],
  ['a', '802.11a [5Ghz]'],
];

// ─── Page ────────────────────────────────────────────────────────────────-─
export default function Network() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Network</h1>
          <NetworkContent />
        </main>
      )}
    </PageShell>
  );
}

function NetworkContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('connections');
  const [msg, setMsg] = useState<Msg>(null);

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const q = useQuery({
    queryKey: ['network'],
    queryFn: () => api<NetworkResp>('/network'),
  });

  const act = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api<ActionResp>('/network/action', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setMsg({ kind: 'ok', text: data['success-message'] || 'OK' });
      qc.invalidateQueries({ queryKey: ['network'] });
    },
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as ActionResp | null) : null;
      setMsg({ kind: 'err', text: body?.['failure-message'] || (err instanceof Error ? err.message : 'error') });
    },
  });
  const runAction = (body: Record<string, unknown>) => { setMsg(null); act.mutate(body); };

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-4">
      {q.data.docker && (
        <Banner tone="warn">Containerized environment detected. Network controls will not function.</Banner>
      )}
      {!q.data.nm_installed && <Banner tone="warn">Network Manager is not available.</Banner>}
      {!isAdmin && <Banner tone="warn">Read-only — admin privileges required for any action.</Banner>}

      <div className="flex items-center gap-1 border-b border-edge">
        <TabBtn active={tab === 'connections'} onClick={() => setTab('connections')}>Connections</TabBtn>
        <TabBtn active={tab === 'wifi'} onClick={() => setTab('wifi')}>Wi-Fi</TabBtn>
        <TabBtn active={tab === 'hotspot'} onClick={() => setTab('hotspot')}>Hotspot</TabBtn>
      </div>

      {tab === 'connections' && (
        <ConnectionsTab data={q.data} isAdmin={isAdmin} busy={act.isPending} onAction={runAction} />
      )}
      {tab === 'wifi' && (
        <WifiTab data={q.data} isAdmin={isAdmin} busy={act.isPending} onAction={runAction} setMsg={setMsg} />
      )}
      {tab === 'hotspot' && (
        <HotspotTab data={q.data} isAdmin={isAdmin} busy={act.isPending} onAction={runAction} />
      )}

      {msg && (
        <Banner tone={msg.kind === 'ok' ? 'info' : 'danger'} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Banner>
      )}
    </div>
  );
}

// Flatten grouped connection choices into a single option list with group
// prefixes, while skipping the empty placeholder entries.
function flattenConnections(connections: Record<string, Choice[]>): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const [group, choices] of Object.entries(connections)) {
    for (const [value, label] of choices) {
      if (value === '' || value === 'error') continue;
      out.push({ value, label: `[${group}] ${label}` });
    }
  }
  return out;
}

// ─── Connections tab ─────────────────────────────────────────────────────-─
function ConnectionsTab({
  data, isAdmin, busy, onAction,
}: {
  data: NetworkResp;
  isAdmin: boolean;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [selected, setSelected] = useState('');

  const options = useMemo(() => flattenConnections(data.connections), [data.connections]);

  useEffect(() => {
    if (options.length === 0) { setSelected(''); return; }
    if (!options.some((o) => o.value === selected)) setSelected(options[0].value);
  }, [options, selected]);

  const fire = (command: string) => {
    if (!selected) return;
    setConfirm(false);
    onAction({ COMMAND: command, CONNECTION: selected });
  };
  const disabled = !isAdmin || busy || !confirm || !selected;

  return (
    <section className="space-y-4">
      <Field label="Connection" className="max-w-2xl">
        <Select<string>
          value={selected}
          options={options.length ? options : [{ value: '', label: 'No managed connections' }]}
          onChange={setSelected}
          buttonClassName="w-full justify-between"
          className="w-full"
        />
        <span className="text-[10px] text-ink-dim">* indicates auto-start</span>
      </Field>

      {isAdmin && (
        <div className="space-y-3">
          <label className="text-[11px] text-ink-dim flex items-center gap-1.5 cursor-pointer w-fit">
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="accent-warn" />
            Confirm — required for every action below
          </label>

          <div className="flex flex-wrap gap-2">
            <ActBtn tone="info" disabled={disabled} onClick={() => fire('activate')}>Activate</ActBtn>
            <ActBtn tone="warn" disabled={disabled} onClick={() => fire('deactivate')}>Deactivate</ActBtn>
            <ActBtn tone="danger" disabled={disabled} onClick={() => fire('delete')}>Delete</ActBtn>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActBtn tone="info" disabled={disabled} onClick={() => fire('autostart')}>Enable auto-start</ActBtn>
            <ActBtn tone="neutral" disabled={disabled} onClick={() => fire('noautostart')}>Disable auto-start</ActBtn>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActBtn tone="info" disabled={disabled} onClick={() => fire('incpriority')}>+10 priority</ActBtn>
            <ActBtn tone="neutral" disabled={disabled} onClick={() => fire('decpriority')}>-10 priority</ActBtn>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActBtn tone="info" disabled={disabled} onClick={() => fire('powersavedisable')}>Disable powersave</ActBtn>
            <ActBtn tone="warn" disabled={disabled} onClick={() => fire('powersaveenable')}>Enable powersave</ActBtn>
          </div>
        </div>
      )}

      <Banner tone="warn">
        Use care when deactivating connections. Deactivating the primary management connection will lose access to the
        web interface. If that happens, a power cycle should reactivate it.
      </Banner>
    </section>
  );
}

// ─── Wi-Fi tab ──────────────────────────────────────────────────────────-──
function WifiTab({
  data, isAdmin, busy, onAction, setMsg,
}: {
  data: NetworkResp;
  isAdmin: boolean;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
  setMsg: (m: Msg) => void;
}) {
  const [iface, setIface] = useState('');
  const [aps, setAps] = useState<AccessPoint[]>([]);
  const [apPath, setApPath] = useState('');
  const [psk, setPsk] = useState('');
  const [priority, setPriority] = useState(0);
  const [retries, setRetries] = useState(4);
  const [scanning, setScanning] = useState(false);

  const devOptions = data.wifi_devices.map(([value, label]) => ({ value, label }));

  useEffect(() => {
    if (devOptions.length === 0) { setIface(''); return; }
    if (!devOptions.some((o) => o.value === iface)) setIface(devOptions[0].value);
  }, [devOptions, iface]);

  const scan = async () => {
    if (!iface) return;
    setMsg(null);
    setScanning(true);
    try {
      const res = await api<ScanResp>('/network/action', {
        method: 'POST',
        body: JSON.stringify({ COMMAND: 'scanap', INTERFACE: iface }),
      });
      setAps(res.data || []);
      setApPath(res.data?.[0]?.path || '');
      setMsg({ kind: 'ok', text: res['success-message'] || 'Scan successful' });
    } catch (err) {
      const body = err instanceof ApiError ? (err.body as ActionResp | null) : null;
      setMsg({ kind: 'err', text: body?.['failure-message'] || (err instanceof Error ? err.message : 'error') });
    } finally {
      setScanning(false);
    }
  };

  const connect = () => {
    if (!iface || !apPath) return;
    onAction({ COMMAND: 'connectap', INTERFACE: iface, AP_PATH: apPath, PSK: psk, PRIORITY: priority, RETRIES: retries });
  };

  const scanned = aps.length > 0;

  return (
    <section className="space-y-4 max-w-2xl">
      <div className="flex items-end gap-3">
        <Field label="Wi-Fi device" className="flex-1">
          <Select<string>
            value={iface}
            options={devOptions.length ? devOptions : [{ value: '', label: 'No wifi devices available' }]}
            onChange={setIface}
            buttonClassName="w-full justify-between"
            className="w-full"
          />
        </Field>
        <ActBtn tone="info" disabled={!isAdmin || scanning || busy || !iface} onClick={scan}>
          {scanning ? 'Scanning…' : 'Scan'}
        </ActBtn>
      </div>

      <Field label="SSID">
        <Select<string>
          value={apPath}
          options={scanned ? aps.map((ap) => ({ value: ap.path, label: ap.desc })) : [{ value: '', label: 'Scan first' }]}
          onChange={setApPath}
          buttonClassName="w-full justify-between"
          className="w-full"
        />
      </Field>

      <Field label="PSK (password)">
        <input
          type="password"
          autoComplete="new-password"
          value={psk}
          disabled={!scanned}
          onChange={(e) => setPsk(e.target.value)}
          className="w-full bg-bg-1 border border-edge rounded-md px-3 py-1.5 text-sm text-ink disabled:opacity-40"
        />
      </Field>

      <div className="flex gap-3 flex-wrap">
        <Field label="Priority">
          <input
            type="number"
            step={10}
            value={priority}
            disabled={!scanned}
            onChange={(e) => setPriority(Number(e.target.value))}
            className="w-32 bg-bg-1 border border-edge rounded-md px-3 py-1.5 text-sm text-ink disabled:opacity-40"
          />
        </Field>
        <Field label="Auto-connect retries">
          <input
            type="number"
            value={retries}
            disabled={!scanned}
            onChange={(e) => setRetries(Number(e.target.value))}
            className="w-32 bg-bg-1 border border-edge rounded-md px-3 py-1.5 text-sm text-ink disabled:opacity-40"
          />
          <span className="text-[10px] text-ink-dim">0 retries forever (never fails over to lower priority)</span>
        </Field>
      </div>

      <ActBtn tone="info" disabled={!isAdmin || busy || !scanned || !apPath} onClick={connect}>Connect</ActBtn>

      <Banner tone="info">Powersave is disabled by default on new Wi-Fi connections.</Banner>
    </section>
  );
}

// ─── Hotspot tab ────────────────────────────────────────────────────────-──
function HotspotTab({
  data, isAdmin, busy, onAction,
}: {
  data: NetworkResp;
  isAdmin: boolean;
  busy: boolean;
  onAction: (body: Record<string, unknown>) => void;
}) {
  const [iface, setIface] = useState('');
  const [ssid, setSsid] = useState('indi-allsky Hotspot');
  const [band, setBand] = useState('bg');
  const [psk, setPsk] = useState('');
  const [noSecurity, setNoSecurity] = useState(false);

  const devOptions = data.wifi_devices.map(([value, label]) => ({ value, label }));

  useEffect(() => {
    if (devOptions.length === 0) { setIface(''); return; }
    if (!devOptions.some((o) => o.value === iface)) setIface(devOptions[0].value);
  }, [devOptions, iface]);

  const create = () => {
    if (!iface) return;
    onAction({ COMMAND: 'createhotspot', INTERFACE: iface, SSID: ssid, BAND: band, PSK: psk, NOSECURITY: noSecurity });
  };

  return (
    <section className="space-y-4 max-w-2xl">
      <Field label="Wi-Fi device">
        <Select<string>
          value={iface}
          options={devOptions.length ? devOptions : [{ value: '', label: 'No wifi devices available' }]}
          onChange={setIface}
          buttonClassName="w-full justify-between"
          className="w-full"
        />
      </Field>

      <div className="flex items-end gap-3">
        <Field label="Hotspot SSID" className="flex-1">
          <input
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            className="w-full bg-bg-1 border border-edge rounded-md px-3 py-1.5 text-sm text-ink"
          />
        </Field>
        <ActBtn tone="info" disabled={!isAdmin || busy || !iface || !ssid} onClick={create}>Create</ActBtn>
      </div>

      <Field label="Band">
        <Select<string>
          value={band}
          options={HOTSPOT_BANDS.map(([value, label]) => ({ value, label }))}
          onChange={setBand}
          buttonClassName="w-full justify-between"
          className="w-full"
        />
      </Field>

      <Field label="Hotspot PSK">
        <input
          type="password"
          autoComplete="new-password"
          value={psk}
          disabled={noSecurity}
          onChange={(e) => setPsk(e.target.value)}
          className="w-full bg-bg-1 border border-edge rounded-md px-3 py-1.5 text-sm text-ink disabled:opacity-40"
        />
        <label className="text-[11px] text-ink-dim flex items-center gap-1.5 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={noSecurity}
            onChange={(e) => { setNoSecurity(e.target.checked); if (e.target.checked) setPsk(''); }}
            className="accent-warn"
          />
          No security (open network)
        </label>
      </Field>

      <Banner tone="info">
        The hotspot uses a static IP of 10.42.0.1 (/24) plus an IPv6 link-local address. Access it at{' '}
        <code className="font-mono text-ink-bright bg-bg-3 px-1.5 py-0.5 rounded">https://{data.hostname}.local</code>.
        It is created with a lower priority (-90) than standard wireless connections, so it acts as a fallback.
      </Banner>
    </section>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────-───
function Field({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={['flex flex-col gap-1', className ?? ''].join(' ')}>
      <span className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</span>
      {children}
    </div>
  );
}

function ActBtn({
  tone, disabled, onClick, children,
}: {
  tone: 'info' | 'warn' | 'danger' | 'neutral';
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const cls =
    tone === 'info'   ? 'hover:bg-info/10   border-info/40   text-info' :
    tone === 'warn'   ? 'hover:bg-warn/10   border-warn/40   text-warn' :
    tone === 'danger' ? 'hover:bg-danger/10 border-danger/40 text-danger' :
                        'hover:bg-bg-3      border-edge      text-ink-dim';
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={['px-3 py-1.5 rounded-md bg-bg-2 border text-sm disabled:opacity-40 disabled:cursor-not-allowed', cls].join(' ')}
    >{children}</button>
  );
}

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
        active ? 'border-accent text-ink-bright' : 'border-transparent text-ink-dim hover:text-ink',
      ].join(' ')}
    >{children}</button>
  );
}

function Banner({
  tone, children, onDismiss,
}: { tone: 'info' | 'warn' | 'danger'; children: React.ReactNode; onDismiss?: () => void }) {
  const cls =
    tone === 'info' ? 'bg-info/10 border-info/30 text-info' :
    tone === 'warn' ? 'bg-warn/10 border-warn/30 text-warn' :
                      'bg-danger/10 border-danger/30 text-danger';
  return (
    <div className={['flex items-center gap-3 px-3 py-2 rounded border text-xs', cls].join(' ')}>
      <div className="flex-1">{children}</div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-base leading-none px-1">×</button>
      )}
    </div>
  );
}
