const RAW_API = process.env.NEXT_PUBLIC_API_BASE;
export const API = RAW_API?.trim() || 'http://localhost:4000';
export const API_BASE = API.replace(/\/v1$/, '');
export const tokenKey = 'jm_access';
export const refreshKey = 'jm_refresh';

export function getAccessToken() { if (typeof window === 'undefined') return null; return localStorage.getItem(tokenKey); }
export function setTokens(a: string, r: string) { localStorage.setItem(tokenKey, a); localStorage.setItem(refreshKey, r); }
export function clearTokens() { localStorage.removeItem(tokenKey); localStorage.removeItem(refreshKey); }

export function getImageUrl(path: string) {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function toApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API}${normalizedPath}`;
}

function toErrorMessage(err: unknown, url: string) {
  if (err instanceof Error) {
    // Browser throws TypeError("Failed to fetch") on DNS/CORS/offline/network resets.
    if (/Failed to fetch/i.test(err.message)) {
      return `Network error while calling ${url}. Ensure API is running and NEXT_PUBLIC_API_BASE is correct.`;
    }
    return err.message;
  }
  return `Request failed for ${url}`;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const token = getAccessToken();
  const url = toApiUrl(path);
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '', ...(init?.headers || {}) },
    });
  } catch (err) {
    throw new Error(toErrorMessage(err, url));
  }

  if (res.status === 401) {
    const refreshToken = globalThis.window ? localStorage.getItem(refreshKey) : null;
    if (refreshToken) {
      try {
        const refreshRes = await fetch(toApiUrl('/v1/auth/refresh'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setTokens(data.accessToken, data.refreshToken);
          const retryRes = await fetch(url, {
            ...init,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.accessToken}`, ...(init?.headers || {}) },
          });
          if (!retryRes.ok) throw new Error(await retryRes.text());
          return retryRes.json();
        }
      } catch (err) {
        clearTokens();
        if (globalThis.window) globalThis.window.location.href = '/auth/login';
        throw new Error(toErrorMessage(err, toApiUrl('/v1/auth/refresh')) || 'Session expired');
      }
    }
    clearTokens();
    if (globalThis.window) globalThis.window.location.href = '/auth/login';
    throw new Error('Session expired');
  }
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}