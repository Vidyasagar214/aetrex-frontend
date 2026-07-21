import { useDataAsOf } from '../../hooks/useDataAsOf';

export default function Header({ title, subtitle, onToggleSidebar }) {
  const dataAsOf = useDataAsOf();

  return (
    <header className="page-header-bar flex items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden w-8 h-8 flex items-center justify-center rounded border border-card-border text-text-secondary hover:bg-white/50 transition-colors shrink-0 bg-white/30"
          aria-label="Toggle sidebar"
        >
          <i className="fa-solid fa-bars text-sm" />
        </button>
        <div className="page-header-text min-w-0">
          <h1 className="page-header-title">{title}</h1>
          <p className="page-header-subtitle">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="data-as-of">
          <span className="data-as-of-dot" aria-hidden="true" />
          <span>{dataAsOf}</span>
        </span>
        <div className="header-avatar" aria-label="User avatar" title="Aetrex">
          AE
        </div>
      </div>
    </header>
  );
}
