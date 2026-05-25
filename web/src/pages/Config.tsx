import PageShell from '@/components/PageShell';

// Config is intentionally a thin pass-through to the legacy /indi-allsky/config
// editor. The full form is ~3000 lines of tabbed Jinja and rebuilding it native
// is out of scope for this migration sweep. Re-evaluate when the legacy form
// is broken up or replaced.
export default function Config() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col">
          <div className="px-4 py-2 flex items-center gap-3 text-xs border-b border-edge">
            <h1 className="text-ink-bright text-sm font-semibold">Config</h1>
            <span className="text-ink-dim">Legacy editor — embedded</span>
            <div className="flex-1" />
            <a
              href="/indi-allsky/config"
              target="_blank"
              rel="noopener noreferrer"
              className="text-info hover:text-accent transition-colors"
            >Open in new tab ↗</a>
          </div>
          <iframe
            src="/indi-allsky/config"
            title="Config (legacy)"
            className="flex-1 w-full bg-bg-0"
            style={{ border: 0, minHeight: 'calc(100vh - 8rem)' }}
          />
        </main>
      )}
    </PageShell>
  );
}
