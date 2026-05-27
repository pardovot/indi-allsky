import type { TabSchema } from '../types';

const stretchClassOptions = [
  { value: '',                    label: 'None' },
  { value: 'mode1_stddev_cutoff', label: 'Standard Deviation Cutoff (Original)' },
  { value: 'mode2_mtf',           label: 'Midtone Transfer Function' },
  { value: 'mode2_mtf_x2',        label: 'Midtone Transfer Function (Double)' },
  { value: 'mode3_adaptive_mtf',  label: 'Adaptive Midtone Transfer Function' },
];

const cfaOptions = [
  { value: '',     label: 'Auto-detect' },
  { value: 'RGGB', label: 'RGGB' },
  { value: 'GRBG', label: 'GRBG' },
  { value: 'BGGR', label: 'BGGR' },
  { value: 'GBRG', label: 'GBRG' },
];

const scnrOptions = [
  { value: '',                label: 'Disabled' },
  { value: 'average_neutral', label: 'Average Neutral' },
  { value: 'maximum_neutral', label: 'Maximum Neutral' },
  { value: 'green_mtf',       label: 'Midtone Transfer Function' },
];

const denoiseOptions = [
  { value: '',              label: 'Disabled' },
  { value: 'gaussian_blur', label: 'Gaussian Blur — smooths uniformly' },
  { value: 'median_blur',   label: 'Median — removes salt-and-pepper noise' },
  { value: 'bilateral',     label: 'Bilateral — smooths sky background' },
  { value: 'wavelet',       label: 'Wavelet — best quality (slow)' },
];

const fileTypeOptions = [
  { value: 'jpg', label: 'JPEG' },
  { value: 'png', label: 'PNG' },
  { value: 'tif', label: 'TIFF' },
];

const fitsPeriodOptions = [
  { value: '0',     label: 'Every image' },
  { value: '30',    label: '30 seconds' },
  { value: '60',    label: '1 minute' },
  { value: '120',   label: '2 minutes' },
  { value: '180',   label: '3 minutes' },
  { value: '300',   label: '5 minutes' },
  { value: '600',   label: '10 minutes' },
  { value: '1800',  label: '30 minutes' },
  { value: '3600',  label: '1 hour' },
  { value: '7200',  label: '2 hours' },
  { value: '14400', label: '4 hours' },
  { value: '21600', label: '6 hours' },
  { value: '43200', label: '12 hours' },
];

const rotateOptions = [
  { value: '',                           label: 'Disabled' },
  { value: 'ROTATE_90_CLOCKWISE',        label: '90° clockwise' },
  { value: 'ROTATE_90_COUNTERCLOCKWISE', label: '90° counter-clockwise' },
  { value: 'ROTATE_180',                 label: '180°' },
];

const colormapOptions = [
  { value: '',                  label: 'None' },
  { value: 'COLORMAP_JET',      label: 'Jet' },
  { value: 'COLORMAP_TURBO',    label: 'Turbo' },
  { value: 'COLORMAP_BONE',     label: 'Bone' },
  { value: 'COLORMAP_RAINBOW',  label: 'Rainbow' },
  { value: 'COLORMAP_SPRING',   label: 'Spring' },
  { value: 'COLORMAP_AUTUMN',   label: 'Autumn' },
  { value: 'COLORMAP_HOT',      label: 'Hot' },
  { value: 'COLORMAP_MAGMA',    label: 'Magma' },
  { value: 'COLORMAP_INFERNO',  label: 'Inferno' },
  { value: 'COLORMAP_CIVIDIS',  label: 'Cividis' },
  { value: 'COLORMAP_PARULA',   label: 'Parula' },
  { value: 'COLORMAP_OCEAN',    label: 'Ocean' },
  { value: 'COLORMAP_PINK',     label: 'Pink' },
  { value: 'COLORMAP_DEEPGREEN', label: 'Deep Green' },
];

const exportRawOptions = [
  { value: '',    label: 'Disabled' },
  { value: 'png', label: 'PNG' },
  { value: 'tif', label: 'TIFF' },
  { value: 'jp2', label: 'JPEG 2000' },
  { value: 'webp', label: 'WEBP' },
  { value: 'jpg', label: 'JPEG' },
];

const fovDivOptions = [
  { value: '2', label: '100%' },
  { value: '3', label: '66%' },
  { value: '4', label: '50%' },
  { value: '6', label: '33%' },
];

export const imageTab: TabSchema = {
  id: 'image',
  label: 'Image',
  tone: 'light',
  intro: 'Image acquisition, calibration, target exposure (ADU), stretching, color, file output, and FITS.',
  groups: [
    {
      title: 'Capture',
      fields: [
        { kind: 'bool', path: ['DAYTIME_CAPTURE'],      label: 'Daytime capture' },
        { kind: 'bool', path: ['DAYTIME_CAPTURE_SAVE'], label: 'Save daytime images' },
        { kind: 'bool', path: ['CAPTURE_PAUSE'],        label: 'Pause capture' },
      ],
    },
    {
      title: 'Calibration',
      fields: [
        { kind: 'bool',   path: ['IMAGE_CALIBRATE_DARK'],          label: 'Dark frame subtraction' },
        { kind: 'bool',   path: ['IMAGE_CALIBRATE_BPM'],           label: 'Bad-pixel map' },
        { kind: 'number', path: ['IMAGE_CALIBRATE_MANUAL_OFFSET'], label: 'Manual offset', numeric: 'int' },
        { kind: 'bool',   path: ['IMAGE_CALIBRATE_FIX_HOLES'],     label: 'Fix holes' },
        { kind: 'number', path: ['IMAGE_CALIBRATE_HOLE_THOLD'],    label: 'Hole threshold', numeric: 'int', help: '%' },
      ],
    },
    {
      title: 'Target ADU',
      description: 'Auto-exposure aims to keep the mean image brightness near these targets.',
      fields: [
        { kind: 'number', path: ['TARGET_ADU'],         label: 'Target ADU (night)',  numeric: 'int' },
        { kind: 'number', path: ['TARGET_ADU_DAY'],     label: 'Target ADU (day)',    numeric: 'int' },
        { kind: 'number', path: ['TARGET_ADU_DEV'],     label: 'Deviation (night)',   numeric: 'int' },
        { kind: 'number', path: ['TARGET_ADU_DEV_DAY'], label: 'Deviation (day)',     numeric: 'int' },
        { kind: 'select', path: ['ADU_FOV_DIV'],        label: 'ADU field of view',   options: fovDivOptions, coerce: 'int' },
        { kind: 'number', path: ['ADU_ROI', 0],         label: 'ADU ROI X1', numeric: 'int' },
        { kind: 'number', path: ['ADU_ROI', 1],         label: 'ADU ROI Y1', numeric: 'int' },
        { kind: 'number', path: ['ADU_ROI', 2],         label: 'ADU ROI X2', numeric: 'int' },
        { kind: 'number', path: ['ADU_ROI', 3],         label: 'ADU ROI Y2', numeric: 'int' },
      ],
    },
    {
      title: 'Contrast enhancement (CLAHE)',
      fields: [
        { kind: 'bool',   path: ['NIGHT_CONTRAST_ENHANCE'],   label: 'Enhance at night' },
        { kind: 'bool',   path: ['DAYTIME_CONTRAST_ENHANCE'], label: 'Enhance during day' },
        { kind: 'bool',   path: ['CONTRAST_ENHANCE_16BIT'],   label: '16-bit enhancement' },
        { kind: 'number', path: ['CLAHE_CLIPLIMIT'],          label: 'CLAHE clip limit', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['CLAHE_GRIDSIZE'],           label: 'CLAHE grid size',  numeric: 'int' },
      ],
    },
    {
      title: 'Stretch',
      fields: [
        { kind: 'select', path: ['IMAGE_STRETCH', 'CLASSNAME'],       label: 'Algorithm', options: stretchClassOptions, coerce: 'string' },
        { kind: 'bool',   path: ['IMAGE_STRETCH', 'MOONMODE'],        label: 'Apply in moonmode' },
        { kind: 'bool',   path: ['IMAGE_STRETCH', 'DAYTIME'],         label: 'Apply during day' },
        { kind: 'bool',   path: ['IMAGE_STRETCH', 'SPLIT'],           label: 'Split preview' },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE1_STDDEVS'],   label: 'Mode 1 · std devs', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE1_GAMMA'],     label: 'Mode 1 · gamma',    numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE2_SHADOWS'],   label: 'Mode 2 · shadows',    numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE2_MIDTONES'],  label: 'Mode 2 · midtones',   numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE2_HIGHLIGHTS'], label: 'Mode 2 · highlights', numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE3_BLACK_CLIP'], label: 'Mode 3 · black clip', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE3_SHADOWS'],   label: 'Mode 3 · shadows',    numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE3_MIDTONES'],  label: 'Mode 3 · midtones',   numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['IMAGE_STRETCH', 'MODE3_HIGHLIGHTS'], label: 'Mode 3 · highlights', numeric: 'float', step: 0.01 },
      ],
    },
    {
      title: 'Color — night',
      fields: [
        { kind: 'bool',   path: ['USE_NIGHT_COLOR'],        label: 'Use night color settings' },
        { kind: 'select', path: ['CFA_PATTERN'],            label: 'Bayer / CFA pattern', options: cfaOptions, coerce: 'string' },
        { kind: 'select', path: ['SCNR_ALGORITHM'],         label: 'SCNR algorithm', options: scnrOptions, coerce: 'string' },
        { kind: 'number', path: ['SCNR_MTF_MIDTONES'],      label: 'SCNR midtones', numeric: 'float', step: 0.01 },
        { kind: 'select', path: ['IMAGE_DENOISE'],          label: 'Denoise', options: denoiseOptions, coerce: 'string' },
        { kind: 'number', path: ['IMAGE_DENOISE_STRENGTH'], label: 'Denoise strength', numeric: 'int' },
        { kind: 'number', path: ['BILATERAL_SIGMA_COLOR'],  label: 'Bilateral σ color', numeric: 'int' },
        { kind: 'number', path: ['BILATERAL_SIGMA_SPACE'],  label: 'Bilateral σ space', numeric: 'int' },
        { kind: 'bool',   path: ['AUTO_WB'],                label: 'Auto white balance' },
        { kind: 'number', path: ['WBR_FACTOR'],             label: 'WB red factor',   numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBG_FACTOR'],             label: 'WB green factor', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBB_FACTOR'],             label: 'WB blue factor',  numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBR_MTF_MIDTONES'],       label: 'WB red midtones',   numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['WBG_MTF_MIDTONES'],       label: 'WB green midtones', numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['WBB_MTF_MIDTONES'],       label: 'WB blue midtones',  numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['SATURATION_FACTOR'],      label: 'Saturation', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['GAMMA_CORRECTION'],       label: 'Gamma',      numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['SHARPEN_AMOUNT'],         label: 'Sharpen',    numeric: 'float', step: 0.1 },
      ],
    },
    {
      title: 'Color — day',
      fields: [
        { kind: 'select', path: ['SCNR_ALGORITHM_DAY'],         label: 'SCNR algorithm', options: scnrOptions, coerce: 'string' },
        { kind: 'number', path: ['SCNR_MTF_MIDTONES_DAY'],      label: 'SCNR midtones', numeric: 'float', step: 0.01 },
        { kind: 'select', path: ['IMAGE_DENOISE_DAY'],          label: 'Denoise', options: denoiseOptions, coerce: 'string' },
        { kind: 'number', path: ['IMAGE_DENOISE_STRENGTH_DAY'], label: 'Denoise strength', numeric: 'int' },
        { kind: 'number', path: ['BILATERAL_SIGMA_COLOR_DAY'],  label: 'Bilateral σ color', numeric: 'int' },
        { kind: 'number', path: ['BILATERAL_SIGMA_SPACE_DAY'],  label: 'Bilateral σ space', numeric: 'int' },
        { kind: 'bool',   path: ['AUTO_WB_DAY'],                label: 'Auto white balance' },
        { kind: 'number', path: ['WBR_FACTOR_DAY'],             label: 'WB red factor',   numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBG_FACTOR_DAY'],             label: 'WB green factor', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBB_FACTOR_DAY'],             label: 'WB blue factor',  numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['WBR_MTF_MIDTONES_DAY'],       label: 'WB red midtones',   numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['WBG_MTF_MIDTONES_DAY'],       label: 'WB green midtones', numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['WBB_MTF_MIDTONES_DAY'],       label: 'WB blue midtones',  numeric: 'float', step: 0.01 },
        { kind: 'number', path: ['SATURATION_FACTOR_DAY'],      label: 'Saturation', numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['GAMMA_CORRECTION_DAY'],       label: 'Gamma',      numeric: 'float', step: 0.1 },
        { kind: 'number', path: ['SHARPEN_AMOUNT_DAY'],         label: 'Sharpen',    numeric: 'float', step: 0.1 },
      ],
    },
    {
      title: 'Grayscale',
      fields: [
        { kind: 'bool', path: ['NIGHT_GRAYSCALE'],   label: 'Grayscale at night' },
        { kind: 'bool', path: ['DAYTIME_GRAYSCALE'], label: 'Grayscale during day' },
      ],
    },
    {
      title: 'File format',
      fields: [
        { kind: 'select', path: ['IMAGE_FILE_TYPE'],                 label: 'Image format', options: fileTypeOptions, coerce: 'string' },
        { kind: 'number', path: ['IMAGE_FILE_COMPRESSION', 'jpg'],   label: 'JPEG quality', numeric: 'int', min: 1, max: 100 },
        { kind: 'number', path: ['IMAGE_FILE_COMPRESSION', 'png'],   label: 'PNG compression', numeric: 'int', min: 0, max: 9 },
        { kind: 'number', path: ['IMAGE_FILE_COMPRESSION', 'tif'],   label: 'TIFF compression', numeric: 'int' },
        { kind: 'select', path: ['IMAGE_COLORMAP'],                  label: 'Color map', options: colormapOptions, coerce: 'string' },
      ],
    },
    {
      title: 'Geometry',
      fields: [
        { kind: 'select', path: ['IMAGE_ROTATE'],            label: 'Rotate', options: rotateOptions, coerce: 'string' },
        { kind: 'number', path: ['IMAGE_ROTATE_ANGLE'],      label: 'Rotate angle', numeric: 'int', help: 'degrees (fine rotation)' },
        { kind: 'bool',   path: ['IMAGE_ROTATE_KEEP_SIZE'],  label: 'Keep size when rotating' },
        { kind: 'bool',   path: ['IMAGE_FLIP_V'],            label: 'Flip vertical' },
        { kind: 'bool',   path: ['IMAGE_FLIP_H'],            label: 'Flip horizontal' },
        { kind: 'number', path: ['IMAGE_SCALE'],             label: 'Scale', numeric: 'int', help: '% of original' },
        { kind: 'number', path: ['IMAGE_CROP_ROI', 0],       label: 'Crop X1', numeric: 'int', help: 'Leave all 0 to disable cropping' },
        { kind: 'number', path: ['IMAGE_CROP_ROI', 1],       label: 'Crop Y1', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_CROP_ROI', 2],       label: 'Crop X2', numeric: 'int' },
        { kind: 'number', path: ['IMAGE_CROP_ROI', 3],       label: 'Crop Y2', numeric: 'int' },
        { kind: 'bool',   path: ['IMAGE_CROP_IMAGE_CIRCLE'], label: 'Crop to image circle' },
      ],
    },
    {
      title: 'Border',
      fields: [
        { kind: 'number', path: ['IMAGE_BORDER', 'TOP'],    label: 'Top',    numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['IMAGE_BORDER', 'LEFT'],   label: 'Left',   numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['IMAGE_BORDER', 'RIGHT'],  label: 'Right',  numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['IMAGE_BORDER', 'BOTTOM'], label: 'Bottom', numeric: 'int', help: 'pixels' },
        { kind: 'number', path: ['IMAGE_BORDER', 'COLOR', 0], label: 'Color · R', numeric: 'int', min: 0, max: 255 },
        { kind: 'number', path: ['IMAGE_BORDER', 'COLOR', 1], label: 'Color · G', numeric: 'int', min: 0, max: 255 },
        { kind: 'number', path: ['IMAGE_BORDER', 'COLOR', 2], label: 'Color · B', numeric: 'int', min: 0, max: 255 },
      ],
    },
    {
      title: 'Raw export',
      fields: [
        { kind: 'select', path: ['IMAGE_EXPORT_RAW'],    label: 'Raw export format', options: exportRawOptions, coerce: 'string' },
        { kind: 'text',   path: ['IMAGE_EXPORT_FOLDER'], label: 'Export folder' },
        { kind: 'bool',   path: ['IMAGE_EXPORT_FLIP_V'], label: 'Flip vertical' },
        { kind: 'bool',   path: ['IMAGE_EXPORT_FLIP_H'], label: 'Flip horizontal' },
      ],
    },
    {
      title: 'FITS',
      fields: [
        { kind: 'bool',   path: ['IMAGE_SAVE_FITS'],            label: 'Save FITS' },
        { kind: 'bool',   path: ['IMAGE_SAVE_FITS_COMPRESSED'], label: 'Compress FITS' },
        { kind: 'select', path: ['IMAGE_SAVE_FITS_PERIOD'],     label: 'Save period', options: fitsPeriodOptions, coerce: 'int' },
        { kind: 'bool',   path: ['IMAGE_SAVE_FITS_PRE_DARK'],   label: 'Save pre-calibration FITS' },
      ],
    },
    {
      title: 'FITS headers',
      description: 'Custom keyword/value pairs written into saved FITS files.',
      fields: [
        { kind: 'text', path: ['FITSHEADERS', 0, 0], label: 'Header 1 key' },
        { kind: 'text', path: ['FITSHEADERS', 0, 1], label: 'Header 1 value' },
        { kind: 'text', path: ['FITSHEADERS', 1, 0], label: 'Header 2 key' },
        { kind: 'text', path: ['FITSHEADERS', 1, 1], label: 'Header 2 value' },
        { kind: 'text', path: ['FITSHEADERS', 2, 0], label: 'Header 3 key' },
        { kind: 'text', path: ['FITSHEADERS', 2, 1], label: 'Header 3 value' },
        { kind: 'text', path: ['FITSHEADERS', 3, 0], label: 'Header 4 key' },
        { kind: 'text', path: ['FITSHEADERS', 3, 1], label: 'Header 4 value' },
        { kind: 'text', path: ['FITSHEADERS', 4, 0], label: 'Header 5 key' },
        { kind: 'text', path: ['FITSHEADERS', 4, 1], label: 'Header 5 value' },
      ],
    },
  ],
};
