import { statusBadgeClass } from '../../lib/fleetData';

export default function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${statusBadgeClass(status)}`}>{status}</span>
  );
}
