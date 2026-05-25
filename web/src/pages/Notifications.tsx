import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface Notice {
  id: number;
  createDate: string | null;
  expireDate: string | null;
  category: string;
  ack: boolean;
  notification: string;
}

export default function Notifications() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Notifications</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const q = useQuery({
    queryKey: ['notifications-history'],
    queryFn: () => api<Notice[]>('/notifications/history'),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
    <DataTable<Notice>
      rows={rows}
      rowKey={(r) => r.id}
      defaultSort={{ key: 'createDate', dir: 'desc' }}
      columns={[
        {
          key: 'id',
          label: 'ID',
          render: (r) => <span className="font-mono">{r.id}</span>,
          sortValue: (r) => r.id,
        },
        {
          key: 'category',
          label: 'Category',
          render: (r) => <CategoryPill category={r.category} />,
          sortValue: (r) => r.category,
          searchValue: (r) => r.category,
        },
        {
          key: 'createDate',
          label: 'Created',
          render: (r) => <span className="font-mono">{fmtTs(r.createDate)}</span>,
          sortValue: (r) => r.createDate,
        },
        {
          key: 'expireDate',
          label: 'Expires',
          render: (r) => <span className="font-mono">{fmtTs(r.expireDate)}</span>,
          sortValue: (r) => r.expireDate,
        },
        {
          key: 'ack',
          label: 'Acked',
          render: (r) =>
            r.ack
              ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-info/15 text-info">yes</span>
              : <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn/15 text-warn">no</span>,
          sortValue: (r) => (r.ack ? 1 : 0),
        },
        {
          key: 'notification',
          label: 'Notification',
          render: (r) => <span className="text-ink">{r.notification}</span>,
          searchValue: (r) => r.notification,
        },
      ]}
    />
  );
}

function CategoryPill({ category }: { category: string }) {
  const c = category.toLowerCase();
  const tone =
    c.includes('error') || c.includes('fail') || c.includes('crit') ? 'bg-danger/15 text-danger' :
    c.includes('warn')                                              ? 'bg-warn/15 text-warn'    :
                                                                      'bg-info/15 text-info';
  return (
    <span className={['text-[10px] px-1.5 py-0.5 rounded', tone].join(' ')}>{category}</span>
  );
}
