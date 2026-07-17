import { useCallback, useEffect, useState } from 'react';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import DevicesDataTable from '../components/ui/DevicesDataTable';
import { loadDevicesPage } from '../api/devices';

const EMPTY_OPTIONS = {
  countries: [],
  models: [],
  versions: [],
  statuses: [
    { value: 'Active', label: 'Active' },
    { value: 'Idle', label: 'Idle' },
    { value: 'Offline', label: 'Offline' },
  ],
};

export default function Devices() {
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    model: '',
    version: '',
    status: '',
  });
  const [devices, setDevices] = useState([]);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    loadDevicesPage()
      .then((page) => {
        if (cancelled) return;
        setDevices(page.devices);
        setOptions({ ...EMPTY_OPTIONS, ...page.filters });
        setCount(page.devices.length);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setDevices([]);
          setCount(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const onFilteredCount = useCallback((n) => {
    setCount(n);
  }, []);

  return (
    <main className="flex-1 p-5 lg:p-6 space-y-5">
      <FilterBar
        searchValue={filters.search}
        onSearchChange={(value) => updateFilter('search', value)}
        scannersInView={
          loading ? '…' : count.toLocaleString('en-US')
        }
        selects={[
          {
            id: 'country',
            ariaLabel: 'Filter by country',
            allLabel: 'All countries',
            value: filters.country,
            onChange: (value) => updateFilter('country', value),
            options: options.countries,
          },
          {
            id: 'model',
            ariaLabel: 'Filter by model',
            allLabel: 'All models',
            value: filters.model,
            onChange: (value) => updateFilter('model', value),
            options: options.models,
          },
          {
            id: 'version',
            ariaLabel: 'Filter by version',
            allLabel: 'All versions',
            value: filters.version,
            onChange: (value) => updateFilter('version', value),
            options: options.versions,
          },
          {
            id: 'status',
            ariaLabel: 'Filter by status',
            allLabel: 'All statuses',
            value: filters.status,
            onChange: (value) => updateFilter('status', value),
            options: options.statuses,
          },
        ]}
      />

      <Card className="p-5 sm:p-6">
        {loading ? (
          <div className="py-16 text-center text-sm text-[var(--cp-text-muted,#888)]">
            <div className="fleet-map-spinner mx-auto mb-3" aria-hidden="true" />
            <p>Loading devices…</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-2">
            <i
              className="fa-solid fa-triangle-exclamation text-xl text-[var(--cp-danger,#d9534f)]"
              aria-hidden="true"
            />
            <p className="text-sm">Unable to load devices.</p>
            <p className="text-xs text-[var(--cp-text-muted,#888)]">
              {error.message || String(error)}
            </p>
          </div>
        ) : (
          <>
            <p className="cp-card-subtitle mb-4">Showing fleet scanners.</p>
            <DevicesDataTable
              devices={devices}
              filters={filters}
              onFilteredCount={onFilteredCount}
            />
          </>
        )}
      </Card>
    </main>
  );
}
