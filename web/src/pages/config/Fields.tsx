import { useId } from 'react';
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
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
}

export function FieldRenderer({ field, config, errors, onChange, disabled }: FieldRendererProps) {
  const key = pathToString(field.path);
  const err = errors[key];
  const id = useId();
  const value = getPath(config, field.path);

  const label = (
    <label htmlFor={id} className="text-[11px] uppercase tracking-wider text-ink-dim">
      {field.label}
    </label>
  );

  const helpAndError = (
    <>
      {field.help && <div className="text-[11px] text-ink-dim mt-1">{field.help}</div>}
      {err?.length ? (
        <div className="text-[11px] text-danger mt-1">{err.join(' · ')}</div>
      ) : null}
    </>
  );

  switch (field.kind) {
    case 'text':
      return (
        <div className="space-y-1">
          {label}
          <TextInput
            id={id}
            field={field}
            value={typeof value === 'string' ? value : (value == null ? '' : String(value))}
            disabled={disabled || field.readonly}
            onChange={(v) => onChange(field.path, v)}
            invalid={!!err?.length}
          />
          {helpAndError}
        </div>
      );
    case 'textarea':
      return (
        <div className="space-y-1">
          {label}
          <TextareaInput
            id={id}
            field={field}
            value={typeof value === 'string' ? value : (value == null ? '' : String(value))}
            disabled={disabled || field.readonly}
            onChange={(v) => onChange(field.path, v)}
            invalid={!!err?.length}
          />
          {helpAndError}
        </div>
      );
    case 'number':
      return (
        <div className="space-y-1">
          {label}
          <NumberInput
            id={id}
            field={field}
            value={value as number | string | undefined}
            disabled={disabled || field.readonly}
            onChange={(v) => onChange(field.path, v)}
            invalid={!!err?.length}
          />
          {helpAndError}
        </div>
      );
    case 'bool':
      return (
        <div className="space-y-1">
          <BoolInput
            id={id}
            field={field}
            value={!!value}
            disabled={disabled || field.readonly}
            onChange={(v) => onChange(field.path, v)}
          />
          {helpAndError}
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1">
          {label}
          <SelectInput
            id={id}
            field={field}
            value={value == null ? '' : String(value)}
            disabled={disabled || field.readonly}
            onChange={(v) => onChange(field.path, v)}
            invalid={!!err?.length}
          />
          {helpAndError}
        </div>
      );
  }
}

// ── inputs ────────────────────────────────────────────────────────────────

const inputBase =
  'w-full bg-bg-2 border rounded-md px-2 py-1.5 text-ink text-sm placeholder:text-ink-dim/60 ' +
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

function BoolInput({
  id, field, value, disabled, onChange,
}: {
  id: string; field: BoolField; value: boolean;
  disabled?: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className={['inline-flex items-center gap-2', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'].join(' ')}>
      <span
        role="switch"
        aria-checked={value}
        aria-disabled={disabled}
        onClick={(e) => { e.preventDefault(); if (!disabled) onChange(!value); }}
        className={[
          'relative inline-block h-4 w-7 rounded-full transition-colors flex-shrink-0',
          value ? 'bg-info' : 'bg-bg-3 border border-edge',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform shadow',
            value ? 'translate-x-3.5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </span>
      <span className="text-sm text-ink select-none">{field.label}</span>
      <input id={id} type="checkbox" className="sr-only" checked={value} readOnly />
    </label>
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

// ── group + section ───────────────────────────────────────────────────────

export function GroupSection({
  group, config, errors, onChange, disabled,
}: {
  group: FieldGroup;
  config: unknown;
  errors: Record<string, string[]>;
  onChange: (path: FieldPath, value: unknown) => void;
  disabled?: boolean;
}) {
  return (
    <section className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
      {(group.title || group.description) && (
        <header className="px-4 py-2.5 bg-bg-2 border-b border-edge">
          {group.title && <h2 className="text-ink-bright text-sm font-medium">{group.title}</h2>}
          {group.description && <p className="text-[11px] text-ink-dim mt-0.5">{group.description}</p>}
        </header>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 p-4">
        {group.fields.map((f) => (
          <FieldRenderer
            key={pathToString(f.path)}
            field={f}
            config={config}
            errors={errors}
            onChange={onChange}
            disabled={disabled}
          />
        ))}
      </div>
    </section>
  );
}
