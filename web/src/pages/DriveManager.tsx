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
  media: string;
  block_devices: BlockDevice[];
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
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function DriveManager() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
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
    <div className="space-y-3">
      <SetupNote />

      {!q.data.udisks2 && (
        <Banner tone="warn">UDisks2 not available — drive controls disabled.</Banner>
      )}
      {!isAdmin && q.data.udisks2 && (
        <Banner tone="warn">Read-only: admin privileges required to mount/unmount/power off.</Banner>
      )}
      {msg && (
        <Banner tone={msg.kind === 'ok' ? 'info' : 'danger'} onDismiss={() => setMsg(null)}>
          {msg.text}
        </Banner>
      )}

      {q.data.drives.length === 0 ? (
        <div className="text-ink-dim text-sm">No drives detected.</div>
      ) : (
        <DrivesTable
          drives={q.data.drives}
          isAdmin={isAdmin}
          busy={act.isPending}
          onAction={(body) => { setMsg(null); act.mutate(body); }}
        />
      )}
    </div>
  );
}

function SetupNote() {
  return (
    <div className="bg-bg-1 border-l-2 border-info/60 border-y border-r border-edge rounded-md px-3 py-2 text-xs text-ink-dim flex items-center gap-2">
      <span className="text-info font-medium">Tip</span>
      <span>
        Run <code className="font-mono text-ink bg-bg-3 px-1.5 py-0.5 rounded">./misc/setup_usb_automount.sh</code> to
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
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 text-base leading-none">×</button>
      )}
    </div>
  );
}

function DrivesTable({
  drives, isAdmin, busy, onAction,
}: {
  drives: Drive[]; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
            <tr>
              <th className="text-left  px-3 py-2 w-44">Drive</th>
              <th className="text-left  px-3 py-2">Vendor / Model</th>
              <th className="text-right px-3 py-2 w-24">Size</th>
              <th className="text-left  px-3 py-2 w-24">Bus</th>
              <th className="text-left  px-3 py-2 w-32">Flags</th>
              {isAdmin && <th className="text-right px-3 py-2 w-44">Drive actions</th>}
            </tr>
          </thead>
          <tbody>
            {drives.map((d) => (
              <DriveBlock key={d.id} drive={d} isAdmin={isAdmin} busy={busy} onAction={onAction} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DriveBlock({
  drive, isAdmin, busy, onAction,
}: {
  drive: Drive; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  const [confirmPower, setConfirmPower] = useState(false);

  return (
    <>
      <tr className="border-t border-edge bg-bg-2/40">
        <td className="px-3 py-2 font-mono text-ink-bright">{drive.id}</td>
        <td className="px-3 py-2 text-ink">{drive.vendor} <span className="text-ink-dim">/ {drive.model || '—'}</span></td>
        <td className="px-3 py-2 text-right font-mono text-ink">{fmtSize(drive.size)}</td>
        <td className="px-3 py-2 text-ink-dim">{drive.connection_bus}</td>
        <td className="px-3 py-2">
          <div className="flex flex-wrap gap-1">
            {drive.removable     && <Tag tone="warn">removable</Tag>}
            {drive.ejectable     && <Tag>ejectable</Tag>}
            {drive.can_power_off && <Tag tone="info">power-off</Tag>}
            {drive.media         && <Tag>{drive.media}</Tag>}
          </div>
        </td>
        {isAdmin && (
          <td className="px-3 py-2">
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => copyDriveDetails(drive)}
                title="Copy drive details"
                className="px-2 py-0.5 rounded bg-bg-3 hover:bg-bg-2 border border-edge text-ink-dim hover:text-ink text-xs"
              >Copy</button>
              {drive.can_power_off ? (
                <>
                  <label className="text-[10px] text-ink-dim flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={confirmPower} onChange={(e) => setConfirmPower(e.target.checked)} />
                    Confirm
                  </label>
                  <button
                    disabled={!confirmPower || busy}
                    onClick={() => { setConfirmPower(false); onAction({ COMMAND: 'poweroff', DRIVE_ID: drive.id }); }}
                    className="px-2 py-0.5 rounded bg-bg-3 hover:bg-bg-2 border border-danger/40 text-danger text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >Power off</button>
                </>
              ) : <span className="text-[10px] text-ink-dim italic">—</span>}
            </div>
          </td>
        )}
      </tr>
      {drive.block_devices.length === 0 ? (
        <tr className="border-t border-edge">
          <td colSpan={isAdmin ? 6 : 5} className="px-6 py-2 text-ink-dim text-xs italic">No partitions on this drive</td>
        </tr>
      ) : drive.block_devices.map((b) => (
        <PartitionRow key={b.device} b={b} isAdmin={isAdmin} busy={busy} onAction={onAction} />
      ))}
    </>
  );
}

function PartitionRow({
  b, isAdmin, busy, onAction,
}: {
  b: BlockDevice; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  const mounted = b.mounts.length > 0;
  const [confirmProt, setConfirmProt] = useState(false);

  return (
    <tr className="border-t border-edge hover:bg-bg-2/40 transition-colors">
      <td className="px-3 py-1.5 pl-8 font-mono text-ink-dim text-xs">└ {b.device}</td>
      <td className="px-3 py-1.5 text-ink-dim text-xs" colSpan={1}>
        <span className="font-mono text-ink">{b.fstype || '—'}</span>
        {b.label && <span className="ml-2">{b.label}</span>}
      </td>
      <td className="px-3 py-1.5 text-right font-mono text-ink-dim text-xs">{fmtSize(b.size)}</td>
      <td className="px-3 py-1.5 text-ink-dim text-xs" colSpan={2}>
        {mounted ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-ink">{b.mounts.join(', ')}</span>
            {b.protected && <Tag tone="warn">system</Tag>}
          </div>
        ) : (
          <span className="text-ink-dim/60 italic">unmounted</span>
        )}
      </td>
      {isAdmin && (
        <td className="px-3 py-1.5">
          <div className="flex items-center justify-end gap-2">
            {!b.mountable ? (
              <span className="text-[10px] text-ink-dim italic">no filesystem</span>
            ) : !b.block_id ? (
              <span className="text-[10px] text-ink-dim italic">missing id</span>
            ) : b.protected && mounted ? (
              <>
                <label className="text-[10px] text-ink-dim flex items-center gap-1 cursor-pointer" title="System mount — unmounting may break the OS">
                  <input type="checkbox" checked={confirmProt} onChange={(e) => setConfirmProt(e.target.checked)} />
                  Force
                </label>
                <button
                  disabled={!confirmProt || busy}
                  onClick={() => { setConfirmProt(false); onAction({ COMMAND: 'unmount', DEVICE_ID: b.block_id }); }}
                  title="Unmounting a protected/system mount is blocked by the server"
                  className="px-2 py-0.5 rounded bg-bg-3 hover:bg-bg-2 border border-danger/40 text-danger text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                >Unmount</button>
              </>
            ) : mounted ? (
              <button
                disabled={busy}
                onClick={() => onAction({ COMMAND: 'unmount', DEVICE_ID: b.block_id })}
                className="px-2 py-0.5 rounded bg-bg-3 hover:bg-bg-2 border border-edge text-warn text-xs disabled:opacity-40"
              >Unmount</button>
            ) : (
              <button
                disabled={busy}
                onClick={() => onAction({ COMMAND: 'mount', DEVICE_ID: b.block_id })}
                className="px-2 py-0.5 rounded bg-bg-3 hover:bg-bg-2 border border-edge text-info text-xs disabled:opacity-40"
              >Mount</button>
            )}
          </div>
        </td>
      )}
    </tr>
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
    `Removable: ${d.removable}`,
    `Ejectable: ${d.ejectable}`,
    `CanPowerOff: ${d.can_power_off}`,
    '',
    'Partitions:',
    ...d.block_devices.map((b) =>
      `  ${b.device}\t${b.fstype || '-'}\t${b.label || '-'}\t${fmtSize(b.size)}\t${b.mounts.join(', ') || 'unmounted'}${b.protected ? '\t[protected]' : ''}`,
    ),
  ];
  navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
}
