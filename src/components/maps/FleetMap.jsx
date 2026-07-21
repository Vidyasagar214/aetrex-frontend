import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Marker,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet';
import { getAvailability, getBubbleColor, getCountryCentroid } from '../../lib/fleetData';
import MapLegend from './MapLegend';

const DEFAULT_CENTER = [20, 0];
const DEFAULT_ZOOM = 2;
/** Overview click / overview popup zoom */
const DETAIL_ZOOM = 5;
/** Single metro / city search — closer in as requested */
const METRO_ZOOM = 11;
const STATE_ZOOM = 8;
const COUNTRY_ZOOM = 5;
/** Collapse country expansion when zoomed back out near world view */
const COUNTRY_CLUSTER_COLLAPSE_ZOOM = 3.25;
const MAX_BOUNDS = [
  [-85, -180],
  [85, 180],
];

function formatCount(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/** One-level MarkerCluster-style grouping: metros → country totals only. */
function buildCountryClusters(metros) {
  const byCountry = new Map();

  for (const metro of metros) {
    if (!Number.isFinite(metro.lat) || !Number.isFinite(metro.lng)) continue;
    const country = String(metro.country || '').trim() || '—';
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country).push(metro);
  }

  return Array.from(byCountry.entries())
    .map(([country, list]) => {
      const scanners = list.reduce((sum, m) => sum + (m.scanners || 0), 0);
      const online = list.reduce((sum, m) => sum + (m.online || 0), 0);
      const offline = list.reduce((sum, m) => sum + (m.offline || 0), 0);
      const centroid = getCountryCentroid(country);
      let lat = centroid?.lat;
      let lng = centroid?.lng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        lat = list.reduce((sum, m) => sum + m.lat, 0) / list.length;
        lng = list.reduce((sum, m) => sum + m.lng, 0) / list.length;
      }

      return {
        country,
        metros: list,
        metroCount: list.length,
        scanners,
        online,
        offline,
        lat,
        lng,
      };
    })
    .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .sort((a, b) => b.metroCount - a.metroCount);
}

/** Bubble label = metro count (not scanner count). */
function countryClusterIcon(metroCount) {
  const colors = getBubbleColor(metroCount);
  const label =
    metroCount >= 1000
      ? `${Math.round(metroCount / 100) / 10}k`
      : String(metroCount);
  const size = metroCount >= 200 ? 34 : metroCount >= 50 ? 30 : 26;

  return L.divIcon({
    className: 'country-cluster-marker',
    html: `<div class="country-cluster-bubble" style="--cluster-fill:${colors.fill};--cluster-border:${colors.border};width:${size}px;height:${size}px;font-size:${size >= 32 ? 11 : 10}px">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function resetMapToDefaultView(map, mode = 'overview') {
  map.invalidateSize();
  if (mode === 'overview') {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
    return;
  }

  const size = map.getSize();
  if (!size.x || !size.y) {
    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
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

  map.setView(DEFAULT_CENTER, zoom, { animate: true });
}

/** Home button under Leaflet zoom (+/−) — resets to default world view. */
function MapHomeControl({ mode = 'overview', onHome }) {
  const map = useMap();
  const onHomeRef = useRef(onHome);
  onHomeRef.current = onHome;

  useEffect(() => {
    const HomeControl = L.Control.extend({
      options: { position: 'topleft' },
      onAdd() {
        const container = L.DomUtil.create(
          'div',
          'leaflet-bar leaflet-control fleet-home-control'
        );
        const btn = L.DomUtil.create('a', 'fleet-home-btn', container);
        btn.href = '#';
        btn.title = 'Reset to default map view';
        btn.setAttribute('role', 'button');
        btn.setAttribute('aria-label', 'Reset to default map view');
        btn.innerHTML = '<i class="fa-solid fa-house" aria-hidden="true"></i>';

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);
        L.DomEvent.on(btn, 'click', (event) => {
          L.DomEvent.preventDefault(event);
          L.DomEvent.stopPropagation(event);
          // Clear search / isolation first so country clusters can reappear
          onHomeRef.current?.();
          map.fire('fleet:home');
          resetMapToDefaultView(map, mode);
        });

        return container;
      },
    });

    const control = new HomeControl();
    map.addControl(control);
    return () => {
      map.removeControl(control);
    };
  }, [map, mode]);

  return null;
}
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
  const value = metro.metroKey || metro.metro;
  return `/location-explorer?metro=${encodeURIComponent(value)}`;
}

/** Overview markers: zoom in on click, then open popup with detail CTA. */
function OverviewMetroMarker({ metro }) {
  const map = useMap();
  const markerRef = useRef(null);
  const allowPopupRef = useRef(false);
  const popupTimerRef = useRef(null);
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
    if (popupTimerRef.current) {
      clearTimeout(popupTimerRef.current);
      popupTimerRef.current = null;
    }
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

    const onMoveEnd = () => {
      if (popupTimerRef.current) {
        clearTimeout(popupTimerRef.current);
        popupTimerRef.current = null;
      }
      openDetailPopup();
    };
    map.once('moveend', onMoveEnd);
    popupTimerRef.current = setTimeout(() => {
      map.off('moveend', onMoveEnd);
      openDetailPopup();
    }, 700);
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
        Total Scanners: {formatCount(metro.scanners)}
        <br />
        Online Devices: {formatCount(metro.online)}
        <br />
        Offline Devices: {formatCount(metro.offline)}
      </Tooltip>
    </CircleMarker>
  );
}

function CountryClusterMarker({ cluster, onExpand }) {
  const map = useMap();
  const icon = useMemo(
    () => countryClusterIcon(cluster.metroCount),
    [cluster.metroCount]
  );

  const onClick = () => {
    onExpand?.(cluster.country);

    const points = cluster.metros
      .filter((m) => Number.isFinite(m.lat) && Number.isFinite(m.lng))
      .map((m) => [m.lat, m.lng]);

    if (!points.length) return;

    if (points.length === 1) {
      map.flyTo(points[0], Math.max(COUNTRY_ZOOM, 6), {
        animate: true,
        duration: 0.7,
      });
      return;
    }

    map.fitBounds(points, {
      padding: [52, 52],
      maxZoom: STATE_ZOOM,
      animate: true,
    });
  };

  return (
    <Marker
      position={[cluster.lat, cluster.lng]}
      icon={icon}
      eventHandlers={{ click: onClick }}
      zIndexOffset={200}
    >
      <Tooltip className="fleet-map-tooltip" sticky direction="top" opacity={1}>
        <strong>{cluster.country}</strong>
        <br />
        Metros: {formatCount(cluster.metroCount)}
        <br />
        Total Scanners: {formatCount(cluster.scanners)}
        <br />
        Online Devices: {formatCount(cluster.online)}
        <br />
        Offline Devices: {formatCount(cluster.offline)}
        <br />
        <em>Click to show metros</em>
      </Tooltip>
    </Marker>
  );
}

/**
 * Default: one country cluster per country (metro count on the bubble).
 * Click country → zoom and show that country's metros only (no further clustering).
 * Search / selection / mapFocus always shows metros directly.
 */
function FleetMarkersLayer({
  metros,
  mode = 'overview',
  onSelect,
  forceMetros = false,
  clusterResetKey = '',
}) {
  const map = useMap();
  const [expandedCountry, setExpandedCountry] = useState(null);

  const clusters = useMemo(() => buildCountryClusters(metros), [metros]);

  useEffect(() => {
    setExpandedCountry(null);
  }, [clusterResetKey, forceMetros]);

  useEffect(() => {
    const onHome = () => setExpandedCountry(null);
    map.on('fleet:home', onHome);
    return () => {
      map.off('fleet:home', onHome);
    };
  }, [map]);

  useEffect(() => {
    if (!expandedCountry) return undefined;

    const onZoomEnd = () => {
      if (map.getZoom() <= COUNTRY_CLUSTER_COLLAPSE_ZOOM) {
        setExpandedCountry(null);
      }
    };

    map.on('zoomend', onZoomEnd);
    return () => {
      map.off('zoomend', onZoomEnd);
    };
  }, [map, expandedCountry]);

  const uniqueCountries = clusters.length;
  const showCountryClusters =
    !forceMetros && !expandedCountry && uniqueCountries > 1;

  if (showCountryClusters) {
    return clusters.map((cluster) => (
      <CountryClusterMarker
        key={`country-${cluster.country}`}
        cluster={cluster}
        onExpand={setExpandedCountry}
      />
    ));
  }

  const metroList = expandedCountry
    ? metros.filter(
        (m) => String(m.country || '').trim() === expandedCountry
      )
    : metros;

  return metroList.map((metro) => {
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
        Unable to load fleet map data from the API. Confirm{' '}
        <code>VITE_API_URL</code> points at the backend and{' '}
        <code>/api/stores</code> responds.
      </p>
    </div>
  );
}

export function FleetOverviewMap({
  metros = [],
  loading = false,
  error = null,
  onStats,
  mapFocus = null,
  searchScope = null,
  searchActive = false,
  onHome,
}) {
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

  useEffect(() => {
    if (!onStats) return;
    const countries = new Set(metros.map((m) => m.country));
    const scanners = metros.reduce((sum, m) => sum + (m.scanners || 0), 0);
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

  if (!metros.length && !mapFocus) {
    return (
      <div className="fleet-map">
        <div className="fleet-map-error">
          <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
          <p>
            {searchActive
              ? 'No metros match the current search.'
              : 'No metros match the current filters.'}
          </p>
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
          <MapHomeControl mode="overview" onHome={onHome} />
          {!searchActive && !mapFocus && <FitWorld mode="overview" />}
          {mapFocus ? (
            <>
              <FocusMapTarget target={{ ...mapFocus, key: mapFocusKey }} />
              <SearchFocusMarker target={mapFocus} />
            </>
          ) : (
            <FitSearchBounds
              metros={metros}
              searchActive={searchActive && metros.length > 0}
              fitKey={`${searchScope || ''}|${metros.length}|${metros[0]?.metroKey || ''}`}
              maxZoom={fitMaxZoom}
            />
          )}
          <FleetMarkersLayer
            metros={metros}
            mode="overview"
            forceMetros={Boolean(searchActive || mapFocus)}
            clusterResetKey={`${searchScope || ''}|${metros.length}|${metros[0]?.metroKey || ''}|${metros[metros.length - 1]?.metroKey || ''}`}
          />
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
  onHome,
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
          <MapHomeControl mode="explorer" onHome={onHome} />
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
          <FleetMarkersLayer
            metros={metros}
            mode="explorer"
            onSelect={onSelect}
            forceMetros={Boolean(searchActive || selectedMetro || mapFocus)}
            clusterResetKey={`${searchScope || ''}|${metros.length}|${selectedMetro?.metroKey || ''}|${metros[0]?.metroKey || ''}`}
          />
        </MapContainer>
      </div>
    </div>
  );
}
