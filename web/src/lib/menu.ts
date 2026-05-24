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
      { label: 'Images',           to: '/images',                           native: true },
      { label: 'Timelapses',       to: '/timelapses',                       native: true },
      { label: 'Mini-Timelapses',  to: '/mini-timelapses',                  native: true },
      { label: 'Panorama',         to: '/panorama',                         native: true },
      { label: 'Panorama Loop',    to: '/panorama-loop',                    native: true },
      { label: 'Realtime Keogram', to: '/realtime-keogram',                 native: true },
      { label: 'Long Term Keogram',to: '/longterm-keogram',                 native: true },
      { label: 'FITS Viewer',      to: '/indi-allsky/fitsimageviewer', authRequired: true },
    ],
  },
  {
    label: 'Info',
    items: [
      { label: 'SQM',              to: '/sqm',                              native: true },
      { label: 'Charts',           to: '/charts',                           native: true },
      { label: 'Sensor Panel',     to: '/sensor-panel',                     native: true },
      { label: 'Dark Library',     to: '/indi-allsky/darks',         authRequired: true },
      { label: 'ADU History',      to: '/indi-allsky/adu',           authRequired: true },
      { label: 'Image Lag',        to: '/lag',                              authRequired: true, native: true },
      { label: 'File Space Usage', to: '/file-space-usage',                 authRequired: true, native: true },
      { label: 'Camera Info',      to: '/camera-info',                      authRequired: true, native: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'VirtualSky',         to: '/virtualsky',                       native: true },
      { label: 'Camera Simulator',   to: '/indi-allsky/camerasimulator' },
      { label: 'Astropanel',         to: '/indi-allsky/astropanel' },
      { label: 'Generate',           to: '/indi-allsky/generate',           authRequired: true },
      { label: 'Focus',              to: '/indi-allsky/focus',              authRequired: true },
      { label: 'Process FITS',       to: '/indi-allsky/processing',         authRequired: true },
      { label: 'Image Circle Helper',to: '/indi-allsky/imagecirclehelper',  authRequired: true },
      { label: 'Mask Base',          to: '/indi-allsky/mask',               authRequired: true },
      { label: 'Log',                to: '/log',                            authRequired: true, native: true },
      { label: 'Support Info',       to: '/support-info',                   authRequired: true, native: true },
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
