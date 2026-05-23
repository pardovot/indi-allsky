const ACCESS_KEY = 'allsky_access_token';

export const auth = {
  get token(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  set(token: string) {
    localStorage.setItem(ACCESS_KEY, token);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
  },
  isAuthed(): boolean {
    return !!localStorage.getItem(ACCESS_KEY);
  },
};

export function getCookie(name: string): string | null {
  const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
  return m ? decodeURIComponent(m[1]) : null;
}
