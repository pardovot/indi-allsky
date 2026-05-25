import { useEffect, useRef, useState } from 'react';
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
          <div>
            <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Cameras</h1>
            <p className="text-[11px] text-ink-dim mt-0.5">
              Admins can edit a camera's friendly name and toggle whether it appears in the topbar selector.
            </p>
          </div>
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
            label: 'Visibility',
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
  const [value, setValue] = useState(cam.friendlyName ?? '');
  const [savedFlash, setSavedFlash] = useState(false);
  const prevSaved = useRef(cam.friendlyName ?? '');

  useEffect(() => {
    setValue(cam.friendlyName ?? '');
    prevSaved.current = cam.friendlyName ?? '';
  }, [cam.friendlyName]);

  const commit = () => {
    const v = value.trim();
    if (v === prevSaved.current) {
      setValue(v);
      return;
    }
    prevSaved.current = v;
    onSave(v.length ? v : null);
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1200);
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      <input
        type="text"
        disabled={!editable}
        value={value}
        maxLength={100}
        placeholder={editable ? 'Set friendly name…' : '—'}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          if (e.key === 'Escape') {
            setValue(prevSaved.current);
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={[
          'rounded px-2 py-1 text-sm w-48 transition-colors',
          'bg-bg-2 border placeholder:text-ink-dim/60',
          editable
            ? 'border-edge hover:border-edge-strong focus:border-accent focus:outline-none text-ink'
            : 'border-transparent text-ink-dim cursor-not-allowed',
        ].join(' ')}
      />
      {editable && (
        <PencilIcon className="text-ink-dim/40 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" />
      )}
      {/* Absolute so visibility toggling never shifts the cell layout. */}
      <span
        aria-hidden={!savedFlash}
        className={[
          'absolute left-full ml-2 text-[10px] text-info pointer-events-none whitespace-nowrap',
          'transition-opacity duration-200',
          savedFlash ? 'opacity-100' : 'opacity-0',
        ].join(' ')}
      >saved</span>
    </div>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      width="11" height="11" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function HiddenToggle({
  cam, disabled, onToggle,
}: { cam: Camera; disabled: boolean; onToggle: (v: boolean) => void }) {
  const shown = !cam.hidden;
  return (
    <label
      className={[
        'inline-flex items-center gap-2',
        disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
      ].join(' ')}
      title={shown
        ? 'Shown in camera selector — click to hide'
        : 'Hidden from camera selector — click to show'}
    >
      <span
        role="switch"
        aria-checked={shown}
        aria-disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          if (!disabled) onToggle(!cam.hidden); // toggle hidden = invert "shown"
        }}
        className={[
          'relative inline-block h-4 w-7 rounded-full transition-colors flex-shrink-0',
          shown ? 'bg-info' : 'bg-bg-3 border border-edge',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform shadow',
            shown ? 'translate-x-3.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
      <span className={['text-xs', shown ? 'text-ink' : 'text-ink-dim'].join(' ')}>
        {shown ? 'Show in selector' : 'Hidden'}
      </span>
    </label>
  );
}
