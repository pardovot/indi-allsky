interface ImageControlsProps {
  night: boolean;
  onNightChange: (v: boolean) => void;
  refreshMs: number;
  onRefreshChange: (ms: number) => void;
  lastUpdated: Date | null;
}

const REFRESH_OPTIONS: { label: string; ms: number }[] = [
  { label: '5s', ms: 5_000 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '60s', ms: 60_000 },
];

export default function ImageControls({
  night,
  onNightChange,
  refreshMs,
  onRefreshChange,
  lastUpdated,
}: ImageControlsProps) {
  return (
    <div className="flex items-center flex-wrap justify-center gap-2 text-xs">
      <div className="inline-flex rounded-md bg-bg-2 border border-edge overflow-hidden" role="group">
        <button
          onClick={() => onNightChange(true)}
          className={[
            'px-3 py-1 transition-colors',
            night ? 'bg-bg-3 text-ink-bright' : 'text-ink-dim hover:text-ink',
          ].join(' ')}
        >
          Night
        </button>
        <button
          onClick={() => onNightChange(false)}
          className={[
            'px-3 py-1 transition-colors',
            !night ? 'bg-bg-3 text-ink-bright' : 'text-ink-dim hover:text-ink',
          ].join(' ')}
        >
          Day
        </button>
      </div>

      <div className="inline-flex items-center gap-1 rounded-md bg-bg-2 border border-edge px-2 py-1">
        <span className="text-ink-dim">Refresh</span>
        <select
          value={refreshMs}
          onChange={(e) => onRefreshChange(Number(e.target.value))}
          className="bg-transparent text-ink focus:outline-none cursor-pointer"
        >
          {REFRESH_OPTIONS.map((o) => (
            <option key={o.ms} value={o.ms}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {lastUpdated && (
        <span className="text-ink-dim">
          Updated {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
