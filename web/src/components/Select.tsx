import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectProps<T extends string | number> {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  label?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  /** Render without the default border/bg — useful when nesting inside a custom container. */
  bare?: boolean;
}

export default function Select<T extends string | number>({
  value,
  options,
  onChange,
  label,
  ariaLabel,
  className,
  buttonClassName,
  bare = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [menuWidth, setMenuWidth] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollTopRef = useRef(0);
  const hasOpenedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    if (btnRef.current) setMenuWidth(btnRef.current.offsetWidth);

    const list = listRef.current;
    if (!list) return;

    if (hasOpenedRef.current) {
      // Subsequent opens: restore scroll position from last close.
      list.scrollTop = scrollTopRef.current;
    } else {
      // First open ever: scroll the selected option into view.
      const selectedEl = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
      hasOpenedRef.current = true;
    }
  }, [open]);

  const current = options.find((o) => o.value === value);

  return (
    <div className={['relative inline-block', className ?? ''].join(' ')} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? label}
        className={[
          'flex items-center gap-2 w-full text-sm text-ink focus:outline-none transition-colors cursor-pointer',
          bare
            ? 'bg-transparent hover:bg-bg-3 px-2 py-1 rounded'
            : 'bg-bg-2 hover:bg-bg-3 border border-edge rounded-md px-2.5 py-1 focus:border-accent',
          buttonClassName ?? '',
        ].join(' ')}
      >
        {label && <span className="text-ink-dim text-xs">{label}</span>}
        <span className="truncate">{current?.label ?? ''}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={['shrink-0 transition-transform', open ? 'rotate-180' : ''].join(' ')}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          style={menuWidth ? { minWidth: menuWidth } : undefined}
          onScroll={(e) => {
            scrollTopRef.current = e.currentTarget.scrollTop;
          }}
          className="absolute left-0 mt-1 bg-bg-1 border border-edge rounded-md shadow-2xl z-50 py-1 max-h-72 overflow-y-auto"
        >
          {options.map((o) => {
            const selected = o.value === value;
            return (
              <li
                key={String(o.value)}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={[
                  'px-3 py-1.5 text-sm cursor-pointer whitespace-nowrap transition-colors',
                  selected
                    ? 'bg-bg-3 text-ink-bright'
                    : 'text-ink hover:bg-bg-2 hover:text-ink-bright',
                ].join(' ')}
              >
                {o.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
