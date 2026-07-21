import { apiGet } from './client';
import { normalizeFilterOptions } from './filters';

/** GET /api/overview/kpis */
function fetchOverviewKpis(params = {}) {
  return apiGet('/api/overview/kpis', params);
}

/** GET /api/overview/activity-status */
function fetchOverviewActivity(params = {}) {
  return apiGet('/api/overview/activity-status', params);
}

/** GET /api/overview/charts */
function fetchOverviewCharts(params = {}) {
  return apiGet('/api/overview/charts', params);
}

/** GET /api/overview/filters */
function fetchOverviewFilters() {
  return apiGet('/api/overview/filters');
}

/**
 * Load Fleet Overview dashboard data.
 * Pass filter params to refresh KPIs / activity / charts.
 */
export async function loadOverviewPage(params = {}) {
  const [kpis, activity, charts, filterOptions] = await Promise.all([
    fetchOverviewKpis(params),
    fetchOverviewActivity(params),
    fetchOverviewCharts(params),
    fetchOverviewFilters(),
  ]);

  const activityPayload = Array.isArray(activity)
    ? { items: activity, stale14d: 0, total: 0 }
    : activity || { items: [], stale14d: 0, total: 0 };

  return {
    kpis: Array.isArray(kpis) ? kpis : [],
    activity: activityPayload.items || [],
    stale14d: activityPayload.stale14d || 0,
    charts: charts || {
      byModel: { labels: [], codes: [], values: [], percents: [] },
      byVersion: { labels: [], values: [] },
    },
    filters: normalizeFilterOptions(filterOptions),
  };
}
