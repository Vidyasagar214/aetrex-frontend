import { useEffect, useMemo, useState } from 'react';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import MapLegend from '../components/maps/MapLegend';
import { ExplorerMap } from '../components/maps/FleetMap';
import { useMetros } from '../hooks/useMetros';

export default function LocationExplorer() {
  const { metros, loading, error } = useMetros();
  const [search, setSearch] = useState('');
  const [selectedMetro, setSelectedMetro] = useState(null);

  const filteredMetros = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return metros;
    return metros.filter(
      (m) =>
        m.metro.toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q)
    );
  }, [metros, search]);

  const totalScanners = useMemo(
    () => filteredMetros.reduce((sum, m) => sum + m.scanners, 0),
    [filteredMetros]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('metro');
    if (!focus || !metros.length) return;
    const match = metros.find(
      (m) => m.metro.toLowerCase() === focus.toLowerCase()
    );
    if (match) setSelectedMetro(match);
  }, [metros]);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5 flex flex-col">
      <FilterBar
        searchPlaceholder="Search metro or country…"
        searchValue={search}
        onSearchChange={setSearch}
        scannersInView={totalScanners.toLocaleString('en-US')}
      />

      <section>
        <Card className="explorer-map-card">
          <div className="explorer-map-toolbar">
            <div>
              <h2 className="cp-card-title">Fleet locations</h2>
              <p className="cp-card-subtitle">
                Hover for tooltip · click for popup · use the list to focus a
                metro
              </p>
            </div>
            <MapLegend className="fleet-map-legend-inline" />
          </div>
          <ExplorerMap
            metros={filteredMetros}
            loading={loading}
            error={error}
            selectedMetro={selectedMetro}
            onSelect={setSelectedMetro}
          />
        </Card>
      </section>
    </main>
  );
}
