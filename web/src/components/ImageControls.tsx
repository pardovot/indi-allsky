interface ImageControlsProps {
  refreshMs: number;
  onRefreshChange: (ms: number) => void;
  lastUpdated: Date | null;
  dimensions?: { width: number; height: number } | null;
}

const REFRESH_OPTIONS: { label: string; ms: number }[] = [
  { label: '5s', ms: 5_000 },
  { label: '15s', ms: 15_000 },
  { label: '30s', ms: 30_000 },
  { label: '60s', ms: 60_000 },
];

export default function ImageControls({
  refreshMs,
  onRefreshChange,
  lastUpdated,
  dimensions,
}: ImageControlsProps) {
  return (
    <div className="flex items-center gap-3 text-xs text-ink-dim flex-wrap">
      <div className="inline-flex items-center gap-1 rounded-md bg-bg-2 border border-edge px-2 py-1">
        <span>Refresh</span>
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
        <span>
          Updated{' '}
          {lastUpdated.toLocaleTimeString(undefined, { hour12: false })}
        </span>
      )}
      {dimensions && (
        <span className="font-mono">
          {dimensions.width}×{dimensions.height}
        </span>
      )}
    </div>
  );
}
