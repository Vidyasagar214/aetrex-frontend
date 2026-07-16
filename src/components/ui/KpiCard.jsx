const META_CLASS = {
  success: 'kpi-meta-success',
  danger: 'kpi-meta-danger',
  info: 'kpi-meta-info',
};

export default function KpiCard({
  label,
  value,
  meta,
  metaTone,
  valueTone,
}) {
  return (
    <div className="cp-card kpi-card p-4">
      <p className="kpi-label">{label}</p>
      <p className={`kpi-value${valueTone === 'danger' ? ' kpi-value-danger' : ''}`}>
        {value}
      </p>
      {meta ? (
        <p className={`kpi-meta ${META_CLASS[metaTone] || ''}`.trim()}>{meta}</p>
      ) : null}
    </div>
  );
}
