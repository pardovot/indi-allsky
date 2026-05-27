import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';

/**
 * FITS / image processing page. Mirrors the legacy `imageprocessing.html`
 * page: choose an existing FITS frame (by camera + frame type + FITS id),
 * tune processing parameters, run the processor and view the resulting image.
 *
 * The backend (JsonImageProcessingView) validates against a WTForms form that
 * reads nearly every field unconditionally, so the full field set is always
 * submitted. The UI surfaces the prominent controls; niche overlay / cardinal /
 * lightgraph / moon / text fields are carried with their legacy defaults.
 */

type Choice = [string, string];

const OUTPUT_IMAGE_TYPE_choices: Choice[] = [
  ['jpg', 'JPEG'],
  ['png', 'PNG'],
];

const FRAME_TYPE_choices: Choice[] = [
  ['light', 'Light'],
  ['dark', 'Dark'],
  ['bpm', 'Bad Pixel Map'],
];

const CCD_BIT_DEPTH_choices: Choice[] = [
  ['0', 'Auto Detect'],
  ['8', '8'],
  ['10', '10'],
  ['12', '12'],
  ['14', '14'],
  ['16', '16'],
];

const CFA_PATTERN_choices: Choice[] = [
  ['', 'Auto Detect'],
  ['RGGB', 'RGGB'],
  ['GRBG', 'GRBG'],
  ['BGGR', 'BGGR'],
  ['GBRG', 'GBRG'],
];

const IMAGE_COLORMAP_choices: Choice[] = [
  ['', 'None'],
  ['COLORMAP_JET', 'Jet'],
  ['COLORMAP_TURBO', 'Turbo'],
  ['COLORMAP_BONE', 'Bone'],
  ['COLORMAP_RAINBOW', 'Rainbow'],
  ['COLORMAP_SPRING', 'Spring'],
  ['COLORMAP_AUTUMN', 'Autumn'],
  ['COLORMAP_HOT', 'Hot'],
  ['COLORMAP_MAGMA', 'Magma'],
  ['COLORMAP_INFERNO', 'Inferno'],
  ['COLORMAP_CIVIDIS', 'Cividis'],
  ['COLORMAP_PARULA', 'Parula'],
  ['COLORMAP_OCEAN', 'Ocean'],
  ['COLORMAP_PINK', 'Pink'],
  ['COLORMAP_DEEPGREEN', 'Deep Green'],
];

const SCNR_ALGORITHM_choices: Choice[] = [
  ['', 'Disabled'],
  ['average_neutral', 'Average Neutral'],
  ['maximum_neutral', 'Maximum Neutral'],
  ['green_mtf', 'Midtone Transfer Function'],
];

const IMAGE_DENOISE_choices: Choice[] = [
  ['', 'Disabled'],
  ['gaussian_blur', 'Gaussian Blur — smooths uniformly'],
  ['median_blur', 'Median — removes salt-and-pepper noise'],
  ['bilateral', 'Bilateral — smooths sky background'],
  ['wavelet', 'Wavelet — best quality (slow)'],
];

const SQM_FOV_DIV_choices: Choice[] = [
  ['2', '100%'],
  ['3', '66%'],
  ['4', '50%'],
  ['6', '33%'],
];

const IMAGE_STACK_METHOD_choices: Choice[] = [
  ['maximum', 'Maximum'],
  ['average', 'Average'],
  ['minimum', 'Minimum'],
];

const IMAGE_STACK_COUNT_choices: Choice[] = [
  ['1', 'Disabled'],
  ['2', '2'],
  ['3', '3'],
  ['4', '4'],
  ['5', '5'],
];

const IMAGE_ROTATE_choices: Choice[] = [
  ['', 'Disabled'],
  ['ROTATE_90_CLOCKWISE', '90° Clockwise'],
  ['ROTATE_90_COUNTERCLOCKWISE', '90° Counterclockwise'],
  ['ROTATE_180', '180°'],
];

const IMAGE_STRETCH__CLASSNAME_choices: Choice[] = [
  ['', 'None'],
  ['mode1_stddev_cutoff', 'Standard Deviation Cutoff (Original)'],
  ['mode2_mtf', 'Midtone Transfer Function'],
  ['mode2_mtf_x2', 'Midtone Transfer Function (Double)'],
  ['mode3_adaptive_mtf', 'Adaptive Midtone Transfer Function'],
];

const IMAGE_LABEL_SYSTEM_choices: Choice[] = [
  ['', 'Off'],
  ['pillow', 'Pillow'],
  ['opencv', 'OpenCV'],
];

/**
 * Full field payload submitted to the processor. Numeric controls are kept as
 * strings (matching the legacy form which serialises every input via `.val()`);
 * the backend coerces them with int()/float().
 */
interface ProcessingFields {
  CAMERA_ID: number;
  FRAME_TYPE: string;
  FITS_ID: string;
  OUTPUT_IMAGE_TYPE: string;
  DISABLE_PROCESSING: boolean;

  // calibration
  IMAGE_CALIBRATE_DARK: boolean;
  IMAGE_CALIBRATE_BPM: boolean;
  IMAGE_CALIBRATE_MANUAL_OFFSET: string;
  IMAGE_CALIBRATE_FIX_HOLES: boolean;
  IMAGE_CALIBRATE_HOLE_THOLD: string;
  CCD_BIT_DEPTH: string;

  // detection / SQM
  DETECT_MASK: string;
  SQM_FOV_DIV: string;
  SQM_ROI_X1: string;
  SQM_ROI_Y1: string;
  SQM_ROI_X2: string;
  SQM_ROI_Y2: string;

  // contrast
  NIGHT_CONTRAST_ENHANCE: boolean;
  CONTRAST_ENHANCE_16BIT: boolean;
  CLAHE_CLIPLIMIT: string;
  CLAHE_GRIDSIZE: string;

  // stretch
  IMAGE_STRETCH__CLASSNAME: string;
  IMAGE_STRETCH__MODE1_GAMMA: string;
  IMAGE_STRETCH__MODE1_STDDEVS: string;
  IMAGE_STRETCH__MODE2_SHADOWS: string;
  IMAGE_STRETCH__MODE2_MIDTONES: string;
  IMAGE_STRETCH__MODE2_HIGHLIGHTS: string;
  IMAGE_STRETCH__MODE3_BLACK_CLIP: string;
  IMAGE_STRETCH__MODE3_SHADOWS: string;
  IMAGE_STRETCH__MODE3_MIDTONES: string;
  IMAGE_STRETCH__MODE3_HIGHLIGHTS: string;

  // color
  CFA_PATTERN: string;
  SCNR_ALGORITHM: string;
  SCNR_MTF_MIDTONES: string;

  // denoise
  IMAGE_DENOISE: string;
  IMAGE_DENOISE_STRENGTH: string;
  BILATERAL_SIGMA_COLOR: string;
  BILATERAL_SIGMA_SPACE: string;

  // white balance
  WBR_FACTOR: string;
  WBG_FACTOR: string;
  WBB_FACTOR: string;
  WBR_MTF_MIDTONES: string;
  WBG_MTF_MIDTONES: string;
  WBB_MTF_MIDTONES: string;
  AUTO_WB: boolean;

  // tone
  SATURATION_FACTOR: string;
  GAMMA_CORRECTION: string;
  SHARPEN_AMOUNT: string;
  IMAGE_COLORMAP: string;

  // border
  IMAGE_BORDER__TOP: string;
  IMAGE_BORDER__LEFT: string;
  IMAGE_BORDER__RIGHT: string;
  IMAGE_BORDER__BOTTOM: string;
  IMAGE_BORDER__COLOR: string;

  // geometry
  IMAGE_CROP_IMAGE_CIRCLE: boolean;
  IMAGE_ROTATE: string;
  IMAGE_ROTATE_ANGLE: string;
  IMAGE_FLIP_V: boolean;
  IMAGE_FLIP_H: boolean;

  // stacking / alignment
  IMAGE_STACK_COUNT: string;
  IMAGE_STACK_METHOD: string;
  IMAGE_STACK_ALIGN: boolean;
  IMAGE_ALIGN_DETECTSIGMA: string;
  IMAGE_ALIGN_POINTS: string;
  IMAGE_ALIGN_SOURCEMINAREA: string;

  // fisheye -> panorama
  FISH2PANO__ENABLE: boolean;
  FISH2PANO__DIAMETER: string;
  FISH2PANO__ROTATE_ANGLE: string;
  FISH2PANO__FLIP_H: boolean;
  FISH2PANO__SCALE: string;
  FISH2PANO__ENABLE_CARDINAL_DIRS: boolean;
  FISH2PANO__DIRS_OFFSET_BOTTOM: string;
  FISH2PANO__OPENCV_FONT_SCALE: string;
  FISH2PANO__PIL_FONT_SIZE: string;

  // image circle mask
  IMAGE_CIRCLE_MASK__ENABLE: boolean;
  IMAGE_CIRCLE_MASK__DIAMETER: string;
  IMAGE_CIRCLE_MASK__OFFSET_X: string;
  IMAGE_CIRCLE_MASK__OFFSET_Y: string;
  IMAGE_CIRCLE_MASK__BLUR: string;
  IMAGE_CIRCLE_MASK__OPACITY: string;
  IMAGE_CIRCLE_MASK__OUTLINE: boolean;

  // labels
  IMAGE_LABEL_SYSTEM: string;
  IMAGE_LABEL_TEMPLATE: string;
  IMAGE_EXTRA_TEXT: string;

  // lens / location
  LENS_IMAGE_CIRCLE: string;
  LENS_OFFSET_X: string;
  LENS_OFFSET_Y: string;
  LENS_AZIMUTH: string;

  // text properties (carried with defaults; required by backend form)
  TEXT_PROPERTIES__FONT_FACE: string;
  TEXT_PROPERTIES__FONT_SCALE: string;
  TEXT_PROPERTIES__FONT_THICKNESS: string;
  TEXT_PROPERTIES__FONT_OUTLINE: boolean;
  TEXT_PROPERTIES__FONT_HEIGHT: string;
  TEXT_PROPERTIES__FONT_X: string;
  TEXT_PROPERTIES__FONT_Y: string;
  TEXT_PROPERTIES__FONT_COLOR: string;
  TEXT_PROPERTIES__PIL_FONT_FILE: string;
  TEXT_PROPERTIES__PIL_FONT_CUSTOM: string;
  TEXT_PROPERTIES__PIL_FONT_SIZE: string;

  // cardinal directions (carried with defaults)
  CARDINAL_DIRS__ENABLE: boolean;
  CARDINAL_DIRS__FONT_COLOR: string;
  CARDINAL_DIRS__SWAP_NS: boolean;
  CARDINAL_DIRS__SWAP_EW: boolean;
  CARDINAL_DIRS__CHAR_NORTH: string;
  CARDINAL_DIRS__CHAR_EAST: string;
  CARDINAL_DIRS__CHAR_WEST: string;
  CARDINAL_DIRS__CHAR_SOUTH: string;
  CARDINAL_DIRS__DIAMETER: string;
  CARDINAL_DIRS__OFFSET_X: string;
  CARDINAL_DIRS__OFFSET_Y: string;
  CARDINAL_DIRS__OFFSET_TOP: string;
  CARDINAL_DIRS__OFFSET_LEFT: string;
  CARDINAL_DIRS__OFFSET_RIGHT: string;
  CARDINAL_DIRS__OFFSET_BOTTOM: string;
  CARDINAL_DIRS__OPENCV_FONT_SCALE: string;
  CARDINAL_DIRS__PIL_FONT_SIZE: string;
  CARDINAL_DIRS__OUTLINE_CIRCLE: boolean;

  // moon overlay (carried with defaults)
  MOON_OVERLAY__ENABLE: boolean;
  MOON_OVERLAY__X: string;
  MOON_OVERLAY__Y: string;
  MOON_OVERLAY__SCALE: string;
  MOON_OVERLAY__DARK_SIDE_SCALE: string;
  MOON_OVERLAY__FLIP_V: boolean;
  MOON_OVERLAY__FLIP_H: boolean;

  // lightgraph overlay (carried with defaults)
  LIGHTGRAPH_OVERLAY__ENABLE: boolean;
  LIGHTGRAPH_OVERLAY__GRAPH_HEIGHT: string;
  LIGHTGRAPH_OVERLAY__GRAPH_BORDER: string;
  LIGHTGRAPH_OVERLAY__Y: string;
  LIGHTGRAPH_OVERLAY__OFFSET_X: string;
  LIGHTGRAPH_OVERLAY__SCALE: string;
  LIGHTGRAPH_OVERLAY__NOW_MARKER_SIZE: string;
  LIGHTGRAPH_OVERLAY__OPACITY: string;
  LIGHTGRAPH_OVERLAY__PIL_FONT_SIZE: string;
  LIGHTGRAPH_OVERLAY__OPENCV_FONT_SCALE: string;
  LIGHTGRAPH_OVERLAY__LABEL: boolean;
  LIGHTGRAPH_OVERLAY__HOUR_LINES: boolean;
  LIGHTGRAPH_OVERLAY__DAY_COLOR: string;
  LIGHTGRAPH_OVERLAY__DUSK_COLOR: string;
  LIGHTGRAPH_OVERLAY__NIGHT_COLOR: string;
  LIGHTGRAPH_OVERLAY__MOONMODE_COLOR: string;
  LIGHTGRAPH_OVERLAY__HOUR_COLOR: string;
  LIGHTGRAPH_OVERLAY__BORDER_COLOR: string;
  LIGHTGRAPH_OVERLAY__NOW_COLOR: string;
  LIGHTGRAPH_OVERLAY__FONT_COLOR: string;
}

interface ProcessResponse {
  image_b64: string | null;
  processing_elapsed_s: number;
  message: string;
  'success-message'?: string;
}

type FieldErrors = Record<string, string[]>;

const DEFAULT_LABEL_TEMPLATE =
  '{timestamp:%Y.%m.%d %H:%M:%S}\\nLat {latitude:0.1f} Long {longitude:0.1f}\\nSun {sun_alt:0.0f}\\xb0 Moon {moon_alt:0.0f}\\xb0 {moon_phase:0.0f}%';

function buildDefaults(cameraId: number, fitsId: string, frameType: string): ProcessingFields {
  return {
    CAMERA_ID: cameraId,
    FRAME_TYPE: frameType,
    FITS_ID: fitsId,
    OUTPUT_IMAGE_TYPE: 'jpg',
    DISABLE_PROCESSING: false,

    IMAGE_CALIBRATE_DARK: false,
    IMAGE_CALIBRATE_BPM: false,
    IMAGE_CALIBRATE_MANUAL_OFFSET: '0',
    IMAGE_CALIBRATE_FIX_HOLES: false,
    IMAGE_CALIBRATE_HOLE_THOLD: '30',
    CCD_BIT_DEPTH: '0',

    DETECT_MASK: '',
    SQM_FOV_DIV: '4',
    SQM_ROI_X1: '0',
    SQM_ROI_Y1: '0',
    SQM_ROI_X2: '0',
    SQM_ROI_Y2: '0',

    NIGHT_CONTRAST_ENHANCE: false,
    CONTRAST_ENHANCE_16BIT: false,
    CLAHE_CLIPLIMIT: '3.0',
    CLAHE_GRIDSIZE: '8',

    IMAGE_STRETCH__CLASSNAME: '',
    IMAGE_STRETCH__MODE1_GAMMA: '3.0',
    IMAGE_STRETCH__MODE1_STDDEVS: '2.25',
    IMAGE_STRETCH__MODE2_SHADOWS: '0.0',
    IMAGE_STRETCH__MODE2_MIDTONES: '0.35',
    IMAGE_STRETCH__MODE2_HIGHLIGHTS: '1.0',
    IMAGE_STRETCH__MODE3_BLACK_CLIP: '-2.8',
    IMAGE_STRETCH__MODE3_SHADOWS: '0.0',
    IMAGE_STRETCH__MODE3_MIDTONES: '0.25',
    IMAGE_STRETCH__MODE3_HIGHLIGHTS: '1.0',

    CFA_PATTERN: '',
    SCNR_ALGORITHM: '',
    SCNR_MTF_MIDTONES: '0.65',

    IMAGE_DENOISE: '',
    IMAGE_DENOISE_STRENGTH: '3',
    BILATERAL_SIGMA_COLOR: '20',
    BILATERAL_SIGMA_SPACE: '35',

    WBR_FACTOR: '1.0',
    WBG_FACTOR: '1.0',
    WBB_FACTOR: '1.0',
    WBR_MTF_MIDTONES: '0.5',
    WBG_MTF_MIDTONES: '0.5',
    WBB_MTF_MIDTONES: '0.5',
    AUTO_WB: false,

    SATURATION_FACTOR: '1.0',
    GAMMA_CORRECTION: '1.0',
    SHARPEN_AMOUNT: '0.0',
    IMAGE_COLORMAP: '',

    IMAGE_BORDER__TOP: '0',
    IMAGE_BORDER__LEFT: '0',
    IMAGE_BORDER__RIGHT: '0',
    IMAGE_BORDER__BOTTOM: '0',
    IMAGE_BORDER__COLOR: '0,0,0',

    IMAGE_CROP_IMAGE_CIRCLE: false,
    IMAGE_ROTATE: '',
    IMAGE_ROTATE_ANGLE: '0',
    IMAGE_FLIP_V: true,
    IMAGE_FLIP_H: true,

    IMAGE_STACK_COUNT: '1',
    IMAGE_STACK_METHOD: 'maximum',
    IMAGE_STACK_ALIGN: false,
    IMAGE_ALIGN_DETECTSIGMA: '5',
    IMAGE_ALIGN_POINTS: '50',
    IMAGE_ALIGN_SOURCEMINAREA: '10',

    FISH2PANO__ENABLE: false,
    FISH2PANO__DIAMETER: '3000',
    FISH2PANO__ROTATE_ANGLE: '0',
    FISH2PANO__FLIP_H: false,
    FISH2PANO__SCALE: '0.3',
    FISH2PANO__ENABLE_CARDINAL_DIRS: true,
    FISH2PANO__DIRS_OFFSET_BOTTOM: '25',
    FISH2PANO__OPENCV_FONT_SCALE: '0.8',
    FISH2PANO__PIL_FONT_SIZE: '30',

    IMAGE_CIRCLE_MASK__ENABLE: false,
    IMAGE_CIRCLE_MASK__DIAMETER: '3000',
    IMAGE_CIRCLE_MASK__OFFSET_X: '0',
    IMAGE_CIRCLE_MASK__OFFSET_Y: '0',
    IMAGE_CIRCLE_MASK__BLUR: '35',
    IMAGE_CIRCLE_MASK__OPACITY: '100',
    IMAGE_CIRCLE_MASK__OUTLINE: false,

    IMAGE_LABEL_SYSTEM: '',
    IMAGE_LABEL_TEMPLATE: DEFAULT_LABEL_TEMPLATE,
    IMAGE_EXTRA_TEXT: '',

    LENS_IMAGE_CIRCLE: '3000',
    LENS_OFFSET_X: '0',
    LENS_OFFSET_Y: '0',
    LENS_AZIMUTH: '0.0',

    TEXT_PROPERTIES__FONT_FACE: 'FONT_HERSHEY_SIMPLEX',
    TEXT_PROPERTIES__FONT_SCALE: '0.8',
    TEXT_PROPERTIES__FONT_THICKNESS: '1',
    TEXT_PROPERTIES__FONT_OUTLINE: true,
    TEXT_PROPERTIES__FONT_HEIGHT: '30',
    TEXT_PROPERTIES__FONT_X: '15',
    TEXT_PROPERTIES__FONT_Y: '30',
    TEXT_PROPERTIES__FONT_COLOR: '200,200,200',
    TEXT_PROPERTIES__PIL_FONT_FILE: 'fonts-freefont-ttf/FreeSans.ttf',
    TEXT_PROPERTIES__PIL_FONT_CUSTOM: '',
    TEXT_PROPERTIES__PIL_FONT_SIZE: '30',

    CARDINAL_DIRS__ENABLE: false,
    CARDINAL_DIRS__FONT_COLOR: '200,200,0',
    CARDINAL_DIRS__SWAP_NS: false,
    CARDINAL_DIRS__SWAP_EW: false,
    CARDINAL_DIRS__CHAR_NORTH: 'N',
    CARDINAL_DIRS__CHAR_EAST: 'E',
    CARDINAL_DIRS__CHAR_WEST: 'W',
    CARDINAL_DIRS__CHAR_SOUTH: 'S',
    CARDINAL_DIRS__DIAMETER: '3000',
    CARDINAL_DIRS__OFFSET_X: '0',
    CARDINAL_DIRS__OFFSET_Y: '0',
    CARDINAL_DIRS__OFFSET_TOP: '15',
    CARDINAL_DIRS__OFFSET_LEFT: '15',
    CARDINAL_DIRS__OFFSET_RIGHT: '15',
    CARDINAL_DIRS__OFFSET_BOTTOM: '15',
    CARDINAL_DIRS__OPENCV_FONT_SCALE: '0.8',
    CARDINAL_DIRS__PIL_FONT_SIZE: '30',
    CARDINAL_DIRS__OUTLINE_CIRCLE: false,

    MOON_OVERLAY__ENABLE: false,
    MOON_OVERLAY__X: '-500',
    MOON_OVERLAY__Y: '-200',
    MOON_OVERLAY__SCALE: '0.5',
    MOON_OVERLAY__DARK_SIDE_SCALE: '0.4',
    MOON_OVERLAY__FLIP_V: false,
    MOON_OVERLAY__FLIP_H: false,

    LIGHTGRAPH_OVERLAY__ENABLE: false,
    LIGHTGRAPH_OVERLAY__GRAPH_HEIGHT: '30',
    LIGHTGRAPH_OVERLAY__GRAPH_BORDER: '3',
    LIGHTGRAPH_OVERLAY__Y: '-50',
    LIGHTGRAPH_OVERLAY__OFFSET_X: '0',
    LIGHTGRAPH_OVERLAY__SCALE: '1.0',
    LIGHTGRAPH_OVERLAY__NOW_MARKER_SIZE: '8',
    LIGHTGRAPH_OVERLAY__OPACITY: '100',
    LIGHTGRAPH_OVERLAY__PIL_FONT_SIZE: '20',
    LIGHTGRAPH_OVERLAY__OPENCV_FONT_SCALE: '0.5',
    LIGHTGRAPH_OVERLAY__LABEL: true,
    LIGHTGRAPH_OVERLAY__HOUR_LINES: true,
    LIGHTGRAPH_OVERLAY__DAY_COLOR: '150,150,150',
    LIGHTGRAPH_OVERLAY__DUSK_COLOR: '75,75,150',
    LIGHTGRAPH_OVERLAY__NIGHT_COLOR: '30,30,30',
    LIGHTGRAPH_OVERLAY__MOONMODE_COLOR: '50,50,50',
    LIGHTGRAPH_OVERLAY__HOUR_COLOR: '100,100,100',
    LIGHTGRAPH_OVERLAY__BORDER_COLOR: '15,15,15',
    LIGHTGRAPH_OVERLAY__NOW_COLOR: '200,200,200',
    LIGHTGRAPH_OVERLAY__FONT_COLOR: '150,150,150',
  };
}

function readQuery(): { id: string; type: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    id: params.get('id') ?? '0',
    type: params.get('type') ?? 'light',
  };
}

export default function ProcessFits() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">FITS Processing</h1>
          {cameraId === null ? (
            <div className="text-ink-dim text-sm">Loading camera…</div>
          ) : (
            <Content cameraId={cameraId} />
          )}
        </main>
      )}
    </PageShell>
  );
}

function Content({ cameraId }: { cameraId: number }) {
  const initial = useMemo(() => {
    const q = readQuery();
    return buildDefaults(cameraId, q.id, q.type);
  }, [cameraId]);

  const [fields, setFields] = useState<ProcessingFields>(initial);
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [statusText, setStatusText] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const didInit = useRef(false);

  // Keep camera id in sync if the header switches cameras.
  useEffect(() => {
    setFields((f) => ({ ...f, CAMERA_ID: cameraId }));
  }, [cameraId]);

  const set = useCallback(
    <K extends keyof ProcessingFields>(key: K, value: ProcessingFields[K]) => {
      setFields((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const run = useCallback(
    async (override?: Partial<ProcessingFields>) => {
      const payload = { ...fields, ...override };
      setBusy(true);
      setStatusText('Processing…');
      setErrors({});
      try {
        const data = await api<ProcessResponse>('/processing', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setImageB64(data.image_b64);
        setElapsed(data.processing_elapsed_s);
        setMessage(data.message || '');
        setStatusText(
          data.image_b64
            ? `Processed in ${data.processing_elapsed_s}s`
            : data.message || 'No image',
        );
      } catch (err) {
        if (err instanceof ApiError && err.body && typeof err.body === 'object') {
          setErrors(err.body as FieldErrors);
          setStatusText('Validation error');
        } else {
          setStatusText(err instanceof Error ? err.message : 'Processing failed');
        }
      } finally {
        setBusy(false);
      }
    },
    [fields],
  );

  // Initial unprocessed preview, mirroring legacy init().
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    run({ DISABLE_PROCESSING: true });
    setStatusText('Unprocessed image');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mimeType = fields.OUTPUT_IMAGE_TYPE === 'png' ? 'image/png' : 'image/jpeg';
  const dataUri = imageB64 ? `data:${mimeType};base64,${imageB64}` : '';
  const ext = fields.OUTPUT_IMAGE_TYPE === 'png' ? '.png' : '.jpg';

  const denoiseDisabled = !fields.IMAGE_DENOISE;
  const bilateralDisabled = fields.IMAGE_DENOISE !== 'bilateral';

  function toggleFullscreen() {
    const el = imgRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  }

  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      {/* Preview + actions */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center w-full min-h-[200px]">
          {dataUri ? (
            <img
              ref={imgRef}
              src={dataUri}
              alt="Processed FITS"
              onClick={toggleFullscreen}
              className="max-w-full max-h-[70vh] w-auto h-auto object-contain rounded-md cursor-zoom-in select-none ring-1 ring-edge"
            />
          ) : (
            <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30">
              <div className="text-ink-dim text-sm">{busy ? 'Processing…' : 'No image'}</div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-dim">
          <span>{statusText}</span>
          {elapsed !== null && imageB64 && <span>· {elapsed}s</span>}
          {message && <span>· {message}</span>}
          {dataUri && (
            <a
              href={dataUri}
              download={`image_processor_${Math.floor(Date.now() / 1000)}${ext}`}
              className="px-2 py-0.5 rounded-md border border-info/30 bg-info/20 text-info hover:opacity-80"
            >
              Download
            </a>
          )}
        </div>
      </div>

      {errors.form_global && (
        <Banner tone="danger">
          {errors.form_global.map((m, i) => <div key={i}>{m}</div>)}
        </Banner>
      )}

      {/* Source + run controls */}
      <Card title="Source">
        <Grid>
          <SelectField label="Frame Type" value={fields.FRAME_TYPE}
            options={FRAME_TYPE_choices} onChange={(v) => set('FRAME_TYPE', v)}
            error={errors.FRAME_TYPE} />
          <TextField label="FITS ID" value={fields.FITS_ID}
            onChange={(v) => set('FITS_ID', v)} error={errors.FITS_ID}
            hint="Database id of the FITS frame. 0 = latest light frame." />
          <SelectField label="Output Type" value={fields.OUTPUT_IMAGE_TYPE}
            options={OUTPUT_IMAGE_TYPE_choices} onChange={(v) => set('OUTPUT_IMAGE_TYPE', v)}
            error={errors.OUTPUT_IMAGE_TYPE} />
          <BoolField label="Disable processing" checked={fields.DISABLE_PROCESSING}
            onChange={(v) => set('DISABLE_PROCESSING', v)}
            hint="Return the raw image with no processing applied." />
        </Grid>
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => run()}
            className="px-4 py-1.5 rounded-md border text-sm font-medium bg-accent/20 hover:bg-accent/30 border-accent/40 text-accent disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? 'Processing…' : 'Process'}
          </button>
        </div>
      </Card>

      <Card title="Calibration">
        <Banner tone="warn">
          Do not enable dark/BPM calibration unless you know what you are doing — calibration is
          almost always already complete.
        </Banner>
        <Grid>
          <BoolField label="Dark frame calibration" checked={fields.IMAGE_CALIBRATE_DARK}
            onChange={(v) => set('IMAGE_CALIBRATE_DARK', v)} />
          <BoolField label="Bad pixel map calibration" checked={fields.IMAGE_CALIBRATE_BPM}
            onChange={(v) => set('IMAGE_CALIBRATE_BPM', v)} />
          <TextField label="Manual offset" value={fields.IMAGE_CALIBRATE_MANUAL_OFFSET}
            onChange={(v) => set('IMAGE_CALIBRATE_MANUAL_OFFSET', v)}
            error={errors.IMAGE_CALIBRATE_MANUAL_OFFSET}
            hint="Manual offset (libcamera) if darks are not applied. e.g. imx477 = 4000." />
          <BoolField label="Fix calibration holes" checked={fields.IMAGE_CALIBRATE_FIX_HOLES}
            onChange={(v) => set('IMAGE_CALIBRATE_FIX_HOLES', v)} hint="BETA" />
          <TextField label="Hole ADU threshold %" value={fields.IMAGE_CALIBRATE_HOLE_THOLD}
            onChange={(v) => set('IMAGE_CALIBRATE_HOLE_THOLD', v)}
            error={errors.IMAGE_CALIBRATE_HOLE_THOLD} hint="Default 30%." />
          <SelectField label="Camera bit depth" value={fields.CCD_BIT_DEPTH}
            options={CCD_BIT_DEPTH_choices} onChange={(v) => set('CCD_BIT_DEPTH', v)}
            error={errors.CCD_BIT_DEPTH} />
        </Grid>
      </Card>

      <Card title="Detection & SQM">
        <Grid>
          <TextField label="Detection mask" value={fields.DETECT_MASK}
            onChange={(v) => set('DETECT_MASK', v)} error={errors.DETECT_MASK}
            hint="PNG mask file for detection area." />
          <SelectField label="SQM FoV" value={fields.SQM_FOV_DIV}
            options={SQM_FOV_DIV_choices} onChange={(v) => set('SQM_FOV_DIV', v)}
            error={errors.SQM_FOV_DIV} hint="Central region for SQM (unused if ROI defined)." />
          <TextField label="SQM ROI x1" value={fields.SQM_ROI_X1}
            onChange={(v) => set('SQM_ROI_X1', v)} error={errors.SQM_ROI_X1} />
          <TextField label="SQM ROI y1" value={fields.SQM_ROI_Y1}
            onChange={(v) => set('SQM_ROI_Y1', v)} error={errors.SQM_ROI_Y1} />
          <TextField label="SQM ROI x2" value={fields.SQM_ROI_X2}
            onChange={(v) => set('SQM_ROI_X2', v)} error={errors.SQM_ROI_X2} />
          <TextField label="SQM ROI y2" value={fields.SQM_ROI_Y2}
            onChange={(v) => set('SQM_ROI_Y2', v)} error={errors.SQM_ROI_Y2}
            hint="x2 & y2 must be > 0 to enable the ROI." />
        </Grid>
      </Card>

      <Card title="Contrast (CLAHE)">
        <Grid>
          <BoolField label="Contrast enhance" checked={fields.NIGHT_CONTRAST_ENHANCE}
            onChange={(v) => set('NIGHT_CONTRAST_ENHANCE', v)} hint="Apply CLAHE contrast enhancement." />
          <BoolField label="16-bit contrast enhance" checked={fields.CONTRAST_ENHANCE_16BIT}
            onChange={(v) => set('CONTRAST_ENHANCE_16BIT', v)}
            hint="CLAHE in 16-bit mode. Needs ~2GB RAM for large images." />
          <TextField label="CLAHE clip limit" value={fields.CLAHE_CLIPLIMIT}
            onChange={(v) => set('CLAHE_CLIPLIMIT', v)} error={errors.CLAHE_CLIPLIMIT}
            hint="Higher = more contrast." />
          <TextField label="CLAHE grid size" value={fields.CLAHE_GRIDSIZE}
            onChange={(v) => set('CLAHE_GRIDSIZE', v)} error={errors.CLAHE_GRIDSIZE} />
        </Grid>
      </Card>

      <Card title="Stretch">
        <Grid>
          <SelectField label="Stretch function" value={fields.IMAGE_STRETCH__CLASSNAME}
            options={IMAGE_STRETCH__CLASSNAME_choices}
            onChange={(v) => set('IMAGE_STRETCH__CLASSNAME', v)} error={errors.IMAGE_STRETCH__CLASSNAME} />
          <TextField label="Mode1 gamma" value={fields.IMAGE_STRETCH__MODE1_GAMMA}
            onChange={(v) => set('IMAGE_STRETCH__MODE1_GAMMA', v)} error={errors.IMAGE_STRETCH__MODE1_GAMMA} />
          <TextField label="Mode1 std devs" value={fields.IMAGE_STRETCH__MODE1_STDDEVS}
            onChange={(v) => set('IMAGE_STRETCH__MODE1_STDDEVS', v)} error={errors.IMAGE_STRETCH__MODE1_STDDEVS}
            hint="Black cutoff in std devs; lower = greater dynamic range." />
          <TextField label="Mode2 shadows" value={fields.IMAGE_STRETCH__MODE2_SHADOWS}
            onChange={(v) => set('IMAGE_STRETCH__MODE2_SHADOWS', v)} error={errors.IMAGE_STRETCH__MODE2_SHADOWS} />
          <TextField label="Mode2 midtones" value={fields.IMAGE_STRETCH__MODE2_MIDTONES}
            onChange={(v) => set('IMAGE_STRETCH__MODE2_MIDTONES', v)} error={errors.IMAGE_STRETCH__MODE2_MIDTONES}
            hint="<0.5 enhances midtones, >0.5 darkens." />
          <TextField label="Mode2 highlights" value={fields.IMAGE_STRETCH__MODE2_HIGHLIGHTS}
            onChange={(v) => set('IMAGE_STRETCH__MODE2_HIGHLIGHTS', v)} error={errors.IMAGE_STRETCH__MODE2_HIGHLIGHTS} />
          <TextField label="Mode3 black clip" value={fields.IMAGE_STRETCH__MODE3_BLACK_CLIP}
            onChange={(v) => set('IMAGE_STRETCH__MODE3_BLACK_CLIP', v)} error={errors.IMAGE_STRETCH__MODE3_BLACK_CLIP} />
          <TextField label="Mode3 shadows" value={fields.IMAGE_STRETCH__MODE3_SHADOWS}
            onChange={(v) => set('IMAGE_STRETCH__MODE3_SHADOWS', v)} error={errors.IMAGE_STRETCH__MODE3_SHADOWS} />
          <TextField label="Mode3 midtones" value={fields.IMAGE_STRETCH__MODE3_MIDTONES}
            onChange={(v) => set('IMAGE_STRETCH__MODE3_MIDTONES', v)} error={errors.IMAGE_STRETCH__MODE3_MIDTONES} />
          <TextField label="Mode3 highlights" value={fields.IMAGE_STRETCH__MODE3_HIGHLIGHTS}
            onChange={(v) => set('IMAGE_STRETCH__MODE3_HIGHLIGHTS', v)} error={errors.IMAGE_STRETCH__MODE3_HIGHLIGHTS} />
        </Grid>
      </Card>

      <Card title="Color & SCNR">
        <Grid>
          <SelectField label="Bayer pattern" value={fields.CFA_PATTERN}
            options={CFA_PATTERN_choices} onChange={(v) => set('CFA_PATTERN', v)} error={errors.CFA_PATTERN} />
          <SelectField label="SCNR (green reduction)" value={fields.SCNR_ALGORITHM}
            options={SCNR_ALGORITHM_choices} onChange={(v) => set('SCNR_ALGORITHM', v)} error={errors.SCNR_ALGORITHM} />
          <TextField label="SCNR MTF midtones" value={fields.SCNR_MTF_MIDTONES}
            onChange={(v) => set('SCNR_MTF_MIDTONES', v)} error={errors.SCNR_MTF_MIDTONES}
            hint="Range 0.5–1.0. 0.5 = no change." />
        </Grid>
      </Card>

      <Card title="Denoise">
        <Grid>
          <SelectField label="Denoise" value={fields.IMAGE_DENOISE}
            options={IMAGE_DENOISE_choices} onChange={(v) => set('IMAGE_DENOISE', v)} error={errors.IMAGE_DENOISE} />
          <TextField label="Denoise strength" value={fields.IMAGE_DENOISE_STRENGTH}
            onChange={(v) => set('IMAGE_DENOISE_STRENGTH', v)} error={errors.IMAGE_DENOISE_STRENGTH}
            disabled={denoiseDisabled} hint="Range 1–5." />
          <TextField label="Bilateral sigma color" value={fields.BILATERAL_SIGMA_COLOR}
            onChange={(v) => set('BILATERAL_SIGMA_COLOR', v)} error={errors.BILATERAL_SIGMA_COLOR}
            disabled={bilateralDisabled} />
          <TextField label="Bilateral sigma space" value={fields.BILATERAL_SIGMA_SPACE}
            onChange={(v) => set('BILATERAL_SIGMA_SPACE', v)} error={errors.BILATERAL_SIGMA_SPACE}
            disabled={bilateralDisabled} />
        </Grid>
      </Card>

      <Card title="White balance">
        <Grid>
          <TextField label="Red factor" value={fields.WBR_FACTOR}
            onChange={(v) => set('WBR_FACTOR', v)} error={errors.WBR_FACTOR} hint="1.0 = disabled." />
          <TextField label="Green factor" value={fields.WBG_FACTOR}
            onChange={(v) => set('WBG_FACTOR', v)} error={errors.WBG_FACTOR} />
          <TextField label="Blue factor" value={fields.WBB_FACTOR}
            onChange={(v) => set('WBB_FACTOR', v)} error={errors.WBB_FACTOR} />
          <TextField label="Red MTF midtones" value={fields.WBR_MTF_MIDTONES}
            onChange={(v) => set('WBR_MTF_MIDTONES', v)} error={errors.WBR_MTF_MIDTONES} />
          <TextField label="Green MTF midtones" value={fields.WBG_MTF_MIDTONES}
            onChange={(v) => set('WBG_MTF_MIDTONES', v)} error={errors.WBG_MTF_MIDTONES}
            hint="0.5 = no change." />
          <TextField label="Blue MTF midtones" value={fields.WBB_MTF_MIDTONES}
            onChange={(v) => set('WBB_MTF_MIDTONES', v)} error={errors.WBB_MTF_MIDTONES} />
          <BoolField label="Auto white balance" checked={fields.AUTO_WB}
            onChange={(v) => set('AUTO_WB', v)} hint="Applied after manual WB." />
        </Grid>
      </Card>

      <Card title="Tone & colormap">
        <Grid>
          <TextField label="Saturation factor" value={fields.SATURATION_FACTOR}
            onChange={(v) => set('SATURATION_FACTOR', v)} error={errors.SATURATION_FACTOR}
            hint="1.0 = disabled. 1.5 is a good start." />
          <TextField label="Gamma correction" value={fields.GAMMA_CORRECTION}
            onChange={(v) => set('GAMMA_CORRECTION', v)} error={errors.GAMMA_CORRECTION} hint="1.0 = disabled." />
          <TextField label="Sharpen amount" value={fields.SHARPEN_AMOUNT}
            onChange={(v) => set('SHARPEN_AMOUNT', v)} error={errors.SHARPEN_AMOUNT}
            hint="0.0 = disabled. Unsharp mask, max 2.0." />
          <SelectField label="Apply colormap" value={fields.IMAGE_COLORMAP}
            options={IMAGE_COLORMAP_choices} onChange={(v) => set('IMAGE_COLORMAP', v)} error={errors.IMAGE_COLORMAP} />
        </Grid>
      </Card>

      <Card title="Geometry">
        <Grid>
          <SelectField label="Rotate image" value={fields.IMAGE_ROTATE}
            options={IMAGE_ROTATE_choices} onChange={(v) => set('IMAGE_ROTATE', v)} error={errors.IMAGE_ROTATE} />
          <TextField label="Rotation angle" value={fields.IMAGE_ROTATE_ANGLE}
            onChange={(v) => set('IMAGE_ROTATE_ANGLE', v)} error={errors.IMAGE_ROTATE_ANGLE}
            hint="Arbitrary angle (0 = disabled)." />
          <BoolField label="Flip vertically" checked={fields.IMAGE_FLIP_V}
            onChange={(v) => set('IMAGE_FLIP_V', v)} />
          <BoolField label="Flip horizontally" checked={fields.IMAGE_FLIP_H}
            onChange={(v) => set('IMAGE_FLIP_H', v)} />
          <BoolField label="Crop to image circle" checked={fields.IMAGE_CROP_IMAGE_CIRCLE}
            onChange={(v) => set('IMAGE_CROP_IMAGE_CIRCLE', v)} />
        </Grid>
      </Card>

      <Card title="Border">
        <Grid>
          <TextField label="Top" value={fields.IMAGE_BORDER__TOP}
            onChange={(v) => set('IMAGE_BORDER__TOP', v)} error={errors.IMAGE_BORDER__TOP} />
          <TextField label="Left" value={fields.IMAGE_BORDER__LEFT}
            onChange={(v) => set('IMAGE_BORDER__LEFT', v)} error={errors.IMAGE_BORDER__LEFT} />
          <TextField label="Right" value={fields.IMAGE_BORDER__RIGHT}
            onChange={(v) => set('IMAGE_BORDER__RIGHT', v)} error={errors.IMAGE_BORDER__RIGHT} />
          <TextField label="Bottom" value={fields.IMAGE_BORDER__BOTTOM}
            onChange={(v) => set('IMAGE_BORDER__BOTTOM', v)} error={errors.IMAGE_BORDER__BOTTOM} />
          <TextField label="Color (r,g,b)" value={fields.IMAGE_BORDER__COLOR}
            onChange={(v) => set('IMAGE_BORDER__COLOR', v)} error={errors.IMAGE_BORDER__COLOR} />
        </Grid>
      </Card>

      <Card title="Stacking & alignment">
        <Grid>
          <SelectField label="Stack count" value={fields.IMAGE_STACK_COUNT}
            options={IMAGE_STACK_COUNT_choices} onChange={(v) => set('IMAGE_STACK_COUNT', v)} error={errors.IMAGE_STACK_COUNT} />
          <SelectField label="Stack method" value={fields.IMAGE_STACK_METHOD}
            options={IMAGE_STACK_METHOD_choices} onChange={(v) => set('IMAGE_STACK_METHOD', v)} error={errors.IMAGE_STACK_METHOD} />
          <BoolField label="Register images" checked={fields.IMAGE_STACK_ALIGN}
            onChange={(v) => set('IMAGE_STACK_ALIGN', v)} hint="Align images before stacking. Here be dragons." />
          <TextField label="Alignment sensitivity" value={fields.IMAGE_ALIGN_DETECTSIGMA}
            onChange={(v) => set('IMAGE_ALIGN_DETECTSIGMA', v)} error={errors.IMAGE_ALIGN_DETECTSIGMA} />
          <TextField label="Alignment points" value={fields.IMAGE_ALIGN_POINTS}
            onChange={(v) => set('IMAGE_ALIGN_POINTS', v)} error={errors.IMAGE_ALIGN_POINTS} />
          <TextField label="Minimum point area" value={fields.IMAGE_ALIGN_SOURCEMINAREA}
            onChange={(v) => set('IMAGE_ALIGN_SOURCEMINAREA', v)} error={errors.IMAGE_ALIGN_SOURCEMINAREA} />
        </Grid>
      </Card>

      <Card title="Fisheye → Panorama">
        <Grid>
          <BoolField label="Enable" checked={fields.FISH2PANO__ENABLE}
            onChange={(v) => set('FISH2PANO__ENABLE', v)} />
          <TextField label="Diameter (px)" value={fields.FISH2PANO__DIAMETER}
            onChange={(v) => set('FISH2PANO__DIAMETER', v)} error={errors.FISH2PANO__DIAMETER} />
          <TextField label="Rotation angle" value={fields.FISH2PANO__ROTATE_ANGLE}
            onChange={(v) => set('FISH2PANO__ROTATE_ANGLE', v)} error={errors.FISH2PANO__ROTATE_ANGLE}
            hint="Min -180, max 180." />
          <BoolField label="Flip horizontally" checked={fields.FISH2PANO__FLIP_H}
            onChange={(v) => set('FISH2PANO__FLIP_H', v)} />
          <TextField label="Scale" value={fields.FISH2PANO__SCALE}
            onChange={(v) => set('FISH2PANO__SCALE', v)} error={errors.FISH2PANO__SCALE}
            hint="Higher scale = longer processing." />
          <BoolField label="Cardinal directions" checked={fields.FISH2PANO__ENABLE_CARDINAL_DIRS}
            onChange={(v) => set('FISH2PANO__ENABLE_CARDINAL_DIRS', v)} />
          <TextField label="Dirs bottom offset" value={fields.FISH2PANO__DIRS_OFFSET_BOTTOM}
            onChange={(v) => set('FISH2PANO__DIRS_OFFSET_BOTTOM', v)} error={errors.FISH2PANO__DIRS_OFFSET_BOTTOM} />
          <TextField label="Font scale (opencv)" value={fields.FISH2PANO__OPENCV_FONT_SCALE}
            onChange={(v) => set('FISH2PANO__OPENCV_FONT_SCALE', v)} error={errors.FISH2PANO__OPENCV_FONT_SCALE} />
          <TextField label="Font size (pillow)" value={fields.FISH2PANO__PIL_FONT_SIZE}
            onChange={(v) => set('FISH2PANO__PIL_FONT_SIZE', v)} error={errors.FISH2PANO__PIL_FONT_SIZE} />
        </Grid>
      </Card>

      <Card title="Image circle mask">
        <Grid>
          <BoolField label="Enable" checked={fields.IMAGE_CIRCLE_MASK__ENABLE}
            onChange={(v) => set('IMAGE_CIRCLE_MASK__ENABLE', v)} />
          <TextField label="Diameter (px)" value={fields.IMAGE_CIRCLE_MASK__DIAMETER}
            onChange={(v) => set('IMAGE_CIRCLE_MASK__DIAMETER', v)} error={errors.IMAGE_CIRCLE_MASK__DIAMETER} />
          <TextField label="Blur" value={fields.IMAGE_CIRCLE_MASK__BLUR}
            onChange={(v) => set('IMAGE_CIRCLE_MASK__BLUR', v)} error={errors.IMAGE_CIRCLE_MASK__BLUR} />
          <TextField label="Opacity %" value={fields.IMAGE_CIRCLE_MASK__OPACITY}
            onChange={(v) => set('IMAGE_CIRCLE_MASK__OPACITY', v)} error={errors.IMAGE_CIRCLE_MASK__OPACITY} />
          <BoolField label="Outline" checked={fields.IMAGE_CIRCLE_MASK__OUTLINE}
            onChange={(v) => set('IMAGE_CIRCLE_MASK__OUTLINE', v)} hint="Sets opacity to 0%." />
        </Grid>
      </Card>

      <Card title="Labels">
        <Grid>
          <SelectField label="Label images" value={fields.IMAGE_LABEL_SYSTEM}
            options={IMAGE_LABEL_SYSTEM_choices} onChange={(v) => set('IMAGE_LABEL_SYSTEM', v)} error={errors.IMAGE_LABEL_SYSTEM} />
          <TextField label="Extra text file" value={fields.IMAGE_EXTRA_TEXT}
            onChange={(v) => set('IMAGE_EXTRA_TEXT', v)} error={errors.IMAGE_EXTRA_TEXT} />
        </Grid>
        <div className="pt-2">
          <TextareaField label="Label template" value={fields.IMAGE_LABEL_TEMPLATE}
            onChange={(v) => set('IMAGE_LABEL_TEMPLATE', v)} error={errors.IMAGE_LABEL_TEMPLATE} rows={6} />
        </div>
      </Card>

      <Card title="Lens / Location">
        <Grid>
          <TextField label="Image circle" value={fields.LENS_IMAGE_CIRCLE}
            onChange={(v) => set('LENS_IMAGE_CIRCLE', v)} error={errors.LENS_IMAGE_CIRCLE} />
          <TextField label="Lens X offset" value={fields.LENS_OFFSET_X}
            onChange={(v) => set('LENS_OFFSET_X', v)} error={errors.LENS_OFFSET_X} />
          <TextField label="Lens Y offset" value={fields.LENS_OFFSET_Y}
            onChange={(v) => set('LENS_OFFSET_Y', v)} error={errors.LENS_OFFSET_Y} />
          <TextField label="Azimuth" value={fields.LENS_AZIMUTH}
            onChange={(v) => set('LENS_AZIMUTH', v)} error={errors.LENS_AZIMUTH}
            hint="Affects cardinal directions." />
        </Grid>
      </Card>
    </div>
  );
}

/* ----------------------------- UI primitives ----------------------------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      <header className="px-4 py-2.5 bg-bg-2 border-b border-edge">
        <h2 className="text-ink-bright text-sm font-medium">{title}</h2>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">{children}</div>;
}

function Banner({ tone, children }: { tone: 'info' | 'warn' | 'danger'; children: React.ReactNode }) {
  const cls =
    tone === 'info' ? 'bg-info/10 border-info/30 text-info' :
    tone === 'warn' ? 'bg-warn/10 border-warn/30 text-warn' :
                      'bg-danger/10 border-danger/30 text-danger';
  return <div className={['px-3 py-2 rounded border text-xs mb-3', cls].join(' ')}>{children}</div>;
}

const inputBase =
  'w-full bg-bg-2 border rounded-md px-2.5 py-1.5 text-ink text-sm placeholder:text-ink-dim/60 ' +
  'focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function labelRow(label: string) {
  return <div className="text-[11px] uppercase tracking-wider font-medium text-ink-dim">{label}</div>;
}

function fieldHelp(hint?: string, error?: string[]) {
  return (
    <>
      {hint && <p className="text-[11px] text-ink-dim leading-snug mt-1">{hint}</p>}
      {error?.length ? <p className="text-[11px] text-danger leading-snug mt-1">{error.join(' · ')}</p> : null}
    </>
  );
}

function TextField({
  label, value, onChange, hint, error, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  hint?: string; error?: string[]; disabled?: boolean;
}) {
  return (
    <div>
      {labelRow(label)}
      <div className="mt-1.5">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={[inputBase, error?.length ? 'border-danger/60' : 'border-edge hover:border-edge-strong'].join(' ')}
        />
      </div>
      {fieldHelp(hint, error)}
    </div>
  );
}

function TextareaField({
  label, value, onChange, error, rows = 4,
}: {
  label: string; value: string; onChange: (v: string) => void; error?: string[]; rows?: number;
}) {
  return (
    <div>
      {labelRow(label)}
      <div className="mt-1.5">
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[inputBase, 'font-mono text-xs', error?.length ? 'border-danger/60' : 'border-edge hover:border-edge-strong'].join(' ')}
        />
      </div>
      {fieldHelp(undefined, error)}
    </div>
  );
}

function SelectField({
  label, value, options, onChange, hint, error,
}: {
  label: string; value: string; options: Choice[]; onChange: (v: string) => void;
  hint?: string; error?: string[];
}) {
  return (
    <div>
      {labelRow(label)}
      <div className="mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={[inputBase, error?.length ? 'border-danger/60' : 'border-edge hover:border-edge-strong'].join(' ')}
        >
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {fieldHelp(hint, error)}
    </div>
  );
}

function BoolField({
  label, checked, onChange, hint,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 min-h-[30px]">
        <span className="text-sm text-ink flex-1 min-w-0">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={[
            'relative inline-block h-5 w-9 rounded-full transition-colors shrink-0 cursor-pointer',
            checked ? 'bg-info' : 'bg-bg-3 ring-1 ring-inset ring-edge',
          ].join(' ')}
        >
          <span
            className={[
              'absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
      {hint && <p className="text-[11px] text-ink-dim leading-snug mt-1">{hint}</p>}
    </div>
  );
}
