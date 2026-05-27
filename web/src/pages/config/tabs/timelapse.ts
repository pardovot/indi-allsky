import type { TabSchema } from '../types';

const preProcessorOptions = [
  { value: 'standard',     label: 'Standard — no processing' },
  { value: 'wrap_keogram', label: 'Wrap keogram around image circle (Keolapse)' },
];

const codecOptions = [
  { value: 'libx264',      label: 'x264' },
  { value: 'libvpx',       label: 'webm' },
  { value: 'h264_v4l2m2m', label: 'h264 (v4l2m2m) — Raspberry Pi' },
  { value: 'h264_nvenc',   label: 'h264 (NVENC) — Nvidia GPU' },
  { value: 'h264_vaapi',   label: 'h264 (VAAPI) — AMD GPU' },
  { value: 'h264_qsv',     label: 'h264 (QSV) — Intel Quick Sync' },
  { value: 'h264_omx',     label: 'h264 (OMX) — Raspberry Pi 32-bit' },
  { value: 'libx265',      label: 'x265 hevc — do not use' },
  { value: 'hevc_v4l2m2m', label: 'h265 hevc (v4l2m2m) — do not use' },
];

const vfscaleOptions = [
  { value: '',         label: 'No scaling' },
  { value: '-2:2160',  label: 'Height 2160px — 2 GB RAM' },
  { value: '-2:1440',  label: 'Height 1440px — 2 GB RAM' },
  { value: '-2:1080',  label: 'Height 1080px — 1 GB RAM' },
  { value: '-2:720',   label: 'Height 720px — 1 GB RAM' },
  { value: '-2:480',   label: 'Height 480px — <1 GB RAM' },
];

export const timelapseTab: TabSchema = {
  id: 'timelapse',
  label: 'Timelapse',
  tone: 'primary',
  intro: 'Nightly/daytime timelapse video generation and ffmpeg encoding settings.',
  groups: [
    {
      title: 'Timelapse (night)',
      fields: [
        { kind: 'bool',   path: ['TIMELAPSE_ENABLE'],              label: 'Enable timelapse' },
        { kind: 'select', path: ['TIMELAPSE', 'PRE_PROCESSOR'],    label: 'Pre-processor', options: preProcessorOptions, coerce: 'string' },
        { kind: 'number', path: ['FFMPEG_FRAMERATE'],              label: 'Frame rate', numeric: 'int', help: 'fps' },
        { kind: 'text',   path: ['FFMPEG_BITRATE'],                label: 'Bitrate', help: 'e.g. 5000k' },
        { kind: 'select', path: ['FFMPEG_VFSCALE'],                label: 'Scaling', options: vfscaleOptions, coerce: 'string' },
        { kind: 'select', path: ['FFMPEG_VFSCALE_STARTRAIL'],      label: 'Star trail scaling', options: vfscaleOptions, coerce: 'string' },
        { kind: 'select', path: ['FFMPEG_CODEC'],                  label: 'Codec', options: codecOptions, coerce: 'string' },
        { kind: 'text',   path: ['FFMPEG_EXTRA_OPTIONS'],          label: 'Extra ffmpeg options' },
        { kind: 'number', path: ['TIMELAPSE_SKIP_FRAMES'],         label: 'Skip frames', numeric: 'int' },
      ],
    },
    {
      title: 'Timelapse (day)',
      fields: [
        { kind: 'bool',   path: ['DAYTIME_TIMELAPSE'],             label: 'Daytime timelapse' },
        { kind: 'bool',   path: ['TIMELAPSE', 'USE_NIGHT_CONFIG'], label: 'Reuse night settings' },
        { kind: 'select', path: ['TIMELAPSE', 'PRE_PROCESSOR_DAY'], label: 'Pre-processor', options: preProcessorOptions, coerce: 'string' },
        { kind: 'number', path: ['FFMPEG_FRAMERATE_DAY'],          label: 'Frame rate', numeric: 'int', help: 'fps' },
        { kind: 'text',   path: ['FFMPEG_BITRATE_DAY'],            label: 'Bitrate', help: 'e.g. 5000k' },
        { kind: 'select', path: ['FFMPEG_VFSCALE_DAY'],            label: 'Scaling', options: vfscaleOptions, coerce: 'string' },
        { kind: 'text',   path: ['FFMPEG_EXTRA_OPTIONS_DAY'],      label: 'Extra ffmpeg options' },
      ],
    },
    {
      title: 'Advanced',
      fields: [
        { kind: 'bool',   path: ['TIMELAPSE', 'FFMPEG_REPORT'],  label: 'ffmpeg report' },
        { kind: 'number', path: ['TIMELAPSE', 'IMAGE_CIRCLE'],   label: 'Image circle', numeric: 'int' },
        { kind: 'number', path: ['TIMELAPSE', 'PRE_SCALE'],      label: 'Pre-scale', numeric: 'int', help: '%' },
        { kind: 'number', path: ['TIMELAPSE', 'KEOGRAM_RATIO'],  label: 'Keogram ratio', numeric: 'float', step: 0.01 },
      ],
    },
  ],
};
