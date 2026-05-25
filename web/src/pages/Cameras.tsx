import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
  hidden: boolean;
  connectDate: string | null;
  width: number;
  height: number;
  pixelSize: number;
  bits: number;
  minGain: number;
  maxGain: number;
  minBinning: number;
  maxBinning: number;
  minExposure: number;
  maxExposure: number;
}

export default function Cameras() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Cameras</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const q = useQuery({
    queryKey: ['cameras-admin'],
    queryFn: () => api<Camera[]>('/cameras-list'),
  });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Pick<Camera, 'friendlyName' | 'hidden'>> }) =>
      api<Camera>(`/cameras-list/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras-admin'] });
      qc.invalidateQueries({ queryKey: ['cameras'] }); // header selector
    },
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as { 'failure-message'?: string } | null) : null;
      setError(body?.['failure-message'] || (err instanceof Error ? err.message : 'Update failed'));
    },
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Read-only — admin required to edit.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none px-1">×</button>
        </div>
      )}

      <DataTable<Camera>
        rows={rows}
        rowKey={(r) => r.id}
        defaultSort={{ key: 'id', dir: 'desc' }}
        columns={[
          {
            key: 'id',
            label: 'ID',
            render: (r) => <span className="font-mono">{r.id}</span>,
            sortValue: (r) => r.id,
          },
          {
            key: 'name',
            label: 'Camera',
            render: (r) => r.name,
            sortValue: (r) => r.name.toLowerCase(),
            searchValue: (r) => r.name,
          },
          {
            key: 'friendlyName',
            label: 'Friendly Name',
            render: (r) => (
              <FriendlyNameCell
                cam={r}
                editable={isAdmin}
                onSave={(v) => { setError(null); patch.mutate({ id: r.id, body: { friendlyName: v } }); }}
              />
            ),
            sortValue: (r) => (r.friendlyName || '').toLowerCase(),
            searchValue: (r) => r.friendlyName || '',
          },
          {
            key: 'hidden',
            label: 'Hidden',
            render: (r) => (
              <HiddenToggle
                cam={r}
                disabled={!isAdmin || patch.isPending}
                onToggle={(v) => { setError(null); patch.mutate({ id: r.id, body: { hidden: v } }); }}
              />
            ),
            sortValue: (r) => (r.hidden ? 1 : 0),
          },
          {
            key: 'connectDate',
            label: 'Connect Date',
            render: (r) => <span className="font-mono">{fmtTs(r.connectDate)}</span>,
            sortValue: (r) => r.connectDate,
          },
          {
            key: 'size',
            label: 'Size',
            render: (r) => <span className="font-mono">{r.width}×{r.height}</span>,
            sortValue: (r) => r.width * r.height,
            right: true,
          },
          {
            key: 'pixels',
            label: 'Pixel µm',
            render: (r) => <span className="font-mono">{r.pixelSize.toFixed(2)}</span>,
            sortValue: (r) => r.pixelSize,
            right: true,
          },
          {
            key: 'bits',
            label: 'Bits',
            render: (r) => <span className="font-mono">{r.bits}</span>,
            sortValue: (r) => r.bits,
            right: true,
          },
          {
            key: 'gain',
            label: 'Gain',
            render: (r) => (
              <span className="font-mono">
                {r.minGain.toFixed(2)} – {r.maxGain.toFixed(2)}
              </span>
            ),
            sortValue: (r) => r.maxGain,
          },
          {
            key: 'binning',
            label: 'Binning',
            render: (r) => (
              <span className="font-mono">{r.minBinning} – {r.maxBinning}</span>
            ),
          },
          {
            key: 'exposure',
            label: 'Exposure',
            render: (r) => (
              <span className="font-mono">
                {r.minExposure.toFixed(6)} – {r.maxExposure.toFixed(1)}s
              </span>
            ),
            sortValue: (r) => r.maxExposure,
          },
        ]}
      />
    </div>
  );
}

function FriendlyNameCell({
  cam, editable, onSave,
}: { cam: Camera; editable: boolean; onSave: (value: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(cam.friendlyName ?? '');

  if (!editable || !editing) {
    return (
      <button
        type="button"
        disabled={!editable}
        onClick={() => { setValue(cam.friendlyName ?? ''); setEditing(true); }}
        className={[
          'text-left',
          editable ? 'hover:text-ink-bright cursor-text' : 'cursor-default',
          cam.friendlyName ? 'text-ink' : 'text-ink-dim italic',
        ].join(' ')}
      >
        {cam.friendlyName || '—'}
      </button>
    );
  }

  const commit = () => {
    const v = value.trim();
    setEditing(false);
    if (v === (cam.friendlyName ?? '')) return;
    onSave(v.length ? v : null);
  };

  return (
    <input
      autoFocus
      value={value}
      maxLength={100}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setEditing(false); }
      }}
      className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded px-1.5 py-0.5 text-ink text-sm w-44"
    />
  );
}

function HiddenToggle({
  cam, disabled, onToggle,
}: { cam: Camera; disabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(!cam.hidden)}
      title={cam.hidden ? 'Hidden from camera selector' : 'Visible in camera selector'}
      className={[
        'text-[10px] px-1.5 py-0.5 rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        cam.hidden
          ? 'bg-warn/15 border-warn/40 text-warn hover:bg-warn/25'
          : 'bg-bg-3 border-edge text-ink-dim hover:text-ink',
      ].join(' ')}
    >
      {cam.hidden ? 'hidden' : 'visible'}
    </button>
  );
}
