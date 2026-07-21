import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import ActivityList from '../components/ui/ActivityList';
import { ModelChart, VersionChart } from '../components/charts/Charts';
import { FleetOverviewMap } from '../components/maps/FleetMap';
import { loadOverviewPage } from '../api/overview';
import { useFleetData } from '../hooks/useFleetData';
import { usePlaceSearch, sumScanners } from '../hooks/usePlaceSearch';

const EMPTY_FILTERS = {
  countries: [],
  models: [],
  versions: [],
  statuses: [
    { value: 'Active', label: 'Active' },
    { value: 'Idle', label: 'Idle' },
    { value: 'Offline', label: 'Offline' },
  ],
};

const EMPTY_CHARTS = {
  byModel: { labels: [], values: [], percents: [] },
  byVersion: { labels: [], values: [] },
};

/** Always render these 6 cards; values fill in from /api/overview/kpis */
const DEFAULT_KPIS = [
  { label: 'Total scanners', value: '—', meta: 'entire deployed fleet' },
  { label: 'Active', value: '—', meta: 'scanned in last 7 days', metaTone: 'success' },
  { label: 'Offline', value: '—', meta: 'no contact 30d+', metaTone: 'danger' },
  { label: 'On latest release', value: '—', meta: 'latest version', metaTone: 'info' },
  { label: 'Unsupported', value: '—', meta: 'below v4.2 — action needed', metaTone: 'danger' },
  { label: 'Failed upgrades', value: '—', meta: 'need intervention', metaTone: 'danger' },
];

/**
 * Dropdowns only show/hide metros. Bubble counts stay the full metro total
 * so "See Detailed View" matches Location Explorer.
 */
function metroVisibleForFilters(metro, scannersByMetro, { country, model, version, status }) {
  if (country && metro.country !== country) return false;
  if (!model && !version && !status) return true;

  const scanners = scannersByMetro.get(metro.metroKey) || [];
  return scanners.some((s) => {
    if (model) {
      const code = String(s.deviceModel || '').trim().toUpperCase();
      if (code !== String(model).trim().toUpperCase()) return false;
    }
    if (version) {
      const ver = String(s.version || '').trim();
      if (version === 'older') {
        if (!ver || ver === '—' || ver === 'NULL') return true;
        const major = Number.parseFloat(ver);
        if (!Number.isFinite(major) || major >= 4.2) return false;
      } else if (!ver.startsWith(String(version).replace(/^v/i, ''))) {
        return false;
      }
    }
    if (status) {
      if (String(s.status || '').toLowerCase() !== String(status).toLowerCase()) {
        return false;
      }
    }
    return true;
  });
}

export default function FleetOverview() {
  const [country, setCountry] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState('');
  const [mapStats, setMapStats] = useState({
    countries: 0,
    metros: 0,
    scanners: 0,
  });

  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [activity, setActivity] = useState([]);
  const [stale14d, setStale14d] = useState(0);
  const [charts, setCharts] = useState(EMPTY_CHARTS);
  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTERS);
  const [error, setError] = useState(null);

  const dropdownParams = useMemo(
    () => ({
      country: country || undefined,
      model: model || undefined,
      version: version || undefined,
      status: status || undefined,
    }),
    [country, model, version, status]
  );

  // Same unfiltered fleet as Location Explorer — detail deep-links stay consistent
  const { metros, scannersByMetro, loading: mapLoading, error: mapError } =
    useFleetData();

  const fleetMetros = useMemo(
    () =>
      metros.filter((m) =>
        metroVisibleForFilters(m, scannersByMetro, {
          country,
          model,
          version,
          status,
        })
      ),
    [metros, scannersByMetro, country, model, version, status]
  );

  const {
    search,
    onSearchChange,
    onSearchKeyDown,
    visibleMetros,
    mapFocus,
    searchScope,
    searchActive,
    searching,
    searchError,
    clearPlaceSearch,
  } = usePlaceSearch({
    metros: fleetMetros,
    scannersByMetro,
  });

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setError(null);

      loadOverviewPage(dropdownParams)
        .then((page) => {
          if (cancelled) return;
          setKpis(
            Array.isArray(page.kpis) && page.kpis.length
              ? page.kpis
              : DEFAULT_KPIS
          );
          setActivity(page.activity);
          setStale14d(page.stale14d);
          setCharts(page.charts || EMPTY_CHARTS);
          setFilterOptions({ ...EMPTY_FILTERS, ...page.filters });
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err);
            setKpis(DEFAULT_KPIS);
            setActivity([]);
            setStale14d(0);
            setCharts(EMPTY_CHARTS);
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dropdownParams]);

  const onStats = useCallback(
    (stats) => setMapStats((prev) => ({ ...prev, ...stats })),
    []
  );

  const scannersInView = useMemo(() => {
    const total = sumScanners(visibleMetros);
    return total ? total.toLocaleString('en-US') : '0';
  }, [visibleMetros]);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5">
      <FilterBar
        searchPlaceholder="Search country,state,city,zip or metro…"
        searchValue={search}
        onSearchChange={onSearchChange}
        onSearchKeyDown={onSearchKeyDown}
        scannersInView={scannersInView}
        selects={[
          {
            id: 'country',
            ariaLabel: 'Filter by country',
            allLabel: 'All countries',
            value: country,
            onChange: setCountry,
            options: filterOptions.countries,
          },
          {
            id: 'model',
            ariaLabel: 'Filter by model',
            allLabel: 'All models',
            value: model,
            onChange: setModel,
            options: filterOptions.models,
          },
          {
            id: 'version',
            ariaLabel: 'Filter by version',
            allLabel: 'All versions',
            value: version,
            onChange: setVersion,
            options: filterOptions.versions,
          },
          {
            id: 'status',
            ariaLabel: 'Filter by status',
            allLabel: 'All statuses',
            value: status,
            onChange: setStatus,
            options: filterOptions.statuses,
          },
        ]}
      />

      {(searching || searchError) && (
        <p
          className={`text-sm ${searchError ? 'text-red-600' : 'text-slate-500'}`}
          role="status"
        >
          {searching ? 'Looking up location…' : searchError}
        </p>
      )}

      {error ? (
        <Card className="p-5 sm:p-6">
          <div className="py-6 text-center space-y-2">
            <i
              className="fa-solid fa-triangle-exclamation text-xl text-[var(--cp-danger,#d9534f)]"
              aria-hidden="true"
            />
            <p className="text-sm">Unable to load fleet overview..</p>
            <p className="text-xs text-[var(--cp-text-muted,#888)]">
              {error.message || String(error)}
            </p>
          </div>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.slice(0, 6).map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-5 sm:p-6 xl:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="cp-card-title">Global fleet distribution</h2>
              <p className="cp-card-subtitle">
                Search place or filter · bubble = scanners per metro · detail
                opens Location Explorer
              </p>
            </div>
            <Link to="/location-explorer" className="card-link shrink-0">
              Open location explorer
              <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
          <FleetOverviewMap
            metros={visibleMetros}
            loading={mapLoading}
            error={mapError}
            onStats={onStats}
            mapFocus={mapFocus}
            searchScope={searchScope}
            searchActive={searchActive}
            onHome={clearPlaceSearch}
          />
        </Card>

        <Card className="chart-card p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Fleet by model</h2>
          <p className="cp-card-subtitle">
            Distribution of deployed scanner models
          </p>
          <div className="chart-container chart-container-donut flex-1">
            <ModelChart
              labels={charts.byModel?.labels}
              values={charts.byModel?.values}
              percents={charts.byModel?.percents}
            />
          </div>
          <p className="model-footer">
            <i className="fa-solid fa-location-dot" aria-hidden="true" />
            Deployed across <strong>{mapStats.countries || '—'}</strong>{' '}
            countries · <strong>{mapStats.metros || '—'}</strong> metros
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="chart-card p-5 sm:p-6 xl:col-span-2">
          <h2 className="cp-card-title mb-1">Software version distribution</h2>
          <p className="cp-card-subtitle">Current versions across the fleet</p>
          <div className="chart-container">
            <VersionChart
              labels={charts.byVersion?.labels}
              values={charts.byVersion?.values}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Scanner activity status</h2>
          <p className="cp-card-subtitle mb-5">
            Operational state for the current filters
          </p>
          <ActivityList
            items={
              activity.length
                ? activity
                : [
                    {
                      label: 'Active',
                      count: '—',
                      pct: '',
                      width: '0%',
                      tone: 'active',
                    },
                    {
                      label: 'Idle',
                      count: '—',
                      pct: '',
                      width: '0%',
                      tone: 'idle',
                    },
                    {
                      label: 'Offline',
                      count: '—',
                      pct: '',
                      width: '0%',
                      tone: 'offline',
                    },
                  ]
            }
          />
          <div className="activity-alert mt-5">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <p>
              <strong>{stale14d.toLocaleString('en-US')}</strong> scanners have
              not communicated in over 14 days —{' '}
              <Link to="/devices">review on Devices</Link>.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
