import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { menu, MenuItem } from '@/lib/menu';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
}

const PREF_KEY = 'allsky_nav_open_groups';
const DEFAULT_OPEN = ['View'];

function loadOpen(): Set<string> {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set(DEFAULT_OPEN);
}

function isExternal(item: MenuItem) {
  return item.to.startsWith('/indi-allsky');
}

function ItemLink({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const cls =
    'flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-ink hover:bg-bg-3 hover:text-ink-bright rounded-md transition-colors';

  if (isExternal(item)) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onClick={onClose}
      >
        <span>{item.label}</span>
        <span className="text-ink-dim text-xs">↗</span>
      </a>
    );
  }
  return (
    <Link to={item.to} className={cls} onClick={onClose}>
      <span>{item.label}</span>
    </Link>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={['transition-transform', open ? 'rotate-90' : ''].join(' ')}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => loadOpen());

  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify([...openGroups]));
  }, [openGroups]);

  function toggle(label: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function expandAll() {
    setOpenGroups(new Set(menu.map((g) => g.label)));
  }
  function collapseAll() {
    setOpenGroups(new Set());
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 bg-bg-1 border-r border-edge overflow-y-auto',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto lg:flex-shrink-0',
        ].join(' ')}
        aria-label="Navigation"
      >
        <div className="sticky top-0 bg-bg-1 border-b border-edge px-3 py-2 flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-ink-dim">Menu</span>
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={expandAll}
              className="text-ink-dim hover:text-ink-bright px-1.5 py-0.5 rounded hover:bg-bg-2"
            >
              Expand
            </button>
            <button
              onClick={collapseAll}
              className="text-ink-dim hover:text-ink-bright px-1.5 py-0.5 rounded hover:bg-bg-2"
            >
              Collapse
            </button>
          </div>
        </div>

        <div className="p-2 space-y-1">
          {menu.map((group) => {
            const isOpen = openGroups.has(group.label);
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggle(group.label)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-xs uppercase tracking-wider text-ink-dim hover:text-ink-bright hover:bg-bg-2 rounded-md transition-colors"
                  aria-expanded={isOpen}
                >
                  <Chevron open={isOpen} />
                  <span className="flex-1 text-left">{group.label}</span>
                  <span className="text-[10px] text-ink-dim/70">{group.items.length}</span>
                </button>
                {isOpen && (
                  <div className="mt-0.5 mb-2 ml-3 pl-2 border-l border-edge space-y-0.5">
                    {group.items.map((item) => (
                      <ItemLink
                        key={item.to + item.label}
                        item={item}
                        onClose={onClose}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-2 mt-2 border-t border-edge text-[11px] text-ink-dim px-3">
            Links marked ↗ open the legacy UI in a new tab.
          </div>
        </div>
      </aside>
    </>
  );
}
