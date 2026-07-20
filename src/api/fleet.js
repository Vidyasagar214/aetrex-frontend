import { apiGet } from './client';
import {
  applyQuickCoords,
  buildFleetIndex,
  normalizeStoreRow,
} from '../lib/fleetData';

/** GET /api/stores — store/scanner rows (source of truth for metro counts) */
function fetchStores(params = {}) {
  return apiGet('/api/stores', params);
}

/**
 * Load fleet map + drawer data from Aetrex-backend.
 * Metro bubbles and drawer KPIs are always derived from the same store rows
 * so scanner totals stay identical across every map view.
 */
export async function loadFleetFromApi(params = {}) {
  const storeRows = await fetchStores(params);

  if (!Array.isArray(storeRows)) {
    throw new Error('Invalid /api/stores response');
  }

  const stores = storeRows.map(normalizeStoreRow).filter(Boolean);
  const index = buildFleetIndex(stores);

  return {
    metros: applyQuickCoords(index.metros),
    stores,
    scannersByMetro: index.scannersByMetro,
    source: 'api',
  };
}
