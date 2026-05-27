import type { TabSchema } from '../types';

export const sattrackTab: TabSchema = {
  id: 'sattrack',
  label: 'Satellite Tracking',
  tone: 'light',
  intro: 'Overlay tracked satellites (ISS, Starlink, …) computed from TLE data.',
  groups: [
    {
      title: 'Satellite tracking',
      fields: [
        { kind: 'bool',     path: ['SATELLITE_TRACK', 'ENABLE'],         label: 'Enable' },
        { kind: 'bool',     path: ['SATELLITE_TRACK', 'DAYTIME_TRACK'],  label: 'Track during day' },
        { kind: 'number',   path: ['SATELLITE_TRACK', 'ALT_DEG_MIN'],    label: 'Min altitude', numeric: 'float', step: 0.1, help: 'degrees above horizon' },
        { kind: 'bool',     path: ['SATELLITE_TRACK', 'LABEL_ENABLE'],   label: 'Show labels' },
        { kind: 'number',   path: ['SATELLITE_TRACK', 'LABEL_LIMIT'],    label: 'Label limit', numeric: 'int' },
        { kind: 'text',     path: ['SATELLITE_TRACK', 'SAT_LABEL_TEMPLATE'], label: 'Satellite label template' },
        { kind: 'textarea', path: ['SATELLITE_TRACK', 'IMAGE_LABEL_TEMPLATE_PREFIX'], label: 'Image label prefix', rows: 4, monospace: true },
      ],
    },
  ],
};
