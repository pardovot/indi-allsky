import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { auth } from '@/lib/auth';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface ConfigEntry {
  id: number;
  createDate: string | null;
  level: string;
  note: string | null;
  encrypted: boolean;
  username: string;
}

const API_BASE = '/indi-allsky/api/v2';

export default function ConfigHistory() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Config History</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const [error, setError] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['config-history'],
    queryFn: () => api<ConfigEntry[]>('/config-history'),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-3 px-3 py-2 rounded border text-xs bg-danger/10 border-danger/30 text-danger">
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="opacity-60 hover:opacity-100 text-base leading-none px-1">×</button>
        </div>
      )}

      <DataTable<ConfigEntry>
        rows={rows}
        rowKey={(r) => r.id}
        defaultSort={{ key: 'createDate', dir: 'desc' }}
        columns={[
          {
            key: 'id',
            label: 'ID',
            render: (r) => <span className="font-mono text-ink-dim">{r.id}</span>,
            sortValue: (r) => r.id,
          },
          {
            key: 'createDate',
            label: 'Created',
            render: (r) => <span className="font-mono">{fmtTs(r.createDate)}</span>,
            sortValue: (r) => r.createDate,
          },
          {
            key: 'username',
            label: 'User',
            render: (r) => <span className="font-mono">{r.username}</span>,
            sortValue: (r) => r.username.toLowerCase(),
            searchValue: (r) => r.username,
          },
          {
            key: 'level',
            label: 'Level',
            render: (r) => <span className="font-mono">{r.level}</span>,
            sortValue: (r) => r.level,
            searchValue: (r) => r.level,
          },
          {
            key: 'encrypted',
            label: 'Encrypted',
            render: (r) => r.encrypted
              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info">yes</span>
              : <span className="text-ink-dim text-xs">no</span>,
            sortValue: (r) => (r.encrypted ? 1 : 0),
          },
          {
            key: 'download',
            label: 'Download',
            render: (r) => (
              <div className="flex items-center gap-2">
                <DownloadButton id={r.id} redact={false} onError={setError} />
                <DownloadButton id={r.id} redact onError={setError} />
              </div>
            ),
          },
          {
            key: 'note',
            label: 'Note',
            render: (r) => r.note
              ? <span className="text-ink-dim text-xs">{r.note}</span>
              : <span className="text-ink-dim/50">—</span>,
            searchValue: (r) => r.note || '',
          },
        ]}
      />

      <div className="text-[11px] text-ink-dim">
        Configs from deleted users are not shown but remain in the database.
      </div>
    </div>
  );
}

function DownloadButton({
  id, redact, onError,
}: { id: number; redact: boolean; onError: (msg: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadConfig(id, redact);
        } catch (e) {
          onError(e instanceof ApiError ? e.message : (e instanceof Error ? e.message : 'Download failed'));
        } finally {
          setBusy(false);
        }
      }}
      className={[
        'text-[10px] px-1.5 py-0.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        redact
          ? 'bg-warn/10 hover:bg-warn/20 border-warn/40 text-warn'
          : 'bg-info/10 hover:bg-info/20 border-info/40 text-info',
      ].join(' ')}
    >{redact ? 'Redacted' : 'Download'}</button>
  );
}

/**
 * Fetch the config file with the JWT bearer header and trigger a browser
 * download via a Blob URL. The legacy <a href> approach won't work because
 * the access token lives in memory, not in a cookie.
 */
async function downloadConfig(id: number, redact: boolean): Promise<void> {
  const url = `${API_BASE}/config-download/${id}?redact=${redact ? 1 : 0}`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `${res.status} ${res.statusText}`);

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') || '';
  const m = /filename="?([^";]+)"?/.exec(disposition);
  const filename = m ? m[1] : `config-${id}.json`;

  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objUrl);
}
