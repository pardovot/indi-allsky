import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import { GroupSection } from './Fields';
import { TAB_REGISTRY, setPath, type FieldPath } from './types';
import { tabs as tabSchemas } from './tabs';

interface ConfigResp {
  config: Record<string, unknown>;
  config_id: number;
  camera: {
    id: number; name: string;
    minGain: number; maxGain: number;
    minBinning: number; maxBinning: number;
    minExposure: number; maxExposure: number;
  } | null;
}

interface SaveResp {
  'success-message'?: string;
  config_id?: number;
}

const TONE_CLS: Record<string, { active: string; idle: string }> = {
  danger:    { active: 'border-danger    text-danger',    idle: 'text-danger/70' },
  light:     { active: 'border-ink       text-ink-bright', idle: 'text-ink-dim'   },
  success:   { active: 'border-success   text-success',   idle: 'text-success/70' },
  secondary: { active: 'border-ink-dim   text-ink-bright', idle: 'text-ink-dim'   },
  primary:   { active: 'border-accent    text-accent',    idle: 'text-accent/70'  },
  info:      { active: 'border-info      text-info',      idle: 'text-info/70'    },
  warning:   { active: 'border-warn      text-warn',      idle: 'text-warn/70'    },
};

export default function ConfigShell() {
  return (
    <PageShell>
      {() => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-4">
          <Header />
          <Content />
        </main>
      )}
    </PageShell>
  );
}

function Header() {
  return (
    <div className="flex items-baseline justify-between flex-wrap gap-x-3">
      <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Config</h1>
      <p className="text-[11px] text-ink-dim">
        Native editor — porting is incremental.{' '}
        <a href="/indi-allsky/config" className="text-info hover:underline">Open legacy editor</a>
      </p>
    </div>
  );
}

function Content() {
  const navigate = useNavigate();
  const { tab: tabId } = useParams<{ tab?: string }>();
  const qc = useQueryClient();

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const q = useQuery({
    queryKey: ['config'],
    queryFn: () => api<ConfigResp>('/config'),
  });

  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [topError, setTopError] = useState<string[] | null>(null);

  useEffect(() => {
    if (q.data) setDraft(q.data.config);
  }, [q.data]);

  const activeId = tabId || 'location';
  const reg = TAB_REGISTRY.find((t) => t.id === activeId) ?? TAB_REGISTRY[0];

  const isDirty = useMemo(() => {
    if (!q.data || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(q.data.config);
  }, [draft, q.data]);

  const save = useMutation({
    mutationFn: (body: { config: Record<string, unknown>; note: string }) =>
      api<SaveResp>('/config', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setSavedMsg(data['success-message'] || 'Saved');
      setTopError(null);
      setErrors({});
      qc.invalidateQueries({ queryKey: ['config'] });
      window.setTimeout(() => setSavedMsg(null), 4000);
    },
    onError: (err: unknown) => {
      setSavedMsg(null);
      const body = err instanceof ApiError ? (err.body as Record<string, string[]> | null) : null;
      if (body && typeof body === 'object') {
        const { form_global, ...fieldErrs } = body;
        setErrors(fieldErrs);
        setTopError(form_global ?? null);
      } else {
        setTopError([err instanceof Error ? err.message : 'Save failed']);
      }
    },
  });

  const onChange = (path: FieldPath, value: unknown) => {
    setDraft((cur) => (cur ? setPath(cur, path, value) : cur));
    setSavedMsg(null);
  };

  const reset = () => {
    if (q.data) setDraft(q.data.config);
    setErrors({});
    setTopError(null);
    setSavedMsg(null);
  };

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error || !q.data) return <div className="text-danger text-sm">Failed to load config</div>;

  const schema = tabSchemas[activeId];

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 flex-wrap border-b border-edge -mb-px overflow-x-auto">
        {TAB_REGISTRY.map((t) => {
          const tone = TONE_CLS[t.tone ?? 'light'];
          const active = t.id === activeId;
          return (
            <button
              key={t.id}
              onClick={() => navigate(`/config/${t.id}`)}
              className={[
                'px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors',
                active
                  ? tone.active
                  : ['border-transparent hover:text-ink', tone.idle].join(' '),
              ].join(' ')}
            >
              {t.label}
              {!t.done && (
                <span className="ml-1.5 text-[9px] uppercase tracking-wider opacity-70">stub</span>
              )}
            </button>
          );
        })}
      </nav>

      {!isAdmin && (
        <Banner tone="warn">Read-only — admin required to save.</Banner>
      )}
      {topError?.length ? (
        <Banner tone="danger">
          {topError.map((m, i) => <div key={i}>{m}</div>)}
        </Banner>
      ) : null}
      {savedMsg && <Banner tone="info">{savedMsg}</Banner>}

      {schema ? (
        <div className="space-y-4">
          {schema.intro && (
            <p className="text-xs text-ink-dim leading-relaxed max-w-3xl">{schema.intro}</p>
          )}
          {schema.groups.map((g, i) => (
            <GroupSection
              key={i}
              group={g}
              config={draft ?? {}}
              errors={errors}
              onChange={onChange}
              disabled={!isAdmin || save.isPending}
            />
          ))}
        </div>
      ) : (
        <StubTab label={reg.label} />
      )}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg-0/85 backdrop-blur border-t border-edge flex items-center gap-3">
        <span className="text-xs text-ink-dim">
          {isDirty
            ? <span className="text-warn">Unsaved changes</span>
            : <span>config #{q.data.config_id}</span>}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          disabled={!isDirty || save.isPending}
          onClick={reset}
          className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >Discard</button>
        <button
          type="button"
          disabled={!isAdmin || !isDirty || save.isPending}
          onClick={() => {
            if (!draft) return;
            setTopError(null);
            setErrors({});
            save.mutate({ config: draft, note: `Edit via web UI (${reg.label})` });
          }}
          className="px-4 py-1.5 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >{save.isPending ? 'Saving…' : 'Save config'}</button>
      </div>
    </div>
  );
}

function StubTab({ label }: { label: string }) {
  return (
    <div className="bg-bg-1 border border-edge border-dashed rounded-lg p-6 text-center text-ink-dim space-y-2">
      <div className="text-sm">
        <span className="text-ink-bright">{label}</span> tab not migrated yet.
      </div>
      <a
        href="/indi-allsky/config"
        className="inline-block text-xs text-info hover:underline"
      >Edit in the legacy config UI →</a>
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
