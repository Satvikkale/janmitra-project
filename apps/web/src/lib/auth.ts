export const API = process.env.NEXT_PUBLIC_API_BASE!;
export const tokenKey = 'jm_access';
export const refreshKey = 'jm_refresh';

export function getAccessToken() { if (typeof window === 'undefined') return null; return localStorage.getItem(tokenKey); }
export function setTokens(a: string, r: string) { localStorage.setItem(tokenKey, a); localStorage.setItem(refreshKey, r); }
export function clearTokens() { localStorage.removeItem(tokenKey); localStorage.removeItem(refreshKey); }

export async function apiFetch(path: string, init?: RequestInit) {
  const token = getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '', ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}