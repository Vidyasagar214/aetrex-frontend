/**
 * Shared filter-option shaping for overview / releases / devices APIs.
 */
export function normalizeFilterOptions(filterOptions = {}, defaults = {}) {
  return {
    countries: filterOptions.countries || defaults.countries || [],
    models: (filterOptions.models || defaults.models || []).map((m) =>
      typeof m === 'string'
        ? m
        : { value: m.label || m.value, label: m.label || m.value }
    ),
    versions: filterOptions.versions || defaults.versions || [],
    statuses: (filterOptions.statuses || defaults.statuses || []).map((s) =>
      typeof s === 'string'
        ? s
        : { value: s.label || s.value, label: s.label || s.value }
    ),
  };
}
