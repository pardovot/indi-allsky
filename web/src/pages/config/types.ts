/**
 * Field-schema types for the Config editor.
 *
 * Each tab declares a list of `Field`s. The generic renderer in `Fields.tsx`
 * reads/writes nested paths inside the config object via `getPath`/`setPath`
 * helpers (e.g., path `["LOCATION_LATITUDE"]` or `["DEW_HEATER", "LEVEL_DEF"]`).
 */

export type FieldPath = (string | number)[];

export interface BaseField {
  /** Nested path into the config object */
  path: FieldPath;
  label: string;
  /** Per-field help text shown under the input */
  help?: string;
  /** Field is shown read-only */
  readonly?: boolean;
}

export interface TextField extends BaseField {
  kind: 'text';
  placeholder?: string;
  maxLength?: number;
}

export interface TextareaField extends BaseField {
  kind: 'textarea';
  rows?: number;
  monospace?: boolean;
}

export interface NumberField extends BaseField {
  kind: 'number';
  min?: number;
  max?: number;
  step?: number;
  /** 'int' coerces on save; 'float' preserves decimals */
  numeric: 'int' | 'float';
  /** Number of decimals to display (float only) */
  decimals?: number;
}

export interface BoolField extends BaseField {
  kind: 'bool';
}

export interface SelectField extends BaseField {
  kind: 'select';
  options: { value: string; label: string; group?: string }[];
  /** Coerce selected string value to int/float at save time */
  coerce?: 'int' | 'float' | 'string';
}

export type Field = TextField | TextareaField | NumberField | BoolField | SelectField;

export interface FieldGroup {
  title?: string;
  description?: string;
  fields: Field[];
}

export interface TabSchema {
  /** Stable id; matches URL segment under /config/<id> */
  id: string;
  label: string;
  /** Tone hint used to colour the sub-nav button */
  tone?: 'danger' | 'light' | 'success' | 'secondary' | 'primary' | 'info' | 'warning';
  /** Each tab is rendered as a stack of FieldGroups */
  groups: FieldGroup[];
  /** Free-form description rendered at top of tab */
  intro?: string;
}

/**
 * Registry entry for a config tab. `done: false` entries render a stub that
 * links out to the unported editor rather than an empty form.
 */
export interface TabRegistryEntry {
  id: string;
  label: string;
  tone?: TabSchema['tone'];
  /** True if a real schema has been authored. Stubs render a placeholder. */
  done: boolean;
}

export const TAB_REGISTRY: TabRegistryEntry[] = [
  { id: 'camera',       label: 'Camera',             tone: 'danger',    done: true  },
  { id: 'image',        label: 'Image',              tone: 'light',     done: true  },
  { id: 'processing',   label: 'Processing',         tone: 'success',   done: true  },
  { id: 'overlays',     label: 'Overlays',           tone: 'secondary', done: true  },
  { id: 'timelapse',    label: 'Timelapse',          tone: 'primary',   done: true  },
  { id: 'location',     label: 'Location',           tone: 'info',      done: true  },
  { id: 'admin',        label: 'Admin',              tone: 'warning',   done: true  },
  { id: 'filetransfer', label: 'File Transfer',      tone: 'primary',   done: true  },
  { id: 'mqtt',         label: 'MQTT',               tone: 'info',      done: true  },
  { id: 'youtube',      label: 'YouTube',            tone: 'danger',    done: true  },
  { id: 's3',           label: 'Object Storage',     tone: 'secondary', done: true  },
  { id: 'syncapi',      label: 'SyncAPI',            tone: 'light',     done: true  },
  { id: 'sensors',      label: 'Sensors',            tone: 'primary',   done: true  },
  { id: 'devices',      label: 'Devices',            tone: 'danger',    done: true  },
  { id: 'adsb',         label: 'ADS-B',              tone: 'secondary', done: true  },
  { id: 'sattrack',     label: 'Satellite Tracking', tone: 'light',     done: true  },
];

// ── path helpers ──────────────────────────────────────────────────────────

export function getPath(obj: unknown, path: FieldPath): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

/**
 * Immutable set: returns a new object with `value` written at `path`.
 * Creates missing intermediate objects as needed.
 */
export function setPath<T>(obj: T, path: FieldPath, value: unknown): T {
  if (path.length === 0) return value as T;
  const cloneContainer = (v: unknown, childKey: string | number): unknown[] | Record<string | number, unknown> => {
    if (Array.isArray(v)) return [...v];
    if (v && typeof v === 'object') return { ...(v as Record<string | number, unknown>) };
    return typeof childKey === 'number' ? [] : {};
  };
  const root = cloneContainer(obj, path[0]) as Record<string | number, unknown>;
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    const next = cloneContainer(cur[k], path[i + 1]) as Record<string | number, unknown>;
    cur[k] = next;
    cur = next;
  }
  cur[path[path.length - 1]] = value;
  return root as T;
}

export function pathToString(p: FieldPath): string {
  return p.join('.');
}

export interface Change {
  path: FieldPath;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Recursively diff two config dicts. Yields one Change per primitive/array
 * leaf that differs, plus one for nested objects that exist on only one side.
 */
export function findChanges(
  before: unknown,
  after: unknown,
  prefix: FieldPath = [],
): Change[] {
  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([
      ...Object.keys(before as Record<string, unknown>),
      ...Object.keys(after as Record<string, unknown>),
    ]);
    const out: Change[] = [];
    for (const k of keys) {
      out.push(
        ...findChanges(
          (before as Record<string, unknown>)[k],
          (after  as Record<string, unknown>)[k],
          [...prefix, k],
        ),
      );
    }
    return out;
  }
  if (jsonEqual(before, after)) return [];
  return [{ path: prefix, oldValue: before, newValue: after }];
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function pathStartsWith(path: FieldPath, prefix: FieldPath): boolean {
  if (path.length < prefix.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (path[i] !== prefix[i]) return false;
  }
  return true;
}

export function collectTabPaths(schema: TabSchema | undefined): FieldPath[] {
  if (!schema) return [];
  const out: FieldPath[] = [];
  for (const g of schema.groups) for (const f of g.fields) out.push(f.path);
  return out;
}

function jsonEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
