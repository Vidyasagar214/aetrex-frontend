export default function ActivityList({ items, showPct = true }) {
  return (
    <ul className="activity-list flex-1">
      {items.map((item) => {
        const fillClass =
          item.tone === 'active'
            ? 'activity-bar-active'
            : item.tone === 'idle'
              ? 'activity-bar-idle'
              : item.tone === 'offline'
                ? 'activity-bar-offline'
                : item.tone === 'scheduled'
                  ? 'activity-bar-scheduled'
                  : '';

        const dotClass =
          item.tone === 'active'
            ? 'activity-dot-active'
            : item.tone === 'idle'
              ? 'activity-dot-idle'
              : item.tone === 'offline'
                ? 'activity-dot-offline'
                : item.tone === 'scheduled'
                  ? 'activity-dot-scheduled'
                  : '';

        return (
          <li key={item.label} className="activity-row">
            <span className="activity-label">
              <span
                className={`activity-dot ${dotClass}`.trim()}
                style={
                  item.tone === 'custom'
                    ? { background: item.customColor }
                    : undefined
                }
              />
              {item.label}
            </span>
            <div className="activity-bar-track" aria-hidden="true">
              <div
                className={`activity-bar-fill ${fillClass}`.trim()}
                style={{
                  width: item.width,
                  ...(item.tone === 'custom'
                    ? { background: item.customColor }
                    : {}),
                }}
              />
            </div>
            <span className="activity-stats">
              <span className="activity-count">{item.count}</span>
              {showPct && item.pct ? (
                <span className="activity-pct">{item.pct}</span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
