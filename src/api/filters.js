/**
 * Shared filter-option shaping for overview / releases / devices APIs.
 */

function asOption(entry) {
  if (entry == null || entry === '') return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    const text = String(entry);
    return { value: text, label: text };
  }
  if (typeof entry === 'object') {
    const label = entry.label ?? entry.name ?? entry.text ?? entry.value ?? '';
    const value = entry.value ?? entry.id ?? entry.code ?? label;
    const labelText = typeof label === 'object' ? String(label?.name ?? label?.label ?? '') : String(label);
    const valueText = typeof value === 'object' ? String(value?.id ?? value?.value ?? labelText) : String(value);
    if (!valueText && !labelText) return null;
    return { value: valueText || labelText, label: labelText || valueText };
  }
  return { value: String(entry), label: String(entry) };
}

function normalizeList(list = [], defaults = []) {
  const source = Array.isArray(list) && list.length ? list : defaults || [];
  return source.map(asOption).filter(Boolean);
}

export function normalizeFilterOptions(filterOptions = {}, defaults = {}) {
  return {
    countries: normalizeList(filterOptions.countries, defaults.countries),
    models: normalizeList(filterOptions.models, defaults.models),
    versions: normalizeList(filterOptions.versions, defaults.versions),
    statuses: normalizeList(filterOptions.statuses, defaults.statuses),
  };
}
