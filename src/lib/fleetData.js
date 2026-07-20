/**
 * Fleet map helpers — normalize stores, build metro index, client-side pin placement
 * (seed / state / country centroids). Map data comes from Aetrex-backend via src/api/fleet.js.
 */

const GEO_CACHE_KEY = 'aetrex-metro-geocodes-v9';
const BUBBLE_COLORS = {
  green: { fill: '#5cb85c', border: '#3d8b3d' },
  yellow: { fill: '#f0ad4e', border: '#d58512' },
  orange: { fill: '#e67e22', border: '#c46814' },
  red: { fill: '#d9534f', border: '#ac2925' },
};

const COUNTRY_CENTROIDS = {
  'United States': [39.8283, -98.5795],
  Canada: [56.1304, -106.3468],
  Sweden: [60.1282, 18.6435],
  Israel: [31.0461, 34.8516],
  Denmark: [56.2639, 9.5018],
  Netherlands: [52.1326, 5.2913],
  'United Arab Emirates': [23.4241, 53.8478],
  Indonesia: [-0.7893, 113.9213],
  Finland: [61.9241, 25.7482],
  Poland: [51.9194, 19.1451],
  Mexico: [23.6345, -102.5528],
  Japan: [36.2048, 138.2529],
  Philippines: [12.8797, 121.774],
  Portugal: [39.3999, -8.2245],
  Spain: [40.4637, -3.7492],
  'United Kingdom': [55.3781, -3.436],
  Germany: [51.1657, 10.4515],
  France: [46.2276, 2.2137],
  Australia: [-25.2744, 133.7751],
  India: [20.5937, 78.9629],
  Brazil: [-14.235, -51.9253],
  Italy: [41.8719, 12.5674],
  Norway: [60.472, 8.4689],
  Belgium: [50.5039, 4.4699],
  Austria: [47.5162, 14.5501],
  Switzerland: [46.8182, 8.2275],
  Ireland: [53.4129, -8.2439],
  'New Zealand': [-40.9006, 174.886],
  Singapore: [1.3521, 103.8198],
  'South Africa': [-30.5595, 22.9375],
  'South Korea': [35.9078, 127.7669],
  China: [35.8617, 104.1954],
  Turkey: [38.9637, 35.2433],
  Greece: [39.0742, 21.8243],
  Hungary: [47.1625, 19.5033],
  'Czech Republic': [49.8175, 15.473],
  Romania: [45.9432, 24.9668],
  Croatia: [45.1, 15.2],
  Slovakia: [48.669, 19.699],
  Slovenia: [46.1512, 14.9955],
  Lithuania: [55.1694, 23.8813],
  Latvia: [56.8796, 24.6032],
  Estonia: [58.5953, 25.0136],
  Luxembourg: [49.8153, 6.1296],
  Malta: [35.9375, 14.3754],
  Cyprus: [35.1264, 33.4299],
  Iceland: [64.9631, -19.0208],
  Thailand: [15.87, 100.9925],
  Malaysia: [4.2105, 101.9758],
  Vietnam: [14.0583, 108.2772],
  Taiwan: [23.6978, 120.9605],
  'Hong Kong': [22.3193, 114.1694],
  Colombia: [4.5709, -74.2973],
  Chile: [-35.6751, -71.543],
  Argentina: [-38.4161, -63.6167],
  Peru: [-9.19, -75.0152],
  Ecuador: [-1.8312, -78.1834],
  Panama: [8.538, -80.7821],
  'Costa Rica': [9.7489, -83.7534],
  'Puerto Rico': [18.2208, -66.5901],
  Jamaica: [18.1096, -77.2975],
  Kuwait: [29.3117, 47.4818],
  Qatar: [25.3548, 51.1839],
  Bahrain: [26.0667, 50.5577],
  'Saudi Arabia': [23.8859, 45.0792],
  Jordan: [30.5852, 36.2384],
  Lebanon: [33.8547, 35.8623],
  Egypt: [26.8206, 30.8025],
  Morocco: [31.7917, -7.0926],
  Nigeria: [9.082, 8.6753],
  Kenya: [-0.0236, 37.9062],
  Kazakhstan: [48.0196, 66.9237],
  Ukraine: [48.3794, 31.1656],
  Russia: [61.524, 105.3188],
  Belarus: [53.7098, 27.9534],
  Serbia: [44.0165, 21.0059],
  Bulgaria: [42.7339, 25.4858],
  Pakistan: [30.3753, 69.3451],
  Bangladesh: [23.685, 90.3563],
  'Sri Lanka': [7.8731, 80.7718],
};

const CITY_ALIASES = {
  bangalore: 'Bengaluru',
  banglore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  "b'luru": 'Bengaluru',
  bluru: 'Bengaluru',
  bombay: 'Mumbai',
  madras: 'Chennai',
  calcutta: 'Kolkata',
  gurgaon: 'Gurugram',
  gurugram: 'Gurugram',
  mysore: 'Mysuru',
  mysuru: 'Mysuru',
  trivandrum: 'Thiruvananthapuram',
  pondicherry: 'Puducherry',
  poona: 'Pune',
  koramangala: 'Bengaluru',
  hyd: 'Hyderabad',
  hyderabad: 'Hyderabad',
};

const INDIA_STATE_ALIASES = {
  ka: 'Karnataka',
  kar: 'Karnataka',
  k: 'Karnataka',
  karnataka: 'Karnataka',
  bangalore: 'Karnataka',
  banglore: 'Karnataka',
  bengaluru: 'Karnataka',
  mh: 'Maharashtra',
  maharashtra: 'Maharashtra',
  tn: 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  telengana: 'Telangana',
  telangana: 'Telangana',
  ts: 'Telangana',
  up: 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  uk: 'Uttarakhand',
  uttarakhand: 'Uttarakhand',
  'uttaranchal': 'Uttarakhand',
  hr: 'Haryana',
  haryana: 'Haryana',
  dl: 'Delhi',
  'new delhi': 'Delhi',
  delhi: 'Delhi',
  mp: 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  rj: 'Rajasthan',
  rajasthan: 'Rajasthan',
  mysore: 'Karnataka',
};

const US_STATE_ALIASES = {
  tx: 'Texas',
  ca: 'California',
  ny: 'New York',
  fl: 'Florida',
  il: 'Illinois',
  pa: 'Pennsylvania',
  oh: 'Ohio',
  ga: 'Georgia',
  nc: 'North Carolina',
  mi: 'Michigan',
  nj: 'New Jersey',
  va: 'Virginia',
  wa: 'Washington',
  ma: 'Massachusetts',
  az: 'Arizona',
  co: 'Colorado',
  md: 'Maryland',
  mn: 'Minnesota',
  mo: 'Missouri',
  wi: 'Wisconsin',
  ct: 'Connecticut',
  or: 'Oregon',
  al: 'Alabama',
  ok: 'Oklahoma',
  tn: 'Tennessee',
  tennessee: 'Tennessee',
};

/** Australia — scoped separately so WA ≠ Washington, VIC ≠ nothing US */
const AU_STATE_ALIASES = {
  nsw: 'New South Wales',
  'new south wales': 'New South Wales',
  'nsw (new south wales)': 'New South Wales',
  qld: 'Queensland',
  queensland: 'Queensland',
  vic: 'Victoria',
  victoria: 'Victoria',
  'vic (victoria)': 'Victoria',
  wa: 'Western Australia',
  'western australia': 'Western Australia',
  sa: 'South Australia',
  'south australia': 'South Australia',
  tas: 'Tasmania',
  tasmania: 'Tasmania',
  act: 'Australian Capital Territory',
  'australian capital territory': 'Australian Capital Territory',
  nt: 'Northern Territory',
  'northern territory': 'Northern Territory',
  // Dirty store rows sometimes put city names in State
  sydney: 'New South Wales',
  melbourne: 'Victoria',
  brisbane: 'Queensland',
  perth: 'Western Australia',
  adelaide: 'South Australia',
  hobart: 'Tasmania',
  canberra: 'Australian Capital Territory',
  'port kennedy': 'Western Australia',
  'jindabyne nsw': 'New South Wales',
};

// Verified city coordinates used before any online geocoder
const CITY_COORDS = {
  'bengaluru|india': { lat: 12.9768, lng: 77.5901 },
  'bangalore|india': { lat: 12.9768, lng: 77.5901 },
  'mumbai|india': { lat: 19.055, lng: 72.8692 },
  'thane|india': { lat: 19.1943, lng: 72.9702 },
  'mysuru|india': { lat: 12.3052, lng: 76.6554 },
  'mysore|india': { lat: 12.3052, lng: 76.6554 },
  'chennai|india': { lat: 13.0827, lng: 80.2707 },
  'hyderabad|india': { lat: 17.385, lng: 78.4867 },
  'new delhi|india': { lat: 28.6139, lng: 77.209 },
  'delhi|india': { lat: 28.6139, lng: 77.209 },
  'gurugram|india': { lat: 28.4595, lng: 77.0266 },
  'gurgaon|india': { lat: 28.4595, lng: 77.0266 },
  'noida|india': { lat: 28.5355, lng: 77.391 },
  'indore|india': { lat: 22.7196, lng: 75.8577 },
  'jodhpur|india': { lat: 26.2389, lng: 73.0243 },
  'koramangala|india': { lat: 12.9352, lng: 77.6245 },
  'dehradun|india': { lat: 30.3165, lng: 78.0322 },
  // Commercial activity clusters around Dehradun — better than geometric state center
  'uttarakhand|india': { lat: 30.3165, lng: 78.0322 },
  // Tennessee — include state in key when city names collide across US states
  'chattanooga|tn|united states': { lat: 35.0456, lng: -85.3097 },
  'chattanooga|tennessee|united states': { lat: 35.0456, lng: -85.3097 },
  'knoxville|tn|united states': { lat: 35.9606, lng: -83.9207 },
  'knoxville|tennessee|united states': { lat: 35.9606, lng: -83.9207 },
  'nashville|tn|united states': { lat: 36.1627, lng: -86.7816 },
  'nashville|tennessee|united states': { lat: 36.1627, lng: -86.7816 },
  'franklin|tn|united states': { lat: 35.9251, lng: -86.8689 },
  'franklin|tennessee|united states': { lat: 35.9251, lng: -86.8689 },
  'clarksville|tn|united states': { lat: 36.5298, lng: -87.3595 },
  'clarksville|tennessee|united states': { lat: 36.5298, lng: -87.3595 },
  'johnson city|tn|united states': { lat: 36.3134, lng: -82.3535 },
  'johnson city|tennessee|united states': { lat: 36.3134, lng: -82.3535 },
  'bristol|tn|united states': { lat: 36.5951, lng: -82.1887 },
  'bristol|tennessee|united states': { lat: 36.5951, lng: -82.1887 },
  'cleveland|tn|united states': { lat: 35.1595, lng: -84.8766 },
  'cleveland|tennessee|united states': { lat: 35.1595, lng: -84.8766 },
  'hixson|tn|united states': { lat: 35.1398, lng: -85.2319 },
  'hixson|tennessee|united states': { lat: 35.1398, lng: -85.2319 },
  'hendersonville|tn|united states': { lat: 36.3048, lng: -86.62 },
  'hendersonville|tennessee|united states': { lat: 36.3048, lng: -86.62 },
  'maryville|tn|united states': { lat: 35.7565, lng: -83.9705 },
  'maryville|tennessee|united states': { lat: 35.7565, lng: -83.9705 },
  'morristown|tn|united states': { lat: 36.214, lng: -83.2949 },
  'morristown|tennessee|united states': { lat: 36.214, lng: -83.2949 },
  'sevierville|tn|united states': { lat: 35.8681, lng: -83.5618 },
  'sevierville|tennessee|united states': { lat: 35.8681, lng: -83.5618 },
  'antioch|tn|united states': { lat: 36.06, lng: -86.6722 },
  'antioch|tennessee|united states': { lat: 36.06, lng: -86.6722 },
  'farragut|tn|united states': { lat: 35.8845, lng: -84.1535 },
  'farragut|tennessee|united states': { lat: 35.8845, lng: -84.1535 },
  'lawrenceburg|tn|united states': { lat: 35.2423, lng: -87.3347 },
  'lawrenceburg|tennessee|united states': { lat: 35.2423, lng: -87.3347 },
  'pulaski|tn|united states': { lat: 35.1998, lng: -87.0308 },
  'pulaski|tennessee|united states': { lat: 35.1998, lng: -87.0308 },
  'madison|tn|united states': { lat: 36.2561, lng: -86.685 },
  'madison|tennessee|united states': { lat: 36.2561, lng: -86.685 },
  // Australia — major metros / suburb clusters from fleet data
  'sydney|australia': { lat: -33.8688, lng: 151.2093 },
  'sydney|new south wales|australia': { lat: -33.8688, lng: 151.2093 },
  'sydney|nsw|australia': { lat: -33.8688, lng: 151.2093 },
  'alexandria|nsw|australia': { lat: -33.901, lng: 151.198 },
  'alexandria|new south wales|australia': { lat: -33.901, lng: 151.198 },
  'marrickville|nsw|australia': { lat: -33.911, lng: 151.155 },
  'marrickville|new south wales|australia': { lat: -33.911, lng: 151.155 },
  'marrickville|queensland|australia': { lat: -27.555, lng: 153.05 },
  'marrickville|qld|australia': { lat: -27.555, lng: 153.05 },
  'penrith|new south wales|australia': { lat: -33.75, lng: 150.694 },
  'penrith|nsw|australia': { lat: -33.75, lng: 150.694 },
  'corrimal|nsw|australia': { lat: -34.372, lng: 150.906 },
  'lake haven|nsw|australia': { lat: -33.24, lng: 151.51 },
  'eastern creek|nsw|australia': { lat: -33.818, lng: 150.855 },
  'eastern creek|new south wales|australia': { lat: -33.818, lng: 150.855 },
  'marsden park|nsw|australia': { lat: -33.697, lng: 150.835 },
  'marsden park|sydney|australia': { lat: -33.697, lng: 150.835 },
  'marsden park|australia': { lat: -33.697, lng: 150.835 },
  'jindabyne|nsw|australia': { lat: -36.415, lng: 148.62 },
  'jindabyne nsw|australia': { lat: -36.415, lng: 148.62 },
  'melbourne|australia': { lat: -37.8136, lng: 144.9631 },
  'melbourne|victoria|australia': { lat: -37.8136, lng: 144.9631 },
  'melbourne|vic|australia': { lat: -37.8136, lng: 144.9631 },
  'docklands|victoria|australia': { lat: -37.815, lng: 144.946 },
  'docklands|australia': { lat: -37.815, lng: 144.946 },
  'epping|victoria|australia': { lat: -37.649, lng: 145.025 },
  'mill park|victoria|australia': { lat: -37.663, lng: 145.061 },
  'greensbrough|vic|australia': { lat: -37.704, lng: 145.103 },
  'greensborough|vic|australia': { lat: -37.704, lng: 145.103 },
  'kilsyth|victoria|australia': { lat: -37.8, lng: 145.316 },
  'kilsyth|vic|australia': { lat: -37.8, lng: 145.316 },
  'malvern east|victoria|australia': { lat: -37.874, lng: 145.05 },
  'malvern east|vic|australia': { lat: -37.874, lng: 145.05 },
  'oakleigh south|victoria|australia': { lat: -37.924, lng: 145.105 },
  'oakleigh south|australia': { lat: -37.924, lng: 145.105 },
  'brisbane|australia': { lat: -27.4698, lng: 153.0251 },
  'brisbane|queensland|australia': { lat: -27.4698, lng: 153.0251 },
  'brisbane|qld|australia': { lat: -27.4698, lng: 153.0251 },
  'coomera|queensland|australia': { lat: -27.872, lng: 153.333 },
  'coomera|qld|australia': { lat: -27.872, lng: 153.333 },
  'coomera|australia': { lat: -27.872, lng: 153.333 },
  'browns plains|queensland|australia': { lat: -27.66, lng: 153.05 },
  'browns plains|australia': { lat: -27.66, lng: 153.05 },
  'hillcrest|queensland|australia': { lat: -27.67, lng: 153.03 },
  'hillcrest|australia': { lat: -27.67, lng: 153.03 },
  'perth|australia': { lat: -31.9505, lng: 115.8605 },
  'perth|western australia|australia': { lat: -31.9505, lng: 115.8605 },
  'perth|wa|australia': { lat: -31.9505, lng: 115.8605 },
  'bibra lake|western australia|australia': { lat: -32.098, lng: 115.819 },
  'bibra lake|australia': { lat: -32.098, lng: 115.819 },
  'port kennedy|wa|australia': { lat: -32.37, lng: 115.75 },
  'port kennedy|western australia|australia': { lat: -32.37, lng: 115.75 },
  'port kennedy|australia': { lat: -32.37, lng: 115.75 },
  'adelaide|australia': { lat: -34.9285, lng: 138.6007 },
  'hobart|australia': { lat: -42.8821, lng: 147.3272 },
  'hobart|tasmania|australia': { lat: -42.8821, lng: 147.3272 },
  'burnie|tasmania|australia': { lat: -41.055, lng: 145.907 },
  'moonah|tasmania|australia': { lat: -42.846, lng: 147.3 },
  'canberra|australia': { lat: -35.2809, lng: 149.13 },
};

const PLACEHOLDER_CITY = /^(x+|xxx+|tbd|abc|oo|null|n\/?a|test|unknown)$/i;

const INDIA_STATE_KEYS = new Set([
  'Karnataka',
  'Maharashtra',
  'Tamil Nadu',
  'Telangana',
  'Delhi',
  'Haryana',
  'Uttar Pradesh',
  'Uttarakhand',
  'Madhya Pradesh',
  'Rajasthan',
  'Gujarat',
  'Kerala',
  'Punjab',
  'West Bengal',
]);

const US_STATE_KEYS = new Set([
  'Texas',
  'TX',
  'California',
  'CA',
  'New York',
  'NY',
  'Florida',
  'FL',
  'Illinois',
  'IL',
  'Pennsylvania',
  'PA',
  'Ohio',
  'OH',
  'Georgia',
  'GA',
  'North Carolina',
  'NC',
  'Michigan',
  'MI',
  'New Jersey',
  'NJ',
  'Virginia',
  'VA',
  'Washington',
  'WA',
  'Massachusetts',
  'MA',
  'Arizona',
  'AZ',
  'Colorado',
  'CO',
  'Maryland',
  'MD',
  'Minnesota',
  'MN',
  'Missouri',
  'MO',
  'Wisconsin',
  'WI',
  'Connecticut',
  'CT',
  'Oregon',
  'OR',
  'Alabama',
  'AL',
  'Oklahoma',
  'OK',
  'Tennessee',
  'TN',
]);

const AU_STATE_KEYS = new Set([
  'New South Wales',
  'NSW',
  'Queensland',
  'QLD',
  'Victoria',
  'VIC',
  'Western Australia',
  'WA',
  'South Australia',
  'SA',
  'Tasmania',
  'TAS',
  'Australian Capital Territory',
  'ACT',
  'Northern Territory',
  'NT',
]);

const STATE_CENTROIDS = {
  // India
  Karnataka: [15.3173, 75.7139],
  Maharashtra: [19.7515, 75.7139],
  'Tamil Nadu': [11.1271, 78.6569],
  Telangana: [18.1124, 79.0193],
  Delhi: [28.7041, 77.1025],
  Haryana: [29.0588, 76.0856],
  'Uttar Pradesh': [26.8467, 80.9462],
  Uttarakhand: [30.3165, 78.0322],
  'Madhya Pradesh': [22.9734, 78.6569],
  Rajasthan: [27.0238, 74.2179],
  Gujarat: [22.2587, 71.1924],
  Kerala: [10.8505, 76.2711],
  Punjab: [31.1471, 75.3412],
  'West Bengal': [22.9868, 87.855],
  // US (common abbreviations + full names)
  Texas: [31.9686, -99.9018],
  TX: [31.9686, -99.9018],
  California: [36.7783, -119.4179],
  CA: [36.7783, -119.4179],
  'New York': [43.0, -75.0],
  NY: [43.0, -75.0],
  Florida: [27.6648, -81.5158],
  FL: [27.6648, -81.5158],
  Illinois: [40.6331, -89.3985],
  IL: [40.6331, -89.3985],
  Pennsylvania: [41.2033, -77.1945],
  PA: [41.2033, -77.1945],
  Ohio: [40.4173, -82.9071],
  OH: [40.4173, -82.9071],
  Georgia: [32.1656, -82.9001],
  GA: [32.1656, -82.9001],
  'North Carolina': [35.7596, -79.0193],
  NC: [35.7596, -79.0193],
  Michigan: [44.3148, -85.6024],
  MI: [44.3148, -85.6024],
  'New Jersey': [40.0583, -74.4057],
  NJ: [40.0583, -74.4057],
  Virginia: [37.4316, -78.6569],
  VA: [37.4316, -78.6569],
  Washington: [47.4009, -121.4905],
  WA: [47.4009, -121.4905],
  Massachusetts: [42.4072, -71.3824],
  MA: [42.4072, -71.3824],
  Arizona: [34.0489, -111.0937],
  AZ: [34.0489, -111.0937],
  Colorado: [39.5501, -105.7821],
  CO: [39.5501, -105.7821],
  Maryland: [39.0458, -76.6413],
  MD: [39.0458, -76.6413],
  Minnesota: [46.7296, -94.6859],
  MN: [46.7296, -94.6859],
  Missouri: [37.9643, -91.8318],
  MO: [37.9643, -91.8318],
  Wisconsin: [43.7844, -88.7879],
  WI: [43.7844, -88.7879],
  Connecticut: [41.6032, -73.0877],
  CT: [41.6032, -73.0877],
  Oregon: [43.8041, -120.5542],
  OR: [43.8041, -120.5542],
  Alabama: [32.3182, -86.9023],
  AL: [32.3182, -86.9023],
  Oklahoma: [35.4676, -97.5164],
  OK: [35.4676, -97.5164],
  Tennessee: [35.5175, -86.5804],
  TN: [35.5175, -86.5804],
  // Australia (full names only — avoid WA/VIC colliding with US keys)
  'New South Wales': [-32.0, 147.0],
  Queensland: [-22.0, 145.0],
  Victoria: [-37.0, 144.5],
  'Western Australia': [-26.0, 121.0],
  'South Australia': [-30.0, 135.0],
  Tasmania: [-42.0, 147.0],
  'Australian Capital Territory': [-35.3, 149.1],
  'Northern Territory': [-19.0, 133.0],
};

function getBubbleColor(scanners) {
  if (scanners <= 5) return BUBBLE_COLORS.green;
  if (scanners <= 10) return BUBBLE_COLORS.yellow;
  if (scanners <= 15) return BUBBLE_COLORS.orange;
  return BUBBLE_COLORS.red;
}

function getAvailability(metro) {
  if (!metro.scanners) return 0;
  return Math.round((metro.online / metro.scanners) * 1000) / 10;
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'active' || s === 'online' || s === 'ok') return 'status-online';
  if (s === 'idle' || s === 'pending' || s === 'locked') return 'status-pending';
  if (s === 'offline') return 'status-offline';
  return 'status-inactive';
}

function formatMetroLabel(city, state) {
  const cityName = String(city || '').trim() || 'Unknown';
  const stateName = String(state || '').trim();
  return stateName ? `${cityName}, ${stateName}` : cityName;
}

function buildMetroKey(city, state, country) {
  return `${String(city || '').trim().toLowerCase()}|${String(state || '')
    .trim()
    .toLowerCase()}|${String(country || '').trim().toLowerCase()}`;
}

function deriveScannerStatus(row) {
  const statusRaw = String(row.Status || '').trim();
  const activeFlag = String(row.ActiveFlg || '').trim().toUpperCase();

  if (/^LOCKED$/i.test(statusRaw)) return 'Offline';
  if (/^(Active|Idle|Offline)$/i.test(statusRaw)) {
    return statusRaw.charAt(0).toUpperCase() + statusRaw.slice(1).toLowerCase();
  }
  if (/^OK$/i.test(statusRaw) && activeFlag === 'Y') return 'Active';
  if (statusRaw) return statusRaw;
  return activeFlag === 'Y' ? 'Active' : 'Offline';
}

function normalizeStoreRow(row) {
  const hasAnyValue = Object.values(row || {}).some((v) => String(v || '').trim() !== '');
  if (!hasAnyValue) return null;

  const rawCity = String(row.City || '').trim() || 'Unknown';
  const rawState = String(row.State || '').trim();
  const country = String(row.Country || '').trim() || '—';
  // Normalize before metroKey so Bangalore / Bengaluru / KORAMANGALA share one metro
  const city = normalizeCityName(rawCity, rawState, country) || rawCity;
  const state = normalizeStateName(rawState, city, country) || rawState;
  const metroKey = buildMetroKey(city, state, country);
  const status = deriveScannerStatus(row);

  const storeNic = String(row.StoreNIC || '').replace(/\s+/g, '');
  const deviceId = String(row.DeviceIDComputed || '').trim();
  const serial =
    deviceId ||
    storeNic ||
    (row.StoreID ? `STR-${String(row.StoreID).trim()}` : 'UNKNOWN');

  const version =
    String(row.SoftwareVersionComputed || row.iStepVerNumber || '—').trim() || '—';

  return {
    storeId: String(row.StoreID || '').trim(),
    serial,
    store: String(row.StoreName || '').trim() || 'Unknown store',
    metroKey,
    metro: formatMetroLabel(city, state),
    city,
    state,
    country,
    zip: String(row.Zip || '').trim(),
    version,
    status,
    online: status !== 'Offline',
    brand: String(row.BrandName || '').trim(),
    deviceModel: deviceId,
    address: String(row.Address || '').trim(),
  };
}

function buildFleetIndex(stores) {
  const scannersByMetro = new Map();
  const metroMeta = new Map();

  stores.forEach((scanner) => {
    if (!scannersByMetro.has(scanner.metroKey)) {
      scannersByMetro.set(scanner.metroKey, []);
      metroMeta.set(scanner.metroKey, {
        metroKey: scanner.metroKey,
        metro: scanner.metro,
        city: scanner.city,
        state: scanner.state,
        country: scanner.country,
        lat: null,
        lng: null,
        scanners: 0,
        online: 0,
        offline: 0,
      });
    }

    scannersByMetro.get(scanner.metroKey).push(scanner);

    const metro = metroMeta.get(scanner.metroKey);
    metro.scanners += 1;
    if (scanner.online) metro.online += 1;
    else metro.offline += 1;
  });

  return {
    stores,
    metros: Array.from(metroMeta.values()),
    scannersByMetro,
  };
}

function readGeoCache() {
  try {
    const raw = localStorage.getItem(GEO_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn('Unable to read geocode cache', err);
    return {};
  }
}

function writeGeoCache(cache) {
  try {
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    console.warn('Unable to write geocode cache', err);
  }
}

function hashStr(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function normalizeCityName(city, state, country) {
  const raw = String(city || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  if (PLACEHOLDER_CITY.test(lower)) return '';

  // Dirty India abbreviations in store city names (b / ben / b'luru / koramangala)
  const countryNorm = String(country || '').trim().toLowerCase();
  const stateNorm = String(state || '').trim().toLowerCase();
  if (countryNorm === 'india') {
    if (
      /bengaluru|bangalore|banglore|b'?luru|koramangala/.test(lower) ||
      ((lower === 'b' || lower === 'ben') &&
        /^(k|ka|kar|karnataka|bangalore|banglore)$/.test(stateNorm))
    ) {
      return 'Bengaluru';
    }
    if (/chennai|nager/.test(lower)) return 'Chennai';
  }

  return CITY_ALIASES[lower] || raw;
}

function normalizeStateName(state, city, country) {
  const raw = String(state || '').trim();
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (PLACEHOLDER_CITY.test(lower)) return '';

  const countryNorm = String(country || '').trim().toLowerCase();
  const isUs =
    countryNorm === 'united states' ||
    countryNorm === 'usa' ||
    countryNorm === 'us';
  const isIndia = countryNorm === 'india';
  const isAustralia = countryNorm === 'australia' || countryNorm === 'au';

  // Country-scoped aliases — prevents US "TN" (Tennessee) mapping to Tamil Nadu
  // and US "WA" (Washington) mapping to Western Australia
  if (isUs && US_STATE_ALIASES[lower]) return US_STATE_ALIASES[lower];
  if (isIndia && INDIA_STATE_ALIASES[lower]) return INDIA_STATE_ALIASES[lower];
  if (isAustralia && AU_STATE_ALIASES[lower]) return AU_STATE_ALIASES[lower];

  if (isIndia) {
    if (/banglo|bengaluru|karnataka|^ka$|^kar$/.test(lower)) return 'Karnataka';
    if (/telengana|telangana/.test(lower)) return 'Telangana';
    if (/uttarakhand|uttaranchal/.test(lower)) return 'Uttarakhand';
  }

  if (isAustralia) {
    if (/new south wales|^nsw\b/.test(lower)) return 'New South Wales';
    if (/queensland|^qld\b/.test(lower)) return 'Queensland';
    if (/victoria|^vic\b/.test(lower)) return 'Victoria';
    if (/western australia|^wa\b/.test(lower)) return 'Western Australia';
    if (/south australia|^sa\b/.test(lower)) return 'South Australia';
    if (/tasmania|^tas\b/.test(lower)) return 'Tasmania';
  }

  // Already a known full/abbrev name for that country
  if (isUs && (US_STATE_KEYS.has(raw) || US_STATE_KEYS.has(raw.toUpperCase()))) {
    return US_STATE_ALIASES[lower] || raw;
  }
  if (isIndia && INDIA_STATE_KEYS.has(raw)) return raw;
  if (isAustralia && AU_STATE_KEYS.has(raw)) {
    return AU_STATE_ALIASES[lower] || raw;
  }

  return raw;
}

function sanitizeMetroLocation(metro) {
  const city = normalizeCityName(metro.city, metro.state, metro.country);
  const state = normalizeStateName(metro.state, city, metro.country);
  const country = String(metro.country || '').trim() || '—';
  const label = city
    ? state
      ? `${city}, ${state}`
      : city
    : metro.metro;

  return {
    ...metro,
    city: city || metro.city,
    state: state || metro.state,
    country,
    metro: label,
    _normalizedCity: city,
    _normalizedState: state,
  };
}

function lookupSeedCoords(metro) {
  const city = (metro._normalizedCity || normalizeCityName(metro.city, metro.state, metro.country) || '')
    .trim()
    .toLowerCase();
  const state = (metro._normalizedState || normalizeStateName(metro.state, city, metro.country) || '')
    .trim()
    .toLowerCase();
  const country = String(metro.country || '').trim().toLowerCase();
  if (!city || !country) return null;

  const keys = [];
  if (state) {
    keys.push(`${city}|${state}|${country}`);
    // Also try US postal abbreviation when we only have the full name (or vice versa)
    const usAbbr = Object.entries(US_STATE_ALIASES).find(
      ([, full]) => full.toLowerCase() === state
    )?.[0];
    if (usAbbr) keys.push(`${city}|${usAbbr}|${country}`);
    const usFull = US_STATE_ALIASES[state];
    if (usFull) keys.push(`${city}|${usFull.toLowerCase()}|${country}`);

    const auAbbr = Object.entries(AU_STATE_ALIASES).find(
      ([, full]) => full.toLowerCase() === state
    )?.[0];
    if (auAbbr) keys.push(`${city}|${auAbbr}|${country}`);
    const auFull = AU_STATE_ALIASES[state];
    if (auFull) keys.push(`${city}|${auFull.toLowerCase()}|${country}`);
  }
  keys.push(`${city}|${country}`);

  for (const key of keys) {
    const hit = CITY_COORDS[key];
    if (hit) return { ...hit, source: 'seed' };
  }

  const aliasCity = CITY_ALIASES[city];
  if (aliasCity) {
    const aliasLower = aliasCity.toLowerCase();
    const aliasKeys = state
      ? [`${aliasLower}|${state}|${country}`, `${aliasLower}|${country}`]
      : [`${aliasLower}|${country}`];
    for (const key of aliasKeys) {
      const hit = CITY_COORDS[key];
      if (hit) return { ...hit, source: 'seed' };
    }
  }

  return null;
}

function coordsFromCache(cacheEntry) {
  if (!cacheEntry || !Number.isFinite(cacheEntry.lat) || !Number.isFinite(cacheEntry.lng)) {
    return null;
  }
  return {
    lat: cacheEntry.lat,
    lng: normalizeLng(cacheEntry.lng),
    source: cacheEntry.source || 'geocode',
  };
}

function normalizeLng(lng) {
  let value = lng;
  while (value > 180) value -= 360;
  while (value < -180) value += 360;
  return value;
}

function jitterFromKey(key, lat, lng, spread = 0.65) {
  const h = hashStr(key);
  const angle = (h % 360) * (Math.PI / 180);
  const dist = ((h >> 8) % 1000) / 1000 * spread;
  const latRad = (lat * Math.PI) / 180;
  return {
    lat: lat + dist * Math.cos(angle),
    lng: lng + (dist * Math.sin(angle)) / Math.max(Math.cos(latRad), 0.2),
  };
}

function applyStateFallback(metro) {
  const state =
    metro._normalizedState || normalizeStateName(metro.state, metro.city, metro.country);
  if (!state) return null;

  const countryNorm = String(metro.country || '').trim().toLowerCase();
  const isUs =
    countryNorm === 'united states' ||
    countryNorm === 'usa' ||
    countryNorm === 'us';
  const isIndia = countryNorm === 'india';
  const isAustralia = countryNorm === 'australia' || countryNorm === 'au';

  // Never place a US metro on an Indian state centroid (or vice versa)
  if (isUs && !US_STATE_KEYS.has(state) && !US_STATE_KEYS.has(state.toUpperCase())) {
    return null;
  }
  if (isIndia && !INDIA_STATE_KEYS.has(state)) {
    return null;
  }
  if (
    isAustralia &&
    !AU_STATE_KEYS.has(state) &&
    !AU_STATE_ALIASES[state.toLowerCase()]
  ) {
    return null;
  }

  const centroid =
    STATE_CENTROIDS[state] || STATE_CENTROIDS[state.toUpperCase()];
  if (!centroid) return null;

  const jittered = jitterFromKey(metro.metroKey, centroid[0], centroid[1], 0.45);
  return {
    lat: jittered.lat,
    lng: normalizeLng(jittered.lng),
    source: 'state-approx',
  };
}

function applyCountryFallback(metro) {
  const centroid = COUNTRY_CENTROIDS[metro.country];
  if (!centroid) return null;
  const jittered = jitterFromKey(metro.metroKey, centroid[0], centroid[1], 1.2);
  return {
    lat: jittered.lat,
    lng: normalizeLng(jittered.lng),
    source: 'country-approx',
  };
}

/** Instant placement: seed → cache → state approx → country approx (no network) */
function applyQuickCoords(metros) {
  const cache = readGeoCache();
  let cacheDirty = false;

  const placed = metros.map((metro) => {
    const cleaned = sanitizeMetroLocation(metro);
    const cached = coordsFromCache(cache[cleaned.metroKey]);
    if (cached && (cached.source === 'geocode' || cached.source === 'seed')) {
      return { ...cleaned, ...cached, _approximate: false };
    }

    const seeded = lookupSeedCoords(cleaned);
    if (seeded) {
      cache[cleaned.metroKey] = seeded;
      cacheDirty = true;
      return { ...cleaned, ...seeded, _approximate: false };
    }

    if (cached) {
      return { ...cleaned, ...cached, _approximate: true };
    }

    const stateApprox = applyStateFallback(cleaned);
    if (stateApprox) {
      return { ...cleaned, ...stateApprox, _approximate: true };
    }

    const countryApprox = applyCountryFallback(cleaned);
    if (countryApprox) {
      return { ...cleaned, ...countryApprox, _approximate: true };
    }

    return cleaned;
  });

  if (cacheDirty) writeGeoCache(cache);
  return placed.filter((metro) => Number.isFinite(metro.lat) && Number.isFinite(metro.lng));
}

function getCountryCentroid(countryName) {
  const raw = String(countryName || '').trim();
  if (!raw) return null;
  if (COUNTRY_CENTROIDS[raw]) {
    const [lat, lng] = COUNTRY_CENTROIDS[raw];
    return { lat, lng, label: raw, zoom: 5 };
  }
  const hit = Object.entries(COUNTRY_CENTROIDS).find(
    ([name]) => name.toLowerCase() === raw.toLowerCase()
  );
  if (!hit) return null;
  return { lat: hit[1][0], lng: hit[1][1], label: hit[0], zoom: 5 };
}

export {
  getBubbleColor,
  getAvailability,
  statusBadgeClass,
  normalizeStoreRow,
  buildFleetIndex,
  applyQuickCoords,
  getCountryCentroid,
};

