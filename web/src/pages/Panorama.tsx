import LatestImageViewer from '@/components/LatestImageViewer';

export default function Panorama() {
  return (
    <LatestImageViewer
      endpoint="/latest-panorama"
      queryKey="latest-panorama"
      emptyLabel="No panorama available"
    />
  );
}
