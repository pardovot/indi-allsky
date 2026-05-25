import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import PageShell from '@/components/PageShell';
import Select from '@/components/Select';

interface DayOption { value: string; label: string }
interface DaysResp { days: DayOption[] }

interface RecentTask {
  id: number;
  createDate: string;
  queue: string;
  action: string;
  state: string;
  result: string | null;
}
interface TasksResp { tasks: RecentTask[] }

const ACTIONS: { value: string; label: string }[] = [
  { value: 'generate_video_k_st',     label: 'Generate All' },
  { value: 'generate_video',          label: 'Generate Timelapse Only' },
  { value: 'generate_k_st',           label: 'Generate Keogram/Star Trails' },
  { value: 'generate_panorama_video', label: 'Generate Panorama Timelapse' },
  { value: 'delete_video_k_st_p',     label: 'Delete Timelapse/Keogram/Star Trails/Panorama' },
  { value: 'delete_video',            label: 'Delete Timelapse Only' },
  { value: 'delete_k_st',             label: 'Delete Keogram/Star Trails' },
  { value: 'delete_panorama_video',   label: 'Delete Panorama Timelapse' },
  { value: 'upload_endofnight',       label: 'Upload End-of-Night Data [today only]' },
  { value: 'delete_images',           label: 'Delete Images for date *DANGER*' },
];

export default function Generate() {
  return (
    <PageShell>
      {({ cameraId }) => (
        <main className="flex-1 flex flex-col px-4 py-4 gap-3">
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Generate</h1>
          <p className="text-ink-dim text-xs">
            Manually submit timelapse / keogram / star trail jobs, or delete prior outputs. Flags indicate existing assets:
            [T] timelapse, [K] keogram/star trails, [P] panorama; [!X] = failed.
          </p>
          {cameraId !== null && <GenerateForm cameraId={cameraId} />}
        </main>
      )}
    </PageShell>
  );
}

function GenerateForm({ cameraId }: { cameraId: number }) {
  const qc = useQueryClient();
  const [action, setAction] = useState('generate_video_k_st');
  const [day, setDay] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const meQ = useQuery({
    queryKey: ['me'],
    queryFn: () => api<{ admin: boolean }>('/auth/me'),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!meQ.data?.admin;

  const daysQ = useQuery({
    queryKey: ['generate-days', cameraId],
    queryFn: () => api<DaysResp>(`/generate/days?camera_id=${cameraId}`),
  });

  const tasksQ = useQuery({
    queryKey: ['generate-tasks', cameraId],
    queryFn: () => api<TasksResp>(`/generate/recent-tasks?camera_id=${cameraId}`),
    refetchInterval: 5_000,
  });

  const submit = useMutation({
    mutationFn: () =>
      api<{ 'success-message'?: string; 'failure-message'?: string }>(
        '/generate/submit',
        {
          method: 'POST',
          body: JSON.stringify({
            CAMERA_ID: cameraId,
            ACTION_SELECT: action,
            DAY_SELECT: day,
            CONFIRM1: confirm ? 'y' : '',
          }),
        },
      ),
    onSuccess: (data) => {
      setMsg({ kind: 'ok', text: data['success-message'] || 'OK' });
      setConfirm(false);
      qc.invalidateQueries({ queryKey: ['generate-tasks', cameraId] });
      qc.invalidateQueries({ queryKey: ['generate-days', cameraId] });
    },
    onError: (err: unknown) => {
      const body = err instanceof ApiError ? (err.body as Record<string, unknown> | null) : null;
      let text: string;
      if (body && typeof body === 'object') {
        const errs: string[] = [];
        for (const [k, v] of Object.entries(body)) {
          if (Array.isArray(v)) errs.push(`${k}: ${v.join(', ')}`);
          else errs.push(`${k}: ${String(v)}`);
        }
        text = errs.join(' · ') || (err instanceof Error ? err.message : 'error');
      } else {
        text = err instanceof Error ? err.message : 'error';
      }
      setMsg({ kind: 'err', text });
    },
  });

  const isDelete = action.startsWith('delete_');

  return (
    <div className="space-y-3">
      {!isAdmin && (
        <div className="text-warn text-xs">Read-only: admin privileges required to submit jobs.</div>
      )}

      <div className="bg-bg-1 border border-edge rounded-lg p-3 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-ink-dim mb-1">Action</div>
            <Select
              value={action}
              options={ACTIONS}
              onChange={setAction}
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </div>
          <div>
            <div className="text-xs text-ink-dim mb-1">Day</div>
            <Select
              value={day}
              options={[{ value: '', label: daysQ.isLoading ? 'Loading…' : '(Select day)' }, ...(daysQ.data?.days ?? [])]}
              onChange={setDay}
              className="w-full"
              buttonClassName="w-full justify-between"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isDelete && (
            <label className="text-xs text-ink-dim flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
              Confirm delete
            </label>
          )}
          <button
            disabled={!isAdmin || !day || submit.isPending || (isDelete && !confirm)}
            onClick={() => { setMsg(null); submit.mutate(); }}
            className={[
              'px-3 py-1.5 rounded-md text-sm border transition-colors',
              isDelete
                ? 'bg-bg-2 hover:bg-bg-3 border-danger/40 text-danger'
                : 'bg-accent/20 hover:bg-accent/30 border-accent/40 text-accent',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            ].join(' ')}
          >
            {submit.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>

        {msg && (
          <div className={[
            'text-xs px-3 py-2 rounded border',
            msg.kind === 'ok'
              ? 'bg-info/10 border-info/30 text-info'
              : 'bg-danger/10 border-danger/30 text-danger',
          ].join(' ')}>{msg.text}</div>
        )}
      </div>

      <div className="bg-bg-1 border border-edge rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-bg-2 border-b border-edge text-ink-bright text-sm font-medium">
          Recent video-queue tasks (12h)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-ink-dim text-[10px] uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-1.5">Created</th>
                <th className="text-left px-3 py-1.5">Action</th>
                <th className="text-left px-3 py-1.5">State</th>
                <th className="text-left px-3 py-1.5">Result</th>
              </tr>
            </thead>
            <tbody>
              {(tasksQ.data?.tasks ?? []).length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-4 text-center text-ink-dim">No recent tasks</td></tr>
              ) : tasksQ.data!.tasks.map((t) => (
                <tr key={t.id} className="border-t border-edge">
                  <td className="px-3 py-1 font-mono text-ink whitespace-nowrap">{t.createDate}</td>
                  <td className="px-3 py-1 font-mono text-ink-dim text-xs">{t.action}</td>
                  <td className={[
                    'px-3 py-1 font-mono text-xs',
                    t.state === 'SUCCESS' ? 'text-info' :
                    t.state === 'RUNNING' ? 'text-accent' :
                    t.state === 'FAILED' ? 'text-danger' :
                    'text-ink-dim',
                  ].join(' ')}>{t.state}</td>
                  <td className="px-3 py-1 text-ink-dim text-xs">{t.result || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
