import { useEffect, useMemo, useState } from 'react';
import { loadFleetFromApi } from '../api/fleet';

let cache = null;
let pending = null;

function loadUnfilteredFleet() {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  pending = loadFleetFromApi()
    .then((fleetData) => {
      cache = fleetData;
      pending = null;
      return fleetData;
    })
    .catch((err) => {
      pending = null;
      throw err;
    });

  return pending;
}

function hasActiveFilters(filters = {}) {
  return Boolean(
    filters.country ||
      filters.model ||
      filters.version ||
      filters.status ||
      filters.q
  );
}

/**
 * Loads metro + store data from Aetrex-backend (/api/stores).
 * Pass filter params so Overview map counts match KPI filters.
 * Unfiltered loads are cached for Location Explorer.
 */
export function useFleetData(filters = {}) {
  const filterKey = useMemo(
    () =>
      JSON.stringify({
        country: filters.country || '',
        model: filters.model || '',
        version: filters.version || '',
        status: filters.status || '',
        q: filters.q || '',
      }),
    [filters.country, filters.model, filters.version, filters.status, filters.q]
  );

  const [metros, setMetros] = useState([]);
  const [scannersByMetro, setScannersByMetro] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const parsed = JSON.parse(filterKey);
    const active = hasActiveFilters(parsed);
    const request = active
      ? loadFleetFromApi({
          country: parsed.country || undefined,
          model: parsed.model || undefined,
          version: parsed.version || undefined,
          status: parsed.status || undefined,
          q: parsed.q || undefined,
        })
      : loadUnfilteredFleet();

    request
      .then((data) => {
        if (cancelled) return;
        setMetros(data.metros);
        setScannersByMetro(data.scannersByMetro);
        setError(null);
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
  }, [filterKey]);

  return { metros, scannersByMetro, loading, error };
}
