import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import ActivityList from '../components/ui/ActivityList';
import { AdoptionChart } from '../components/charts/Charts';
import { loadReleasesPage } from '../api/releases';

const EMPTY_FILTERS = {
  countries: [],
  models: [],
  versions: [],
  statuses: [
    { value: 'upgraded', label: 'Upgraded' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'failed', label: 'Failed' },
    { value: 'unsupported', label: 'Unsupported' },
  ],
};

/** Always render these 5 cards; values fill in from /api/releases/kpis */
const DEFAULT_KPIS = [
  { label: 'Adoption', value: '—', meta: 'target 90%', metaTone: 'danger' },
  { label: 'Upgraded', value: '—', meta: 'on latest', metaTone: 'success' },
  { label: 'Scheduled', value: '—', meta: 'not yet on latest', metaTone: 'info' },
  {
    label: 'Failed',
    value: '—',
    meta: 'upgrade failures',
    metaTone: 'danger',
    valueTone: 'danger',
  },
  {
    label: 'Unsupported',
    value: '—',
    meta: 'below v4.2',
    metaTone: 'danger',
    valueTone: 'danger',
  },
];

function formatReleaseStart(isoDay) {
  if (!isoDay) return null;
  const d = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDay;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function ReleaseUpdates() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState('');

  const [kpis, setKpis] = useState(DEFAULT_KPIS);
  const [pipeline, setPipeline] = useState([]);
  const [adoption, setAdoption] = useState({
    labels: [],
    adoption: [],
    target: [],
    currentPct: 0,
    targetPct: 90,
    releaseStart: null,
    latestVersion: null,
  });
  const [unsupported, setUnsupported] = useState([]);
  const [unsupportedTotal, setUnsupportedTotal] = useState(0);
  const [failed, setFailed] = useState(0);
  const [topFailure, setTopFailure] = useState('');
  const [latestVersion, setLatestVersion] = useState(null);
  const [scannersInView, setScannersInView] = useState(0);
  const [filterOptions, setFilterOptions] = useState(EMPTY_FILTERS);
  const [error, setError] = useState(null);

  const queryParams = useMemo(
    () => ({
      q: search.trim() || undefined,
      country: country || undefined,
      model: model || undefined,
      version: version || undefined,
      status: status || undefined,
    }),
    [search, country, model, version, status]
  );

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setError(null);

      loadReleasesPage(queryParams)
        .then((page) => {
          if (cancelled) return;
          setKpis(
            Array.isArray(page.kpis) && page.kpis.length
              ? page.kpis
              : DEFAULT_KPIS
          );
          setPipeline(page.pipeline);
          setAdoption(page.adoption);
          setUnsupported(page.unsupported);
          setUnsupportedTotal(page.unsupportedTotal);
          setFailed(page.failed);
          setTopFailure(page.topFailure);
          setLatestVersion(page.latestVersion);
          setScannersInView(page.total || 0);
          setFilterOptions({ ...EMPTY_FILTERS, ...page.filters });
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err);
            setKpis(DEFAULT_KPIS);
          }
        });
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [queryParams]);

  const versionLabel = latestVersion ? `v${latestVersion}` : 'latest release';
  const releaseStartLabel = formatReleaseStart(adoption.releaseStart);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        scannersInView={scannersInView.toLocaleString('en-US')}
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

      {error ? (
        <Card className="p-5 sm:p-6">
          <div className="py-6 text-center space-y-2">
            <i
              className="fa-solid fa-triangle-exclamation text-xl text-[var(--cp-danger,#d9534f)]"
              aria-hidden="true"
            />
            <p className="text-sm">
              Unable to load releases..
            </p>
            <p className="text-xs text-[var(--cp-text-muted,#888)]">
              {error.message || String(error)}
            </p>
          </div>
        </Card>
      ) : null}

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.slice(0, 5).map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="chart-card p-5 sm:p-6 xl:col-span-2">
          <h2 className="cp-card-title mb-1">
            Latest release adoption — {versionLabel}
          </h2>
          <p className="cp-card-subtitle">
            Cumulative % of fleet on {versionLabel}
            {releaseStartLabel ? ` since ${releaseStartLabel}` : ''}
            {typeof adoption.currentPct === 'number'
              ? ` · now ${adoption.currentPct}%`
              : ''}
          </p>
          <div className="chart-container chart-container-adoption">
            <AdoptionChart
              key={`${adoption.latestVersion || 'none'}-${adoption.labels?.join('|') || 'empty'}`}
              labels={adoption.labels}
              adoption={adoption.adoption}
              target={adoption.target}
              targetPct={adoption.targetPct || 90}
            />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Upgrade pipeline</h2>
          <p className="cp-card-subtitle mb-5">
            Rollout state toward {versionLabel}
          </p>
          <ActivityList
            items={
              pipeline.length
                ? pipeline
                : [
                    { label: 'Upgraded', count: '—', width: '0%', tone: 'active' },
                    { label: 'Scheduled', count: '—', width: '0%', tone: 'scheduled' },
                    { label: 'Failed', count: '—', width: '0%', tone: 'offline' },
                    {
                      label: 'Not scheduled',
                      count: '—',
                      width: '0%',
                      tone: 'custom',
                      customColor: '#999999',
                    },
                  ]
            }
            showPct={false}
          />
          <div className="activity-alert activity-alert-danger mt-5">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <p>
              <strong>{failed.toLocaleString('en-US')}</strong> devices with
              failed upgrades need intervention
              {topFailure ? (
                <>
                  {' '}
                  — most common: {topFailure}
                  {topFailure.endsWith('.') ? '' : '.'}
                </>
              ) : (
                '.'
              )}
            </p>
          </div>
        </Card>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="card-header-row mb-1">
          <div>
            <h2 className="section-title">Devices on unsupported versions</h2>
            <p className="section-subtitle">
             <b> {unsupportedTotal.toLocaleString('en-US')}</b> devices below v4.2 —
              prioritized by last contact
            </p>
          </div>
          <Link to="/devices" className="card-link shrink-0">
            View all in Devices
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
          {unsupported.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--cp-text-muted,#888)]">
              No unsupported devices match the current filters.
            </p>
          ) : (
            <table className="cp-data-table w-full">
              <thead>
                <tr>
                  <th>Serial</th>
                  <th>Model</th>
                  <th>Store</th>
                  <th>Country</th>
                  <th>Version</th>
                  <th>Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {unsupported.map((device) => (
                  <tr key={device.serial}>
                    <td>{device.serial}</td>
                    <td>{device.model}</td>
                    <td>{device.store}</td>
                    <td>{device.country}</td>
                    <td>{device.version}</td>
                    <td>{device.lastContact}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </main>
  );
}
