import { useCallback, useMemo, useState } from 'react';
import FilterBar from '../components/ui/FilterBar';
import Card from '../components/ui/Card';
import DevicesDataTable from '../components/ui/DevicesDataTable';
import { DEVICES } from '../data/devices';

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export default function Devices() {
  const [filters, setFilters] = useState({
    search: '',
    country: '',
    model: '',
    version: '',
    status: '',
  });
  const [count, setCount] = useState(DEVICES.length);

  const options = useMemo(
    () => ({
      countries: uniqueSorted(DEVICES.map((d) => d.country)),
      models: uniqueSorted(DEVICES.map((d) => d.model)),
      versions: uniqueSorted(DEVICES.map((d) => d.version)),
      statuses: uniqueSorted(DEVICES.map((d) => d.status)),
    }),
    []
  );

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
        scannersInView={count.toLocaleString('en-US')}
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
        <DevicesDataTable
          devices={DEVICES}
          filters={filters}
          onFilteredCount={onFilteredCount}
        />
      </Card>
    </main>
  );
}
