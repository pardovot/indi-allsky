import type { Field, FieldPath, TabSchema } from '../types';

const labelSystemOptions = [
  { value: '',       label: 'Off' },
  { value: 'pillow', label: 'Pillow' },
  { value: 'opencv', label: 'OpenCV' },
];

const fontFaceOptions = [
  { value: 'FONT_HERSHEY_SIMPLEX',        label: 'Sans-Serif' },
  { value: 'FONT_HERSHEY_PLAIN',          label: 'Sans-Serif (small)' },
  { value: 'FONT_HERSHEY_DUPLEX',         label: 'Sans-Serif (complex)' },
  { value: 'FONT_HERSHEY_COMPLEX',        label: 'Serif' },
  { value: 'FONT_HERSHEY_TRIPLEX',        label: 'Serif (complex)' },
  { value: 'FONT_HERSHEY_COMPLEX_SMALL',  label: 'Serif (small)' },
  { value: 'FONT_HERSHEY_SCRIPT_SIMPLEX', label: 'Script' },
  { value: 'FONT_HERSHEY_SCRIPT_COMPLEX', label: 'Script (complex)' },
];

const overlayFileTypeOptions = [
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'tif', label: 'TIFF' },
];

const orbModeOptions = [
  { value: 'ha',  label: 'Local Hour Angle' },
  { value: 'az',  label: 'Azimuth' },
  { value: 'alt', label: 'Altitude' },
  { value: 'off', label: 'Off' },
];

/** Three 0–255 inputs for an [r,g,b] list stored at `prefix`. */
function rgb(prefix: FieldPath, label: string): Field[] {
  return [
    { kind: 'number', path: [...prefix, 0], label: `${label} · R`, numeric: 'int', min: 0, max: 255 },
    { kind: 'number', path: [...prefix, 1], label: `${label} · G`, numeric: 'int', min: 0, max: 255 },
    { kind: 'number', path: [...prefix, 2], label: `${label} · B`, numeric: 'int', min: 0, max: 255 },
  ];
}

export const overlaysTab: TabSchema = {
  id: 'overlays',
  label: 'Overlays',
  tone: 'secondary',
  intro: 'Text labels, fonts, moon/lightgraph/image overlays, cardinal directions, orbs, and logo.',
  groups: [
    {
      title: 'Image labels',
      fields: [
        { kind: 'select',   path: ['IMAGE_LABEL_SYSTEM'],   label: 'Label system', options: labelSystemOptions, coerce: 'string' },
        { kind: 'textarea', path: ['IMAGE_LABEL_TEMPLATE'], label: 'Label template', rows: 4, monospace: true },
        { kind: 'text',     path: ['IMAGE_EXTRA_TEXT'],     label: 'Extra text file' },
      ],
    },
    {
      title: 'Font',
      fields: [
        { kind: 'text',   path: ['TEXT_PROPERTIES', 'PIL_FONT_FILE'],   label: 'PIL font file', help: 'Path under the fonts directory' },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'PIL_FONT_SIZE'],   label: 'PIL font size', numeric: 'int' },
        { kind: 'text',   path: ['TEXT_PROPERTIES', 'PIL_FONT_CUSTOM'], label: 'PIL custom font path' },
        { kind: 'select', path: ['TEXT_PROPERTIES', 'FONT_FACE'],       label: 'OpenCV font', options: fontFaceOptions, coerce: 'string' },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'FONT_SCALE'],      label: 'OpenCV font scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'FONT_THICKNESS'],  label: 'Thickness', numeric: 'int' },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'FONT_HEIGHT'],     label: 'Line height', numeric: 'int' },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'FONT_X'],          label: 'X offset', numeric: 'int' },
        { kind: 'number', path: ['TEXT_PROPERTIES', 'FONT_Y'],          label: 'Y offset', numeric: 'int' },
        ...rgb(['TEXT_PROPERTIES', 'FONT_COLOR'], 'Font color'),
        { kind: 'bool',   path: ['TEXT_PROPERTIES', 'FONT_OUTLINE'],    label: 'Outline' },
      ],
    },
    {
      title: 'Moon overlay',
      fields: [
        { kind: 'bool',   path: ['MOON_OVERLAY', 'ENABLE'],          label: 'Enable' },
        { kind: 'number', path: ['MOON_OVERLAY', 'X'],               label: 'X', numeric: 'int' },
        { kind: 'number', path: ['MOON_OVERLAY', 'Y'],               label: 'Y', numeric: 'int' },
        { kind: 'bool',   path: ['MOON_OVERLAY', 'FLIP_V'],          label: 'Flip vertical' },
        { kind: 'bool',   path: ['MOON_OVERLAY', 'FLIP_H'],          label: 'Flip horizontal' },
        { kind: 'number', path: ['MOON_OVERLAY', 'SCALE'],           label: 'Scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['MOON_OVERLAY', 'DARK_SIDE_SCALE'], label: 'Dark side scale', numeric: 'float', step: 0.1 },
      ],
    },
    {
      title: 'Lightgraph overlay',
      fields: [
        { kind: 'bool',   path: ['LIGHTGRAPH_OVERLAY', 'ENABLE'],          label: 'Enable' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'GRAPH_HEIGHT'],    label: 'Graph height', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'GRAPH_BORDER'],    label: 'Graph border', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'NOW_MARKER_SIZE'], label: 'Now marker size', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'Y'],              label: 'Y', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'OFFSET_X'],       label: 'Offset X', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'SCALE'],          label: 'Scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'OPACITY'],        label: 'Opacity', numeric: 'int', min: 0, max: 100 },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'PIL_FONT_SIZE'],  label: 'PIL font size', numeric: 'int' },
        { kind: 'number', path: ['LIGHTGRAPH_OVERLAY', 'OPENCV_FONT_SCALE'], label: 'OpenCV font scale', numeric: 'float', step: 0.1 },
        { kind: 'bool',   path: ['LIGHTGRAPH_OVERLAY', 'LABEL'],          label: 'Label' },
        { kind: 'bool',   path: ['LIGHTGRAPH_OVERLAY', 'HOUR_LINES'],     label: 'Hour lines' },
        ...rgb(['LIGHTGRAPH_OVERLAY', 'DAY_COLOR'],      'Day color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'DUSK_COLOR'],     'Dusk color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'NIGHT_COLOR'],    'Night color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'MOONMODE_COLOR'], 'Moonmode color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'HOUR_COLOR'],     'Hour color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'BORDER_COLOR'],   'Border color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'NOW_COLOR'],      'Now color'),
        ...rgb(['LIGHTGRAPH_OVERLAY', 'FONT_COLOR'],     'Font color'),
      ],
    },
    {
      title: 'Image overlay',
      fields: [
        { kind: 'bool',   path: ['IMAGE_OVERLAY', 'ENABLE'],            label: 'Enable' },
        { kind: 'number', path: ['IMAGE_OVERLAY', 'LOAD_INTERVAL'],     label: 'Load interval', numeric: 'int', help: 'seconds' },
        { kind: 'text',   path: ['IMAGE_OVERLAY', 'A_URL'],             label: 'Source URL' },
        { kind: 'select', path: ['IMAGE_OVERLAY', 'A_IMAGE_FILE_TYPE'], label: 'File type', options: overlayFileTypeOptions, coerce: 'string' },
        { kind: 'text',   path: ['IMAGE_OVERLAY', 'A_USERNAME'],        label: 'Username' },
        { kind: 'text',   path: ['IMAGE_OVERLAY', 'A_PASSWORD'],        label: 'Password' },
        { kind: 'number', path: ['IMAGE_OVERLAY', 'A_WIDTH'],           label: 'Width', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_OVERLAY', 'A_HEIGHT'],          label: 'Height', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_OVERLAY', 'A_X'],               label: 'X', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_OVERLAY', 'A_Y'],               label: 'Y', numeric: 'int' },
      ],
    },
    {
      title: 'Cardinal directions',
      fields: [
        { kind: 'bool',   path: ['CARDINAL_DIRS', 'ENABLE'],           label: 'Enable' },
        { kind: 'bool',   path: ['CARDINAL_DIRS', 'SWAP_NS'],          label: 'Swap N/S' },
        { kind: 'bool',   path: ['CARDINAL_DIRS', 'SWAP_EW'],          label: 'Swap E/W' },
        { kind: 'text',   path: ['CARDINAL_DIRS', 'CHAR_NORTH'],       label: 'North char' },
        { kind: 'text',   path: ['CARDINAL_DIRS', 'CHAR_EAST'],        label: 'East char' },
        { kind: 'text',   path: ['CARDINAL_DIRS', 'CHAR_WEST'],        label: 'West char' },
        { kind: 'text',   path: ['CARDINAL_DIRS', 'CHAR_SOUTH'],       label: 'South char' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'DIAMETER'],         label: 'Diameter', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_X'],         label: 'Offset X', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_Y'],         label: 'Offset Y', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_TOP'],       label: 'Offset top', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_LEFT'],      label: 'Offset left', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_RIGHT'],     label: 'Offset right', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OFFSET_BOTTOM'],    label: 'Offset bottom', numeric: 'int' },
        { kind: 'number', path: ['CARDINAL_DIRS', 'OPENCV_FONT_SCALE'], label: 'OpenCV font scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['CARDINAL_DIRS', 'PIL_FONT_SIZE'],    label: 'PIL font size', numeric: 'int' },
        { kind: 'bool',   path: ['CARDINAL_DIRS', 'OUTLINE_CIRCLE'],   label: 'Outline circle' },
        ...rgb(['CARDINAL_DIRS', 'FONT_COLOR'], 'Font color'),
      ],
    },
    {
      title: 'Orbs',
      fields: [
        { kind: 'select', path: ['ORB_PROPERTIES', 'MODE'],       label: 'Mode', options: orbModeOptions, coerce: 'string' },
        { kind: 'number', path: ['ORB_PROPERTIES', 'RADIUS'],     label: 'Radius', numeric: 'int' },
        { kind: 'number', path: ['ORB_PROPERTIES', 'AZ_OFFSET'],  label: 'Azimuth offset', numeric: 'float', step: 0.1 },
        { kind: 'bool',   path: ['ORB_PROPERTIES', 'RETROGRADE'], label: 'Retrograde' },
        ...rgb(['ORB_PROPERTIES', 'SUN_COLOR'],  'Sun color'),
        ...rgb(['ORB_PROPERTIES', 'MOON_COLOR'], 'Moon color'),
      ],
    },
    {
      title: 'Logo',
      fields: [
        { kind: 'text', path: ['LOGO_OVERLAY'], label: 'Logo image path' },
      ],
    },
  ],
};
