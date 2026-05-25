import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  createDate: string | null;
  active: boolean;
  staff: boolean;
  admin: boolean;
}

export default function Users() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Users</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const q = useQuery({
    queryKey: ['users'],
    queryFn: () => api<User[]>('/users'),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
    <DataTable<User>
      rows={rows}
      rowKey={(r) => r.id}
      defaultSort={{ key: 'createDate', dir: 'desc' }}
      columns={[
        {
          key: 'createDate',
          label: 'Created',
          render: (r) => <span className="font-mono">{fmtTs(r.createDate)}</span>,
          sortValue: (r) => r.createDate,
        },
        {
          key: 'username',
          label: 'Username',
          render: (r) => <span className="font-mono">{r.username}</span>,
          sortValue: (r) => r.username.toLowerCase(),
          searchValue: (r) => r.username,
        },
        {
          key: 'name',
          label: 'Name',
          render: (r) => r.name || '—',
          sortValue: (r) => (r.name || '').toLowerCase(),
          searchValue: (r) => r.name,
        },
        {
          key: 'email',
          label: 'Email',
          render: (r) => r.email || '—',
          sortValue: (r) => (r.email || '').toLowerCase(),
          searchValue: (r) => r.email,
        },
        {
          key: 'active',
          label: 'Active',
          render: (r) => <Pill on={r.active} />,
          sortValue: (r) => (r.active ? 1 : 0),
        },
        {
          key: 'staff',
          label: 'Staff',
          render: (r) => <Pill on={r.staff} />,
          sortValue: (r) => (r.staff ? 1 : 0),
        },
        {
          key: 'admin',
          label: 'Admin',
          render: (r) => <Pill on={r.admin} tone="warn" />,
          sortValue: (r) => (r.admin ? 1 : 0),
        },
      ]}
    />
  );
}

function Pill({ on, tone = 'info' }: { on: boolean; tone?: 'info' | 'warn' }) {
  if (!on) return <span className="text-ink-dim text-xs">no</span>;
  const cls = tone === 'warn' ? 'bg-warn/15 text-warn' : 'bg-info/15 text-info';
  return (
    <span className={['text-[10px] px-1.5 py-0.5 rounded', cls].join(' ')}>yes</span>
  );
}
