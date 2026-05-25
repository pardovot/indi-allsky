import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface Task {
  id: number;
  createDate: string | null;
  queue: string;
  state: string;
  action: string;
  result: string | null;
}

const STATE_TONE: Record<string, string> = {
  MANUAL:  'bg-bg-3 text-ink-dim',
  QUEUED:  'bg-info/15 text-info',
  RUNNING: 'bg-warn/15 text-warn',
  SUCCESS: 'bg-info/15 text-info',
  FAILED:  'bg-danger/15 text-danger',
};

export default function TaskQueue() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Task Queue</h1>
          <div className="text-[11px] text-ink-dim">Last 3 days of non-image/upload tasks.</div>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const q = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api<Task[]>('/tasks'),
    refetchInterval: 5_000,
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
    <DataTable<Task>
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
          label: 'Date',
          render: (r) => <span className="font-mono">{fmtTs(r.createDate)}</span>,
          sortValue: (r) => r.createDate,
        },
        {
          key: 'queue',
          label: 'Queue',
          render: (r) => <span className="font-mono text-ink-dim">{r.queue}</span>,
          sortValue: (r) => r.queue,
          searchValue: (r) => r.queue,
        },
        {
          key: 'action',
          label: 'Action',
          render: (r) => <span className="font-mono">{r.action}</span>,
          sortValue: (r) => r.action,
          searchValue: (r) => r.action,
        },
        {
          key: 'state',
          label: 'State',
          render: (r) => (
            <span
              className={[
                'text-[10px] px-1.5 py-0.5 rounded',
                STATE_TONE[r.state] ?? 'bg-bg-3 text-ink-dim',
              ].join(' ')}
            >{r.state}</span>
          ),
          sortValue: (r) => r.state,
        },
        {
          key: 'result',
          label: 'Result',
          render: (r) => (
            r.result
              ? <span className="font-mono text-ink-dim text-xs">{r.result}</span>
              : <span className="text-ink-dim/50">—</span>
          ),
          searchValue: (r) => r.result || '',
        },
      ]}
    />
  );
}
