import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import MetroDrawer from '../components/ui/MetroDrawer';
import MapLegend from '../components/maps/MapLegend';
import { ExplorerMap } from '../components/maps/FleetMap';
import { useFleetData } from '../hooks/useFleetData';

export default function LocationExplorer() {
  const { metros, scannersByMetro, loading, error } = useFleetData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [selectedMetro, setSelectedMetro] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const matchingMetros = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metros;
    return metros.filter(
      (m) =>
        m.metro.toLowerCase().includes(q) ||
        (m.city || '').toLowerCase().includes(q) ||
        (m.state || '').toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q)
    );
  }, [metros, search]);

  const totalScanners = useMemo(() => {
    if (drawerOpen && selectedMetro) {
      const list = scannersByMetro.get(selectedMetro.metroKey) || [];
      return list.length;
    }
    return matchingMetros.reduce((sum, m) => sum + m.scanners, 0);
  }, [drawerOpen, selectedMetro, scannersByMetro, matchingMetros]);

  const drawerScanners = useMemo(() => {
    if (!selectedMetro) return [];
    return scannersByMetro.get(selectedMetro.metroKey) || [];
  }, [selectedMetro, scannersByMetro]);

  const selectMetro = useCallback(
    (metro, { updateUrl = true } = {}) => {
      if (!metro) return;
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
    // Keep selectedMetro so the map stays zoomed on this location
    setDrawerOpen(false);
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Deep-link ?metro= (from Overview "See Detailed View" or shared URL)
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
      setSelectedMetro(match);
      setDrawerOpen(true);
    }
  }, [metros, searchParams]);

  const onSearchKeyDown = useCallback(
    (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const q = search.trim().toLowerCase();
      if (!q) return;

      const exact = metros.find(
        (m) =>
          (m.city || '').toLowerCase() === q ||
          m.metro.toLowerCase() === q ||
          m.metro.toLowerCase().startsWith(`${q},`)
      );
      const only = matchingMetros;
      const target = exact || (only.length === 1 ? only[0] : null);
      if (target) selectMetro(target);
    },
    [search, metros, matchingMetros, selectMetro]
  );

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5 flex flex-col">
      <FilterBar
        searchPlaceholder="Search metro or country…"
        searchValue={search}
        onSearchChange={setSearch}
        onSearchKeyDown={onSearchKeyDown}
        scannersInView={totalScanners.toLocaleString('en-US')}
      />

      <section className="explorer-map-section">
        <Card className="explorer-map-card">
          <div className="explorer-map-toolbar">
            <div>
              <h2 className="cp-card-title">Fleet locations</h2>
              <p className="cp-card-subtitle">
                Hover for details · click a metro to open the scanner explorer
              </p>
            </div>
            <MapLegend className="fleet-map-legend-inline" />
          </div>
          <ExplorerMap
            metros={metros}
            loading={loading}
            error={error}
            selectedMetro={selectedMetro}
            onSelect={selectMetro}
            searchQuery={search}
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
