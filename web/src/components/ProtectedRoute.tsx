import { Navigate } from 'react-router-dom';
import { auth } from '@/lib/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!auth.isAuthed()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
