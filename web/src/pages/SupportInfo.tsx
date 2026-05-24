import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import PageShell from '@/components/PageShell';

interface SupportResp { support_info: string }

export default function SupportInfo() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Support Info</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const [copied, setCopied] = useState(false);
  const q = useQuery({
    queryKey: ['support-info'],
    queryFn: () => api<SupportResp>('/support-info'),
  });

  function copy() {
    if (!q.data?.support_info) return;
    navigator.clipboard?.writeText(q.data.support_info).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-ink-dim">
        <button
          onClick={copy}
          disabled={!q.data?.support_info}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
        >
          {copied ? 'Copied!' : 'Copy all'}
        </button>
        {q.isLoading && <span>Running support_info.sh — this can take a minute…</span>}
      </div>
      <pre className="bg-bg-1 border border-edge rounded-lg p-3 text-[11px] text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-[80vh] overflow-y-auto">
        {q.isLoading ? 'Loading…' : q.data?.support_info || ''}
      </pre>
    </div>
  );
}
