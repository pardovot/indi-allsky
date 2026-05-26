import type { TabSchema } from '../types';
import { cameraTab } from './camera';
import { locationTab } from './location';

/** Registry of fully-authored tab schemas. Tabs not present here render a stub. */
export const tabs: Record<string, TabSchema> = {
  [cameraTab.id]:   cameraTab,
  [locationTab.id]: locationTab,
};
