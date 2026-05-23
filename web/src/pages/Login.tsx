import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { auth } from '@/lib/auth';

interface LoginResponse {
  access_token: string;
  user: { id: number; username: string; admin: boolean; staff: boolean };
}

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const data = await api<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      auth.set(data.access_token);
      nav('/', { replace: true });
    } catch (e) {
      const msg =
        e instanceof ApiError && (e.body as { error?: string })?.error
          ? (e.body as { error: string }).error
          : 'Login failed';
      setErr(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-12 bg-bg-0">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-bg-1 border border-edge rounded-lg p-6 space-y-5 shadow-xl"
      >
        <div className="text-center space-y-1">
          <img
            src="/indi-allsky/static/images/logo_outline_full.png"
            alt="indi-allsky"
            className="mx-auto h-12 w-auto opacity-90"
          />
          <h1 className="text-ink-bright text-lg font-semibold tracking-tight">Sign in</h1>
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-dim">Username</span>
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-3 py-2 text-ink"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-ink-dim">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-bg-2 border border-edge focus:border-accent focus:outline-none rounded-md px-3 py-2 text-ink"
            />
          </label>
        </div>

        {err && <div className="text-sm text-danger">{err}</div>}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-50 text-bg-0 font-medium rounded-md py-2 transition-colors"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
