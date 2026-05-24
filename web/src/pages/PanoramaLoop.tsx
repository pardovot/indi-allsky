import LoopViewer from '@/components/LoopViewer';

export default function PanoramaLoop() {
  return (
    <LoopViewer
      endpoint="/panorama-loop"
      queryKey="panorama-loop"
      settingsKey="allsky_panorama_loop_settings"
    />
  );
}
