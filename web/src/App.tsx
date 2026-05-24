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
import MediaViewer from './pages/MediaViewer';
import MiniGenerate from './pages/MiniGenerate';
import Charts from './pages/Charts';
import Lag from './pages/Lag';
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
          <Route path="/view-image"        element={<ProtectedRoute><MediaViewer type="image"           title="Image" /></ProtectedRoute>} />
          <Route path="/view-keogram"      element={<ProtectedRoute><MediaViewer type="keogram"         title="Keogram" /></ProtectedRoute>} />
          <Route path="/view-startrail"    element={<ProtectedRoute><MediaViewer type="startrail"       title="Star Trail" /></ProtectedRoute>} />
          <Route path="/view-panorama"     element={<ProtectedRoute><MediaViewer type="panorama"        title="Panorama Image" /></ProtectedRoute>} />
          <Route path="/view-raw"          element={<ProtectedRoute><MediaViewer type="raw"             title="RAW Image" /></ProtectedRoute>} />
          <Route path="/watch-timelapse"   element={<ProtectedRoute><MediaViewer type="timelapse"       title="Timelapse" /></ProtectedRoute>} />
          <Route path="/watch-mini"        element={<ProtectedRoute><MediaViewer type="mini-timelapse"  title="Mini Timelapse" /></ProtectedRoute>} />
          <Route path="/watch-startrail"   element={<ProtectedRoute><MediaViewer type="startrail-video" title="Star Trail Timelapse" /></ProtectedRoute>} />
          <Route path="/watch-panorama"    element={<ProtectedRoute><MediaViewer type="panorama-video"  title="Panorama Timelapse" /></ProtectedRoute>} />
          <Route path="/generate-mini"     element={<ProtectedRoute><MiniGenerate /></ProtectedRoute>} />
          <Route path="/charts"            element={<ProtectedRoute><Charts /></ProtectedRoute>} />
          <Route path="/lag"               element={<ProtectedRoute><Lag /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
