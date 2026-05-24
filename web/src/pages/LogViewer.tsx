import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

interface LogResp { log: string }

const LINES_OPTIONS = [
  { value: 100,  label: '100 lines' },
  { value: 500,  label: '500 lines' },
  { value: 1000, label: '1000 lines' },
  { value: 5000, label: '5000 lines' },
];

const REFRESH_OPTIONS = [
  { value: 0,     label: 'Off' },
  { value: 5000,  label: '5s' },
  { value: 15000, label: '15s' },
  { value: 30000, label: '30s' },
];

export default function LogViewer() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3 min-h-0">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Log Viewer</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const [lines, setLines] = useState(500);
  const [filter, setFilter] = useState('');
  const [refreshMs, setRefreshMs] = useState(0);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const filterTimerRef = useRef<number | undefined>(undefined);

  async function fetchLog(opts: { lines: number; filter: string }) {
    setLoading(true);
    setError(null);
    try {
      const resp = await api<LogResp>('/log', {
        method: 'POST',
        body: JSON.stringify({ lines: opts.lines, filter: opts.filter }),
      });
      setText(resp.log || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fetch failed');
    } finally {
      setLoading(false);
    }
  }

  // Refetch when lines change or initial load
  useEffect(() => {
    fetchLog({ lines, filter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  // Debounce filter changes
  useEffect(() => {
    window.clearTimeout(filterTimerRef.current);
    filterTimerRef.current = window.setTimeout(() => {
      fetchLog({ lines, filter });
    }, 400);
    return () => window.clearTimeout(filterTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshMs) return;
    const id = window.setInterval(() => fetchLog({ lines, filter }), refreshMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMs, lines, filter]);

  return (
    <div className="flex flex-col gap-2 min-h-0">
      <div className="flex items-center gap-2 flex-wrap text-xs text-ink-dim">
        <Select label="Lines" value={lines} options={LINES_OPTIONS} onChange={setLines} />
        <Select label="Refresh" value={refreshMs} options={REFRESH_OPTIONS} onChange={setRefreshMs} />
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter (regex)"
          className="bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-2 py-1 text-ink text-xs flex-1 min-w-[150px] max-w-xs font-mono"
        />
        <a
          href="/indi-allsky/log/download"
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink transition-colors"
        >
          Download
        </a>
        {loading && <span>Loading…</span>}
        {error && <span className="text-danger">{error}</span>}
      </div>

      <pre className="bg-bg-1 border border-edge rounded-lg p-3 text-[11px] text-ink font-mono overflow-auto flex-1 min-h-[60vh] whitespace-pre">
        {text || (loading ? 'Loading…' : '')}
      </pre>
    </div>
  );
}
