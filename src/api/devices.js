import { apiGet } from './client';
import { normalizeFilterOptions } from './filters';

/** GET /api/devices — paginated/filtered device list from SQLite Stores */
function fetchDevices(params = {}) {
  return apiGet('/api/devices', params);
}

/** GET /api/overview/filters — countries, models, versions, statuses */
function fetchDeviceFilters() {
  return apiGet('/api/overview/filters');
}

/**
 * Load the full devices list for the Devices page table.
 * Returns { devices, meta, filters }.
 */
export async function loadDevicesPage(params = {}) {
  const [devicesPayload, filterOptions] = await Promise.all([
    fetchDevices({ limit: 10000, ...params }),
    fetchDeviceFilters(),
  ]);

  const devices = Array.isArray(devicesPayload?.data)
    ? devicesPayload.data
    : Array.isArray(devicesPayload)
      ? devicesPayload
      : [];

  const meta = devicesPayload?.meta || { total: devices.length };

  return {
    devices,
    meta,
    filters: normalizeFilterOptions(filterOptions),
  };
}
