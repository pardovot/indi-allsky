// Menu mirrors original base.html. `to` starting with `/indi-allsky` opens the
// existing Jinja UI in a new tab (not yet migrated). `to: '/'` is the React home.

export interface MenuItem {
  label: string;
  to: string;          // path; if starts with /indi-allsky/ it's external (Jinja)
  authRequired?: boolean;
  native?: boolean;    // true = handled by React router
}

export interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export const menu: MenuGroup[] = [
  {
    label: 'View',
    items: [
      { label: 'Latest',           to: '/',                                native: true },
      { label: 'Loop',             to: '/loop',                            native: true },
    ],
  },
  {
    label: 'Media',
    items: [
      { label: 'Gallery',          to: '/gallery',                          native: true },
      { label: 'Images',           to: '/indi-allsky/imageviewer' },
      { label: 'Timelapses',       to: '/indi-allsky/videoviewer' },
      { label: 'Mini-Timelapses',  to: '/indi-allsky/minivideoviewer' },
      { label: 'Panorama',         to: '/indi-allsky/panorama' },
      { label: 'Panorama Loop',    to: '/indi-allsky/looppanorama' },
      { label: 'Realtime Keogram', to: '/indi-allsky/realtime_keogram' },
      { label: 'Long Term Keogram',to: '/indi-allsky/longtermkeogram' },
      { label: 'FITS Viewer',      to: '/indi-allsky/fitsimageviewer', authRequired: true },
    ],
  },
  {
    label: 'Info',
    items: [
      { label: 'SQM',              to: '/indi-allsky/sqm' },
      { label: 'Charts',           to: '/indi-allsky/charts' },
      { label: 'Sensor Panel',     to: '/indi-allsky/sensor_panel' },
      { label: 'Dark Library',     to: '/indi-allsky/darks',         authRequired: true },
      { label: 'ADU History',      to: '/indi-allsky/adu',           authRequired: true },
      { label: 'Image Lag',        to: '/indi-allsky/lag',           authRequired: true },
      { label: 'File Space Usage', to: '/indi-allsky/filespaceusage', authRequired: true },
      { label: 'Camera Info',      to: '/indi-allsky/camera',        authRequired: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'VirtualSky',         to: '/indi-allsky/virtualsky' },
      { label: 'Camera Simulator',   to: '/indi-allsky/camerasimulator' },
      { label: 'Astropanel',         to: '/indi-allsky/astropanel' },
      { label: 'Generate',           to: '/indi-allsky/generate',           authRequired: true },
      { label: 'Focus',              to: '/indi-allsky/focus',              authRequired: true },
      { label: 'Process FITS',       to: '/indi-allsky/processing',         authRequired: true },
      { label: 'Image Circle Helper',to: '/indi-allsky/imagecirclehelper',  authRequired: true },
      { label: 'Mask Base',          to: '/indi-allsky/mask',               authRequired: true },
      { label: 'Log',                to: '/indi-allsky/log',                authRequired: true },
      { label: 'Support Info',       to: '/indi-allsky/support',            authRequired: true },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Config',         to: '/indi-allsky/config',      authRequired: true },
      { label: 'Network',        to: '/indi-allsky/network',     authRequired: true },
      { label: 'Drives',         to: '/indi-allsky/drives',      authRequired: true },
      { label: 'GPIO Control',   to: '/indi-allsky/manual_gpio', authRequired: true },
      { label: 'System Info',    to: '/indi-allsky/system',      authRequired: true },
    ],
  },
];
