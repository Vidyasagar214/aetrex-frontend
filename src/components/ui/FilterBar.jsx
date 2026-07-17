export default function FilterBar({
  searchPlaceholder = 'Search serial, retailer, city…',
  searchValue = '',
  onSearchChange,
  onSearchKeyDown,
  selects = [],
  scannersInView,
  onExport,
}) {
  return (
    <section className="filter-bar">
      {onSearchChange ? (
        <div className="filter-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={onSearchKeyDown}
            placeholder={searchPlaceholder}
            autoComplete="off"
          />
        </div>
      ) : null}

      {selects.length > 0 ? (
        <div className="filter-selects">
          {selects.map((select) => (
            <select
              key={select.id}
              aria-label={select.ariaLabel}
              value={select.value}
              onChange={(e) => select.onChange(e.target.value)}
            >
              <option value="">{select.allLabel}</option>
              {select.options.map((opt) => {
                const value = typeof opt === 'string' ? opt : opt.value;
                const label = typeof opt === 'string' ? opt : opt.label;
                return (
                  <option key={value} value={value}>
                    {label}
                  </option>
                );
              })}
            </select>
          ))}
        </div>
      ) : null}

      <div className="filter-actions">
        {onExport ? (
          <button type="button" className="btn-export" onClick={onExport}>
            <i className="fa-solid fa-download" />
            Export report
          </button>
        ) : null}
        {scannersInView != null ? (
          <p className="filter-count">
            <span>{scannersInView}</span> scanners in view
          </p>
        ) : null}
      </div>
    </section>
  );
}
