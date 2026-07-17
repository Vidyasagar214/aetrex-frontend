import { apiGet } from './client';
import { normalizeFilterOptions } from './filters';

function fetchReleaseKpis(params = {}) {
  return apiGet('/api/releases/kpis', params);
}

function fetchReleasePipeline(params = {}) {
  return apiGet('/api/releases/pipeline', params);
}

function fetchReleaseAdoption(params = {}) {
  return apiGet('/api/releases/adoption', params);
}

function fetchUnsupportedDevices(params = {}) {
  return apiGet('/api/releases/unsupported', params);
}

function fetchReleaseFilters() {
  return apiGet('/api/releases/filters');
}

const RELEASE_STATUS_DEFAULTS = [
  { value: 'upgraded', label: 'Upgraded' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'failed', label: 'Failed' },
  { value: 'unsupported', label: 'Unsupported' },
];

/**
 * Load Releases & Upgrades page data from Aetrex-backend.
 */
export async function loadReleasesPage(params = {}) {
  const [kpis, pipeline, adoption, unsupported, filterOptions] =
    await Promise.all([
      fetchReleaseKpis(params),
      fetchReleasePipeline(params),
      fetchReleaseAdoption(params),
      fetchUnsupportedDevices({ ...params, limit: 50 }),
      fetchReleaseFilters(),
    ]);

  const pipelinePayload = Array.isArray(pipeline)
    ? {
        items: pipeline,
        failed: 0,
        topFailure: '',
        latestVersion: null,
        total: 0,
      }
    : pipeline || {
        items: [],
        failed: 0,
        topFailure: '',
        latestVersion: null,
        total: 0,
      };

  const unsupportedPayload = Array.isArray(unsupported)
    ? { data: unsupported, meta: { total: unsupported.length } }
    : unsupported || { data: [], meta: { total: 0 } };

  return {
    kpis: Array.isArray(kpis) ? kpis : [],
    pipeline: pipelinePayload.items || [],
    failed: pipelinePayload.failed || 0,
    topFailure: pipelinePayload.topFailure || '',
    total: pipelinePayload.total || 0,
    latestVersion:
      adoption?.latestVersion || pipelinePayload.latestVersion || null,
    adoption: adoption || {
      labels: [],
      adoption: [],
      target: [],
      currentPct: 0,
      targetPct: 90,
      releaseStart: null,
    },
    unsupported: unsupportedPayload.data || [],
    unsupportedTotal: unsupportedPayload.meta?.total || 0,
    filters: normalizeFilterOptions(filterOptions, {
      statuses: RELEASE_STATUS_DEFAULTS,
    }),
  };
}
