export default function MapLegend({ className = '' }) {
  return (
    <div className={`fleet-map-legend ${className}`.trim()}>
      <div className="legend-row">
        <span className="legend-title">Scanners</span>
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
      {/* <p className="legend-cluster-note">Country # = metros · click to expand</p> */}
    </div>
  );
}
