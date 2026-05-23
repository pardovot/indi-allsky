import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import StatusPill from './StatusPill';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface HeaderProps {
  cameras: Camera[];
  cameraId: number | null;
  onCameraChange: (id: number) => void;
  onToggleNav: () => void;
  onOpenStatus?: () => void;
}

export default function Header({
  cameras,
  cameraId,
  onCameraChange,
  onToggleNav,
  onOpenStatus,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-2 px-3 py-2 bg-bg-1 border-b border-edge sticky top-0 z-20">
      <button
        onClick={onToggleNav}
        className="lg:hidden p-2 text-ink-dim hover:text-ink-bright hover:bg-bg-2 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        <HamburgerIcon />
      </button>

      <img
        src="/indi-allsky/static/images/logo_outline_full.png"
        alt="indi-allsky"
        className="h-9 w-auto opacity-90"
      />
      <span className="text-ink-bright font-semibold tracking-tight hidden sm:inline text-base">
        indi-allsky
      </span>

      <div className="flex-1" />

      <StatusPill cameraId={cameraId} onClick={onOpenStatus} />

      {cameras.length > 0 && (
        <div className="flex flex-col items-end leading-tight">
          <select
            value={cameraId ?? ''}
            onChange={(e) => onCameraChange(Number(e.target.value))}
            className="bg-bg-2 border border-edge text-ink rounded-md px-2 py-1 text-sm focus:border-accent focus:outline-none"
            aria-label="Camera"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id}>
                {c.friendlyName || c.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] text-ink-dim mt-0.5 pr-1">
            {cameras.length} camera{cameras.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <NotificationBell cameraId={cameraId} />
      <UserMenu />
    </header>
  );
}

function HamburgerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}
