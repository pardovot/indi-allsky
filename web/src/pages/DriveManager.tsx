import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

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

function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

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
        <Banner tone="warn">Read-only: admin privileges required to mount/unmount or power off.</Banner>
      )}
      {msg && (
        <Banner tone={msg.kind === 'ok' ? 'info' : 'danger'} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Banner>
      )}

      {q.data.drives.length === 0 ? (
        <div className="text-ink-dim text-sm">No drives detected.</div>
      ) : q.data.drives.map((d) => (
        <DriveCard
          key={d.id}
          drive={d}
          isAdmin={isAdmin}
          busy={act.isPending}
          onAction={(body) => { setMsg(null); act.mutate(body); }}
        />
      ))}
    </div>
  );
}

function TipNote() {
  return (
    <div className="bg-info/5 border border-info/30 rounded-md px-3 py-2 text-xs text-ink flex items-center gap-2">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
           strokeLinecap="round" strokeLinejoin="round" className="text-info shrink-0">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
      <span className="text-ink-dim">
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

function DriveCard({
  drive, isAdmin, busy, onAction,
}: {
  drive: Drive; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  const [confirmPower, setConfirmPower] = useState(false);
  const title = `${drive.vendor} ${drive.model}`.trim() || drive.id;

  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      {/* Drive header */}
      <div className="px-4 py-3 bg-bg-2 border-b border-edge flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-ink-bright font-semibold text-base truncate">{title}</span>
            {drive.removable     && <Tag tone="warn">removable</Tag>}
            {drive.ejectable     && <Tag>ejectable</Tag>}
            {drive.can_power_off && <Tag tone="info">power-off</Tag>}
          </div>
          <div className="text-ink-dim text-xs font-mono mt-0.5 truncate">{drive.id}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => copyDriveDetails(drive)}
            className="px-2.5 py-1 rounded-md bg-bg-1 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-xs"
          >Copy details</button>
          {isAdmin && drive.can_power_off && (
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
                onClick={() => { setConfirmPower(false); onAction({ COMMAND: 'poweroff', DRIVE_ID: drive.id }); }}
                className="px-2.5 py-1 rounded-md bg-bg-1 hover:bg-danger/10 border border-danger/40 text-danger text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >Power off</button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata strip */}
      <dl className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2 text-xs border-b border-edge">
        <Meta label="Size"     value={fmtSize(drive.size)} mono />
        <Meta label="Bus"      value={drive.connection_bus} />
        <Meta label="Media"    value={drive.media || '—'} />
        <Meta label="Serial"   value={drive.serial || '—'} mono />
        {(drive.media_compatibility?.length ?? 0) > 0 && (
          <Meta label="Compatible" value={drive.media_compatibility!.join(', ')} className="col-span-2" />
        )}
        {drive.time_detected && (
          <Meta label="Detected" value={drive.time_detected} mono />
        )}
        {drive.time_media_detected && (
          <Meta label="Media seen" value={drive.time_media_detected} mono />
        )}
      </dl>

      {/* Mounts sub-table */}
      <MountsTable drive={drive} isAdmin={isAdmin} busy={busy} onAction={onAction} />
    </div>
  );
}

function Meta({
  label, value, mono, className,
}: { label: string; value: string; mono?: boolean; className?: string }) {
  return (
    <div className={['flex flex-col gap-0.5 min-w-0', className ?? ''].join(' ')}>
      <dt className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</dt>
      <dd className={['truncate text-ink', mono ? 'font-mono' : ''].join(' ')}>{value}</dd>
    </div>
  );
}

function MountsTable({
  drive, isAdmin, busy, onAction,
}: {
  drive: Drive; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  // Filter out raw whole-disk entries (no filesystem) — the original page
  // doesn't list them in the Mounts tab either.
  const partitions = (drive.block_devices ?? []).filter((b) => b.mountable || b.mounts.length > 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-bg-1 text-ink-dim text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left px-4 py-2 w-44">Device</th>
            <th className="text-left px-4 py-2 w-24">FS</th>
            <th className="text-left px-4 py-2">Label</th>
            <th className="text-right px-4 py-2 w-24">Size</th>
            <th className="text-left px-4 py-2">Mount point</th>
            {isAdmin && <th className="text-right px-4 py-2 w-40">Action</th>}
          </tr>
        </thead>
        <tbody>
          {partitions.length === 0 ? (
            <tr><td colSpan={isAdmin ? 6 : 5} className="px-4 py-3 text-center text-ink-dim text-xs">No partitions on this drive</td></tr>
          ) : partitions.map((b) => (
            <MountRow key={b.device} b={b} isAdmin={isAdmin} busy={busy} onAction={onAction} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MountRow({
  b, isAdmin, busy, onAction,
}: {
  b: BlockDevice; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  const mounted = b.mounts.length > 0;
  const [confirmProt, setConfirmProt] = useState(false);

  return (
    <tr className="border-t border-edge hover:bg-bg-2/40 transition-colors">
      <td className="px-4 py-2 font-mono text-ink text-xs">{b.device}</td>
      <td className="px-4 py-2 font-mono text-ink-dim text-xs">{b.fstype || '—'}</td>
      <td className="px-4 py-2 text-ink-dim text-xs">{b.label || '—'}</td>
      <td className="px-4 py-2 text-right font-mono text-ink-dim text-xs">{fmtSize(b.size)}</td>
      <td className="px-4 py-2 text-xs">
        {mounted ? (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-ink">{b.mounts.join(', ')}</span>
            {b.protected && <Tag tone="warn">system</Tag>}
          </span>
        ) : (
          <span className="text-ink-dim italic">unmounted</span>
        )}
      </td>
      {isAdmin && (
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-2">
            <MountAction
              b={b} mounted={mounted} busy={busy} onAction={onAction}
              confirmProt={confirmProt} setConfirmProt={setConfirmProt}
            />
          </div>
        </td>
      )}
    </tr>
  );
}

function MountAction({
  b, mounted, busy, confirmProt, setConfirmProt, onAction,
}: {
  b: BlockDevice; mounted: boolean; busy: boolean;
  confirmProt: boolean; setConfirmProt: (v: boolean) => void;
  onAction: (body: Record<string, string>) => void;
}) {
  if (!b.block_id) return <span className="text-[10px] text-ink-dim italic">no id</span>;

  if (b.protected && mounted) {
    return (
      <>
        <label className="text-[10px] text-ink-dim flex items-center gap-1 cursor-pointer" title="System mount — the server will refuse unless you understand the risk">
          <input
            type="checkbox"
            checked={confirmProt}
            onChange={(e) => setConfirmProt(e.target.checked)}
            className="accent-danger"
          />
          Force
        </label>
        <button
          disabled={!confirmProt || busy}
          onClick={() => { setConfirmProt(false); onAction({ COMMAND: 'unmount', DEVICE_ID: b.block_id }); }}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-danger/10 border border-danger/40 text-danger text-xs disabled:opacity-40 disabled:cursor-not-allowed"
        >Unmount</button>
      </>
    );
  }

  if (mounted) {
    return (
      <button
        disabled={busy}
        onClick={() => onAction({ COMMAND: 'unmount', DEVICE_ID: b.block_id })}
        className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-warn/40 text-warn text-xs disabled:opacity-40"
      >Unmount</button>
    );
  }

  return (
    <button
      disabled={busy}
      onClick={() => onAction({ COMMAND: 'mount', DEVICE_ID: b.block_id })}
      className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-info/40 text-info text-xs disabled:opacity-40"
    >Mount</button>
  );
}

function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'warn' | 'info' }) {
  const cls =
    tone === 'warn' ? 'bg-bg-3 text-warn' :
    tone === 'info' ? 'bg-bg-3 text-info' :
                      'bg-bg-3 text-ink-dim';
  return <span className={['text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap', cls].join(' ')}>{children}</span>;
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
