import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { menu, MenuItem, MenuGroup } from '@/lib/menu';

function isExternal(item: MenuItem) {
  return item.to.startsWith('/indi-allsky');
}

function ItemLink({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const cls =
    'flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-3 hover:text-ink-bright rounded-md transition-colors';
  if (isExternal(item)) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onClick={onClick}
      >
        <span>{item.label}</span>
        <span className="text-ink-dim text-xs">↗</span>
      </a>
    );
  }
  return (
    <Link to={item.to} className={cls} onClick={onClick}>
      <span>{item.label}</span>
    </Link>
  );
}

function GroupDropdown({ group }: { group: MenuGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={[
          'flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md transition-colors',
          open
            ? 'bg-bg-2 text-ink-bright'
            : 'text-ink-dim hover:text-ink-bright hover:bg-bg-2',
        ].join(' ')}
        aria-expanded={open}
      >
        <span>{group.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 mt-1 min-w-[200px] bg-bg-1 border border-edge rounded-md shadow-2xl z-50 p-1">
          {group.items.map((item) => (
            <ItemLink key={item.to + item.label} item={item} onClick={() => setOpen(false)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TopNav() {
  return (
    <nav className="hidden lg:flex items-center gap-0.5">
      {menu.map((group) => (
        <GroupDropdown key={group.label} group={group} />
      ))}
    </nav>
  );
}
