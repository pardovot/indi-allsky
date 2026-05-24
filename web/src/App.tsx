import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/Login';
import Home from './pages/Home';
import Loop from './pages/Loop';
import Gallery from './pages/Gallery';
import Images from './pages/Images';
import Timelapses from './pages/Timelapses';
import Panorama from './pages/Panorama';
import PanoramaLoop from './pages/PanoramaLoop';
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/loop"
            element={
              <ProtectedRoute>
                <Loop />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <Gallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/images"
            element={
              <ProtectedRoute>
                <Images />
              </ProtectedRoute>
            }
          />
          <Route
            path="/timelapses"
            element={
              <ProtectedRoute>
                <Timelapses endpoint="/videoviewer" queryKey="videoviewer" title="Timelapses" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mini-timelapses"
            element={
              <ProtectedRoute>
                <Timelapses endpoint="/mini-videoviewer" queryKey="mini-videoviewer" title="Mini-Timelapses" mini />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panorama"
            element={
              <ProtectedRoute>
                <Panorama />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panorama-loop"
            element={
              <ProtectedRoute>
                <PanoramaLoop />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
