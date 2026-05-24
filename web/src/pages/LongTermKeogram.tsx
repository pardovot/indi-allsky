import { FormEvent, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

interface KeogramResp {
  url: string | null;
  age: string | null;
}

function resolveUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('/')) return url;
  return `/indi-allsky/${url}`;
}

const START_OPTIONS = [
  { value: 'today',    label: 'Today' },
  { value: 'thisyear', label: 'End of this year' },
  { value: 'lastyear', label: 'End of last year' },
];

const DAYS_OPTIONS = [
  { value: '30',   label: '1 Month' },
  { value: '90',   label: '3 Months' },
  { value: '180',  label: '6 Months' },
  { value: '365',  label: '1 Year' },
  { value: '730',  label: '2 Years' },
  { value: '1095', label: '3 Years' },
  { value: '42',   label: 'All Available' },
];

const PIXELS_OPTIONS = [
  { value: '1', label: '1' }, { value: '2', label: '2' },
  { value: '3', label: '3' }, { value: '4', label: '4' },
  { value: '5', label: '5' },
];

const ALIGNMENT_OPTIONS = [20, 30, 40, 50, 60, 75, 90, 120].map((s) => ({
  value: String(s),
  label: `${s} Seconds`,
}));

const OFFSET_OPTIONS = Array.from({ length: 25 }, (_, i) => {
  const hours = i - 12;
  return { value: String(hours * 3600), label: String(hours) };
});

interface FormState {
  END_SELECT: string;
  DAYS_SELECT: string;
  PIXELS_SELECT: string;
  ALIGNMENT_SELECT: string;
  OFFSET_SELECT: string;
  REVERSE: boolean;
  LABEL: boolean;
}

const DEFAULT_FORM: FormState = {
  END_SELECT: 'today',
  DAYS_SELECT: '30',
  PIXELS_SELECT: '5',
  ALIGNMENT_SELECT: '60',
  OFFSET_SELECT: '0',
  REVERSE: false,
  LABEL: false,
};

export default function LongTermKeogram() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col items-center px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight self-start max-w-7xl w-full">
            Long Term Keogram
          </h1>
          {cameraId !== null && <LongContent cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function LongContent({ cameraId }: { cameraId: number }) {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ['longterm-keogram', cameraId],
    queryFn: () => api<KeogramResp>(`/longterm-keogram?camera_id=${cameraId}`),
    refetchInterval: submitting ? 5_000 : false,
  });

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 30_000);
    return () => clearTimeout(t);
  }, [successMsg]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      await api('/longterm-keogram-generate', {
        method: 'POST',
        body: JSON.stringify({
          CAMERA_ID: cameraId,
          ...form,
        }),
      });
      setSuccessMsg('Generation kicked off — image will refresh shortly.');
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { 'failure-message'?: string } | undefined;
        setErrorMsg(body?.['failure-message'] || `Error: ${err.message}`);
      } else {
        setErrorMsg('Submit failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  return (
    <div className="w-full max-w-7xl flex flex-col gap-3">
      <form
        onSubmit={onSubmit}
        className="bg-bg-1 border border-edge rounded-lg p-3 flex flex-wrap items-end gap-3 text-xs"
      >
        <Select label="Start"          value={form.END_SELECT}       options={START_OPTIONS}      onChange={(v) => update('END_SELECT', v)} />
        <Select label="Timeframe"      value={form.DAYS_SELECT}      options={DAYS_OPTIONS}       onChange={(v) => update('DAYS_SELECT', v)} />
        <Select label="Pixels/Day"     value={form.PIXELS_SELECT}    options={PIXELS_OPTIONS}     onChange={(v) => update('PIXELS_SELECT', v)} />
        <Select label="Alignment"      value={form.ALIGNMENT_SELECT} options={ALIGNMENT_OPTIONS}  onChange={(v) => update('ALIGNMENT_SELECT', v)} />
        <Select label="Hour Offset"    value={form.OFFSET_SELECT}    options={OFFSET_OPTIONS}     onChange={(v) => update('OFFSET_SELECT', v)} />
        <label className="inline-flex items-center gap-1.5 rounded-md bg-bg-2 border border-edge px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={form.REVERSE} onChange={(e) => update('REVERSE', e.target.checked)} className="accent-accent" />
          <span className="text-ink-dim">Reverse</span>
        </label>
        <label className="inline-flex items-center gap-1.5 rounded-md bg-bg-2 border border-edge px-2 py-1 cursor-pointer">
          <input type="checkbox" checked={form.LABEL} onChange={(e) => update('LABEL', e.target.checked)} className="accent-accent" />
          <span className="text-ink-dim">Label</span>
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="bg-accent hover:bg-accent-hover disabled:opacity-40 text-bg-0 font-medium rounded-md px-3 py-1.5"
        >
          {submitting ? 'Generating…' : 'Generate'}
        </button>
        {q.data?.url && (
          <a
            href={resolveUrl(q.data.url)}
            download
            className="px-2.5 py-1 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink transition-colors"
          >
            Download
          </a>
        )}
        {successMsg && <span className="text-success">{successMsg}</span>}
        {errorMsg && <span className="text-danger">{errorMsg}</span>}
      </form>

      {q.data?.age && (
        <div className="text-xs text-ink-dim text-center">{q.data.age}</div>
      )}

      <div className="flex justify-center">
        {q.data?.url ? (
          <img
            src={resolveUrl(q.data.url)}
            alt="Long term keogram"
            className="max-w-full max-h-[75vh] w-auto h-auto object-contain rounded-md ring-1 ring-edge"
          />
        ) : (
          <div className="aspect-video w-full max-w-3xl border border-edge rounded-lg flex items-center justify-center bg-bg-1/30 text-center px-4">
            <div className="text-ink-dim text-sm">
              {q.isLoading ? 'Loading…' : 'No long-term keogram generated yet — submit the form above.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
