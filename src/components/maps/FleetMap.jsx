import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Popup,
  useMap,
} from 'react-leaflet';
import {
  getAvailability,
  getBubbleColor,
  useMetros,
} from '../../hooks/useMetros';
import MapLegend from './MapLegend';

function FitBounds({ metros }) {
  const map = useMap();

  useEffect(() => {
    if (!metros.length) return;
    const bounds = metros.map((m) => [m.lat, m.lng]);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 5, animate: false });
    setTimeout(() => map.invalidateSize(), 80);
  }, [map, metros]);

  useEffect(() => {
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);

  return null;
}

function MetroMarkers({ metros, onSelect }) {
  return metros.map((metro) => {
    const colors = getBubbleColor(metro.scanners);
    const availability = getAvailability(metro);

    return (
      <CircleMarker
        key={`${metro.metro}-${metro.lat}-${metro.lng}`}
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
      </CircleMarker>
    );
  });
}

export function FleetOverviewMap({ onStats }) {
  const { metros, loading, error } = useMetros();

  useEffect(() => {
    if (!onStats || !metros.length) return;
    const countries = new Set(metros.map((m) => m.country));
    onStats({ countries: countries.size, metros: metros.length });
  }, [metros, onStats]);

  if (loading) {
    return (
      <div className="fleet-map" aria-label="World map showing scanner fleet distribution by metro">
        <div className="fleet-map-loading" role="status" aria-live="polite">
          <div className="fleet-map-spinner" aria-hidden="true" />
          <p>Loading fleet locations…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fleet-map">
        <div className="fleet-map-error">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <p>
            Unable to load <code>data/stores.csv</code>. Confirm the file exists
            in the public folder.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-map" aria-label="World map showing scanner fleet distribution by metro">
      <div className="fleet-map-canvas">
        <MapContainer
          center={[20, 0]}
          zoom={2}
          minZoom={1}
          maxZoom={18}
          worldCopyJump
          scrollWheelZoom
          style={{ height: '100%', width: '100%', minHeight: 320 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitBounds metros={metros} />
          <MetroMarkers metros={metros} />
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
}) {
  const focusKey = useMemo(
    () => (selectedMetro ? `${selectedMetro.metro}-${selectedMetro.lat}` : ''),
    [selectedMetro]
  );

  if (loading) {
    return (
      <div className="explorer-map-shell">
        <div className="fleet-map-loading" role="status" aria-live="polite">
          <div className="fleet-map-spinner" aria-hidden="true" />
          <p>Loading fleet locations…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="explorer-map-shell">
        <div className="fleet-map-error">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <p>
            Unable to load <code>data/stores.csv</code>. Confirm the file exists
            in the public folder.
          </p>
        </div>
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
          center={[20, 0]}
          zoom={2}
          minZoom={1}
          maxZoom={18}
          worldCopyJump
          scrollWheelZoom
          style={{ height: '100%', width: '100%', minHeight: 480 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
          <FitBounds metros={metros} />
          <FocusMetro metro={selectedMetro} focusKey={focusKey} />
          <MetroMarkers metros={metros} onSelect={onSelect} />
        </MapContainer>
      </div>
    </div>
  );
}

function FocusMetro({ metro, focusKey }) {
  const map = useMap();

  useEffect(() => {
    if (!metro) return;
    map.setView([metro.lat, metro.lng], Math.max(map.getZoom(), 5), {
      animate: true,
    });
  }, [map, metro, focusKey]);

  return null;
}
