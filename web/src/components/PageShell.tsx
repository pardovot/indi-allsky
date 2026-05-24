import { ReactNode, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Header from './Header';
import NavDrawer from './NavDrawer';
import StatusPanel from './StatusPanel';

interface Camera {
  id: number;
  name: string;
  friendlyName: string | null;
}

interface PageShellProps {
  /** Render prop receives the resolved camera id (null until cameras load) */
  children: (ctx: { cameraId: number | null }) => ReactNode;
}

const CAMERA_PREF_KEY = 'allsky_camera_id';

export default function PageShell({ children }: PageShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cameraId, setCameraId] = useState<number | null>(() => {
    const v = localStorage.getItem(CAMERA_PREF_KEY);
    const n = v === null ? NaN : Number(v);
    return Number.isFinite(n) ? n : null;
  });

  useEffect(() => {
    if (cameraId !== null) localStorage.setItem(CAMERA_PREF_KEY, String(cameraId));
  }, [cameraId]);

  const camerasQ = useQuery({
    queryKey: ['cameras'],
    queryFn: () => api<Camera[]>('/cameras'),
  });

  useEffect(() => {
    const list = camerasQ.data;
    if (!list || list.length === 0) return;
    if (cameraId === null || !list.some((c) => c.id === cameraId)) {
      setCameraId(list[0].id);
    }
  }, [camerasQ.data, cameraId]);

  return (
    <div className="min-h-full flex flex-col">
      <NavDrawer open={navOpen} onClose={() => setNavOpen(false)} />

      <Header
        cameras={camerasQ.data ?? []}
        cameraId={cameraId}
        camerasLoading={camerasQ.isLoading}
        onCameraChange={setCameraId}
        onToggleNav={() => setNavOpen((v) => !v)}
        onOpenStatus={() => setStatusOpen(true)}
      />

      {children({ cameraId })}

      <StatusPanel
        cameraId={cameraId}
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
      />
    </div>
  );
}
