import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import MetroDrawer from '../components/ui/MetroDrawer';
import MapLegend from '../components/maps/MapLegend';
import { ExplorerMap } from '../components/maps/FleetMap';
import { useFleetData } from '../hooks/useFleetData';
import { usePlaceSearch, sumScanners } from '../hooks/usePlaceSearch';

export default function LocationExplorer() {
  const { metros, scannersByMetro, loading, error } = useFleetData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedMetro, setSelectedMetro] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    search,
    setSearch,
    onSearchChange,
    resolveSearch,
    visibleMetros,
    mapFocus,
    searchScope,
    searchActive,
    searching,
    searchError,
    isolateMetro,
    resetSearchUi,
  } = usePlaceSearch({ metros, scannersByMetro });

  const totalScanners = useMemo(() => {
    if (drawerOpen && selectedMetro) {
      return (scannersByMetro.get(selectedMetro.metroKey) || []).length;
    }
    if (searchActive) return sumScanners(visibleMetros);
    return sumScanners(metros);
  }, [
    drawerOpen,
    selectedMetro,
    scannersByMetro,
    searchActive,
    visibleMetros,
    metros,
  ]);

  const drawerScanners = useMemo(() => {
    if (!selectedMetro) return [];
    return scannersByMetro.get(selectedMetro.metroKey) || [];
  }, [selectedMetro, scannersByMetro]);

  const selectMetro = useCallback(
    (metro, { updateUrl = true } = {}) => {
      if (!metro) return;
      isolateMetro(metro);
      setSelectedMetro(metro);
      setDrawerOpen(true);
      if (updateUrl && metro.metroKey) {
        setSearchParams({ metro: metro.metroKey }, { replace: true });
      }
    },
    [isolateMetro, setSearchParams]
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedMetro(null);
    resetSearchUi();
    setSearchParams({}, { replace: true });
  }, [setSearchParams, resetSearchUi]);

  const onExplorerSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      resolveSearch(search).then((result) => {
        if (result && !Array.isArray(result)) {
          selectMetro(result, { updateUrl: true });
        }
      });
    },
    [resolveSearch, search, selectMetro]
  );

  useEffect(() => {
    const focus = searchParams.get('metro');
    if (!focus || !metros.length) return;
    const needle = focus.toLowerCase();
    const match =
      metros.find((m) => m.metroKey === focus) ||
      metros.find((m) => m.metroKey?.toLowerCase() === needle);
    if (match) {
      isolateMetro(match);
      setSelectedMetro(match);
      setDrawerOpen(true);
      setSearch(match.metro);
    }
  }, [metros, searchParams, isolateMetro, setSearch]);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5 flex flex-col">
      <FilterBar
        searchPlaceholder="Search address, zip, city, state, country, or metro…"
        searchValue={search}
        onSearchChange={onSearchChange}
        onSearchKeyDown={onExplorerSearchKeyDown}
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
            searchActive={searchActive}
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
