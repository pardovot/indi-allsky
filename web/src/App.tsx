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
import VirtualSky from './pages/VirtualSky';
import RealtimeKeogram from './pages/RealtimeKeogram';
import LongTermKeogram from './pages/LongTermKeogram';
import SensorPanel from './pages/SensorPanel';
import Sqm from './pages/Sqm';
import FileSpaceUsage from './pages/FileSpaceUsage';
import CameraInfo from './pages/CameraInfo';
import SupportInfo from './pages/SupportInfo';
import LogViewer from './pages/LogViewer';
import AduHistory from './pages/AduHistory';
import DarkLibrary from './pages/DarkLibrary';
import DriveManager from './pages/DriveManager';
import SystemInfo from './pages/SystemInfo';
import Generate from './pages/Generate';
import Config from './pages/Config';
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
          <Route path="/virtualsky"        element={<ProtectedRoute><VirtualSky /></ProtectedRoute>} />
          <Route path="/realtime-keogram"  element={<ProtectedRoute><RealtimeKeogram /></ProtectedRoute>} />
          <Route path="/longterm-keogram"  element={<ProtectedRoute><LongTermKeogram /></ProtectedRoute>} />
          <Route path="/sensor-panel"      element={<ProtectedRoute><SensorPanel /></ProtectedRoute>} />
          <Route path="/sqm"               element={<ProtectedRoute><Sqm /></ProtectedRoute>} />
          <Route path="/file-space-usage"  element={<ProtectedRoute><FileSpaceUsage /></ProtectedRoute>} />
          <Route path="/camera-info"       element={<ProtectedRoute><CameraInfo /></ProtectedRoute>} />
          <Route path="/support-info"      element={<ProtectedRoute><SupportInfo /></ProtectedRoute>} />
          <Route path="/log"               element={<ProtectedRoute><LogViewer /></ProtectedRoute>} />
          <Route path="/adu"               element={<ProtectedRoute><AduHistory /></ProtectedRoute>} />
          <Route path="/darks"             element={<ProtectedRoute><DarkLibrary /></ProtectedRoute>} />
          <Route path="/drives"            element={<ProtectedRoute><DriveManager /></ProtectedRoute>} />
          <Route path="/system"            element={<ProtectedRoute><SystemInfo /></ProtectedRoute>} />
          <Route path="/generate"          element={<ProtectedRoute><Generate /></ProtectedRoute>} />
          <Route path="/config"            element={<ProtectedRoute><Config /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
