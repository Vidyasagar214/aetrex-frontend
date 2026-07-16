import { useState } from 'react';
import { Link } from 'react-router-dom';
import FilterBar from '../components/ui/FilterBar';
import KpiCard from '../components/ui/KpiCard';
import Card from '../components/ui/Card';
import ActivityList from '../components/ui/ActivityList';
import { AdoptionChart } from '../components/charts/Charts';
import {
  RELEASE_FILTERS,
  RELEASE_KPIS,
  UNSUPPORTED_DEVICES,
  UPGRADE_PIPELINE,
} from '../data/devices';

export default function ReleaseUpdates() {
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('');
  const [model, setModel] = useState('');
  const [version, setVersion] = useState('');
  const [status, setStatus] = useState('');

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
            options: RELEASE_FILTERS.countries,
          },
          {
            id: 'model',
            ariaLabel: 'Filter by model',
            allLabel: 'All models',
            value: model,
            onChange: setModel,
            options: RELEASE_FILTERS.models,
          },
          {
            id: 'version',
            ariaLabel: 'Filter by version',
            allLabel: 'All versions',
            value: version,
            onChange: setVersion,
            options: RELEASE_FILTERS.versions,
          },
          {
            id: 'status',
            ariaLabel: 'Filter by status',
            allLabel: 'All statuses',
            value: status,
            onChange: setStatus,
            options: RELEASE_FILTERS.statuses,
          },
        ]}
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {RELEASE_KPIS.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="chart-card p-5 sm:p-6 xl:col-span-2">
          <h2 className="cp-card-title mb-1">Latest release adoption — v4.5</h2>
          <p className="cp-card-subtitle">
            % of fleet upgraded since release (May 18)
          </p>
          <div className="chart-container chart-container-adoption">
            <AdoptionChart />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 flex flex-col">
          <h2 className="cp-card-title mb-1">Upgrade pipeline</h2>
          <p className="cp-card-subtitle mb-5">Rollout state toward v4.5</p>
          <ActivityList items={UPGRADE_PIPELINE} showPct={false} />
          <div className="activity-alert activity-alert-danger mt-5">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            <p>
              <strong>18</strong> failed upgrades require intervention — most
              common: interrupted download over store Wi-Fi.
            </p>
          </div>
        </Card>
      </section>

      <Card className="p-5 sm:p-6">
        <div className="card-header-row mb-1">
          <div>
            <h2 className="section-title">Devices on unsupported versions</h2>
            <p className="section-subtitle">
              125 devices below v4.2 — prioritized by last contact
            </p>
          </div>
          <Link to="/devices" className="card-link shrink-0">
            View all in Devices
            <i className="fa-solid fa-arrow-right text-[10px]" />
          </Link>
        </div>

        <div className="overflow-x-auto mt-4">
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
              {UNSUPPORTED_DEVICES.map((device) => (
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
        </div>
      </Card>
    </main>
  );
}
