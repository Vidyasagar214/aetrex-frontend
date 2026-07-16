const STATUS_CLASS = {
  Active: 'status-online',
  Idle: 'status-pending',
  Offline: 'status-offline',
  Online: 'status-online',
};

export default function StatusBadge({ status }) {
  const tone = STATUS_CLASS[status] || 'status-inactive';
  return <span className={`status-badge ${tone}`}>{status}</span>;
}
