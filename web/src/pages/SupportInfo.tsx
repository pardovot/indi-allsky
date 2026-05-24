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

async function downloadGzipped(text: string, prefix: string) {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream({
    start(c) { c.enqueue(bytes); c.close(); },
  });
  // CompressionStream is available in modern browsers
  // @ts-expect-error CompressionStream typing varies by TS lib
  const compressed = stream.pipeThrough(new CompressionStream('gzip'));
  const blob = await new Response(compressed).blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  a.href = url;
  a.download = `${prefix}_${stamp}.txt.gz`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <button
          onClick={copy}
          disabled={!q.data?.support_info}
          className="px-2.5 py-1 rounded-md bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg-0 font-medium transition-colors"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
        <button
          onClick={() => q.data?.support_info && downloadGzipped(q.data.support_info, 'indi-allsky_support_info')}
          disabled={!q.data?.support_info}
          className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink disabled:opacity-40 transition-colors"
        >
          Download support info (.txt.gz)
        </button>

        <span className="mx-2 text-ink-dim/40">|</span>

        <DownloadLink href="/indi-allsky/log/download"          label="Capture log" />
        <DownloadLink href="/indi-allsky/log/webapp_download"   label="Webapp log" />
        <DownloadLink href="/indi-allsky/log/syslog_download"   label="OS syslog" />
        <DownloadLink href="/indi-allsky/log/kern_download"     label="Kernel log" />

        <a
          href="https://github.com/aaronwmorris/indi-allsky/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-2.5 py-1 rounded-md bg-danger/20 text-danger border border-danger/30 hover:bg-danger/30 transition-colors"
        >
          GitHub Issues ↗
        </a>

        {q.isLoading && <span className="text-ink-dim">Running support_info.sh — this can take a minute…</span>}
      </div>

      <div className="text-[11px] text-ink-dim">
        Support info can be pasted directly into a GitHub issue.
      </div>

      <pre className="bg-bg-1 border border-edge rounded-lg p-3 text-[11px] text-ink font-mono overflow-x-auto whitespace-pre-wrap max-h-[75vh] overflow-y-auto">
        {q.isLoading ? 'Loading…' : q.data?.support_info || ''}
      </pre>
    </div>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink transition-colors"
    >
      {label}
    </a>
  );
}
