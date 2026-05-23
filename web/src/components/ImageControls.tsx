import Select from './Select';

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
      <Select
        label="Refresh"
        value={refreshMs}
        options={REFRESH_OPTIONS.map((o) => ({ value: o.ms, label: o.label }))}
        onChange={onRefreshChange}
      />
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
