import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet';
import { loadFleetFromApi } from '../../api/fleet';
import { getAvailability, getBubbleColor } from '../../lib/fleetData';
import MapLegend from './MapLegend';

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
/** Overview click / overview popup zoom */
const DETAIL_ZOOM = 5;
/** Single metro / city search — closer in as requested */
const METRO_ZOOM = 11;
const STATE_ZOOM = 8;
const COUNTRY_ZOOM = 5;
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
    map.flyTo([metro.lat, metro.lng], METRO_ZOOM, {
      animate: true,
      duration: 0.75,
    });
  }, [map, metro, focusKey]);

  return null;
}

function FocusMapTarget({ target }) {
  const map = useMap();
  const focusKey = target?.key;

  useEffect(() => {
    if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lng)) {
      return;
    }
    const zoom = Number.isFinite(target.zoom) ? target.zoom : METRO_ZOOM;
    map.flyTo([target.lat, target.lng], zoom, {
      animate: true,
      duration: 0.85,
    });
  }, [map, focusKey, target]);

  return null;
}

function SearchFocusMarker({ target }) {
  if (!target || !Number.isFinite(target.lat) || !Number.isFinite(target.lng)) {
    return null;
  }

  return (
    <CircleMarker
      center={[target.lat, target.lng]}
      radius={9}
      pathOptions={{
        fillColor: '#2c3e50',
        color: '#7bc9d7',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      }}
    >
      <Tooltip className="fleet-map-tooltip" direction="top" opacity={1}>
        <strong>{target.label || 'Search result'}</strong>
      </Tooltip>
    </CircleMarker>
  );
}

function FitSearchBounds({ metros, searchActive, fitKey, maxZoom = METRO_ZOOM }) {
  const map = useMap();

  useEffect(() => {
    if (!searchActive || !metros.length) return;

    if (metros.length === 1) {
      const m = metros[0];
      if (Number.isFinite(m.lat) && Number.isFinite(m.lng)) {
        map.flyTo([m.lat, m.lng], maxZoom, { animate: true, duration: 0.75 });
      }
      return;
    }

    const bounds = metros
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => [m.lat, m.lng]);
    if (!bounds.length) return;

    map.fitBounds(bounds, {
      padding: [56, 56],
      maxZoom,
      animate: true,
    });
  }, [map, metros, searchActive, fitKey, maxZoom]);

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

function explorerDeepLink(metro) {
  const value = metro.metroKey || metro.city || metro.metro;
  return `/location-explorer?metro=${encodeURIComponent(value)}`;
}

/** Overview markers: zoom in on click, then open popup with detail CTA. */
function OverviewMetroMarker({ metro }) {
  const map = useMap();
  const markerRef = useRef(null);
  const allowPopupRef = useRef(false);
  const availability = getAvailability(metro);
  const colors = getBubbleColor(metro.scanners);

  const openDetailPopup = () => {
    const marker = markerRef.current;
    if (!marker) return;
    allowPopupRef.current = true;
    marker.openPopup?.();
  };

  const onMarkerClick = () => {
    const marker = markerRef.current;
    if (!marker || !Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) {
      return;
    }

    allowPopupRef.current = false;
    if (typeof marker.closePopup === 'function') {
      marker.closePopup();
    }

    const targetZoom = Math.max(map.getZoom(), DETAIL_ZOOM);
    const alreadyClose =
      map.getZoom() >= DETAIL_ZOOM - 0.2 &&
      map.getBounds().contains([metro.lat, metro.lng]) &&
      map.distance(map.getCenter(), [metro.lat, metro.lng]) < 40000;

    if (alreadyClose) {
      openDetailPopup();
      return;
    }

    map.flyTo([metro.lat, metro.lng], targetZoom, {
      animate: true,
      duration: 0.65,
    });

    map.once('moveend', openDetailPopup);
    setTimeout(openDetailPopup, 700);
  };

  return (
    <CircleMarker
      ref={markerRef}
      center={[metro.lat, metro.lng]}
      radius={6}
      pathOptions={{
        fillColor: colors.fill,
        color: colors.border,
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.55,
      }}
      eventHandlers={{
        click: onMarkerClick,
        popupopen: () => {
          // Block Leaflet's default click→popup until zoom has finished
          if (!allowPopupRef.current && markerRef.current) {
            markerRef.current.closePopup();
          }
        },
      }}
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
      <Popup className="fleet-map-popup" maxWidth={280} autoPan>
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
          <Link to={explorerDeepLink(metro)} className="map-info-detail-btn">
            See Detailed View
          </Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}

function ExplorerMetroMarker({ metro, onSelect }) {
  const colors = getBubbleColor(metro.scanners);

  return (
    <CircleMarker
      center={[metro.lat, metro.lng]}
      radius={6}
      pathOptions={{
        fillColor: colors.fill,
        color: colors.border,
        weight: 2,
        opacity: 0.95,
        fillOpacity: 0.55,
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
    </CircleMarker>
  );
}

function MetroMarkers({ metros, mode = 'overview', onSelect }) {
  return metros.map((metro) => {
    if (!Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) return null;

    const key = metro.metroKey || `${metro.metro}-${metro.lat}-${metro.lng}`;

    if (mode === 'overview') {
      return <OverviewMetroMarker key={key} metro={metro} />;
    }

    return (
      <ExplorerMetroMarker key={key} metro={metro} onSelect={onSelect} />
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
        <code>/api/stores</code> responds.
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

      loadFleetFromApi(params)
        .then((data) => {
          if (cancelled) return;
          setMetros(data.metros);
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
  loading,
  error,
  selectedMetro,
  onSelect,
  searchActive = false,
  mapFocus = null,
  searchScope = null,
  drawerOpen = false,
}) {
  const focusKey = useMemo(
    () =>
      selectedMetro
        ? `${selectedMetro.metroKey || selectedMetro.metro}-${selectedMetro.lat}`
        : '',
    [selectedMetro]
  );

  const mapFocusKey = mapFocus
    ? mapFocus.key || `${mapFocus.lat},${mapFocus.lng},${mapFocus.label}`
    : '';

  const fitMaxZoom =
    searchScope === 'country'
      ? COUNTRY_ZOOM
      : searchScope === 'state'
        ? STATE_ZOOM
        : searchScope === 'zip' || searchScope === 'address'
          ? 14
          : METRO_ZOOM;

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
          {!searchActive && !selectedMetro && !mapFocus && (
            <FitWorld mode="explorer" />
          )}
          {mapFocus ? (
            <>
              <FocusMapTarget target={{ ...mapFocus, key: mapFocusKey }} />
              <SearchFocusMarker target={mapFocus} />
            </>
          ) : (
            <>
              <FocusMetro metro={selectedMetro} focusKey={focusKey} />
              <FitSearchBounds
                metros={metros}
                searchActive={searchActive && metros.length > 0 && !selectedMetro}
                fitKey={`${searchScope || ''}|${metros.length}|${metros[0]?.metroKey || ''}`}
                maxZoom={fitMaxZoom}
              />
            </>
          )}
          <InvalidateOnDrawer drawerOpen={drawerOpen} />
          <MetroMarkers metros={metros} mode="explorer" onSelect={onSelect} />
        </MapContainer>
      </div>
    </div>
  );
}
