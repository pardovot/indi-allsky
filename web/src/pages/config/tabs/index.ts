import type { TabSchema } from '../types';
import { cameraTab } from './camera';
import { imageTab } from './image';
import { processingTab } from './processing';
import { overlaysTab } from './overlays';
import { timelapseTab } from './timelapse';
import { locationTab } from './location';
import { adminTab } from './admin';
import { mqttTab } from './mqtt';
import { youtubeTab } from './youtube';
import { s3Tab } from './s3';
import { syncapiTab } from './syncapi';
import { filetransferTab } from './filetransfer';
import { sensorsTab } from './sensors';
import { devicesTab } from './devices';
import { adsbTab } from './adsb';
import { sattrackTab } from './sattrack';

/** Registry of fully-authored tab schemas. Tabs not present here render a stub. */
export const tabs: Record<string, TabSchema> = {
  [cameraTab.id]:       cameraTab,
  [imageTab.id]:        imageTab,
  [processingTab.id]:   processingTab,
  [overlaysTab.id]:     overlaysTab,
  [timelapseTab.id]:    timelapseTab,
  [locationTab.id]:     locationTab,
  [adminTab.id]:        adminTab,
  [mqttTab.id]:         mqttTab,
  [youtubeTab.id]:      youtubeTab,
  [s3Tab.id]:           s3Tab,
  [syncapiTab.id]:      syncapiTab,
  [filetransferTab.id]: filetransferTab,
  [sensorsTab.id]:      sensorsTab,
  [devicesTab.id]:      devicesTab,
  [adsbTab.id]:         adsbTab,
  [sattrackTab.id]:     sattrackTab,
};
