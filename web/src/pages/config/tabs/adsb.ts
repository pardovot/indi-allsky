import type { TabSchema } from '../types';

export const adsbTab: TabSchema = {
  id: 'adsb',
  label: 'ADS-B',
  tone: 'secondary',
  intro: 'Overlay nearby aircraft tracked from an ADS-B / dump1090 feed.',
  groups: [
    {
      title: 'ADS-B tracking',
      fields: [
        { kind: 'bool',     path: ['ADSB', 'ENABLE'],       label: 'Enable' },
        { kind: 'text',     path: ['ADSB', 'DUMP1090_URL'], label: 'dump1090 URL' },
        { kind: 'text',     path: ['ADSB', 'USERNAME'],     label: 'Username' },
        { kind: 'text',     path: ['ADSB', 'PASSWORD'],     label: 'Password' },
        { kind: 'bool',     path: ['ADSB', 'CERT_BYPASS'],  label: 'Bypass cert validation' },
        { kind: 'number',   path: ['ADSB', 'ALT_DEG_MIN'],  label: 'Min altitude', numeric: 'float', step: 0.1, help: 'degrees above horizon' },
        { kind: 'bool',     path: ['ADSB', 'LABEL_ENABLE'], label: 'Show labels' },
        { kind: 'number',   path: ['ADSB', 'LABEL_LIMIT'],  label: 'Label limit', numeric: 'int' },
        { kind: 'text',     path: ['ADSB', 'AIRCRAFT_LABEL_TEMPLATE'],     label: 'Aircraft label template' },
        { kind: 'textarea', path: ['ADSB', 'IMAGE_LABEL_TEMPLATE_PREFIX'], label: 'Image label prefix', rows: 4, monospace: true },
      ],
    },
  ],
};
