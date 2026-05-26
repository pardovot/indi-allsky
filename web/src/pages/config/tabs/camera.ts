import type { TabSchema } from '../types';

const cameraInterfaceOptions = [
  { value: 'indi',                          label: 'INDI — ZWO, PlayerOne, SVBony, Altair, ToupTek',  group: 'INDI' },
  { value: 'libcamera_imx477',              label: 'libcamera IMX477 — Raspberry Pi HQ',              group: 'libcamera' },
  { value: 'libcamera_imx378',              label: 'libcamera IMX378',                                 group: 'libcamera' },
  { value: 'libcamera_imx708',              label: 'libcamera IMX708 — Camera Module 3',              group: 'libcamera' },
  { value: 'libcamera_imx519',              label: 'libcamera IMX519',                                 group: 'libcamera' },
  { value: 'libcamera_imx462',              label: 'libcamera IMX462',                                 group: 'libcamera' },
  { value: 'libcamera_imx290',              label: 'libcamera IMX290',                                 group: 'libcamera' },
  { value: 'libcamera_imx219',              label: 'libcamera IMX219 — Camera Module 2',              group: 'libcamera' },
  { value: 'pycurl_camera',                 label: 'pyCurl Camera',                                    group: 'Network web cameras' },
  { value: 'indi_accumulator',              label: 'INDI Accumulator',                                 group: 'Special' },
  { value: 'indi_passive',                  label: 'INDI (Passive)',                                   group: 'Special' },
  { value: 'test_rotating_stars',           label: 'Test — Rotating Stars',                            group: 'Test' },
  { value: 'test_bubbles',                  label: 'Test — Bubbles',                                   group: 'Test' },
];

const bitDepthOptions = [
  { value: '0',  label: 'Auto-detect' },
  { value: '8',  label: '8-bit' },
  { value: '10', label: '10-bit' },
  { value: '12', label: '12-bit' },
  { value: '14', label: '14-bit' },
  { value: '16', label: '16-bit' },
];

const autoGainLevelOptions = ['4','5','6','7','8','9','10','11','12']
  .map((v) => ({ value: v, label: v }));

export const cameraTab: TabSchema = {
  id: 'camera',
  label: 'Camera',
  tone: 'danger',
  intro:
    'Camera hardware and capture settings. Gain and binning live under CCD_CONFIG with separate ' +
    'values per profile (night, moonmode, day) — switched automatically by sun and moon altitude.',
  groups: [
    {
      title: 'INDI server',
      fields: [
        {
          kind: 'select', path: ['CAMERA_INTERFACE'],
          label: 'Camera interface',
          options: cameraInterfaceOptions, coerce: 'string',
          help: 'Driver that talks to the camera hardware.',
        },
        {
          kind: 'text', path: ['INDI_SERVER'],
          label: 'INDI host', placeholder: 'localhost',
          help: 'Hostname or IP address of the indiserver process.',
        },
        {
          kind: 'number', path: ['INDI_PORT'],
          label: 'INDI port',
          numeric: 'int', min: 1, max: 65535,
        },
        {
          kind: 'text', path: ['INDI_CAMERA_NAME'],
          label: 'Camera name', placeholder: 'auto-detect',
          help: 'Leave blank to auto-detect the first compatible camera.',
        },
      ],
    },
    {
      title: 'Capture profiles',
      description: 'Gain and binning per time-of-day profile. The capture loop switches profiles automatically.',
      fields: [
        { kind: 'number', path: ['CCD_CONFIG', 'NIGHT',    'GAIN'],    label: 'Night gain',    numeric: 'float', step: 0.1, decimals: 2 },
        { kind: 'number', path: ['CCD_CONFIG', 'NIGHT',    'BINNING'], label: 'Night binning', numeric: 'int',   min: 1, max: 4 },
        { kind: 'number', path: ['CCD_CONFIG', 'MOONMODE', 'GAIN'],    label: 'Moon gain',     numeric: 'float', step: 0.1, decimals: 2 },
        { kind: 'number', path: ['CCD_CONFIG', 'MOONMODE', 'BINNING'], label: 'Moon binning',  numeric: 'int',   min: 1, max: 4 },
        { kind: 'number', path: ['CCD_CONFIG', 'DAY',      'GAIN'],    label: 'Day gain',      numeric: 'float', step: 0.1, decimals: 2 },
        { kind: 'number', path: ['CCD_CONFIG', 'DAY',      'BINNING'], label: 'Day binning',   numeric: 'int',   min: 1, max: 4 },
        {
          kind: 'bool', path: ['CCD_CONFIG', 'AUTO_GAIN_ENABLE'],
          label: 'Auto-gain',
          help: 'Adjust gain within the configured range to track target ADU.',
        },
        {
          kind: 'select', path: ['CCD_CONFIG', 'AUTO_GAIN_LEVELS'],
          label: 'Auto-gain levels',
          options: autoGainLevelOptions, coerce: 'int',
          help: 'Number of discrete gain steps used by auto-gain.',
        },
      ],
    },
    {
      title: 'Exposure',
      fields: [
        {
          kind: 'number', path: ['CCD_EXPOSURE_MIN'],
          label: 'Minimum (night)',
          numeric: 'float', step: 0.001, decimals: 6,
          help: 'Shortest exposure allowed at night, in seconds.',
        },
        {
          kind: 'number', path: ['CCD_EXPOSURE_DEF'],
          label: 'Default',
          numeric: 'float', step: 0.1, decimals: 6,
          help: 'Initial exposure (seconds). 0 means auto-detect from previous frame.',
        },
        {
          kind: 'number', path: ['CCD_EXPOSURE_MAX'],
          label: 'Maximum',
          numeric: 'float', step: 1, decimals: 6,
          help: 'Longest exposure allowed, in seconds.',
        },
        {
          kind: 'number', path: ['CCD_EXPOSURE_MIN_DAY'],
          label: 'Minimum (day)',
          numeric: 'float', step: 0.001, decimals: 6,
          help: 'Shortest exposure allowed during the day, in seconds.',
        },
        {
          kind: 'number', path: ['CCD_EXPOSURE_TIMEOUT'],
          label: 'Timeout',
          numeric: 'int', min: 30,
          help: 'Seconds before an unresponsive capture is abandoned.',
        },
        {
          kind: 'select', path: ['CCD_BIT_DEPTH'],
          label: 'Bit depth',
          options: bitDepthOptions, coerce: 'int',
          help: 'Sensor bit depth. Auto-detect works for most cameras.',
        },
        {
          kind: 'number', path: ['EXPOSURE_PERIOD'],
          label: 'Period (night)',
          numeric: 'float', step: 0.5,
          help: 'Seconds between successive exposures at night.',
        },
        {
          kind: 'number', path: ['EXPOSURE_PERIOD_DAY'],
          label: 'Period (day)',
          numeric: 'float', step: 0.5,
          help: 'Seconds between successive exposures during the day.',
        },
      ],
    },
    {
      title: 'Lens',
      fields: [
        {
          kind: 'text', path: ['LENS_NAME'],
          label: 'Lens name',
        },
        {
          kind: 'number', path: ['LENS_FOCAL_LENGTH'],
          label: 'Focal length',
          numeric: 'float', step: 0.1,
          help: 'Millimetres.',
        },
        {
          kind: 'number', path: ['LENS_FOCAL_RATIO'],
          label: 'Focal ratio',
          numeric: 'float', step: 0.1,
          help: 'f-number (e.g. 2.8).',
        },
        {
          kind: 'number', path: ['LENS_IMAGE_CIRCLE'],
          label: 'Image circle',
          numeric: 'int',
          help: 'Diameter of the projected image, in pixels.',
        },
        {
          kind: 'number', path: ['LENS_OFFSET_X'],
          label: 'Offset X',
          numeric: 'int',
          help: 'Horizontal offset of the image circle from the sensor center, in pixels.',
        },
        {
          kind: 'number', path: ['LENS_OFFSET_Y'],
          label: 'Offset Y',
          numeric: 'int',
          help: 'Vertical offset of the image circle from the sensor center, in pixels.',
        },
        {
          kind: 'number', path: ['LENS_ALTITUDE'],
          label: 'Altitude',
          numeric: 'float', step: 0.1, min: -90, max: 90,
          help: 'Lens pointing altitude in degrees from the horizon.',
        },
        {
          kind: 'number', path: ['LENS_AZIMUTH'],
          label: 'Azimuth',
          numeric: 'float', step: 0.1, min: 0, max: 360,
          help: 'Lens pointing azimuth in degrees clockwise from North.',
        },
      ],
    },
  ],
};
