import { ReactNode, useId } from 'react';
import type {
  BoolField,
  Field,
  FieldGroup,
  FieldPath,
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from './types';
import { getPath, pathToString } from './types';

interface FieldRendererProps {
  field: Field;
  config: unknown;
  defaults?: unknown;
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
}

export function FieldRenderer({
  field, config, defaults, errors, onChange, disabled,
}: FieldRendererProps) {
  const key = pathToString(field.path);
  const err = errors[key];
  const id = useId();
  const value = getPath(config, field.path);
  const defaultValue = defaults === undefined ? undefined : getPath(defaults, field.path);
  const hasDefault = defaults !== undefined && defaultValue !== undefined;
  const isModified = hasDefault && !jsonEqualLoose(value, defaultValue);
  const showReset = isModified && !disabled && !field.readonly;
  const resetTitle = showReset ? `Reset to default: ${formatDefaultPreview(defaultValue)}` : '';
  const onReset = () => onChange(field.path, defaultValue);

  if (field.kind === 'bool') {
    return (
      <FieldShell>
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor={id}
            className={[
              'text-sm flex-1 min-w-0 cursor-pointer',
              isModified ? 'text-warn' : 'text-ink',
            ].join(' ')}
          >
            {field.label}
          </label>
          <div className="flex items-center gap-3 shrink-0">
            {showReset && <ResetChip title={resetTitle} onClick={onReset} />}
            <BoolSwitch
              id={id}
              value={!!value}
              disabled={disabled || field.readonly}
              onChange={(v) => onChange(field.path, v)}
            />
          </div>
        </div>
        {field.help && (
          <p className="text-[11px] text-ink-dim leading-snug mt-1">{field.help}</p>
        )}
      </FieldShell>
    );
  }

  const labelRow = (
    <div className="flex items-baseline justify-between gap-2 min-h-[14px]">
      <label
        htmlFor={id}
        className={[
          'text-[11px] uppercase tracking-wider font-medium',
          isModified ? 'text-warn' : 'text-ink-dim',
        ].join(' ')}
      >
        {field.label}
      </label>
      {showReset && <ResetChip title={resetTitle} onClick={onReset} />}
    </div>
  );

  const help = (
    <>
      {field.help && <p className="text-[11px] text-ink-dim leading-snug mt-1">{field.help}</p>}
      {err?.length ? <p className="text-[11px] text-danger leading-snug mt-1">{err.join(' · ')}</p> : null}
    </>
  );

  let control: ReactNode;
  switch (field.kind) {
    case 'text':
      control = (
        <TextInput
          id={id} field={field}
          value={typeof value === 'string' ? value : (value == null ? '' : String(value))}
          disabled={disabled || field.readonly}
          onChange={(v) => onChange(field.path, v)}
          invalid={!!err?.length}
        />
      );
      break;
    case 'textarea':
      control = (
        <TextareaInput
          id={id} field={field}
          value={typeof value === 'string' ? value : (value == null ? '' : String(value))}
          disabled={disabled || field.readonly}
          onChange={(v) => onChange(field.path, v)}
          invalid={!!err?.length}
        />
      );
      break;
    case 'number':
      control = (
        <NumberInput
          id={id} field={field}
          value={value as number | string | undefined}
          disabled={disabled || field.readonly}
          onChange={(v) => onChange(field.path, v)}
          invalid={!!err?.length}
        />
      );
      break;
    case 'select':
      control = (
        <SelectInput
          id={id} field={field}
          value={value == null ? '' : String(value)}
          disabled={disabled || field.readonly}
          onChange={(v) => onChange(field.path, v)}
          invalid={!!err?.length}
        />
      );
      break;
  }

  return (
    <FieldShell>
      {labelRow}
      <div className="mt-1.5">{control}</div>
      {help}
    </FieldShell>
  );
}

/**
 * Each field becomes one grid row. The shell carries the vertical padding
 * + min-height so paired sections line up cleanly under subgrid.
 */
function FieldShell({ children }: { children: ReactNode }) {
  return <div className="py-2">{children}</div>;
}

function ResetChip({ title, onClick }: { title: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label="Reset to default"
      className="shrink-0 text-[10px] text-warn/80 hover:text-warn flex items-center gap-1 transition-colors"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
      </svg>
      reset
    </button>
  );
}

const inputBase =
  'w-full bg-bg-2 border rounded-md px-2.5 py-1.5 text-ink text-sm placeholder:text-ink-dim/60 ' +
  'focus:outline-none focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

function fieldClasses(invalid: boolean): string {
  return [inputBase, invalid ? 'border-danger/60' : 'border-edge hover:border-edge-strong'].join(' ');
}

function TextInput({
  id, field, value, disabled, onChange, invalid,
}: {
  id: string; field: TextField; value: string;
  disabled?: boolean; onChange: (v: string) => void; invalid: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClasses(invalid)}
    />
  );
}

function TextareaInput({
  id, field, value, disabled, onChange, invalid,
}: {
  id: string; field: TextareaField; value: string;
  disabled?: boolean; onChange: (v: string) => void; invalid: boolean;
}) {
  return (
    <textarea
      id={id}
      rows={field.rows ?? 4}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={[fieldClasses(invalid), field.monospace ? 'font-mono text-xs' : ''].join(' ')}
    />
  );
}

function NumberInput({
  id, field, value, disabled, onChange, invalid,
}: {
  id: string; field: NumberField; value: number | string | undefined;
  disabled?: boolean; onChange: (v: number | null) => void; invalid: boolean;
}) {
  const display = value == null || value === '' ? '' : String(value);
  // No extra right padding: padding-right pushes the native spinner inward,
  // which would land it left of the reset glyph. Keep the spinner at the edge
  // and park the reset just to its left instead.
  return (
    <input
      id={id}
      type="number"
      inputMode={field.numeric === 'int' ? 'numeric' : 'decimal'}
      value={display}
      min={field.min}
      max={field.max}
      step={field.step ?? (field.numeric === 'int' ? 1 : 'any')}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') { onChange(null); return; }
        const n = field.numeric === 'int' ? parseInt(raw, 10) : parseFloat(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={[fieldClasses(invalid), 'font-mono'].join(' ')}
    />
  );
}

function BoolSwitch({
  id, value, disabled, onChange,
}: {
  id: string; value: boolean;
  disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-disabled={disabled}
        onClick={() => { if (!disabled) onChange(!value); }}
        className={[
          'relative inline-block h-5 w-9 rounded-full transition-colors shrink-0',
          value ? 'bg-info' : 'bg-bg-3 ring-1 ring-inset ring-edge',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ].join(' ')}
      >
        <span
          className={[
            'absolute left-0.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow transition-transform',
            value ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      <input id={id} type="checkbox" className="sr-only" checked={value} readOnly />
    </>
  );
}

function SelectInput({
  id, field, value, disabled, onChange, invalid,
}: {
  id: string; field: SelectField; value: string;
  disabled?: boolean; onChange: (v: string) => void; invalid: boolean;
}) {
  const grouped: Record<string, typeof field.options> = {};
  let hasGroups = false;
  for (const o of field.options) {
    const g = o.group ?? '';
    if (g) hasGroups = true;
    (grouped[g] ||= []).push(o);
  }
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClasses(invalid)}
    >
      {hasGroups
        ? Object.entries(grouped).map(([g, opts]) =>
            g ? (
              <optgroup key={g} label={g}>
                {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </optgroup>
            ) : opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
          )
        : field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/**
 * Renders a pair of sections side-by-side so corresponding field rows share
 * the same height (CSS subgrid). On narrow screens the sections stack.
 */
export function SectionPair({
  groups, config, defaults, errors, onChange, disabled,
}: {
  groups: [FieldGroup] | [FieldGroup, FieldGroup];
  config: unknown;
  defaults?: unknown;
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
}) {
  if (groups.length === 1) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <SectionCard
          group={groups[0]} config={config} defaults={defaults}
          errors={errors} onChange={onChange} disabled={disabled}
        />
      </div>
    );
  }

  const [left, right] = groups;
  const rowCount = 1 + Math.max(left.fields.length, right.fields.length); // header row + field rows
  const rowSpan = `span ${rowCount}`;

  return (
    <div
      className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-4 lg:gap-y-0"
      style={{ gridTemplateRows: `repeat(${rowCount}, min-content)` }}
    >
      <SectionCard
        group={left} config={config} defaults={defaults}
        errors={errors} onChange={onChange} disabled={disabled}
        subgridRowSpan={rowSpan}
      />
      <SectionCard
        group={right} config={config} defaults={defaults}
        errors={errors} onChange={onChange} disabled={disabled}
        subgridRowSpan={rowSpan}
      />
    </div>
  );
}

function SectionCard({
  group, config, defaults, errors, onChange, disabled, subgridRowSpan,
}: {
  group: FieldGroup;
  config: unknown;
  defaults?: unknown;
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
  subgridRowSpan?: string;
}) {
  const subgrid = !!subgridRowSpan;
  return (
    <section
      className={[
        'bg-bg-1 border border-edge rounded-lg overflow-hidden',
        subgrid ? 'lg:grid lg:grid-rows-subgrid' : 'flex flex-col',
      ].join(' ')}
      style={subgrid ? { gridRow: subgridRowSpan } : undefined}
    >
      <header className="px-4 py-2.5 bg-bg-2 border-b border-edge">
        {group.title && <h2 className="text-ink-bright text-sm font-medium">{group.title}</h2>}
        {group.description && <p className="text-[11px] text-ink-dim mt-0.5">{group.description}</p>}
      </header>
      {/* Field rows. In subgrid mode each row participates in the outer pair's row grid. */}
      {group.fields.map((f, i) => (
        <div
          key={pathToString(f.path)}
          className={[
            'px-4',
            i === group.fields.length - 1 ? 'pb-3' : '',
            i === 0 ? 'pt-2' : '',
          ].join(' ')}
        >
          <FieldRenderer
            field={f}
            config={config}
            defaults={defaults}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
          />
        </div>
      ))}
    </section>
  );
}

/** Backwards-compat: existing callers that render groups individually. */
export function GroupSection(props: {
  group: FieldGroup;
  config: unknown;
  defaults?: unknown;
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
}) {
  return <SectionCard {...props} />;
}

function formatDefaultPreview(v: unknown): string {
  if (v == null) return '∅';
  if (typeof v === 'boolean') return v ? 'on' : 'off';
  if (typeof v === 'string') return v.length > 30 ? v.slice(0, 30) + '…' : v || '""';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v).slice(0, 30);
}

function jsonEqualLoose(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}
