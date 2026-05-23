import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface HeaderProps {
  cameras: Camera[];
  cameraId: number | null;
  onCameraChange: (id: number) => void;
}

export default function Header({ cameras, cameraId, onCameraChange }: HeaderProps) {
  const nav = useNavigate();

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    auth.clear();
    nav('/login', { replace: true });
  }

  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-bg-1 border-b border-edge">
      <img
        src="/indi-allsky/static/images/logo_outline_full.png"
        alt="indi-allsky"
        className="h-7 w-auto opacity-90"
      />
      <span className="text-ink-bright font-semibold tracking-tight hidden sm:inline">
        indi-allsky
      </span>

      <div className="flex-1" />

      {cameras.length > 0 && (
        <select
          value={cameraId ?? ''}
          onChange={(e) => onCameraChange(Number(e.target.value))}
          className="bg-bg-2 border border-edge text-ink rounded-md px-2 py-1 text-sm focus:border-accent focus:outline-none"
        >
          {cameras.map((c) => (
            <option key={c.id} value={c.id}>
              {c.friendlyName || c.name}
            </option>
          ))}
        </select>
      )}

      <button
        onClick={logout}
        className="text-ink-dim hover:text-ink-bright text-sm px-2 py-1 rounded-md hover:bg-bg-2 transition-colors"
        aria-label="Sign out"
      >
        Sign out
      </button>
    </header>
  );
}
