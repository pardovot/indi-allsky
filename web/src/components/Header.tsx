import NotificationBell from './NotificationBell';
import UserMenu from './UserMenu';
import StatusPill from './StatusPill';
import TopNav from './TopNav';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface HeaderProps {
  cameras: Camera[];
  cameraId: number | null;
  camerasLoading: boolean;
  onCameraChange: (id: number) => void;
  onToggleNav: () => void;
  onOpenStatus?: () => void;
}

export default function Header({
  cameras,
  cameraId,
  camerasLoading,
  onCameraChange,
  onToggleNav,
  onOpenStatus,
}: HeaderProps) {
  return (
    <header className="flex items-center gap-3 px-3 py-2 bg-bg-1 border-b border-edge sticky top-0 z-20">
      <button
        onClick={onToggleNav}
        className="lg:hidden p-2 text-ink-dim hover:text-ink-bright hover:bg-bg-2 rounded-md transition-colors"
        aria-label="Toggle menu"
      >
        <HamburgerIcon />
      </button>

      <div className="flex items-center gap-2 shrink-0">
        <img
          src="/indi-allsky/static/images/logo_outline_full.png"
          alt="indi-allsky"
          className="h-9 w-auto opacity-90"
        />
        <span className="text-ink-bright font-semibold tracking-tight hidden sm:inline text-base">
          indi-allsky
        </span>
      </div>

      <div className="hidden lg:block w-px h-6 bg-edge mx-1" />

      <TopNav />

      <div className="flex-1" />

      <StatusPill cameraId={cameraId} onClick={onOpenStatus} />

      {cameras.length > 0 ? (
        <div className="border border-edge rounded-md bg-bg-2 overflow-hidden flex flex-col">
          <span className="px-2 pt-0.5 text-[10px] text-ink-dim text-center whitespace-nowrap leading-none border-b border-edge/60">
            Cameras Available: {cameras.length}
          </span>
          <select
            value={cameraId ?? ''}
            onChange={(e) => onCameraChange(Number(e.target.value))}
            className="bg-transparent border-0 text-ink px-2 py-1 text-sm focus:outline-none max-w-[180px] cursor-pointer"
            aria-label="Camera"
          >
            {cameras.map((c) => (
              <option key={c.id} value={c.id} className="bg-bg-2">
                {c.friendlyName || c.name}
              </option>
            ))}
          </select>
        </div>
      ) : !camerasLoading ? (
        <div className="border border-danger/40 rounded-md bg-danger/10 px-2.5 py-1 text-xs text-danger whitespace-nowrap">
          No cameras connected
        </div>
      ) : null}

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
