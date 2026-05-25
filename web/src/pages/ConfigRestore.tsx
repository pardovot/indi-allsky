import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { auth } from '@/lib/auth';
import PageShell from '@/components/PageShell';

const API_BASE = '/indi-allsky/api/v2';

type FieldErrors = Record<string, string[]>;

export default function ConfigRestore() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4 max-w-3xl">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Config Restore</h1>
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Content() {
  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [flushConfigs, setFlushConfigs] = useState(false);
  const [resetKeys, setResetKeys] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors | null>(null);

  const reset = () => {
    if (fileRef.current) fileRef.current.value = '';
    setFilename('');
    setFlushConfigs(false);
    setResetKeys(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors(null);
    setSuccess(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErrors({ CONFIG_UPLOAD: ['File required'] });
      return;
    }

    const fd = new FormData();
    fd.append('CONFIG_UPLOAD', file);
    fd.append('FLUSH_CONFIGS', flushConfigs ? '1' : '');
    fd.append('RESET_KEYS', resetKeys ? '1' : '');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/config-restore`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
        headers: auth.token ? { Authorization: `Bearer ${auth.token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data && typeof data === 'object') setErrors(data as FieldErrors);
        else setErrors({ form_global: [`${res.status} ${res.statusText}`] });
        return;
      }
      setSuccess((data as { 'success-message'?: string })['success-message'] || 'Restored Config');
      reset();
      // If keys were reset, the session is invalidated → kick to login soon.
      if (resetKeys) {
        setTimeout(() => {
          auth.clear();
          window.location.href = '/login';
        }, 2000);
      }
    } catch (err) {
      setErrors({
        form_global: [err instanceof ApiError ? err.message : (err instanceof Error ? err.message : 'Restore failed')],
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Banner tone="danger">
        <strong className="font-semibold">Warning:</strong> Restoring a configuration will completely overwrite your existing configuration.
        Older configurations remain available unless you flush previous configs.
      </Banner>

      {!isAdmin && (
        <Banner tone="warn">Admin privileges required to restore.</Banner>
      )}

      <div>
        <Link to="/config-history" className="text-xs text-info hover:underline">
          ← Config History
        </Link>
      </div>

      <form onSubmit={onSubmit} autoComplete="off" className="space-y-4">
        <Field
          label="Config file"
          hint="A JSON config previously downloaded from indi-allsky."
          error={errors?.CONFIG_UPLOAD}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!isAdmin || submitting}
              onClick={() => fileRef.current?.click()}
              className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >Choose file</button>
            <span className={['text-xs', filename ? 'text-ink' : 'text-ink-dim'].join(' ')}>
              {filename || 'No file selected'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => setFilename(e.target.files?.[0]?.name ?? '')}
            />
          </div>
        </Field>

        <Toggle
          label="Flush previous configs"
          hint="Remove all previous configurations after restore."
          checked={flushConfigs}
          onChange={setFlushConfigs}
          disabled={!isAdmin || submitting}
          error={errors?.FLUSH_CONFIGS}
        />

        <Toggle
          label="Reset security keys"
          hint={
            <>
              <span className="text-warn">Warning:</span> Deletes and recreates Flask security keys.
              Your session will be invalidated and you will be forced to re-login.
            </>
          }
          checked={resetKeys}
          onChange={setResetKeys}
          disabled={!isAdmin || submitting}
          tone="warn"
          error={errors?.RESET_KEYS}
        />

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={!isAdmin || submitting || !filename}
            className={[
              'px-4 py-1.5 rounded-md border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              'bg-danger/15 hover:bg-danger/25 border-danger/40 text-danger',
            ].join(' ')}
          >
            {submitting ? 'Restoring…' : 'Restore'}
          </button>
          {success && (
            <span className="text-info text-xs">{success}</span>
          )}
        </div>

        {errors?.form_global && (
          <Banner tone="danger">
            {errors.form_global.map((m, i) => <div key={i}>{m}</div>)}
          </Banner>
        )}
      </form>
    </div>
  );
}

function Banner({ tone, children }: { tone: 'info' | 'warn' | 'danger'; children: React.ReactNode }) {
  const cls =
    tone === 'info'   ? 'bg-info/10   border-info/30   text-info'   :
    tone === 'warn'   ? 'bg-warn/10   border-warn/30   text-warn'   :
                        'bg-danger/10 border-danger/30 text-danger';
  return (
    <div className={['px-3 py-2 rounded border text-xs', cls].join(' ')}>{children}</div>
  );
}

function Field({
  label, hint, error, children,
}: { label: string; hint?: React.ReactNode; error?: string[]; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-ink-dim">{label}</div>
      {children}
      {hint && <div className="text-[11px] text-ink-dim">{hint}</div>}
      {error?.length ? (
        <div className="text-[11px] text-danger">{error.join(' · ')}</div>
      ) : null}
    </div>
  );
}

function Toggle({
  label, hint, checked, onChange, disabled, error, tone = 'info',
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  error?: string[];
  tone?: 'info' | 'warn';
}) {
  const accent = tone === 'warn' ? 'accent-warn' : 'accent-info';
  return (
    <div className="space-y-1">
      <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className={accent}
        />
        <span>{label}</span>
      </label>
      {hint && <div className="text-[11px] text-ink-dim pl-6">{hint}</div>}
      {error?.length ? (
        <div className="text-[11px] text-danger pl-6">{error.join(' · ')}</div>
      ) : null}
    </div>
  );
}
