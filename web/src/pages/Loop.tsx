import LoopViewer from '@/components/LoopViewer';

export default function Loop() {
  return (
    <LoopViewer
      endpoint="/loop"
      queryKey="loop"
      settingsKey="allsky_loop_settings"
    />
  );
}
