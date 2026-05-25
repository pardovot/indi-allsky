import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import DataTable, { fmtTs } from '@/components/DataTable';

interface Camera {
  id: number;
  name: string;
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
  const q = useQuery({
    queryKey: ['cameras-admin'],
    queryFn: () => api<Camera[]>('/cameras-list'),
  });

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error) return <div className="text-danger text-sm">Failed to load</div>;

  const rows = q.data ?? [];

  return (
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
  );
}
