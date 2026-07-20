/**
 * Location Explorer place search — address, zip, city, state, metro, country.
 * Nominatim (OpenStreetMap) geocoder; no API key required.
 */

const NOMINATIM_TIMEOUT_MS = 7000;
const GEO_USER_AGENT =
  'AetrexFleetDashboard/0.2 (location-explorer; contact=support@aetrex.com)';

const COUNTRY_ALIASES = {
  us: 'United States',
  usa: 'United States',
  'u.s.': 'United States',
  'u.s.a.': 'United States',
  'u.s.a': 'United States',
  'united states of america': 'United States',
  america: 'United States',
  uk: 'United Kingdom',
  'u.k.': 'United Kingdom',
  'u.k': 'United Kingdom',
  britain: 'United Kingdom',
  'great britain': 'United Kingdom',
  england: 'United Kingdom',
  uae: 'United Arab Emirates',
  holland: 'Netherlands',
  korea: 'South Korea',
  nz: 'New Zealand',
  au: 'Australia',
  aus: 'Australia',
  deutschland: 'Germany',
  bharat: 'India',
  hindustan: 'India',
};

const US_STATE_ALIASES = {
  al: 'Alabama',
  ak: 'Alaska',
  az: 'Arizona',
  ar: 'Arkansas',
  ca: 'California',
  co: 'Colorado',
  ct: 'Connecticut',
  de: 'Delaware',
  fl: 'Florida',
  ga: 'Georgia',
  hi: 'Hawaii',
  id: 'Idaho',
  il: 'Illinois',
  in: 'Indiana',
  ia: 'Iowa',
  ks: 'Kansas',
  ky: 'Kentucky',
  la: 'Louisiana',
  me: 'Maine',
  md: 'Maryland',
  ma: 'Massachusetts',
  mi: 'Michigan',
  mn: 'Minnesota',
  ms: 'Mississippi',
  mo: 'Missouri',
  mt: 'Montana',
  ne: 'Nebraska',
  nv: 'Nevada',
  nh: 'New Hampshire',
  nj: 'New Jersey',
  nm: 'New Mexico',
  ny: 'New York',
  nc: 'North Carolina',
  nd: 'North Dakota',
  oh: 'Ohio',
  ok: 'Oklahoma',
  or: 'Oregon',
  pa: 'Pennsylvania',
  ri: 'Rhode Island',
  sc: 'South Carolina',
  sd: 'South Dakota',
  tn: 'Tennessee',
  tx: 'Texas',
  ut: 'Utah',
  vt: 'Vermont',
  va: 'Virginia',
  wa: 'Washington',
  wv: 'West Virginia',
  wi: 'Wisconsin',
  wy: 'Wyoming',
  dc: 'District of Columbia',
  tennessee: 'Tennessee',
  california: 'California',
  texas: 'Texas',
  florida: 'Florida',
  'new york': 'New York',
};

const INDIA_STATE_ALIASES = {
  ka: 'Karnataka',
  kar: 'Karnataka',
  karnataka: 'Karnataka',
  mh: 'Maharashtra',
  maharashtra: 'Maharashtra',
  'tamil nadu': 'Tamil Nadu',
  tg: 'Telangana',
  telangana: 'Telangana',
  telengana: 'Telangana',
  dl: 'Delhi',
  delhi: 'Delhi',
  hr: 'Haryana',
  haryana: 'Haryana',
  up: 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  uttarakhand: 'Uttarakhand',
  mp: 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  rj: 'Rajasthan',
  rajasthan: 'Rajasthan',
  gj: 'Gujarat',
  gujarat: 'Gujarat',
  kl: 'Kerala',
  kerala: 'Kerala',
  pb: 'Punjab',
  punjab: 'Punjab',
  wb: 'West Bengal',
  'west bengal': 'West Bengal',
};

const AU_STATE_ALIASES = {
  nsw: 'New South Wales',
  'new south wales': 'New South Wales',
  qld: 'Queensland',
  queensland: 'Queensland',
  vic: 'Victoria',
  victoria: 'Victoria',
  wa: 'Western Australia',
  'western australia': 'Western Australia',
  sa: 'South Australia',
  'south australia': 'South Australia',
  tas: 'Tasmania',
  tasmania: 'Tasmania',
  act: 'Australian Capital Territory',
  nt: 'Northern Territory',
};

const STREET_HINT =
  /\b(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|hwy|highway|suite|ste|apt|unit|#)\b/i;

function normalizeLng(lng) {
  if (!Number.isFinite(lng)) return lng;
  let n = lng;
  while (n > 180) n -= 360;
  while (n < -180) n += 360;
  return n;
}

export function isUsZip(query) {
  return /^\d{5}(-\d{4})?$/.test(String(query || '').trim());
}

export function looksLikeZip(query) {
  const q = String(query || '').trim();
  if (!q || /\s/.test(q)) return false;
  if (isUsZip(q)) return true;
  return /^[a-z0-9]{3,10}$/i.test(q) && /\d/.test(q) && /[a-z]/i.test(q);
}

export function looksLikeAddress(query) {
  const q = String(query || '').trim();
  if (!q) return false;
  if (isUsZip(q) || looksLikeZip(q)) return false;
  if (STREET_HINT.test(q)) return true;
  if (/^\d+\s+\S+/.test(q)) return true;
  if (q.includes(',') && /\d/.test(q)) return true;
  return false;
}

export function resolveCountryQuery(query, knownCountries = []) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return null;
  if (COUNTRY_ALIASES[q]) return COUNTRY_ALIASES[q];

  const known = knownCountries.find((c) => String(c).trim().toLowerCase() === q);
  if (known) return String(known).trim();

  const aliasHit = Object.values(COUNTRY_ALIASES).find(
    (name) => name.toLowerCase() === q
  );
  return aliasHit || null;
}

/** All region interpretations of a state query (handles WA / SA ambiguity). */
function resolveAllStateQueries(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return [];

  const out = [];
  const push = (name, region) => {
    if (!name) return;
    if (!out.some((s) => s.name === name && s.region === region)) {
      out.push({ name, region });
    }
  };

  push(US_STATE_ALIASES[q], 'us');
  push(INDIA_STATE_ALIASES[q], 'in');
  push(AU_STATE_ALIASES[q], 'au');

  const usFull = Object.values(US_STATE_ALIASES).find((n) => n.toLowerCase() === q);
  push(usFull, 'us');
  const inFull = Object.values(INDIA_STATE_ALIASES).find(
    (n) => n.toLowerCase() === q
  );
  push(inFull, 'in');
  const auFull = Object.values(AU_STATE_ALIASES).find((n) => n.toLowerCase() === q);
  push(auFull, 'au');

  return out;
}

function normalizeStateQuery(query) {
  const all = resolveAllStateQueries(query);
  if (!all.length) return null;
  // Prefer unambiguous full names; for abbreviations keep first but callers
  // that need all regions should use resolveAllStateQueries / findMetrosByState.
  if (all.length === 1) return all[0];
  // Prefer full-name-only region when query equals a full state name
  const q = String(query || '')
    .trim()
    .toLowerCase();
  const fullHit = all.find((s) => s.name.toLowerCase() === q);
  return fullHit || all[0];
}

function stateEquals(metroState, canonicalName) {
  const raw = String(metroState || '').trim();
  if (!raw || !canonicalName) return false;
  const lower = raw.toLowerCase();
  const canon = canonicalName.toLowerCase();
  if (lower === canon) return true;
  const fromUs = US_STATE_ALIASES[lower];
  if (fromUs && fromUs.toLowerCase() === canon) return true;
  const fromIn = INDIA_STATE_ALIASES[lower];
  if (fromIn && fromIn.toLowerCase() === canon) return true;
  const fromAu = AU_STATE_ALIASES[lower];
  if (fromAu && fromAu.toLowerCase() === canon) return true;
  return false;
}

function countryEquals(metroCountry, canonical) {
  const country = String(metroCountry || '').trim().toLowerCase();
  if (!country || country === '—' || !canonical) return false;
  const target = String(canonical).trim().toLowerCase();
  if (country === target) return true;

  const resolvedCountry = (COUNTRY_ALIASES[country] || country).toLowerCase();
  const resolvedTarget = (COUNTRY_ALIASES[target] || target).toLowerCase();
  if (resolvedCountry === resolvedTarget) return true;

  // Avoid fuzzy matches that confuse near-names (Australia / Austria)
  return false;
}

function enrichQuery(query) {
  const q = String(query || '').trim();
  if (isUsZip(q)) return `${q}, USA`;
  const country = resolveCountryQuery(q);
  if (country) return country;
  const states = resolveAllStateQueries(q);
  if (states.length === 1) {
    const state = states[0];
    if (state.region === 'in') return `${state.name}, India`;
    if (state.region === 'au') return `${state.name}, Australia`;
    return `${state.name}, USA`;
  }
  // Ambiguous abbrevs (WA, SA, …) — don't force USA; let Nominatim + scoring decide
  return q;
}

function zoomFromNominatim(result) {
  const type = String(result.type || result.class || '').toLowerCase();
  if (type === 'house' || type === 'residential' || type === 'road') return 15;
  if (type === 'postcode') return 14;
  if (['city', 'town', 'village', 'municipality', 'suburb'].includes(type)) {
    return 12;
  }
  if (type === 'county' || type === 'administrative') {
    const rank = Number(result.place_rank);
    if (Number.isFinite(rank) && rank <= 8) return 5;
    if (Number.isFinite(rank) && rank <= 12) return 8;
    return 10;
  }
  if (type === 'state') return 8;
  if (type === 'country') return 5;
  return 12;
}

function scoreNominatimResult(result, originalQuery) {
  const cc = String(result.address?.country_code || '').toUpperCase();
  const type = String(result.type || '').toLowerCase();
  let score = 0;
  if (['US', 'IN', 'CA', 'GB', 'AU', 'MX'].includes(cc)) score += 8;
  if (isUsZip(originalQuery) && cc === 'US') score += 40;
  if (result.type === 'postcode') score += 6;
  if (result.importance) score += Number(result.importance) * 5;

  const countryQuery = resolveCountryQuery(originalQuery);
  if (countryQuery && (type === 'country' || result.class === 'boundary')) {
    score += 50;
  }
  const stateQuery = normalizeStateQuery(originalQuery);
  if (stateQuery && type === 'state') score += 40;
  return score;
}

function pickBestNominatim(results, originalQuery) {
  if (!Array.isArray(results) || !results.length) return null;
  return [...results].sort(
    (a, b) =>
      scoreNominatimResult(b, originalQuery) - scoreNominatimResult(a, originalQuery)
  )[0];
}

async function fetchWithTimeout(url, { signal, timeoutMs } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs || 4000);
  const onAbort = () => controller.abort();

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer);
      throw new DOMException('Aborted', 'AbortError');
    }
    signal.addEventListener('abort', onAbort);
  }

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': GEO_USER_AGENT,
      },
    });
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

async function geocodeWithNominatim(query, originalQuery, signal) {
  try {
    const params = new URLSearchParams({
      format: 'json',
      q: query,
      limit: '8',
      addressdetails: '1',
    });
    if (isUsZip(originalQuery)) params.set('countrycodes', 'us');

    const states = resolveAllStateQueries(originalQuery);
    if (states.length === 1) {
      if (states[0].region === 'us') params.set('countrycodes', 'us');
      if (states[0].region === 'in') params.set('countrycodes', 'in');
      if (states[0].region === 'au') params.set('countrycodes', 'au');
    }

    const response = await fetchWithTimeout(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      { signal, timeoutMs: NOMINATIM_TIMEOUT_MS }
    );
    if (!response.ok) return null;

    const results = await response.json();
    const match = pickBestNominatim(results, originalQuery);
    if (!match) return null;

    const lat = parseFloat(match.lat);
    const lng = parseFloat(match.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
      lat,
      lng: normalizeLng(lng),
      label: match.display_name || match.name || 'Location',
      zoom: zoomFromNominatim(match),
      source: 'nominatim',
    };
  } catch (err) {
    if (err?.name === 'AbortError' && signal?.aborted) throw err;
    return null;
  }
}

/** Free-form address / zip / place geocode. */
export async function geocodePlace(query, { signal } = {}) {
  const original = String(query || '').trim();
  if (!original) return null;

  const place = await geocodeWithNominatim(
    enrichQuery(original),
    original,
    signal
  );
  if (!place) return null;

  if (resolveCountryQuery(original)) {
    return { ...place, zoom: Math.min(place.zoom || 5, 5) };
  }
  if (normalizeStateQuery(original)) {
    return { ...place, zoom: Math.max(place.zoom || 8, 8) };
  }
  if (isUsZip(original) || looksLikeZip(original)) {
    return { ...place, zoom: Math.max(place.zoom || 14, 13) };
  }
  return { ...place, zoom: Math.max(place.zoom || 12, 11) };
}

export function findMetroByZip(metros, scannersByMetro, query) {
  const q = String(query || '')
    .trim()
    .replace(/\s+/g, '')
    .toLowerCase();
  // Require a real zip-length query before matching (avoids short false positives)
  if (!q || q.length < 4) return null;

  for (const metro of metros) {
    const scanners = scannersByMetro.get(metro.metroKey) || [];
    const hit = scanners.some((s) => {
      const zip = String(s.zip || '')
        .replace(/\s+/g, '')
        .toLowerCase();
      if (!zip) return false;
      if (zip === q) return true;
      if (q.length >= 5 && (zip.startsWith(q) || q.startsWith(zip.slice(0, 5)))) {
        return true;
      }
      return false;
    });
    if (hit) return metro;
  }
  return null;
}

export function findMetrosByCountry(metros, query) {
  const known = [
    ...new Set(metros.map((m) => m.country).filter((c) => c && c !== '—')),
  ];
  const canonical = resolveCountryQuery(query, known);
  if (!canonical) {
    const q = String(query || '')
      .trim()
      .toLowerCase();
    if (!q || q.length < 3) return [];
    return metros.filter(
      (m) => String(m.country || '').trim().toLowerCase() === q
    );
  }
  return metros.filter((m) => countryEquals(m.country, canonical));
}

export function findMetrosByState(metros, query) {
  const states = resolveAllStateQueries(query);
  if (states.length) {
    const names = states.map((s) => s.name);
    return metros.filter((m) => names.some((name) => stateEquals(m.state, name)));
  }
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q || q.length < 2) return [];
  return metros.filter((m) => String(m.state || '').trim().toLowerCase() === q);
}

export function findExactMetro(metros, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return null;

  if (resolveCountryQuery(query, metros.map((m) => m.country))) return null;
  if (normalizeStateQuery(query)) return null;

  return (
    metros.find(
      (m) =>
        (m.city || '').toLowerCase() === q ||
        m.metro.toLowerCase() === q ||
        m.metro.toLowerCase().startsWith(`${q},`)
    ) || null
  );
}

export function filterMetrosByQuery(metros, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return metros;

  const byCountry = findMetrosByCountry(metros, query);
  if (byCountry.length) return byCountry;

  const byState = findMetrosByState(metros, query);
  if (byState.length) return byState;

  return metros.filter(
    (m) =>
      m.metro.toLowerCase().includes(q) ||
      (m.city || '').toLowerCase().includes(q) ||
      (m.state || '').toLowerCase().includes(q) ||
      String(m.country || '')
        .toLowerCase()
        .includes(q)
  );
}
