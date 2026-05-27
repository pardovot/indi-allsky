import type { TabSchema } from '../types';

const fovDivOptions = [
  { value: '2', label: '100%' },
  { value: '3', label: '66%' },
  { value: '4', label: '50%' },
  { value: '6', label: '33%' },
];

const stackMethodOptions = [
  { value: 'maximum', label: 'Maximum' },
  { value: 'average', label: 'Average' },
  { value: 'minimum', label: 'Minimum' },
];

const stackCountOptions = [
  { value: '1', label: 'Disabled' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
];

export const processingTab: TabSchema = {
  id: 'processing',
  label: 'Processing',
  tone: 'success',
  intro: 'Detection, masking, stacking, keograms, star trails, panorama projection, and capture hooks.',
  groups: [
    {
      title: 'Star / meteor detection',
      fields: [
        { kind: 'bool',   path: ['DETECT_STARS'],         label: 'Detect stars' },
        { kind: 'number', path: ['DETECT_STARS_THOLD'],   label: 'Star threshold', numeric: 'float', step: 0.1 },
        { kind: 'bool',   path: ['DETECT_METEORS'],       label: 'Detect meteors' },
        { kind: 'number', path: ['DETECT_METEORS_THOLD'], label: 'Meteor threshold', numeric: 'int' },
        { kind: 'text',   path: ['DETECT_MASK'],          label: 'Detection mask', help: 'Path to a mask image' },
        { kind: 'bool',   path: ['DETECT_DRAW'],          label: 'Draw detections' },
      ],
    },
    {
      title: 'Image circle mask',
      fields: [
        { kind: 'bool',   path: ['IMAGE_CIRCLE_MASK', 'ENABLE'],   label: 'Enable' },
        { kind: 'number', path: ['IMAGE_CIRCLE_MASK', 'DIAMETER'], label: 'Diameter', numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['IMAGE_CIRCLE_MASK', 'OFFSET_X'], label: 'Offset X', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_CIRCLE_MASK', 'OFFSET_Y'], label: 'Offset Y', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_CIRCLE_MASK', 'BLUR'],     label: 'Blur', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_CIRCLE_MASK', 'OPACITY'],  label: 'Opacity', numeric: 'int', min: 0, max: 100, help: '%' },
        { kind: 'bool',   path: ['IMAGE_CIRCLE_MASK', 'OUTLINE'],  label: 'Outline' },
      ],
    },
    {
      title: 'SQM region of interest',
      fields: [
        { kind: 'select', path: ['SQM_FOV_DIV'], label: 'SQM field of view', options: fovDivOptions, coerce: 'int' },
        { kind: 'number', path: ['SQM_ROI', 0],  label: 'SQM ROI X1', numeric: 'int', help: 'Leave all 0 to use FOV' },
        { kind: 'number', path: ['SQM_ROI', 1],  label: 'SQM ROI Y1', numeric: 'int' },
        { kind: 'number', path: ['SQM_ROI', 2],  label: 'SQM ROI X2', numeric: 'int' },
        { kind: 'number', path: ['SQM_ROI', 3],  label: 'SQM ROI Y2', numeric: 'int' },
      ],
    },
    {
      title: 'Image stacking',
      fields: [
        { kind: 'select', path: ['IMAGE_STACK_COUNT'],        label: 'Stack count', options: stackCountOptions, coerce: 'int' },
        { kind: 'select', path: ['IMAGE_STACK_METHOD'],       label: 'Method', options: stackMethodOptions, coerce: 'string' },
        { kind: 'bool',   path: ['IMAGE_STACK_ALIGN'],        label: 'Align frames' },
        { kind: 'number', path: ['IMAGE_ALIGN_DETECTSIGMA'],  label: 'Align detect sigma', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_ALIGN_POINTS'],       label: 'Align points', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_ALIGN_SOURCEMINAREA'], label: 'Align min area', numeric: 'int' },
        { kind: 'bool',   path: ['IMAGE_STACK_SPLIT'],        label: 'Split preview' },
        { kind: 'bool',   path: ['IMAGE_STACK_MOONMODE'],     label: 'Stack in moonmode' },
        { kind: 'bool',   path: ['IMAGE_STACK_DAY'],          label: 'Stack during day' },
      ],
    },
    {
      title: 'Keogram',
      fields: [
        { kind: 'number', path: ['KEOGRAM_ANGLE'],       label: 'Angle', numeric: 'float', step: 0.1, help: 'degrees' },
        { kind: 'number', path: ['KEOGRAM_H_SCALE'],     label: 'Horizontal scale', numeric: 'int', help: '%' },
        { kind: 'number', path: ['KEOGRAM_V_SCALE'],     label: 'Vertical scale', numeric: 'int', help: '%' },
        { kind: 'number', path: ['KEOGRAM_CROP_TOP'],    label: 'Crop top', numeric: 'int', help: '%' },
        { kind: 'number', path: ['KEOGRAM_CROP_BOTTOM'], label: 'Crop bottom', numeric: 'int', help: '%' },
        { kind: 'bool',   path: ['KEOGRAM_LABEL'],       label: 'Label' },
      ],
    },
    {
      title: 'Long-term keogram',
      fields: [
        { kind: 'bool',   path: ['LONGTERM_KEOGRAM', 'ENABLE'],               label: 'Enable' },
        { kind: 'number', path: ['LONGTERM_KEOGRAM', 'OFFSET_X'],             label: 'Offset X', numeric: 'int' },
        { kind: 'number', path: ['LONGTERM_KEOGRAM', 'OFFSET_Y'],             label: 'Offset Y', numeric: 'int' },
        { kind: 'text',   path: ['LONGTERM_KEOGRAM', 'MONTH_LABEL_TEMPLATE'], label: 'Month label template' },
        { kind: 'number', path: ['LONGTERM_KEOGRAM', 'PIL_FONT_SIZE'],        label: 'PIL font size', numeric: 'int' },
        { kind: 'number', path: ['LONGTERM_KEOGRAM', 'OPENCV_FONT_SCALE'],    label: 'OpenCV font scale', numeric: 'float', step: 0.1 },
      ],
    },
    {
      title: 'Realtime keogram',
      fields: [
        { kind: 'number', path: ['REALTIME_KEOGRAM', 'MAX_ENTRIES'],   label: 'Max entries', numeric: 'int' },
        { kind: 'number', path: ['REALTIME_KEOGRAM', 'SAVE_INTERVAL'], label: 'Save interval', numeric: 'int' },
        { kind: 'bool',   path: ['REALTIME_KEOGRAM', 'LABEL'],         label: 'Label' },
      ],
    },
    {
      title: 'Star trails',
      fields: [
        { kind: 'number', path: ['STARTRAILS_SUN_ALT_THOLD'],     label: 'Sun altitude threshold', numeric: 'float', step: 0.1 },
        { kind: 'bool',   path: ['STARTRAILS_MOONMODE_THOLD'],    label: 'Skip moonmode frames' },
        { kind: 'number', path: ['STARTRAILS_MOON_ALT_THOLD'],    label: 'Moon altitude threshold', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['STARTRAILS_MOON_PHASE_THOLD'],  label: 'Moon phase threshold', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['STARTRAILS_MAX_ADU'],           label: 'Max ADU', numeric: 'int' },
        { kind: 'number', path: ['STARTRAILS_MASK_THOLD'],        label: 'Mask threshold', numeric: 'int' },
        { kind: 'number', path: ['STARTRAILS_PIXEL_THOLD'],       label: 'Pixel threshold', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['STARTRAILS_MIN_STARS'],         label: 'Min stars', numeric: 'int' },
        { kind: 'bool',   path: ['STARTRAILS_USE_DB_DATA'],       label: 'Use DB data' },
        { kind: 'bool',   path: ['STARTRAILS_TIMELAPSE'],         label: 'Generate timelapse' },
        { kind: 'number', path: ['STARTRAILS_TIMELAPSE_MINFRAMES'], label: 'Timelapse min frames', numeric: 'int' },
        { kind: 'bool',   path: ['STARTRAILS', 'IMAGE_CIRCLE_MASK_ENABLE'],   label: 'Circle mask' },
        { kind: 'number', path: ['STARTRAILS', 'IMAGE_CIRCLE_MASK_DIAMETER'], label: 'Mask diameter', numeric: 'int' },
        { kind: 'number', path: ['STARTRAILS', 'IMAGE_CIRCLE_MASK_BLUR'],     label: 'Mask blur', numeric: 'int' },
        { kind: 'number', path: ['STARTRAILS', 'IMAGE_CIRCLE_MASK_OPACITY'],  label: 'Mask opacity', numeric: 'int', min: 0, max: 100 },
      ],
    },
    {
      title: 'Panorama (fish2pano)',
      fields: [
        { kind: 'bool',   path: ['FISH2PANO', 'ENABLE'],              label: 'Enable' },
        { kind: 'number', path: ['FISH2PANO', 'DIAMETER'],            label: 'Diameter', numeric: 'int' },
        { kind: 'number', path: ['FISH2PANO', 'OFFSET_X'],            label: 'Offset X', numeric: 'int' },
        { kind: 'number', path: ['FISH2PANO', 'OFFSET_Y'],            label: 'Offset Y', numeric: 'int' },
        { kind: 'number', path: ['FISH2PANO', 'ROTATE_ANGLE'],        label: 'Rotate angle', numeric: 'int' },
        { kind: 'bool',   path: ['FISH2PANO', 'FLIP_H'],              label: 'Flip horizontal' },
        { kind: 'number', path: ['FISH2PANO', 'SCALE'],              label: 'Scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['FISH2PANO', 'MODULUS'],            label: 'Modulus', numeric: 'int' },
        { kind: 'bool',   path: ['FISH2PANO', 'ENABLE_CARDINAL_DIRS'], label: 'Cardinal directions' },
        { kind: 'number', path: ['FISH2PANO', 'DIRS_OFFSET_BOTTOM'], label: 'Dirs offset bottom', numeric: 'int' },
        { kind: 'number', path: ['FISH2PANO', 'OPENCV_FONT_SCALE'],  label: 'OpenCV font scale', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['FISH2PANO', 'PIL_FONT_SIZE'],      label: 'PIL font size', numeric: 'int' },
      ],
    },
    {
      title: 'Circular display',
      fields: [
        { kind: 'bool',   path: ['CIRCULAR_DISPLAY', 'ENABLE'],               label: 'Enable' },
        { kind: 'number', path: ['CIRCULAR_DISPLAY', 'RESOLUTION'],           label: 'Resolution', numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['CIRCULAR_DISPLAY', 'IMAGE_CIRCLE_DIAMETER'], label: 'Image circle diameter', numeric: 'int' },
      ],
    },
    {
      title: 'Hooks',
      description: 'External scripts run around capture and image save.',
      fields: [
        { kind: 'text',   path: ['CAPTURE_HOOK_PRE'],       label: 'Pre-capture script' },
        { kind: 'number', path: ['CAPTURE_HOOK_TIMEOUT'],   label: 'Pre-capture timeout', numeric: 'int', help: 'seconds' },
        { kind: 'text',   path: ['IMAGE_SAVE_HOOK_PRE'],    label: 'Pre-save script' },
        { kind: 'text',   path: ['IMAGE_SAVE_HOOK_POST'],   label: 'Post-save script' },
        { kind: 'number', path: ['IMAGE_SAVE_HOOK_TIMEOUT'], label: 'Save hook timeout', numeric: 'int', help: 'seconds' },
      ],
    },
  ],
};
