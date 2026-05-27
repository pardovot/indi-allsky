import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface Pin { id: number; name: string; state: number }
interface GpioResp { gpio_class: string; pins: Pin[] }

export default function Gpio() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">GPIO Control</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const meQ = useQuery({ queryKey: ['me'], queryFn: () => api<{ admin: boolean }>('/auth/me'), staleTime: 5 * 60_000 });
  const isAdmin = !!meQ.data?.admin;

  const q = useQuery({
    queryKey: ['gpio'],
    queryFn: () => api<GpioResp>('/gpio'),
    refetchInterval: 15_000,
  });

  const set = useMutation({
    mutationFn: (body: { PIN_ID: number; NEW_PIN_STATE: boolean }) =>
      api<{ pin_state: number }>('/gpio/set', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gpio'] }),
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as { 'failure-message'?: string } | null) : null;
      setError(body?.['failure-message'] || (err instanceof Error ? err.message : 'Failed'));
    },
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error || !q.data) return <div className="text-danger text-sm">Failed to load</div>;

  if (!q.data.gpio_class) {
    return <div className="text-ink-dim text-sm">Manual GPIO is not configured (set MANUAL_GPIO in Config → Devices).</div>;
  }

  return (
    <div className="space-y-3 max-w-xl">
      {!isAdmin && (
        <div className="px-3 py-2 rounded border text-xs bg-warn/10 border-warn/30 text-warn">
          Read-only — admin required to toggle pins.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none px-1">×</button>
        </div>
      )}
      <div className="text-[11px] text-ink-dim">Driver: <span className="font-mono">{q.data.gpio_class}</span></div>

      <div className="bg-bg-1 border border-edge rounded-lg divide-y divide-edge/60">
        {q.data.pins.map((pin) => {
          const on = pin.state === 1;
          const err = pin.state === -1;
          return (
            <div key={pin.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm text-ink">Pin {pin.id}</div>
                <div className="text-[11px] text-ink-dim font-mono">{pin.name}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={['text-xs', err ? 'text-danger' : on ? 'text-info' : 'text-ink-dim'].join(' ')}>
                  {err ? 'error' : on ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  disabled={!isAdmin || err || set.isPending}
                  onClick={() => { setError(null); set.mutate({ PIN_ID: pin.id, NEW_PIN_STATE: !on }); }}
                  className={[
                    'relative inline-block h-5 w-9 rounded-full border transition-colors',
                    on ? 'bg-info border-info' : 'bg-bg-3 border-edge',
                    (!isAdmin || err || set.isPending) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  <span className={['absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow transition-transform', on ? 'translate-x-4' : 'translate-x-0'].join(' ')} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
