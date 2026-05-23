import { Link } from 'react-router-dom';
import { menu, MenuItem } from '@/lib/menu';

interface NavDrawerProps {
  open: boolean;
  onClose: () => void;
}

function isExternal(item: MenuItem) {
  return item.to.startsWith('/indi-allsky');
}

function ItemLink({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const cls =
    'flex items-center justify-between gap-2 px-3 py-2 text-sm text-ink hover:bg-bg-3 hover:text-ink-bright rounded-md transition-colors';

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

export default function NavDrawer({ open, onClose }: NavDrawerProps) {
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
          'fixed inset-y-0 left-0 z-40 w-72 bg-bg-1 border-r border-edge overflow-y-auto',
          'transform transition-transform duration-200 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:static lg:z-auto',
        ].join(' ')}
        aria-label="Navigation"
      >
        <div className="p-3 space-y-4">
          {menu.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-1 text-xs uppercase tracking-wider text-ink-dim">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <ItemLink key={item.to + item.label} item={item} onClose={onClose} />
                ))}
              </div>
            </div>
          ))}

          <div className="pt-2 mt-2 border-t border-edge text-[11px] text-ink-dim px-3">
            Links marked ↗ open the legacy UI in a new tab.
          </div>
        </div>
      </aside>
    </>
  );
}
