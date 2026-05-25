import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

interface BlockDevice {
  device: string;
  block_id: string;
  mounts: string[];
  label: string;
  fstype: string;
  size: number;
  mountable: boolean;
  protected: boolean;
  is_partition: boolean;
}
interface Drive {
  id: string;
  vendor: string;
  model: string;
  size: number;
  connection_bus: string;
  serial: string;
  removable: boolean;
  ejectable: boolean;
  can_power_off: boolean;
  media?: string;
  media_compatibility?: string[];
  time_detected?: string | null;
  time_media_detected?: string | null;
  block_devices?: BlockDevice[];
}
interface DrivesResp {
  udisks2: boolean;
  drives: Drive[];
  protected_filesystems: string[];
}

// Flat block-device entry decorated with its parent drive's id, for the
// Mounts tab dropdown.
interface FlatDevice extends BlockDevice {
  drive_id: string;
}

function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

type Tab = 'drives' | 'mounts';

export default function DriveManager() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Drive Manager</h1>
          <DrivesContent />
        </main>
      )}
    </PageShell>
  );
}

function DrivesContent() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('drives');
  const [selectedDriveId, setSelectedDriveId] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const q = useQuery({
    queryKey: ['drives'],
    queryFn: () => api<DrivesResp>('/drives'),
    refetchInterval: 10_000,
  });

  // Flatten block-devices across all drives for the Mounts tab.
  const allDevices: FlatDevice[] = useMemo(() => {
    if (!q.data) return [];
    const out: FlatDevice[] = [];
    for (const d of q.data.drives) {
      for (const b of d.block_devices ?? []) {
        if (b.mountable || b.mounts.length > 0) out.push({ ...b, drive_id: d.id });
      }
    }
    return out;
  }, [q.data]);

  // Auto-select sensible defaults once data arrives / changes.
  useEffect(() => {
    if (!q.data || q.data.drives.length === 0) return;
    if (!selectedDriveId || !q.data.drives.some((d) => d.id === selectedDriveId)) {
      setSelectedDriveId(q.data.drives[0].id);
    }
  }, [q.data, selectedDriveId]);

  useEffect(() => {
    if (allDevices.length === 0) return;
    if (!selectedDeviceId || !allDevices.some((b) => b.block_id === selectedDeviceId)) {
      setSelectedDeviceId(allDevices[0].block_id);
    }
  }, [allDevices, selectedDeviceId]);

  const act = useMutation({
    mutationFn: (body: Record<string, string>) =>
      api<{ 'success-message'?: string; 'failure-message'?: string }>(
        '/drives/action',
        { method: 'POST', body: JSON.stringify(body) },
      ),
    onSuccess: (data) => {
      setMsg({ kind: 'ok', text: data['success-message'] || 'OK' });
      qc.invalidateQueries({ queryKey: ['drives'] });
    },
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as { 'failure-message'?: string } | null) : null;
      setMsg({ kind: 'err', text: body?.['failure-message'] || (err instanceof Error ? err.message : 'error') });
    },
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (!q.data) return <div className="text-ink-dim text-sm">No data</div>;

  return (
    <div className="space-y-4">
      <TipNote />

      {!q.data.udisks2 && <Banner tone="warn">UDisks2 not available — drive controls disabled.</Banner>}
      {!isAdmin && q.data.udisks2 && (
        <Banner tone="warn">Read-only — admin privileges required for any action.</Banner>
      )}

      <div className="flex items-center gap-1 border-b border-edge">
        <TabBtn active={tab === 'drives'} onClick={() => setTab('drives')}>Drives</TabBtn>
        <TabBtn active={tab === 'mounts'} onClick={() => setTab('mounts')}>Mounts</TabBtn>
      </div>

      {tab === 'drives' && (
        <DrivesTab
          drives={q.data.drives}
          selectedId={selectedDriveId}
          onSelect={setSelectedDriveId}
          isAdmin={isAdmin}
          busy={act.isPending}
          onAction={(body) => { setMsg(null); act.mutate(body); }}
          message={msg}
          clearMessage={() => setMsg(null)}
        />
      )}
      {tab === 'mounts' && (
        <MountsTab
          devices={allDevices}
          selectedId={selectedDeviceId}
          onSelect={setSelectedDeviceId}
          isAdmin={isAdmin}
          busy={act.isPending}
          onAction={(body) => { setMsg(null); act.mutate(body); }}
          message={msg}
          clearMessage={() => setMsg(null)}
        />
      )}
    </div>
  );
}

// ─── Drives tab ──────────────────────────────────────────────────────────

function DrivesTab({
  drives, selectedId, onSelect, isAdmin, busy, onAction, message, clearMessage,
}: {
  drives: Drive[];
  selectedId: string;
  onSelect: (id: string) => void;
  isAdmin: boolean;
  busy: boolean;
  onAction: (body: Record<string, string>) => void;
  message: { kind: 'ok' | 'err'; text: string } | null;
  clearMessage: () => void;
}) {
  const [confirmPower, setConfirmPower] = useState(false);
  const selected = drives.find((d) => d.id === selectedId);

  const options = drives.length
    ? drives.map((d) => ({
        value: d.id,
        label: driveOptionLabel(d),
      }))
    : [{ value: '', label: 'No drives' }];

  return (
    <section className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Drive" className="flex-1 min-w-[260px]">
          <Select<string>
            value={selectedId}
            options={options}
            onChange={onSelect}
            buttonClassName="w-full justify-between"
            className="w-full"
          />
        </Field>
        {isAdmin && selected?.can_power_off && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-ink-dim flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmPower}
                onChange={(e) => setConfirmPower(e.target.checked)}
                className="accent-danger"
              />
              Confirm
            </label>
            <button
              disabled={!confirmPower || busy}
              onClick={() => {
                setConfirmPower(false);
                onAction({ COMMAND: 'poweroff', DRIVE_ID: selected.id });
              }}
              className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-danger/10 border border-danger/40 text-danger text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >Power off</button>
          </div>
        )}
      </div>

      {message && (
        <Banner tone={message.kind === 'ok' ? 'info' : 'danger'} onDismiss={clearMessage}>
          {message.text}
        </Banner>
      )}

      {selected && <DriveDetails drive={selected} />}
    </section>
  );
}

function driveOptionLabel(d: Drive): string {
  const vendor = d.vendor || '[no vendor]';
  const model = d.model || '';
  return `${vendor} — ${model || d.id} · ${fmtSize(d.size)} · ${d.connection_bus}`;
}

function DriveDetails({ drive }: { drive: Drive }) {
  const rows: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    { label: 'Id',                value: drive.id,                                mono: true },
    { label: 'Vendor',            value: drive.vendor || '—' },
    { label: 'Model',             value: drive.model  || '—' },
    { label: 'Size',              value: fmtSize(drive.size),                     mono: true },
    { label: 'Connection bus',    value: drive.connection_bus },
    { label: 'Serial',            value: drive.serial || '—',                    mono: true },
    { label: 'Media',             value: drive.media  || '—' },
    { label: 'Media compatibility', value: (drive.media_compatibility ?? []).join(', ') || '—' },
    { label: 'Removable',         value: drive.removable     ? 'yes' : 'no' },
    { label: 'Ejectable',         value: drive.ejectable     ? 'yes' : 'no' },
    { label: 'Can power off',     value: drive.can_power_off ? 'yes' : 'no' },
    { label: 'Time detected',     value: drive.time_detected       || '—',       mono: true },
    { label: 'Time media detected', value: drive.time_media_detected || '—',     mono: true },
  ];

  return (
    <div className="bg-bg-1 border border-edge rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-bg-2 border-b border-edge">
        <span className="text-ink-dim text-[10px] uppercase tracking-wider">Drive details</span>
        <button
          onClick={() => copyDriveDetails(drive)}
          className="text-xs px-2 py-0.5 rounded bg-bg-1 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink"
        >Copy</button>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t first:border-t-0 border-edge/60">
              <th className="text-left text-ink-dim text-xs font-normal px-4 py-2 w-56 align-top">{r.label}</th>
              <td className={['px-4 py-2 text-ink', r.mono ? 'font-mono' : ''].join(' ')}>{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Mounts tab ──────────────────────────────────────────────────────────

function MountsTab({
  devices, selectedId, onSelect, isAdmin, busy, onAction, message, clearMessage,
}: {
  devices: FlatDevice[];
  selectedId: string;
  onSelect: (id: string) => void;
  isAdmin: boolean;
  busy: boolean;
  onAction: (body: Record<string, string>) => void;
  message: { kind: 'ok' | 'err'; text: string } | null;
  clearMessage: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const selected = devices.find((d) => d.block_id === selectedId);
  const mounted = !!selected && selected.mounts.length > 0;

  const options = devices.length
    ? devices.map((d) => ({
        value: d.block_id,
        label: mountOptionLabel(d),
      }))
    : [{ value: '', label: 'No mountable devices' }];

  return (
    <section className="space-y-4">
      <div className="flex items-end gap-3 flex-wrap">
        <Field label="Device" className="flex-1 min-w-[260px]">
          <Select<string>
            value={selectedId}
            options={options}
            onChange={onSelect}
            buttonClassName="w-full justify-between"
            className="w-full"
          />
        </Field>
        {isAdmin && selected && (
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-ink-dim flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={confirm}
                onChange={(e) => setConfirm(e.target.checked)}
                className="accent-info"
              />
              Confirm
            </label>
            <button
              disabled={!confirm || busy || mounted}
              onClick={() => { setConfirm(false); onAction({ COMMAND: 'mount', DEVICE_ID: selected.block_id }); }}
              className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-info/10 border border-info/40 text-info text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >Mount</button>
            <button
              disabled={!confirm || busy || !mounted}
              onClick={() => { setConfirm(false); onAction({ COMMAND: 'unmount', DEVICE_ID: selected.block_id }); }}
              className={[
                'px-3 py-1.5 rounded-md border text-sm disabled:opacity-40 disabled:cursor-not-allowed',
                selected.protected
                  ? 'bg-bg-2 hover:bg-danger/10 border-danger/40 text-danger'
                  : 'bg-bg-2 hover:bg-bg-3 border-warn/40 text-warn',
              ].join(' ')}
            >Unmount</button>
          </div>
        )}
      </div>

      {message && (
        <Banner tone={message.kind === 'ok' ? 'info' : 'danger'} onDismiss={clearMessage}>
          {message.text}
        </Banner>
      )}

      {selected && <DeviceDetails dev={selected} />}
    </section>
  );
}

function mountOptionLabel(d: FlatDevice): string {
  const mp = d.mounts.length ? d.mounts.join(', ') : 'unmounted';
  const fs = d.fstype || '—';
  const label = d.label ? ` "${d.label}"` : '';
  return `${d.device}${label} · ${fs} · ${fmtSize(d.size)} · ${mp}`;
}

function DeviceDetails({ dev }: { dev: FlatDevice }) {
  const mounted = dev.mounts.length > 0;
  return (
    <div className="bg-bg-1 border border-edge rounded-md overflow-hidden">
      <div className="px-4 py-2 bg-bg-2 border-b border-edge flex items-center justify-between">
        <span className="text-ink-dim text-[10px] uppercase tracking-wider">Device details</span>
        {dev.protected && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-3 text-warn">system mount</span>}
      </div>
      <table className="w-full text-sm">
        <tbody>
          <Row label="Device path"   value={<span className="font-mono">{dev.device}</span>} />
          <Row label="Drive"         value={<span className="font-mono">{dev.drive_id}</span>} />
          <Row label="Filesystem"    value={dev.fstype || '—'} />
          <Row label="Label"         value={dev.label  || '—'} />
          <Row label="Size"          value={<span className="font-mono">{fmtSize(dev.size)}</span>} />
          <Row
            label="Mount point"
            value={mounted
              ? <span className="font-mono text-ink">{dev.mounts.join(', ')}</span>
              : <span className="text-ink-dim italic">unmounted</span>}
          />
          <Row label="Status"        value={mounted ? <span className="text-info">mounted</span> : <span className="text-ink-dim">unmounted</span>} />
        </tbody>
      </table>
    </div>
  );
}

// ─── Shared ──────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-t first:border-t-0 border-edge/60">
      <th className="text-left text-ink-dim text-xs font-normal px-4 py-2 w-56 align-top">{label}</th>
      <td className="px-4 py-2 text-ink">{value}</td>
    </tr>
  );
}

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

function TabBtn({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
        active
          ? 'border-accent text-ink-bright'
          : 'border-transparent text-ink-dim hover:text-ink',
      ].join(' ')}
    >{children}</button>
  );
}

function TipNote() {
  return (
    <div className="flex items-center gap-2 text-xs text-ink-dim">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" className="text-info shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span>
        Run <code className="font-mono text-ink-bright bg-bg-3 px-1.5 py-0.5 rounded">./misc/setup_usb_automount.sh</code> to
        automount USB drives at boot.
      </span>
    </div>
  );
}

function Banner({
  tone, children, onDismiss,
}: { tone: 'info' | 'warn' | 'danger'; children: React.ReactNode; onDismiss?: () => void }) {
  const cls =
    tone === 'info'   ? 'bg-info/10   border-info/30   text-info' :
    tone === 'warn'   ? 'bg-warn/10   border-warn/30   text-warn' :
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

function copyDriveDetails(d: Drive) {
  const lines: string[] = [
    `Id: ${d.id}`,
    `Vendor: ${d.vendor}`,
    `Model: ${d.model}`,
    `Size: ${fmtSize(d.size)}`,
    `ConnectionBus: ${d.connection_bus}`,
    `Serial: ${d.serial}`,
    `Media: ${d.media || '—'}`,
    `MediaCompatibility: ${(d.media_compatibility ?? []).join(', ') || '—'}`,
    `Removable: ${d.removable}`,
    `Ejectable: ${d.ejectable}`,
    `CanPowerOff: ${d.can_power_off}`,
    `TimeDetected: ${d.time_detected || '—'}`,
    `TimeMediaDetected: ${d.time_media_detected || '—'}`,
    '',
    'Partitions:',
    ...(d.block_devices ?? []).map((b) =>
      `  ${b.device}\t${b.fstype || '-'}\t${b.label || '-'}\t${fmtSize(b.size)}\t${b.mounts.join(', ') || 'unmounted'}${b.protected ? '\t[protected]' : ''}`,
    ),
  ];
  navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
}
