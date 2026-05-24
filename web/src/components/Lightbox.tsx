import { useEffect, useRef, useState } from 'react';

export interface LightboxImage {
  url: string;
  width: number;
  height: number;
  date?: string;
  id?: number;
  ts?: number;
}

interface LightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}

export default function Lightbox({ images, index, onIndexChange, onClose }: LightboxProps) {
  const [loading, setLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const current = images[index];

  useEffect(() => {
    setLoading(true);
  }, [index]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndexChange(Math.max(0, index - 1));
      else if (e.key === 'ArrowRight') onIndexChange(Math.min(images.length - 1, index + 1));
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, images.length, onIndexChange, onClose]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-ink text-sm">
          {current.date && <span>{current.date}</span>}
          <span className="text-ink-dim ml-2">
            {index + 1} / {images.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={current.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-dim hover:text-ink-bright p-2 rounded-md hover:bg-bg-2/80 transition-colors"
            title="Open original"
          >
            <ExternalIcon />
          </a>
          <a
            href={current.url}
            download
            className="text-ink-dim hover:text-ink-bright p-2 rounded-md hover:bg-bg-2/80 transition-colors"
            title="Download"
          >
            <DownloadIcon />
          </a>
          <button
            onClick={onClose}
            className="text-ink-dim hover:text-ink-bright p-2 rounded-md hover:bg-bg-2/80 transition-colors"
            title="Close (Esc)"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Prev / Next */}
      {index > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
          className="absolute left-2 sm:left-6 z-10 text-ink-dim hover:text-ink-bright bg-bg-2/60 hover:bg-bg-2 rounded-full p-2 transition-colors"
          title="Previous (←)"
        >
          <ChevronLeftIcon />
        </button>
      )}
      {index < images.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
          className="absolute right-2 sm:right-6 z-10 text-ink-dim hover:text-ink-bright bg-bg-2/60 hover:bg-bg-2 rounded-full p-2 transition-colors"
          title="Next (→)"
        >
          <ChevronRightIcon />
        </button>
      )}

      {/* Image */}
      <div className="relative max-w-[95vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-ink-dim text-sm">
            Loading…
          </div>
        )}
        <img
          ref={imgRef}
          src={current.url}
          alt={current.date || ''}
          onLoad={() => setLoading(false)}
          className="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-md"
        />
      </div>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function ChevronLeftIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
