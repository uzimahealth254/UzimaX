import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

let accessToken: string | null = sessionStorage.getItem('uzima_access') || null;
// Refresh prefers httpOnly cookie; body refresh kept only as fallback for same-origin tooling
let refreshToken: string | null = sessionStorage.getItem('uzima_refresh') || null;

export function setTokens(access: string | null, refresh?: string | null) {
  accessToken = access;
  if (access) sessionStorage.setItem('uzima_access', access);
  else sessionStorage.removeItem('uzima_access');
  if (refresh !== undefined) {
    refreshToken = refresh;
    if (refresh) sessionStorage.setItem('uzima_refresh', refresh);
    else sessionStorage.removeItem('uzima_refresh');
  }
  // Migrate away from localStorage (XSS-durable)
  try {
    localStorage.removeItem('uzima_refresh');
    localStorage.removeItem('uzima_access');
  } catch { /* */ }
}

export function getAccessToken() {
  return accessToken;
}

export const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login')) {
      original._retry = true;
      refreshing = refreshing ?? (async () => {
        try {
          const body = refreshToken ? { refreshToken } : {};
          const { data } = await axios.post(`${API_URL}/api/v1/auth/refresh`, body, { withCredentials: true });
          setTokens(data.accessToken, data.refreshToken ?? refreshToken);
          return data.accessToken as string;
        } catch {
          setTokens(null, null);
          return null;
        } finally {
          refreshing = null;
        }
      })();
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export type UzimaUser = {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'buyer' | 'supplier' | 'spv';
  organisationId: string | null;
  organisationName: string | null;
  uzimaPartyId?: string | null;
};

export async function loginApi(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  setTokens(data.accessToken, data.refreshToken ?? null);
  return data as { accessToken: string; refreshToken?: string; user: UzimaUser };
}

export async function logoutApi() {
  try { await api.post('/auth/logout'); } catch { /* */ }
  setTokens(null, null);
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data as UzimaUser;
}

export async function apiHealth(): Promise<boolean> {
  try {
    const { data } = await api.get('/health');
    return data?.status === 'ok';
  } catch {
    return false;
  }
}
