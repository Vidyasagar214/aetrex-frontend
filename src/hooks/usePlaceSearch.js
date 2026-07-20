import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

/**
 * Shared place search for Fleet Overview + Location Explorer.
 * Resolves country / state / city / metro / zip / address / geocode,
 * isolates matching metros (hides others), and drives map zoom.
 */
export function usePlaceSearch({ metros = [], scannersByMetro = new Map() } = {}) {
  const [search, setSearch] = useState('');
  const [mapFocus, setMapFocus] = useState(null);
  const [isolatedMetros, setIsolatedMetros] = useState(null);
  const [searchScope, setSearchScope] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const searchSeqRef = useRef(0);

  const filteredMetros = useMemo(
    () => filterMetrosByQuery(metros, search),
    [metros, search]
  );

  const searchActive = Boolean(search.trim() || mapFocus);

  const visibleMetros = useMemo(() => {
    if (!search.trim() && !mapFocus) return metros;
    if (mapFocus?.hideFleet) return [];
    if (isolatedMetros) return isolatedMetros;
    if (search.trim()) return filteredMetros;
    return metros;
  }, [metros, search, mapFocus, isolatedMetros, filteredMetros]);

  const resetSearchUi = useCallback(() => {
    setMapFocus(null);
    setIsolatedMetros(null);
    setSearchScope(null);
    setSearchError('');
    setSearching(false);
  }, []);

  const showFleetGroup = useCallback((list, scope) => {
    setMapFocus(null);
    setIsolatedMetros(list);
    setSearchScope(scope);
    setSearchError('');
  }, []);

  const showSingleMetro = useCallback((metro) => {
    if (!metro) return;
    setMapFocus(null);
    setIsolatedMetros([metro]);
    setSearchScope('metro');
    setSearchError('');
  }, []);

  const showPlacePin = useCallback((place, scope = 'local') => {
    if (!place) return;
    setIsolatedMetros(null);
    setSearchScope(scope);
    setMapFocus({ ...place, hideFleet: true });
    setSearchError('');
  }, []);

  const geocodeAndFocus = useCallback(
    async (query, signal, scope = 'local') => {
      const reqId = ++searchSeqRef.current;
      setSearching(true);
      setSearchError('');
      try {
        const place = await geocodePlace(query, { signal });
        if (signal?.aborted || reqId !== searchSeqRef.current) return;
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
        if (err?.name === 'AbortError' || reqId !== searchSeqRef.current) return;
        resetSearchUi();
        setSearchError('Unable to look up that location. Try again.');
      } finally {
        if (reqId === searchSeqRef.current) setSearching(false);
      }
    },
    [showPlacePin, resetSearchUi]
  );

  const resolveSearch = useCallback(
    async (rawQuery) => {
      const query = rawQuery.trim();

      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }

      if (!query) {
        resetSearchUi();
        return null;
      }

      const knownCountries = [
        ...new Set(metros.map((m) => m.country).filter((c) => c && c !== '—')),
      ];

      if (isUsZip(query) || looksLikeZip(query)) {
        const byZip = findMetroByZip(metros, scannersByMetro, query);
        if (byZip) {
          showSingleMetro(byZip);
          return byZip;
        }
        const controller = new AbortController();
        abortRef.current = controller;
        await geocodeAndFocus(query, controller.signal, 'zip');
        return null;
      }

      if (looksLikeAddress(query)) {
        const controller = new AbortController();
        abortRef.current = controller;
        await geocodeAndFocus(query, controller.signal, 'address');
        return null;
      }

      const countryName = resolveCountryQuery(query, knownCountries);
      const countryMetros = findMetrosByCountry(metros, query);
      if (countryName || countryMetros.length > 0) {
        if (countryMetros.length > 0) {
          showFleetGroup(countryMetros, 'country');
          return countryMetros;
        }
        if (countryName) {
          const pin = countryPin(countryName);
          if (pin) {
            showPlacePin(pin, 'country');
            return null;
          }
          const controller = new AbortController();
          abortRef.current = controller;
          await geocodeAndFocus(query, controller.signal, 'country');
          return null;
        }
      }

      const stateMetros = findMetrosByState(metros, query);
      if (stateMetros.length === 1) {
        showSingleMetro(stateMetros[0]);
        return stateMetros[0];
      }
      if (stateMetros.length > 1) {
        showFleetGroup(stateMetros, 'state');
        return stateMetros;
      }

      const exact = findExactMetro(metros, query);
      if (exact) {
        showSingleMetro(exact);
        return exact;
      }

      const matches = filterMetrosByQuery(metros, query);
      if (matches.length === 1) {
        showSingleMetro(matches[0]);
        return matches[0];
      }
      if (matches.length > 1) {
        showFleetGroup(matches, 'local');
        return matches;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      await geocodeAndFocus(query, controller.signal, 'local');
      return null;
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
        resolveSearch(value);
      }, 380);
    },
    [resolveSearch, resetSearchUi]
  );

  const onSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      clearTimeout(debounceRef.current);
      resolveSearch(search);
    },
    [search, resolveSearch]
  );

  const isolateMetro = useCallback((metro) => {
    if (!metro) return;
    showSingleMetro(metro);
  }, [showSingleMetro]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // When the underlying fleet set changes (dropdown filters), re-run active place search
  useEffect(() => {
    if (!search.trim()) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      resolveSearch(search);
    }, 120);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metros]);

  return {
    search,
    setSearch,
    onSearchChange,
    onSearchKeyDown,
    resolveSearch,
    visibleMetros,
    mapFocus,
    searchScope,
    searchActive,
    searching,
    searchError,
    isolatedMetros,
    resetSearchUi,
    isolateMetro,
    showSingleMetro,
  };
}

export function sumScanners(list) {
  return (list || []).reduce((sum, m) => sum + (m.scanners || 0), 0);
}
