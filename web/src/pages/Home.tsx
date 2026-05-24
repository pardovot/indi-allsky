import LatestImageViewer from '@/components/LatestImageViewer';

export default function Home() {
  return <LatestImageViewer endpoint="/latest-image" queryKey="latest-image" />;
}
