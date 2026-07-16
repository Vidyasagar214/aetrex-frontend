import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import ActivityList from '../components/ui/ActivityList';
import { ModelChart, VersionChart } from '../components/charts/Charts';
import { FleetOverviewMap } from '../components/maps/FleetMap';
import {
  ACTIVITY_STATUS,
  FLEET_OVERVIEW_KPIS,
  OVERVIEW_FILTERS,
} from '../data/devices';

export default function FleetOverview() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState('');
  const [mapStats, setMapStats] = useState({ countries: 12, metros: 48 });

  const onStats = useCallback((stats) => setMapStats(stats), []);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5">
      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        scannersInView="4,238"
        selects={[
          {
            id: 'country',
            ariaLabel: 'Filter by country',
            allLabel: 'All countries',
            value: country,
            onChange: setCountry,
            options: OVERVIEW_FILTERS.countries,
          },
          {
            id: 'model',
            ariaLabel: 'Filter by model',
            allLabel: 'All models',
            value: model,
            onChange: setModel,
            options: OVERVIEW_FILTERS.models,
          },
          {
            id: 'version',
            ariaLabel: 'Filter by version',
            allLabel: 'All versions',
            value: version,
            onChange: setVersion,
            options: OVERVIEW_FILTERS.versions,
          },
          {
            id: 'status',
            ariaLabel: 'Filter by status',
            allLabel: 'All statuses',
            value: status,
            onChange: setStatus,
            options: OVERVIEW_FILTERS.statuses,
          },
        ]}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {FLEET_OVERVIEW_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-5 sm:p-6 xl:col-span-2 flex flex-col">
          <div className="flex items-start justify-between gap-3 mb-1">
            <div>
              <h2 className="cp-card-title">Global fleet distribution</h2>
              <p className="cp-card-subtitle">
                Bubble = scanners per metro — click to explore the metro
              </p>
            </div>
            <Link to="/location-explorer" className="card-link shrink-0">
              Open location explorer
              <i className="fa-solid fa-arrow-right text-[10px]" />
            </Link>
          </div>
          <FleetOverviewMap onStats={onStats} />
        </Card>

        <Card className="chart-card p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Fleet by model</h2>
          <p className="cp-card-subtitle">
            Distribution of deployed scanner models
          </p>
          <div className="chart-container chart-container-donut flex-1">
            <ModelChart />
          </div>
          <p className="model-footer">
            <i className="fa-solid fa-location-dot" aria-hidden="true" />
            Deployed across <strong>{mapStats.countries}</strong> countries ·{' '}
            <strong>{mapStats.metros}</strong> metros
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="chart-card p-5 sm:p-6 xl:col-span-2">
          <h2 className="cp-card-title mb-1">Software version distribution</h2>
          <p className="cp-card-subtitle">Current versions across the fleet</p>
          <div className="chart-container">
            <VersionChart />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Scanner activity status</h2>
          <p className="cp-card-subtitle mb-5">
            Operational state of scanners in view
          </p>
          <ActivityList items={ACTIVITY_STATUS} />
          <div className="activity-alert mt-5">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <p>
              <strong>98</strong> scanners have not communicated in over 14 days
              — <Link to="/alerts">see Alerts</Link>.
            </p>
          </div>
        </Card>
      </section>
    </main>
  );
}
