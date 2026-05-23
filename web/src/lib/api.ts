import { auth, getCookie } from './auth';

const API_BASE = '/indi-allsky/api/v2';

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const csrf = getCookie('csrf_refresh_token');
  if (!csrf) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-TOKEN': csrf },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { access_token: string };
  auth.set(data.access_token);
  return data.access_token;
}

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const exec = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  };

  let res = await exec(auth.token);

  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await exec(newToken);
    } else {
      auth.clear();
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  if (!res.ok) {
    let body: unknown = null;
    try { body = await res.json(); } catch { /* ignore */ }
    throw new ApiError(res.status, `${res.status} ${res.statusText}`, body);
  }

  return res.json() as Promise<T>;
}
