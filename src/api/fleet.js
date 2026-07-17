import { apiGet } from './client';
import {
  applyQuickCoords,
  buildFleetIndex,
  normalizeStoreRow,
} from '../lib/fleetData';

/** GET /api/metros — metro aggregates for map bubbles (lat/lng null; geocode client-side) */
export function fetchMetros(params = {}) {
  return apiGet('/api/metros', params);
}

/** GET /api/stores — store/scanner rows for explorer drawer */
function fetchStores(params = {}) {
  return apiGet('/api/stores', params);
}

/**
 * Load fleet map data exclusively from Aetrex-backend SQLite APIs
 * (`/api/metros`, `/api/stores`).
 */
export async function loadFleetFromApi(params = {}) {
  const [metroRows, storeRows] = await Promise.all([
    fetchMetros(params),
    fetchStores(params),
  ]);

  if (!Array.isArray(metroRows)) {
    throw new Error('Invalid /api/metros response');
  }
  if (!Array.isArray(storeRows)) {
    throw new Error('Invalid /api/stores response');
  }

  const stores = storeRows.map(normalizeStoreRow).filter(Boolean);
  const index = buildFleetIndex(stores);

  // Prefer API metro aggregates (online/offline from Scan activity)
  const metroSource = metroRows.length > 0 ? metroRows : index.metros;

  return {
    metros: applyQuickCoords(metroSource),
    stores,
    scannersByMetro: index.scannersByMetro,
    source: 'api',
  };
}
