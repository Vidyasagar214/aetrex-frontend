import { useEffect, useState } from 'react';
import { loadFleetFromApi } from '../api/fleet';

let cache = null;
let pending = null;

function loadMetros() {
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

/**
 * Loads metro + store data from Aetrex-backend (/api/metros, /api/stores).
 * Pin placement uses seed / state / country centroids (no online geocoder).
 */
export function useFleetData() {
  const [metros, setMetros] = useState([]);
  const [scannersByMetro, setScannersByMetro] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    loadMetros()
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
  }, []);

  return { metros, scannersByMetro, loading, error };
}
