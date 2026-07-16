export default function MapLegend({ className = '' }) {
  return (
    <div className={`fleet-map-legend ${className}`.trim()}>
      <span className="legend-title">Scanner Count</span>
      <span className="legend-item">
        <span className="legend-swatch legend-green" />
        0–50
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-yellow" />
        51–150
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-orange" />
        151–300
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-red" />
        300+
      </span>
    </div>
  );
}
