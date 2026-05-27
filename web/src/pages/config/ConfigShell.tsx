import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import { SectionRow } from './Fields';
import type { FieldGroup } from './types';
import {
  TAB_REGISTRY,
  collectTabPaths,
  findChanges,
  pathStartsWith,
  pathToString,
  setPath,
  type Change,
  type FieldPath,
} from './types';
import { tabs as tabSchemas } from './tabs';

interface ConfigResp {
  config: Record<string, unknown>;
  base_config: Record<string, unknown>;
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
  const [showChanges, setShowChanges] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [savePrompt, setSavePrompt] = useState(false);
  const changesRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showChanges) {
      changesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showChanges]);

  useEffect(() => {
    if (q.data) setDraft(q.data.config);
  }, [q.data]);

  const activeId = tabId || TAB_REGISTRY.find((t) => t.done)?.id || TAB_REGISTRY[0].id;
  const reg = TAB_REGISTRY.find((t) => t.id === activeId) ?? TAB_REGISTRY[0];
  const schema = tabSchemas[activeId];
  const tabPaths = useMemo(() => collectTabPaths(schema), [schema]);

  const allChanges = useMemo<Change[]>(() => {
    if (!q.data || !draft) return [];
    return findChanges(q.data.config, draft);
  }, [draft, q.data]);
  const tabChanges = useMemo(() => {
    if (tabPaths.length === 0) return allChanges;
    return allChanges.filter((c) =>
      tabPaths.some((p) => pathStartsWith(c.path, p)),
    );
  }, [allChanges, tabPaths]);
  const isDirty = allChanges.length > 0;
  const isTabDirty = tabChanges.length > 0;

  useEffect(() => {
    if (!isTabDirty && showChanges) setShowChanges(false);
  }, [isTabDirty, showChanges]);

  const save = useMutation({
    mutationFn: (body: { config: Record<string, unknown>; note: string; reload: boolean }) =>
      api<SaveResp>('/config', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (data) => {
      setSavedMsg(data['success-message'] || 'Saved');
      setTopError(null);
      setErrors({});
      setSavePrompt(false);
      qc.invalidateQueries({ queryKey: ['config'] });
      window.setTimeout(() => setSavedMsg(null), 5000);
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

  const discard = () => {
    if (q.data) setDraft(q.data.config);
    setErrors({});
    setTopError(null);
    setSavedMsg(null);
    setShowChanges(false);
    setConfirmResetAll(false);
    setSavePrompt(false);
  };

  const submitSave = (reload: boolean) => {
    if (!draft) return;
    setTopError(null);
    setErrors({});
    save.mutate({ config: draft, note: `Edit via web UI (${reg.label})`, reload });
  };

  const resetTabToDefaults = () => {
    if (!q.data || !draft) return;
    let next = draft;
    for (const p of tabPaths) {
      const def = getAtPath(q.data.base_config, p);
      next = setPath(next, p, def);
    }
    setDraft(next);
    setErrors({});
    setTopError(null);
    setSavedMsg(null);
    setConfirmResetAll(false);
  };

  if (q.isLoading) return <div className="text-ink-dim text-sm">Loading…</div>;
  if (q.error || !q.data) return <div className="text-danger text-sm">Failed to load config</div>;

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
          {pairGroups(schema.groups).map((row, i) => (
            <SectionRow
              key={i}
              groups={row}
              config={draft ?? {}}
              defaults={q.data.base_config}
              errors={errors}
              onChange={onChange}
              disabled={!isAdmin || save.isPending}
            />
          ))}
        </div>
      ) : (
        <StubTab label={reg.label} />
      )}

      {showChanges && isTabDirty && (
        <div ref={changesRef}>
          <ChangesPanel
            changes={tabChanges}
            tabLabel={reg.label}
            onClose={() => setShowChanges(false)}
            onRevert={(p) => onChange(p, getAtPath(q.data!.config, p))}
          />
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-bg-0/85 backdrop-blur border-t border-edge flex items-center gap-3 flex-wrap">
        <span className="text-xs text-ink-dim">
          {isTabDirty
            ? <span className="text-warn">{tabChanges.length} unsaved change{tabChanges.length === 1 ? '' : 's'} on this tab</span>
            : isDirty
              ? <span className="text-ink-dim">{allChanges.length} change{allChanges.length === 1 ? '' : 's'} on other tabs</span>
              : <span>config #{q.data.config_id}</span>}
        </span>
        <div className="flex-1" />

        {isAdmin && tabPaths.length > 0 && (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => setConfirmResetAll(true)}
            title={`Reset all fields on the ${reg.label} tab to factory defaults`}
            className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >Reset tab to defaults</button>
        )}

        <button
          type="button"
          disabled={!isTabDirty || save.isPending}
          onClick={() => setShowChanges((v) => !v)}
          className={[
            'px-3 py-1.5 rounded-md border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
            showChanges
              ? 'bg-warn/15 border-warn/40 text-warn'
              : 'bg-bg-2 hover:bg-bg-3 border-edge text-ink-dim hover:text-ink',
          ].join(' ')}
        >
          {showChanges ? 'Hide changes' : `Show changes${isTabDirty ? ` (${tabChanges.length})` : ''}`}
        </button>

        <button
          type="button"
          disabled={!isDirty || save.isPending}
          onClick={discard}
          className="px-3 py-1.5 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink-dim hover:text-ink text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          title={isDirty ? 'Discard all unsaved changes (every tab)' : ''}
        >Discard</button>

        <button
          type="button"
          disabled={!isAdmin || !isDirty || save.isPending}
          onClick={() => setSavePrompt(true)}
          className="px-4 py-1.5 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
        >{save.isPending ? 'Saving…' : 'Save config'}</button>
      </div>

      {savePrompt && (
        <SaveDialog
          changeCount={allChanges.length}
          busy={save.isPending}
          onSaveReload={() => submitSave(true)}
          onSaveOnly={() => submitSave(false)}
          onCancel={() => setSavePrompt(false)}
        />
      )}

      {confirmResetAll && (
        <ConfirmDialog
          title={`Reset ${reg.label} to defaults`}
          body={`This replaces every field on the ${reg.label} tab with its factory default. Unsaved edits on this tab are lost. Nothing is written until you save.`}
          confirmLabel="Reset tab"
          danger
          onConfirm={resetTabToDefaults}
          onCancel={() => setConfirmResetAll(false)}
        />
      )}
    </div>
  );
}

function ConfirmDialog({
  title, body, confirmLabel, danger, onConfirm, onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md bg-bg-1 border border-edge rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-ink-bright text-base font-semibold">{title}</h2>
          <p className="text-sm text-ink-dim mt-1">{body}</p>
        </div>
        <div className="px-5 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-ink-dim hover:text-ink text-sm"
          >Cancel</button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'px-4 py-1.5 rounded-md border text-sm font-medium',
              danger
                ? 'bg-danger/15 hover:bg-danger/25 border-danger/40 text-danger'
                : 'bg-info/15 hover:bg-info/25 border-info/40 text-info',
            ].join(' ')}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function SaveDialog({
  changeCount, busy, onSaveReload, onSaveOnly, onCancel,
}: {
  changeCount: number;
  busy: boolean;
  onSaveReload: () => void;
  onSaveOnly: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-0/70 backdrop-blur-sm p-4"
      onClick={busy ? undefined : onCancel}
    >
      <div
        className="w-full max-w-md bg-bg-1 border border-edge rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="px-5 py-4 border-b border-edge">
          <h2 className="text-ink-bright text-base font-semibold">Save configuration</h2>
          <p className="text-sm text-ink-dim mt-1">
            Saving {changeCount} change{changeCount === 1 ? '' : 's'}. Reload indi-allsky now to apply
            them to the running capture, or save and reload later?
          </p>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onSaveReload}
            className="px-4 py-3 rounded-md bg-info/15 hover:bg-info/25 border border-info/40 text-info text-sm font-medium text-left disabled:opacity-50"
          >
            <span className="block">Save &amp; reload</span>
            <span className="block text-[11px] text-ink-dim font-normal mt-0.5">
              Applies immediately, the capture service restarts.
            </span>
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSaveOnly}
            className="px-4 py-3 rounded-md bg-bg-2 hover:bg-bg-3 border border-edge text-ink text-sm font-medium text-left disabled:opacity-50"
          >
            <span className="block">Save only</span>
            <span className="block text-[11px] text-ink-dim font-normal mt-0.5">
              Stored now, takes effect on the next manual reload or restart.
            </span>
          </button>
        </div>
        <div className="px-5 py-3 border-t border-edge flex justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-ink-dim hover:text-ink text-sm disabled:opacity-50"
          >Cancel</button>
        </div>
      </div>
    </div>
  );
}

function getAtPath(obj: unknown, path: FieldPath): unknown {
  let cur: unknown = obj;
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string | number, unknown>)[k];
  }
  return cur;
}

function ChangesPanel({
  changes, tabLabel, onClose, onRevert,
}: {
  changes: Change[];
  tabLabel: string;
  onClose: () => void;
  onRevert: (path: FieldPath) => void;
}) {
  return (
    <section className="bg-bg-1 border border-warn/30 rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-2 bg-warn/10 border-b border-warn/30">
        <h2 className="text-warn text-sm font-medium">
          Pending changes — {tabLabel} ({changes.length})
        </h2>
        <button
          onClick={onClose}
          className="text-ink-dim hover:text-ink text-xs px-1"
        >Close</button>
      </header>
      <ul className="divide-y divide-edge">
        {changes.map((c) => (
          <li key={pathToString(c.path)} className="px-4 py-2 flex items-center gap-3 text-xs">
            <span className="font-mono text-ink-bright flex-shrink-0">{pathToString(c.path)}</span>
            <span className="text-ink-dim line-through font-mono truncate max-w-[16ch]">{renderValue(c.oldValue)}</span>
            <span className="text-ink-dim">→</span>
            <span className="text-warn font-mono truncate max-w-[24ch]">{renderValue(c.newValue)}</span>
            <div className="flex-1" />
            <button
              onClick={() => onRevert(c.path)}
              className="text-ink-dim hover:text-info text-[10px] uppercase tracking-wider"
              title="Revert this field to its saved value"
            >revert</button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function pairGroups(groups: FieldGroup[]): FieldGroup[][] {
  const out: FieldGroup[][] = [];
  for (let i = 0; i < groups.length; i += 2) {
    out.push(groups.slice(i, i + 2));
  }
  return out;
}

function renderValue(v: unknown): string {
  if (v === undefined) return '∅';
  if (v === null) return 'null';
  if (typeof v === 'string') return v === '' ? '""' : v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
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
