export default function MapLegend({ className = '' }) {
  return (
    <div className={`fleet-map-legend ${className}`.trim()}>
      <span className="legend-title">Scanner Count</span>
      <span className="legend-item">
        <span className="legend-swatch legend-green" />
        1–5
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-yellow" />
        6–10
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-orange" />
        11–15
      </span>
      <span className="legend-item">
        <span className="legend-swatch legend-red" />
        16+
      </span>
    </div>
  );
}
