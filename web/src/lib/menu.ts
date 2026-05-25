export interface MenuItem {
  label: string;
  /** Path; if it starts with `/indi-allsky/` it's an external Jinja page opened in a new tab. */
  to: string;
  authRequired?: boolean;
  /** True = routed by the React app; false/undefined = external href. */
  native?: boolean;
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
      { label: 'FITS Viewer (legacy)', to: '/indi-allsky/fitsimageviewer', authRequired: true },
    ],
  },
  {
    label: 'Info',
    items: [
      { label: 'SQM',              to: '/sqm',                              native: true },
      { label: 'Charts',           to: '/charts',                           native: true },
      { label: 'Sensor Panel',     to: '/sensor-panel',                     native: true },
      { label: 'Dark Library',     to: '/darks',                            authRequired: true, native: true },
      { label: 'ADU History',      to: '/adu',                              authRequired: true, native: true },
      { label: 'Image Lag',        to: '/lag',                              authRequired: true, native: true },
      { label: 'File Space Usage', to: '/file-space-usage',                 authRequired: true, native: true },
      { label: 'Camera Info',      to: '/camera-info',                      authRequired: true, native: true },
    ],
  },
  {
    label: 'Tools',
    items: [
      { label: 'VirtualSky',                  to: '/virtualsky',                        native: true },
      { label: 'Camera Simulator (legacy)',   to: '/indi-allsky/camerasimulator' },
      { label: 'Astropanel (legacy)',         to: '/indi-allsky/astropanel' },
      { label: 'Generate',                    to: '/generate',                          authRequired: true, native: true },
      { label: 'Focus (legacy)',              to: '/indi-allsky/focus',                 authRequired: true },
      { label: 'Process FITS (legacy)',       to: '/indi-allsky/processing',            authRequired: true },
      { label: 'Image Circle Helper (legacy)',to: '/indi-allsky/imagecirclehelper',     authRequired: true },
      { label: 'Mask Base (legacy)',          to: '/indi-allsky/mask',                  authRequired: true },
      { label: 'Log',                         to: '/log',                               authRequired: true, native: true },
      { label: 'Support Info',                to: '/support-info',                      authRequired: true, native: true },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Config',                to: '/config',                   authRequired: true, native: true },
      { label: 'Network (legacy)',      to: '/indi-allsky/network',      authRequired: true },
      { label: 'Drives',                to: '/drives',                   authRequired: true, native: true },
      { label: 'GPIO Control (legacy)', to: '/indi-allsky/manual_gpio',  authRequired: true },
      { label: 'System Info',           to: '/system',                   authRequired: true, native: true },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Users',          to: '/users',          authRequired: true, native: true },
      { label: 'Cameras',        to: '/cameras-admin',  authRequired: true, native: true },
      { label: 'Notifications',  to: '/notifications',  authRequired: true, native: true },
      { label: 'Task Queue',     to: '/taskqueue',      authRequired: true, native: true },
      { label: 'Config History', to: '/config-history', authRequired: true, native: true },
      { label: 'Config Restore', to: '/config-restore', authRequired: true, native: true },
    ],
  },
];
