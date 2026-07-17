import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet';
import { fetchMetros } from '../../api/fleet';
import {
  applyQuickCoords,
  getAvailability,
  getBubbleColor,
} from '../../lib/fleetData';
import MapLegend from './MapLegend';

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
const MAX_BOUNDS = [
  [-85, -180],
  [85, 180],
];

function FitWorld({ mode = 'overview' }) {
  const map = useMap();

  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (mode === 'overview') {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
        return;
      }

      const size = map.getSize();
      if (!size.x || !size.y) {
        map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: false });
        return;
      }

      let zoom = DEFAULT_ZOOM;
      map.setView(DEFAULT_CENTER, zoom, { animate: false });

      while (zoom < 7) {
        const west = map.latLngToContainerPoint([DEFAULT_CENTER[0], -180]);
        const east = map.latLngToContainerPoint([DEFAULT_CENTER[0], 180]);
        const worldWidth = east.x - west.x;
        if (worldWidth >= size.x - 2) break;
        zoom += 1;
        map.setView(DEFAULT_CENTER, zoom, { animate: false });
      }

      map.setView(DEFAULT_CENTER, zoom, { animate: false });
    };

    requestAnimationFrame(() => {
      fit();
      setTimeout(fit, 120);
    });

    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map, mode]);

  return null;
}

function FocusMetro({ metro, focusKey }) {
  const map = useMap();

  useEffect(() => {
    if (!metro || !Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) {
      return;
    }
    map.setView([metro.lat, metro.lng], Math.max(map.getZoom(), 6), {
      animate: true,
    });
  }, [map, metro, focusKey]);

  return null;
}

function FitSearchBounds({ metros, searchActive }) {
  const map = useMap();

  useEffect(() => {
    if (!searchActive || !metros.length) return;

    if (metros.length === 1) {
      const m = metros[0];
      if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
        map.setView([m.lat, m.lng], Math.max(map.getZoom(), 6), {
          animate: true,
        });
      }
      return;
    }

    const bounds = metros
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => [m.lat, m.lng]);
    if (!bounds.length) return;

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: metros.length <= 5 ? 7 : 5,
      animate: true,
    });
  }, [map, metros, searchActive]);

  return null;
}

function InvalidateOnDrawer({ drawerOpen }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 240);
    return () => clearTimeout(timer);
  }, [map, drawerOpen]);

  return null;
}

function MetroMarkers({
  metros,
  mode = 'overview',
  onSelect,
  dimmedKeys = null,
}) {
  return metros.map((metro) => {
    if (!Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) return null;

    const colors = getBubbleColor(metro.scanners);
    const availability = getAvailability(metro);
    const isDimmed =
      dimmedKeys instanceof Set && !dimmedKeys.has(metro.metroKey);

    return (
      <CircleMarker
        key={metro.metroKey || `${metro.metro}-${metro.lat}-${metro.lng}`}
        center={[metro.lat, metro.lng]}
        radius={6}
        pathOptions={{
          fillColor: colors.fill,
          color: colors.border,
          weight: 2,
          opacity: isDimmed ? 0.2 : 0.95,
          fillOpacity: isDimmed ? 0.12 : 0.55,
        }}
        eventHandlers={
          onSelect
            ? {
                click: () => onSelect(metro),
              }
            : undefined
        }
      >
        <Tooltip className="fleet-map-tooltip" sticky direction="top" opacity={1}>
          <strong>{metro.metro}</strong>
          <br />
          {metro.country}
          <br />
          Total Scanners: {metro.scanners.toLocaleString('en-US')}
          <br />
          Online Devices: {metro.online.toLocaleString('en-US')}
          <br />
          Offline Devices: {metro.offline.toLocaleString('en-US')}
        </Tooltip>
        {mode !== 'explorer' && (
          <Popup className="fleet-map-popup" maxWidth={280}>
            <div className="map-info-window">
              <h3 className="map-info-title">{metro.metro}</h3>
              <p className="map-info-country">{metro.country}</p>
              <dl className="map-info-stats">
                <div>
                  <dt>Total Scanners</dt>
                  <dd>{metro.scanners.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Online</dt>
                  <dd>{metro.online.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Offline</dt>
                  <dd>{metro.offline.toLocaleString('en-US')}</dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd>{availability}%</dd>
                </div>
              </dl>
            </div>
          </Popup>
        )}
      </CircleMarker>
    );
  });
}

function MapLoading() {
  return (
    <div className="fleet-map-loading" role="status" aria-live="polite">
      <div className="fleet-map-spinner" aria-hidden="true" />
      <p>Loading fleet locations…</p>
    </div>
  );
}

function MapError() {
  return (
    <div className="fleet-map-error">
      <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      <p>
        Unable to load fleet map data from the API. Confirm the backend is
        running on <code>http://localhost:4000</code> and{' '}
        <code>/api/metros</code> responds.
      </p>
    </div>
  );
}

export function FleetOverviewMap({ onStats, filters = {} }) {
  const [metros, setMetros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filterKey = useMemo(
    () =>
      JSON.stringify({
        q: filters.q || '',
        country: filters.country || '',
        model: filters.model || '',
        version: filters.version || '',
        status: filters.status || '',
      }),
    [filters]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.country) params.country = filters.country;
      if (filters.model) params.model = filters.model;
      if (filters.version) params.version = filters.version;
      if (filters.status) params.status = filters.status;

      fetchMetros(params)
        .then((rows) => {
          if (!Array.isArray(rows)) {
            throw new Error('Invalid /api/metros response');
          }
          return applyQuickCoords(rows);
        })
        .then((placed) => {
          if (cancelled) return;
          setMetros(placed);
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err);
            setMetros([]);
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // filterKey captures all filter fields used above
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    if (!onStats) return;
    const countries = new Set(metros.map((m) => m.country));
    const scanners = metros.reduce((sum, m) => sum + m.scanners, 0);
    onStats({
      countries: countries.size,
      metros: metros.length,
      scanners,
    });
  }, [metros, onStats]);

  if (loading) {
    return (
      <div
        className="fleet-map"
        aria-label="World map showing scanner fleet distribution by metro"
      >
        <MapLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fleet-map">
        <MapError />
      </div>
    );
  }

  if (!metros.length) {
    return (
      <div className="fleet-map">
        <div className="fleet-map-error">
          <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
          <p>No metros match the current filters.</p>
        </div>
        <MapLegend />
      </div>
    );
  }

  return (
    <div
      className="fleet-map"
      aria-label="World map showing scanner fleet distribution by metro"
    >
      <div className="fleet-map-canvas">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={2}
          maxZoom={18}
          maxBounds={MAX_BOUNDS}
          maxBoundsViscosity={0.85}
          worldCopyJump={false}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', minHeight: 320 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            noWrap
          />
          <FitWorld mode="overview" />
          <MetroMarkers metros={metros} mode="overview" />
        </MapContainer>
      </div>
      <MapLegend />
    </div>
  );
}

export function ExplorerMap({
  metros,
  allMetros,
  loading,
  error,
  selectedMetro,
  onSelect,
  searchQuery = '',
  drawerOpen = false,
}) {
  const focusKey = useMemo(
    () =>
      selectedMetro
        ? `${selectedMetro.metroKey || selectedMetro.metro}-${selectedMetro.lat}`
        : '',
    [selectedMetro]
  );

  const q = searchQuery.trim().toLowerCase();
  const matchingMetros = useMemo(() => {
    if (!q) return allMetros || metros;
    return (allMetros || metros).filter(
      (m) =>
        m.metro.toLowerCase().includes(q) ||
        (m.city || '').toLowerCase().includes(q) ||
        (m.state || '').toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q)
    );
  }, [allMetros, metros, q]);

  const dimmedKeys = useMemo(() => {
    if (!q) return null;
    return new Set(matchingMetros.map((m) => m.metroKey));
  }, [matchingMetros, q]);

  const markersSource = allMetros || metros;

  if (loading) {
    return (
      <div className="explorer-map-shell">
        <MapLoading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-map-shell">
        <MapError />
      </div>
    );
  }

  return (
    <div className="explorer-map-shell">
      <div
        className="explorer-map-canvas"
        aria-label="Location explorer map"
        style={{ height: '100%' }}
      >
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={2}
          maxZoom={18}
          maxBounds={MAX_BOUNDS}
          maxBoundsViscosity={0.85}
          worldCopyJump={false}
          scrollWheelZoom
          style={{ height: '100%', width: '100%', minHeight: 480 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            noWrap
          />
          {!q && !selectedMetro && <FitWorld mode="explorer" />}
          <FocusMetro metro={selectedMetro} focusKey={focusKey} />
          <FitSearchBounds metros={matchingMetros} searchActive={Boolean(q) && !selectedMetro} />
          <InvalidateOnDrawer drawerOpen={drawerOpen} />
          <MetroMarkers
            metros={markersSource}
            mode="explorer"
            onSelect={onSelect}
            dimmedKeys={dimmedKeys}
          />
        </MapContainer>
      </div>
    </div>
  );
}
