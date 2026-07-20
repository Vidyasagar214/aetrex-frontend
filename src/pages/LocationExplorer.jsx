import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import MetroDrawer from '../components/ui/MetroDrawer';
import MapLegend from '../components/maps/MapLegend';
import { ExplorerMap } from '../components/maps/FleetMap';
import { useFleetData } from '../hooks/useFleetData';
import {
  filterMetrosByQuery,
  findExactMetro,
  findMetroByZip,
  findMetrosByCountry,
  findMetrosByState,
  geocodePlace,
  isUsZip,
  looksLikeAddress,
  looksLikeZip,
  resolveCountryQuery,
} from '../lib/geocodeSearch';
import { getCountryCentroid } from '../lib/fleetData';

function sumScanners(list) {
  return list.reduce((sum, m) => sum + (m.scanners || 0), 0);
}

function countryPin(countryName) {
  const centroid = getCountryCentroid(countryName);
  if (!centroid) return null;
  return {
    ...centroid,
    zoom: 5,
    hideFleet: true,
    key: `country-${countryName}`,
  };
}

export default function LocationExplorer() {
  const { metros, scannersByMetro, loading, error } = useFleetData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedMetro, setSelectedMetro] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState(null);
  /** Exact metros to show (zip / single city) — bypasses text-only filter gaps */
  const [isolatedMetros, setIsolatedMetros] = useState(null);
  const [searchScope, setSearchScope] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  const filteredMetros = useMemo(
    () => filterMetrosByQuery(metros, search),
    [metros, search]
  );

  const visibleMetros = useMemo(() => {
    if (!search.trim() && !mapFocus) return metros;
    if (mapFocus?.hideFleet) return [];
    if (isolatedMetros) return isolatedMetros;
    if (search.trim()) return filteredMetros;
    return metros;
  }, [metros, search, mapFocus, isolatedMetros, filteredMetros]);

  const totalScanners = useMemo(() => {
    if (drawerOpen && selectedMetro) {
      return (scannersByMetro.get(selectedMetro.metroKey) || []).length;
    }
    if (search.trim() || mapFocus) return sumScanners(visibleMetros);
    return sumScanners(metros);
  }, [
    drawerOpen,
    selectedMetro,
    scannersByMetro,
    search,
    mapFocus,
    visibleMetros,
    metros,
  ]);

  const drawerScanners = useMemo(() => {
    if (!selectedMetro) return [];
    return scannersByMetro.get(selectedMetro.metroKey) || [];
  }, [selectedMetro, scannersByMetro]);

  const resetSearchUi = useCallback(() => {
    setMapFocus(null);
    setIsolatedMetros(null);
    setSearchScope(null);
    setSearchError('');
    setSearching(false);
  }, []);

  const selectMetro = useCallback(
    (metro, { updateUrl = true } = {}) => {
      if (!metro) return;
      setMapFocus(null);
      setIsolatedMetros([metro]);
      setSearchScope('metro');
      setSearchError('');
      setSelectedMetro(metro);
      setDrawerOpen(true);
      if (updateUrl) {
        setSearchParams(
          { metro: metro.metroKey || metro.city || metro.metro },
          { replace: true }
        );
      }
    },
    [setSearchParams]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const showFleetGroup = useCallback((list, scope) => {
    setDrawerOpen(false);
    setSelectedMetro(null);
    setMapFocus(null);
    setIsolatedMetros(list);
    setSearchScope(scope);
    setSearchError('');
  }, []);

  const showSingleMetro = useCallback(
    (metro, { openDrawer = false } = {}) => {
      if (!metro) return;
      if (openDrawer) {
        selectMetro(metro);
        return;
      }
      setDrawerOpen(false);
      setSelectedMetro(null);
      setMapFocus(null);
      setIsolatedMetros([metro]);
      setSearchScope('metro');
      setSearchError('');
    },
    [selectMetro]
  );

  const showPlacePin = useCallback((place, scope = 'local') => {
    if (!place) return;
    setDrawerOpen(false);
    setSelectedMetro(null);
    setIsolatedMetros(null);
    setSearchScope(scope);
    setMapFocus({ ...place, hideFleet: true });
    setSearchError('');
  }, []);

  const geocodeAndFocus = useCallback(
    async (query, signal, scope = 'local') => {
      setSearching(true);
      setSearchError('');
      try {
        const place = await geocodePlace(query, { signal });
        if (signal?.aborted) return;
        if (place) {
          showPlacePin(
            { ...place, key: `geo-${query}-${place.lat},${place.lng}` },
            scope
          );
        } else {
          resetSearchUi();
          setSearchError('No location found for that search.');
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
        resetSearchUi();
        setSearchError('Unable to look up that location. Try again.');
      } finally {
        setSearching(false);
      }
    },
    [showPlacePin, resetSearchUi]
  );

  const resolveSearch = useCallback(
    async (rawQuery, { openDrawer = false } = {}) => {
      const query = rawQuery.trim();

      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      if (!query) {
        resetSearchUi();
        return;
      }

      const knownCountries = [
        ...new Set(metros.map((m) => m.country).filter((c) => c && c !== '—')),
      ];

      // 1) Zip / postcode
      if (isUsZip(query) || looksLikeZip(query)) {
        const byZip = findMetroByZip(metros, scannersByMetro, query);
        if (byZip) {
          showSingleMetro(byZip, { openDrawer });
          return;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        await geocodeAndFocus(query, controller.signal, 'zip');
        return;
      }

      // 2) Street / full address → geocode
      if (looksLikeAddress(query)) {
        const controller = new AbortController();
        abortRef.current = controller;
        await geocodeAndFocus(query, controller.signal, 'address');
        return;
      }

      // 3) Country
      const countryName = resolveCountryQuery(query, knownCountries);
      const countryMetros = findMetrosByCountry(metros, query);
      if (countryName || countryMetros.length > 0) {
        if (countryMetros.length > 0) {
          showFleetGroup(countryMetros, 'country');
          return;
        }
        if (countryName) {
          const pin = countryPin(countryName);
          if (pin) {
            showPlacePin(pin, 'country');
            return;
          }
          const controller = new AbortController();
          abortRef.current = controller;
          await geocodeAndFocus(query, controller.signal, 'country');
          return;
        }
      }

      // 4) State
      const stateMetros = findMetrosByState(metros, query);
      if (stateMetros.length === 1) {
        showSingleMetro(stateMetros[0], { openDrawer });
        return;
      }
      if (stateMetros.length > 1) {
        showFleetGroup(stateMetros, 'state');
        return;
      }

      // 5) Exact city / metro
      const exact = findExactMetro(metros, query);
      if (exact) {
        showSingleMetro(exact, { openDrawer });
        return;
      }

      // 6) Partial fleet matches
      const matches = filterMetrosByQuery(metros, query);
      if (matches.length === 1) {
        showSingleMetro(matches[0], { openDrawer });
        return;
      }
      if (matches.length > 1) {
        showFleetGroup(matches, 'local');
        return;
      }

      // 7) Geocode anything else (city/place not in fleet)
      const controller = new AbortController();
      abortRef.current = controller;
      await geocodeAndFocus(query, controller.signal, 'local');
    },
    [
      metros,
      scannersByMetro,
      resetSearchUi,
      showSingleMetro,
      showFleetGroup,
      showPlacePin,
      geocodeAndFocus,
    ]
  );

  const onSearchChange = useCallback(
    (value) => {
      setSearch(value);
      clearTimeout(debounceRef.current);

      if (!value.trim()) {
        if (abortRef.current) abortRef.current.abort();
        resetSearchUi();
        return;
      }

      debounceRef.current = setTimeout(() => {
        resolveSearch(value, { openDrawer: false });
      }, 380);
    },
    [resolveSearch, resetSearchUi]
  );

  const onSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(debounceRef.current);
      resolveSearch(search, { openDrawer: true });
    },
    [search, resolveSearch]
  );

  useEffect(() => {
    const focus = searchParams.get('metro');
    if (!focus || !metros.length) return;
    const needle = focus.toLowerCase();
    const match = metros.find(
      (m) =>
        m.metroKey === focus ||
        m.metroKey?.toLowerCase() === needle ||
        m.metro.toLowerCase() === needle ||
        (m.city || '').toLowerCase() === needle ||
        m.metro.toLowerCase().startsWith(`${needle},`)
    );
    if (match) {
      setMapFocus(null);
      setIsolatedMetros([match]);
      setSearchScope('metro');
      setSelectedMetro(match);
      setDrawerOpen(true);
    }
  }, [metros, searchParams]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5 flex flex-col">
      <FilterBar
        searchPlaceholder="Search address, zip, city, state, country, or metro…"
        searchValue={search}
        onSearchChange={onSearchChange}
        onSearchKeyDown={onSearchKeyDown}
        scannersInView={totalScanners.toLocaleString('en-US')}
      />

      {(searching || searchError) && (
        <p
          className={`text-sm ${searchError ? 'text-red-600' : 'text-slate-500'}`}
          role="status"
        >
          {searching ? 'Looking up location…' : searchError}
        </p>
      )}

      <section className="explorer-map-section">
        <Card className="explorer-map-card">
          <div className="explorer-map-toolbar">
            <div>
              <h2 className="cp-card-title">Fleet locations</h2>
              <p className="cp-card-subtitle">
                Search address, zip, city, state, or country · click a metro for
                scanners
              </p>
            </div>
            <MapLegend className="fleet-map-legend-inline" />
          </div>
          <ExplorerMap
            metros={visibleMetros}
            loading={loading}
            error={error}
            selectedMetro={selectedMetro}
            onSelect={selectMetro}
            searchActive={Boolean(search.trim() || mapFocus)}
            mapFocus={mapFocus}
            searchScope={searchScope}
            drawerOpen={drawerOpen}
          />
        </Card>
      </section>

      <MetroDrawer
        open={drawerOpen}
        metro={selectedMetro}
        scanners={drawerScanners}
        onClose={closeDrawer}
      />
    </main>
  );
}
