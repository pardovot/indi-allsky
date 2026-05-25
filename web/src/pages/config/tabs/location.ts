import type { TabSchema } from '../types';

export const locationTab: TabSchema = {
  id: 'location',
  label: 'Location',
  tone: 'info',
  intro:
    'Observer location and night/moonmode thresholds. Latitude/longitude drive sun and moon ephemeris; ' +
    'getting these wrong will cause day/night detection to misbehave.',
  groups: [
    {
      title: 'Observer',
      fields: [
        { kind: 'text',   path: ['LOCATION_NAME'],      label: 'Location name', placeholder: 'My Backyard' },
        { kind: 'number', path: ['LOCATION_LATITUDE'],  label: 'Latitude',  numeric: 'float', step: 0.001, min: -90,  max: 90,  help: '+north / −south, decimal degrees' },
        { kind: 'number', path: ['LOCATION_LONGITUDE'], label: 'Longitude', numeric: 'float', step: 0.001, min: -180, max: 180, help: '+east  / −west,  decimal degrees' },
        { kind: 'number', path: ['LOCATION_ELEVATION'], label: 'Elevation', numeric: 'int',   step: 1, help: 'Meters above sea level' },
      ],
    },
    {
      title: 'Night detection',
      description: 'Sun and moon altitudes used to switch between day/night/moonmode capture profiles.',
      fields: [
        {
          kind: 'number', path: ['NIGHT_SUN_ALT_DEG'], label: 'Night sun altitude',
          numeric: 'float', step: 0.1, min: -90, max: 90,
          help: 'Sun altitude (degrees) at which night begins. Typical: −6 (civil), −12 (nautical), −18 (astronomical).',
        },
        {
          kind: 'number', path: ['NIGHT_MOONMODE_ALT_DEG'], label: 'Moonmode altitude',
          numeric: 'float', step: 0.1, min: -90, max: 90,
          help: 'Moon altitude (degrees) at which moonmode capture kicks in.',
        },
        {
          kind: 'number', path: ['NIGHT_MOONMODE_PHASE'], label: 'Moonmode phase',
          numeric: 'float', step: 0.01, min: 0, max: 1,
          help: 'Moon phase fraction (0–1) at which moonmode kicks in.',
        },
      ],
    },
  ],
};
