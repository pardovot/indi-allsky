import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface BlockDevice {
  device: string;
  mounts: string[];
  label: string;
  fstype: string;
  size: number;
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
  block_devices: BlockDevice[];
}
interface DrivesResp { udisks2: boolean; drives: Drive[] }

function fmtSize(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / 1024 / 1024 / 1024;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(0)} MB`;
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
      {!q.data.udisks2 && (
        <div className="text-warn text-xs">UDisks2 not available — drive controls disabled.</div>
      )}
      {!isAdmin && (
        <div className="text-warn text-xs">Read-only: admin privileges required for actions.</div>
      )}
      {msg && (
        <div className={[
          'text-xs px-3 py-2 rounded border',
          msg.kind === 'ok'
            ? 'bg-info/10 border-info/30 text-info'
            : 'bg-danger/10 border-danger/30 text-danger',
        ].join(' ')}>
          {msg.text}
        </div>
      )}
      {q.data.drives.length === 0 ? (
        <div className="text-ink-dim text-sm">No drives detected.</div>
      ) : q.data.drives.map((d) => (
        <DriveCard
          key={d.id}
          drive={d}
          isAdmin={isAdmin}
          onAction={(body) => act.mutate(body)}
          busy={act.isPending}
        />
      ))}
    </div>
  );
}

function DriveCard({
  drive, isAdmin, onAction, busy,
}: {
  drive: Drive; isAdmin: boolean; busy: boolean;
  onAction: (body: Record<string, string>) => void;
}) {
  const [confirmPower, setConfirmPower] = useState(false);
  return (
    <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-bg-2 border-b border-edge flex items-center gap-3 flex-wrap">
        <div className="text-ink-bright text-sm font-medium font-mono">{drive.id}</div>
        <div className="text-ink-dim text-xs">{drive.vendor} {drive.model}</div>
        <div className="text-ink-dim text-xs font-mono">{fmtSize(drive.size)}</div>
        <div className="text-ink-dim text-xs">{drive.connection_bus}</div>
        {drive.removable && <span className="text-[10px] bg-bg-3 text-warn px-1.5 py-0.5 rounded">removable</span>}
        <div className="flex-1" />
        {drive.can_power_off && isAdmin && (
          <>
            <label className="text-xs text-ink-dim flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={confirmPower} onChange={(e) => setConfirmPower(e.target.checked)} />
              Confirm
            </label>
            <button
              disabled={!confirmPower || busy}
              onClick={() => { setConfirmPower(false); onAction({ COMMAND: 'poweroff', DRIVE_ID: drive.id }); }}
              className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-danger/40 text-danger text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Power off
            </button>
          </>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-1.5">Device</th>
            <th className="text-left px-3 py-1.5">Label</th>
            <th className="text-left px-3 py-1.5">FS</th>
            <th className="text-right px-3 py-1.5">Size</th>
            <th className="text-left px-3 py-1.5">Mount</th>
            {isAdmin && <th className="text-right px-3 py-1.5">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {drive.block_devices.length === 0 ? (
            <tr><td colSpan={isAdmin ? 6 : 5} className="px-3 py-3 text-center text-ink-dim text-xs">No partitions</td></tr>
          ) : drive.block_devices.map((b) => (
            <tr key={b.device} className="border-t border-edge">
              <td className="px-3 py-1 font-mono text-ink">{b.device}</td>
              <td className="px-3 py-1 text-ink-dim">{b.label || '—'}</td>
              <td className="px-3 py-1 text-ink-dim">{b.fstype || '—'}</td>
              <td className="px-3 py-1 text-right font-mono text-ink-dim">{fmtSize(b.size)}</td>
              <td className="px-3 py-1 font-mono text-ink-dim text-xs">
                {b.mounts.length ? b.mounts.join(', ') : <span className="text-ink-dim/60">unmounted</span>}
              </td>
              {isAdmin && (
                <td className="px-3 py-1 text-right">
                  {b.mounts.length ? (
                    <button
                      disabled={busy}
                      onClick={() => onAction({ COMMAND: 'unmount', DEVICE_ID: b.device })}
                      className="px-2 py-0.5 rounded bg-bg-2 hover:bg-bg-3 border border-edge text-warn text-xs disabled:opacity-40"
                    >Unmount</button>
                  ) : (
                    <button
                      disabled={busy}
                      onClick={() => onAction({ COMMAND: 'mount', DEVICE_ID: b.device })}
                      className="px-2 py-0.5 rounded bg-bg-2 hover:bg-bg-3 border border-edge text-info text-xs disabled:opacity-40"
                    >Mount</button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
