/**
 * API base URL.
 * Local dev: leave VITE_API_URL empty — Vite proxies /api → http://localhost:4000
 * Production: set VITE_API_URL to the backend origin (no trailing slash)
 */
const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${RAW_BASE}${normalized}`;
}

export async function apiGet(path, params = {}) {
  const target = apiUrl(path);
  const url = target.startsWith('http')
    ? new URL(target)
    : new URL(target, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    let detail = '';
    try {
      detail = await response.text();
    } catch {
      detail = '';
    }
    throw new Error(detail || `API ${response.status}: ${path}`);
  }

  return response.json();
}
