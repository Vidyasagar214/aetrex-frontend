/**
 * API base URL.
 * Local dev: leave VITE_API_URL empty — Vite proxies /api → http://localhost:4000
 * Production (Vercel): set VITE_API_URL to the backend origin (no trailing slash)
 *   e.g. https://aetrex-backend.vercel.app
 */
const RAW_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getApiBase() {
  return RAW_BASE || '(same-origin / Vite proxy)';
}

function apiUrl(path) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${RAW_BASE}${normalized}`;
}

export async function apiGet(path, params = {}) {
  if (import.meta.env.PROD && !RAW_BASE) {
    throw new Error(
      'VITE_API_URL is not set. In Vercel → Frontend → Settings → Environment Variables, set VITE_API_URL to your backend URL (e.g. https://aetrex-backend.vercel.app), then Redeploy.'
    );
  }

  const target = apiUrl(path);
  const url = target.startsWith('http')
    ? new URL(target)
    : new URL(target, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value != null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  let response;
  try {
    response = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(
      `Failed to reach API at ${url.origin}. Check VITE_API_URL and that backend CORS_ORIGIN allows this frontend (no trailing slash).`
    );
  }

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
