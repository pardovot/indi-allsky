import { useEffect, useRef, useState } from 'react';
import PageShell from '@/components/PageShell';

interface Sensor {
  w: number;
  h: number;
  p: number; // pixel size in µm
}

interface Choice {
  value: string;
  label: string;
}

interface ChoiceGroup {
  group: string;
  options: Choice[];
}

// Lens image circle diameter (mm), keyed by lens value.
const LENS_ICD: Record<string, number> = {
  'zwo_f2.0_2.1mm_1-3': 6.7,
  'zwo_f1.2_2.5mm_1-2': 6.7,
  'fe185c046ha_f1.4_1.4mm_1-2': 4.6,
  'fe185c057ha_f1.4_1.8mm_2-3': 5.7,
  'arecont_f2.0_1.55mm_1-2': 4.8,
  'stardot_f1.5_1.55mm_1-2': 4.8,
  'm12_f2.1_0.76mm_1-3.2': 2.77,
  'm12_f2.0_1.44mm_1-2.5': 3.55,
  'm12_f2.0_1.56mm_1-2.5': 4.8,
  'm12_f2.0_1.7mm_1-2.5': 5.6,
  'm12_f2.2_1.71mm_1-3': 3.5,
  'm12_f2.4_1.8mm_1-4': 4.8,
  'm12_f2.0_1.8mm_1-2.5': 6.9,
  'm12_f2.0_1.85mm_1-1.8': 5.8,
  'm12_f2.0_2.1mm_1-2.7': 6.7,
  'fe185c086ha_f1.8_2.7mm_1': 8.6,
  'vm2.8ir10mp_f1.6_2.8mm_1-1.8': 9.0,
  'meike_f2.8_3.5mm_4-3': 12.5,
  'custom_f7_5.8mm_m42': 17.3,
  '7artisans_f2.8_4.0mm_4-3': 12.37,
  'laowa_f2.8_4.0mm_4-3': 13.4,
  'cil505_f2.2_4.9mm': 14.2,
  'cs-2.5ir_8mp_-f_f1.6_2.5mm_2-3': 6.4,
  'wgwk-3130-a1_m12_f1.8_1.91mm_1-2.3': 6.4,
  'sunex_dsl215_m12_f2.0_1.55mm_1-2': 4.7,
};

// Sensor dimensions, keyed by sensor value.
const SENSORS: Record<string, Sensor> = {
  imx477: { w: 4056, h: 3040, p: 1.55 },
  imx378: { w: 4056, h: 3040, p: 1.55 },
  imx708: { w: 4608, h: 2592, p: 1.4 },
  imx462: { w: 1920, h: 1080, p: 2.9 },
  imx290: { w: 1936, h: 1096, p: 2.9 },
  imx519: { w: 4656, h: 3496, p: 1.22 },
  ov5647: { w: 2592, h: 1944, p: 1.4 },
  imx219: { w: 3280, h: 2464, p: 1.12 },
  imx296: { w: 1456, h: 1088, p: 3.45 },
  ar0130: { w: 1280, h: 960, p: 3.75 },
  sc2210: { w: 1920, h: 1080, p: 4 },
  imx224: { w: 1304, h: 976, p: 3.75 },
  imx225: { w: 1304, h: 976, p: 3.75 },
  imx185: { w: 1944, h: 1224, p: 3.75 },
  imx385: { w: 1936, h: 1096, p: 3.75 },
  imx183: { w: 5472, h: 3648, p: 2.4 },
  imx533: { w: 3008, h: 3008, p: 3.76 },
  imx485: { w: 3840, h: 2160, p: 2.9 },
  imx585: { w: 3856, h: 2180, p: 2.9 },
  imx715: { w: 3864, h: 2192, p: 1.45 },
  mt9m034: { w: 1280, h: 960, p: 3.75 },
  mt9t001: { w: 2048, h: 1536, p: 3.2 },
  imx571: { w: 6248, h: 4176, p: 3.76 },
  imx455: { w: 9576, h: 6388, p: 3.76 },
  imx178: { w: 3096, h: 2080, p: 2.4 },
  imx676: { w: 3552, h: 3552, p: 2 },
  imx678: { w: 3840, h: 2160, p: 2 },
  imx482: { w: 1920, h: 1080, p: 5.8 },
  imx174: { w: 1936, h: 1216, p: 5.86 },
  imx432: { w: 1608, h: 1104, p: 9 },
  imx662: { w: 1920, h: 1080, p: 2.9 },
  imx294: { w: 4144, h: 2822, p: 4.63 },
  imx664: { w: 2704, h: 1540, p: 2.9 },
  imx464: { w: 2712, h: 1538, p: 2.9 },
  imx287: { w: 728, h: 544, p: 6.9 },
  imx307: { w: 1920, h: 1080, p: 2.9 },
  imx415: { w: 3864, h: 2160, p: 1.45 },
  imx415_sv205: { w: 3264, h: 2160, p: 1.45 },
  imx249: { w: 1936, h: 1216, p: 5.86 },
  imx429: { w: 1944, h: 1472, p: 4.5 },
  imx230: { w: 5344, h: 4016, p: 1.12 },
  ar0234: { w: 1920, h: 1200, p: 3 },
  icx825al: { w: 1392, h: 1040, p: 6.45 },
  icx205al: { w: 1392, h: 1040, p: 4.65 },
  icx267al: { w: 1392, h: 1040, p: 4.65 },
  imx327: { w: 1920, h: 1080, p: 2.9 },
  imx269: { w: 5280, h: 3956, p: 3.3 },
  imx410: { w: 6072, h: 4042, p: 5.94 },
  icx274al: { w: 1628, h: 1236, p: 4.4 },
  imx273: { w: 1456, h: 1088, p: 3.45 },
  imx252: { w: 2064, h: 1544, p: 3.45 },
  imx250: { w: 2464, h: 2056, p: 3.45 },
  imx265: { w: 2064, h: 1544, p: 3.45 },
  imx264: { w: 2464, h: 2056, p: 3.45 },
  imx304: { w: 4112, h: 3008, p: 3.45 },
  imx253: { w: 4112, h: 3008, p: 3.45 },
  imx682: { w: 9152, h: 6944, p: 0.8 },
  ov64a40: { w: 9152, h: 6944, p: 1.008 },
  imx283: { w: 5472, h: 3648, p: 2.4 },
  imx298: { w: 4640, h: 3472, p: 1.12 },
};

const SENSOR_GROUPS: ChoiceGroup[] = [
  {
    group: 'Small',
    options: [
      { value: 'imx219', label: 'IMX219 - 1/4" - Camera Module 2' },
      { value: 'imx415_sv205', label: 'SV205C - 1/2.8" (IMX415)' },
      { value: 'ov5647', label: 'OV5647 - 1/4" - Camera Module 1' },
    ],
  },
  {
    group: 'Medium - 6mm Class',
    options: [
      { value: 'ar0130', label: 'ASI120 - 1/3" - AR0130CS' },
      { value: 'imx224', label: 'IMX224 - 1/3"' },
      { value: 'imx225', label: 'IMX225 - 1/3"' },
      { value: 'imx273', label: 'IMX273 - 1/2.9"' },
      { value: 'imx287', label: 'IMX287 - 1/2.9"' },
      { value: 'imx290', label: 'IMX290 - 1/2.8"' },
      { value: 'imx296', label: 'IMX296 - 1/2.9" - Global Shutter' },
      { value: 'imx298', label: 'IMX298 - 1/2.8"' },
      { value: 'imx307', label: 'IMX307 - 1/2.8" - SV105C' },
      { value: 'imx327', label: 'IMX327 - 1/2.8"' },
      { value: 'imx415', label: 'IMX415 - 1/2.8"' },
      { value: 'imx462', label: 'IMX462 - 1/2.8"' },
      { value: 'imx662', label: 'IMX662 - 1/2.8"' },
      { value: 'imx715', label: 'IMX715 - 1/2.8"' },
      { value: 'mt9m034', label: 'QHY5LII - 1/3" - MT9M034' },
    ],
  },
  {
    group: 'Medium - 7mm Class',
    options: [
      { value: 'ar0234', label: 'AR0234 - 1/2.6" - Global Shutter' },
      { value: 'imx230', label: 'IMX230 - 1/2.4"' },
      { value: 'imx519', label: 'IMX519 - 1/2.53"' },
      { value: 'imx708', label: 'IMX708 - 1/2.43" - Camera Module 3' },
    ],
  },
  {
    group: 'Medium - 8mm Class',
    options: [
      { value: 'imx185', label: 'IMX185 - 1/1.9"' },
      { value: 'imx378', label: 'IMX378 - 1/2.3"' },
      { value: 'imx385', label: 'IMX385 - 1/1.9"' },
      { value: 'imx477', label: 'IMX477 - 1/2.3" - HQ Camera' },
      { value: 'icx205al', label: 'ICX205AL - 1/2" - SX Superstar' },
      { value: 'icx267al', label: 'ICX267AL - 1/2" - SX Oculus' },
      { value: 'mt9t001', label: 'MT9T001 - 1/2"' },
    ],
  },
  {
    group: 'Medium - 9mm Class',
    options: [
      { value: 'icx274al', label: 'ICX274AL - 1/1.8"' },
      { value: 'imx178', label: 'IMX178 - 1/1.8"' },
      { value: 'imx252', label: 'IMX252 - 1/1.8"' },
      { value: 'imx265', label: 'IMX265 - 1/1.8"' },
      { value: 'imx464', label: 'IMX464 - 1/1.8" - POA Neptune-C II' },
      { value: 'imx664', label: 'IMX664 - 1/1.8" - POA Neptune 664C' },
      { value: 'imx678', label: 'IMX678 - 1/1.8"' },
      { value: 'imx682', label: 'IMX682 - 1/1.7" - 64MP Hawkeye' },
      { value: 'sc2210', label: 'SC2210 - 1/1.8" - ASI220' },
    ],
  },
  {
    group: 'Medium - 10-13mm Class',
    options: [
      { value: 'ov64a40', label: 'OV64A40 - 1/1.32 - 64MP OwlSight' },
      { value: 'imx250', label: 'IMX250 - 2/3"' },
      { value: 'imx264', label: 'IMX264 - 2/3"' },
      { value: 'imx429', label: 'IMX429 - 2/3" - POA Apollo-M MINI' },
      { value: 'imx482', label: 'IMX482 - 1/1.2"' },
      { value: 'imx485', label: 'IMX485 - 1/1.2"' },
      { value: 'imx585', label: 'IMX585 - 1/1.2"' },
      { value: 'imx676', label: 'IMX676 - 1/1.6"' },
      { value: 'icx825al', label: 'ICX825AL - 2/3" - SX ULTRASTAR PRO' },
    ],
  },
  {
    group: 'Large',
    options: [
      { value: 'imx174', label: 'IMX174 - 1/1.2"' },
      { value: 'imx183', label: 'IMX183 - 1"' },
      { value: 'imx249', label: 'IMX249 - 1/1.2" - POA Xena-M' },
      { value: 'imx253', label: 'IMX253 - 1.1"' },
      { value: 'imx283', label: 'IMX283 - 1" - Arducam Klarity' },
      { value: 'imx304', label: 'IMX304 - 1.1"' },
      { value: 'imx432', label: 'IMX432 - 1.1"' },
      { value: 'imx533', label: 'IMX533 - 1"' },
    ],
  },
  {
    group: 'Extra Large',
    options: [
      { value: 'imx269', label: 'IMX269 - 4/3"' },
      { value: 'imx294', label: 'IMX294 - 4/3"' },
      { value: 'imx410', label: 'IMX410 - Full Frame - ASI2400' },
      { value: 'imx455', label: 'IMX455 - Full Frame - ASI6200' },
      { value: 'imx571', label: 'IMX571 - APS-C - ASI2600' },
    ],
  },
];

const LENS_GROUPS: ChoiceGroup[] = [
  {
    group: 'Small',
    options: [
      { value: 'm12_f2.1_0.76mm_1-3.2', label: 'M12 0.76mm ƒ/2.1 [M12] - 222° - 1/3.2" ∅2.77mm' },
      { value: 'm12_f2.2_1.71mm_1-3', label: 'M12 1.71mm ƒ/2.2 [M12] - 184° - 1/3" ∅3.5mm' },
      { value: 'm12_f2.0_1.44mm_1-2.5', label: 'M12 1.44mm ƒ/2.0 [M12] - 180° - 1/2.5" ∅3.55mm' },
    ],
  },
  {
    group: 'Medium',
    options: [
      { value: 'fe185c046ha_f1.4_1.4mm_1-2', label: 'Fujinon 1.4mm ƒ/1.4 [C/CS] - 185° - 1/2" ∅4.6mm' },
      { value: 'sunex_dsl215_m12_f2.0_1.55mm_1-2', label: 'Sunex DSL215 1.55mm ƒ/2.0 [M12] - 185° - 1/2" ∅4.7mm' },
      { value: 'arecont_f2.0_1.55mm_1-2', label: 'Arecont 1.55mm ƒ/2.0 [C/CS] - 180° - 1/2" ∅4.8mm' },
      { value: 'stardot_f1.5_1.55mm_1-2', label: 'Stardot 1.55mm ƒ/1.5 [C/CS] - 180° - 1/2" ∅4.8mm' },
      { value: 'm12_f2.4_1.8mm_1-4', label: 'M12 1.8mm ƒ/2.4 [M12] - 125° - 1/4" ∅4.8mm' },
      { value: 'm12_f2.0_1.56mm_1-2.5', label: 'M12 1.56mm ƒ/2.0 [M12] - 185° - 1/2.5" ∅4.8mm' },
      { value: 'm12_f2.0_1.7mm_1-2.5', label: 'M12 1.7mm ƒ/2.0 [M12] - 180° - 1/2.5" ∅5.6mm' },
      { value: 'fe185c057ha_f1.4_1.8mm_2-3', label: 'Fujinon 1.8mm ƒ/1.4 [C/CS] - 185° - 2/3" ∅5.7mm' },
      { value: 'm12_f2.0_1.85mm_1-1.8', label: 'M12 1.85mm ƒ/2.0 [M12] - 180° - 1/1.8" ∅5.8mm' },
      { value: 'wgwk-3130-a1_m12_f1.8_1.91mm_1-2.3', label: 'WGWK-3130 M12 1.91mm ƒ/1.8 [M12] - 185° - 1/2.3" ∅6.4mm' },
      { value: 'cs-2.5ir_8mp_-f_f1.6_2.5mm_2-3', label: 'CS-2.5IR(8MP)-F 2.5mm ƒ/1.6 [C/CS] - 190° - 2/3 ∅6.4mm' },
      { value: 'zwo_f2.0_2.1mm_1-3', label: 'ZWO 2.1mm ƒ/2.0 [C/CS] - 150° - 1/3" ∅6.7mm' },
      { value: 'zwo_f1.2_2.5mm_1-2', label: 'ZWO 2.5mm ƒ/1.2 [C/CS] - 170° - 1/2" ∅6.7mm' },
      { value: 'm12_f2.0_2.1mm_1-2.7', label: 'M12 2.1mm ƒ/2.0 [M12] - 170° - 1/2.7" ∅6.7mm' },
      { value: 'm12_f2.0_1.8mm_1-2.5', label: 'M12 1.8mm ƒ/2.0 [M12] - 180° - 1/2.5" ∅6.9mm' },
    ],
  },
  {
    group: 'Large',
    options: [
      { value: 'fe185c086ha_f1.8_2.7mm_1', label: 'Fujinon 2.7mm ƒ/1.8 [C/CS] - 185° - 1" ∅8.6mm' },
      { value: 'vm2.8ir10mp_f1.6_2.8mm_1-1.8', label: 'VM2.8IR10MP 2.8mm ƒ/1.6 [C/CS] - 190° - 1/1.8" ∅9.0mm' },
      { value: 'meike_f2.8_3.5mm_4-3', label: 'Meike 3.5mm ƒ/2.8 Fisheye [MFT] - 220° - 4/3" ∅12.5mm' },
      { value: '7artisans_f2.8_4.0mm_4-3', label: '7Artisans 4mm ƒ/2.8 Fisheye [Camera] - 225° - 4/3" ∅12.37mm' },
      { value: 'laowa_f2.8_4.0mm_4-3', label: 'Laowa 4mm ƒ/2.8 Fisheye - [Camera] 210° - 4/3 ∅13.4mm' },
      { value: 'cil505_f2.2_4.9mm', label: 'CIL505 4.9mm ƒ/2.2 Fisheye [C/CS] - 180° - ∅14.2mm' },
      { value: 'custom_f7_5.8mm_m42', label: 'Custom 5.8mm ƒ/7 [M42] - 174° - ∅17.3mm' },
    ],
  },
];

const DEFAULT_LENS = 'zwo_f1.2_2.5mm_1-2';
const DEFAULT_SENSOR = 'imx477';

const FOV_CIRCLES: [number, number][] = [
  [80, 87],
  [70, 80],
  [60, 69],
  [50, 57],
  [40, 45],
  [30, 33],
  [20, 21],
  [10, 10],
];

function pixels2mm(pixels: number, pixelUm: number): number {
  return pixels * (pixelUm / 1000);
}

function labelFor(groups: ChoiceGroup[], value: string): string {
  for (const g of groups) {
    for (const o of g.options) {
      if (o.value === value) return o.label;
    }
  }
  return value;
}

export default function CameraSimulator() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Camera Simulator</h1>
          {cameraId !== null && <Content />}
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const initLens = params.get('lens') && LENS_ICD[params.get('lens') as string] ? (params.get('lens') as string) : DEFAULT_LENS;
  const initSensor = params.get('sensor') && SENSORS[params.get('sensor') as string] ? (params.get('sensor') as string) : DEFAULT_SENSOR;

  const [lens, setLens] = useState(initLens);
  const [sensor, setSensor] = useState(initSensor);
  const [offsetX, setOffsetX] = useState(parseInt(params.get('offset_x') || '0', 10) || 0);
  const [offsetY, setOffsetY] = useState(parseInt(params.get('offset_y') || '0', 10) || 0);

  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    draw();
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens, sensor, offsetX, offsetY]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const sd = SENSORS[sensor];
    const icd = LENS_ICD[lens];
    if (!sd || icd === undefined) return;

    // All geometry values are in millimeters.
    const r = {
      w: pixels2mm(sd.w, sd.p),
      h: pixels2mm(sd.h, sd.p),
    };
    const cr = icd / 2;

    const offX = pixels2mm(offsetX, sd.p);
    const offY = pixels2mm(offsetY, sd.p);

    // Use the rendered width of the canvas as the fitting bound.
    const bound = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
    const ratio = bound / r.w;

    canvas.width = r.w * ratio;
    canvas.height = r.h * ratio;

    // sensor rectangle
    ctx.beginPath();
    ctx.fillStyle = '#000000';
    ctx.rect(0, 0, r.w * ratio, r.h * ratio);
    ctx.stroke();
    ctx.fill();

    // image circle
    ctx.beginPath();
    ctx.fillStyle = '#444444';
    ctx.globalCompositeOperation = 'source-atop';
    ctx.arc(((r.w / 2) + offX) * ratio, ((r.h / 2) - offY) * ratio, cr * ratio, 0, 2 * Math.PI, false);
    ctx.stroke();
    ctx.fill();

    ctx.font = '20px serif';
    ctx.textAlign = 'center';

    FOV_CIRCLES.forEach((item) => {
      ctx.beginPath();
      ctx.fillStyle = '#333333';
      ctx.arc(
        ((r.w / 2) + offX) * ratio,
        ((r.h / 2) - offY) * ratio,
        (cr * ((10 / 9) * (item[1] / 100))) * ratio,
        0,
        2 * Math.PI,
        false,
      );
      ctx.stroke();

      ctx.strokeText(
        item[0] * 2 + '°',
        ((r.w / 2) - (cr * ((10 / 9) * (item[1] / 100))) + offX) * ratio + 20,
        ((r.h / 2) - offY) * ratio,
      );
      ctx.strokeText(
        item[0] * 2 + '°',
        ((r.w / 2) + offX) * ratio,
        ((r.h / 2) - (cr * ((10 / 9) * (item[1] / 100))) - offY) * ratio + 20,
      );
    });

    ctx.lineWidth = 10;
    ctx.font = '20px serif';
    ctx.lineJoin = 'round';

    const lensText = labelFor(LENS_GROUPS, lens);
    const cameraText = labelFor(SENSOR_GROUPS, sensor);
    const resolutionText = sd.w + ' x ' + sd.h + ' (' + sd.p + 'µm)';
    const sizeText = r.w.toFixed(2) + ' x ' + r.h.toFixed(2) + 'mm';
    const diagText = Math.sqrt(r.w ** 2 + r.h ** 2).toFixed(2) + 'mm diag';
    const imgCText = ((icd / sd.p) * 1000).toFixed(0) + 'px circle';
    const offsetText = offX.toFixed(2) + ' x ' + offY.toFixed(2) + 'mm offset';

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'lightgrey';

    ctx.textAlign = 'left';
    ctx.strokeText(lensText, 25, 40, 500);
    ctx.strokeText(cameraText, 25, 70, 500);
    ctx.fillText(lensText, 25, 40, 500);
    ctx.fillText(cameraText, 25, 70, 500);

    const xText = r.w * ratio - 25;
    const yText = r.h * ratio - 180;
    const maxWidth = 200;

    ctx.textAlign = 'right';
    ctx.strokeText(resolutionText, xText, 40, maxWidth);
    ctx.strokeText(sizeText, xText, 70, maxWidth);
    ctx.strokeText(diagText, xText, 100, maxWidth);
    ctx.fillText(resolutionText, xText, 40, maxWidth);
    ctx.fillText(sizeText, xText, 70, maxWidth);
    ctx.fillText(diagText, xText, 100, maxWidth);

    ctx.strokeText(imgCText, xText, yText + 130, maxWidth);
    ctx.strokeText(offsetText, xText, yText + 160, maxWidth);
    ctx.fillText(imgCText, xText, yText + 130, maxWidth);
    ctx.fillText(offsetText, xText, yText + 160, maxWidth);

    ctx.globalCompositeOperation = 'source-over';
  }

  function copyPermalink() {
    const base = window.location.origin + window.location.pathname;
    const url = `${base}?lens=${encodeURIComponent(lens)}&sensor=${encodeURIComponent(sensor)}&offset_x=${offsetX}&offset_y=${offsetY}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4 bg-bg-1 border border-edge rounded-lg p-4">
        <SelectField label="Lens" value={lens} onChange={setLens} groups={LENS_GROUPS} />
        <SelectField label="Sensor" value={sensor} onChange={setSensor} groups={SENSOR_GROUPS} />
        <NumberField label="X Offset" value={offsetX} step={25} onChange={setOffsetX} />
        <NumberField label="Y Offset" value={offsetY} step={25} onChange={setOffsetY} />
      </div>

      <p className="text-[11px] text-ink-dim text-center">
        Only simulates the image circle. Field of View is dependant on lens. Field of View circles are approximate.
      </p>

      <div className="flex justify-center">
        <canvas ref={canvasRef} className="w-3/4 max-w-full bg-bg-1 border border-edge rounded" />
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={copyPermalink}
          className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-info text-sm"
        >
          {copied ? 'Copied!' : 'Copy Permalink to Clipboard'}
        </button>
      </div>
    </div>
  );
}

function SelectField({
  label, value, onChange, groups,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  groups: ChoiceGroup[];
}) {
  return (
    <div className="space-y-1 min-w-[16rem]">
      <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2 py-1.5 rounded-md bg-bg-2 border border-edge text-ink text-sm"
      >
        {groups.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  label, value, step, onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1 w-24">
      <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || 0)}
        className="w-full px-2 py-1.5 rounded-md bg-bg-2 border border-edge text-ink text-sm"
      />
    </div>
  );
}
