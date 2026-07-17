import { useEffect, useMemo, useState } from 'react';
import StatusBadge from './StatusBadge';

export default function MetroDrawer({
  open,
  metro,
  scanners = [],
  onClose,
}) {
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) {
      setSearch('');
      return undefined;
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };

    document.body.classList.add('metro-drawer-open');
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.classList.remove('metro-drawer-open');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    setSearch('');
  }, [metro?.metroKey]);

  const kpis = useMemo(() => {
    const total = scanners.length;
    const online = scanners.filter((s) => s.status !== 'Offline').length;
    const offline = total - online;
    const availability = total
      ? Math.round((online / total) * 1000) / 10
      : 0;
    return { total, online, offline, availability };
  }, [scanners]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scanners;
    return scanners.filter((s) => {
      const hay =
        `${s.serial} ${s.store} ${s.version} ${s.status} ${s.deviceModel} ${s.brand}`.toLowerCase();
      return hay.includes(q);
    });
  }, [scanners, search]);

  if (!metro) return null;

  return (
    <>
      <div
        className={`metro-drawer-backdrop${open ? ' is-open' : ''}`}
        hidden={!open}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={`metro-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        aria-labelledby="drawer-metro-name"
      >
        <div className="metro-drawer-header">
          <div className="min-w-0">
            <h2 id="drawer-metro-name" className="metro-drawer-title">
              {metro.metro}
            </h2>
            <p className="metro-drawer-subtitle">
              {metro.country} · {scanners.length.toLocaleString('en-US')} scanners
              listed
            </p>
          </div>
          <button
            type="button"
            className="metro-drawer-close"
            aria-label="Close metro explorer"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="metro-drawer-kpis">
          <div className="metro-drawer-kpi">
            <span className="label">Total Scanners</span>
            <span className="value">{kpis.total.toLocaleString('en-US')}</span>
          </div>
          <div className="metro-drawer-kpi">
            <span className="label">Online</span>
            <span className="value text-success">
              {kpis.online.toLocaleString('en-US')}
            </span>
          </div>
          <div className="metro-drawer-kpi">
            <span className="label">Offline</span>
            <span className="value text-danger">
              {kpis.offline.toLocaleString('en-US')}
            </span>
          </div>
          <div className="metro-drawer-kpi">
            <span className="label">Availability</span>
            <span className="value">{kpis.availability}%</span>
          </div>
        </div>

        <div className="metro-drawer-toolbar">
          <div className="filter-search metro-drawer-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search device ID, store, status…"
              autoComplete="off"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <p className="metro-drawer-count">
            <span>{filtered.length.toLocaleString('en-US')}</span> scanners
          </p>
        </div>

        <div className="metro-drawer-list-header">
          <span>Device ID</span>
          <span>Store</span>
          <span>Version</span>
          <span>Status</span>
        </div>

        <div className="metro-drawer-list" role="list">
          {!filtered.length ? (
            <div className="metro-drawer-empty">
              <i className="fa-solid fa-inbox" aria-hidden="true" />
              <p>No scanners match the current filters for this metro.</p>
            </div>
          ) : (
            filtered.map((s, index) => (
              <article
                key={`${s.serial}-${s.storeId || index}`}
                className="metro-drawer-row"
                role="listitem"
              >
                <span className="drawer-serial" title={s.serial}>
                  {s.serial}
                </span>
                <span className="drawer-store" title={s.store}>
                  {s.store}
                </span>
                <span className="drawer-version">{s.version}</span>
                <span className="drawer-status">
                  <StatusBadge status={s.status} />
                </span>
              </article>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
