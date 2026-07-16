import { useEffect, useState } from 'react';
import Papa from 'papaparse';

function normalizeRow(row) {
  const hasAnyValue = Object.values(row || {}).some((v) => String(v || '').trim() !== '');
  if (!hasAnyValue) return null;

  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const scanners = Number(row.Scanners) || 0;
  const online = Number(row.Online) || 0;
  const offline = Number(row.Offline) || Math.max(0, scanners - online);

  return {
    metro: String(row.Metro || '').trim() || 'Unknown',
    country: String(row.Country || '').trim() || '—',
    lat,
    lng,
    scanners,
    online,
    offline,
  };
}

let cache = null;
let pending = null;

export function loadMetros() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    Papa.parse('/data/stores.csv', {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const metros = (results.data || []).map(normalizeRow).filter(Boolean);
        cache = metros;
        pending = null;
        resolve(metros);
      },
      error(err) {
        pending = null;
        reject(err || new Error('Failed to load stores.csv'));
      },
    });
  });

  return pending;
}

export function useMetros() {
  const [metros, setMetros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMetros()
      .then((data) => {
        if (!cancelled) {
          setMetros(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { metros, loading, error };
}

export function getBubbleColor(scanners) {
  if (scanners <= 50) return { fill: '#5cb85c', border: '#3d8b3d', key: 'green' };
  if (scanners <= 150) return { fill: '#f0ad4e', border: '#d58512', key: 'yellow' };
  if (scanners <= 300) return { fill: '#e67e22', border: '#c46814', key: 'orange' };
  return { fill: '#d9534f', border: '#ac2925', key: 'red' };
}

export function getAvailability(metro) {
  if (!metro.scanners) return 0;
  return Math.round((metro.online / metro.scanners) * 1000) / 10;
}
