import { useEffect, useRef } from 'react';
import $ from 'jquery';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';
import StatusBadge from './StatusBadge';

if (typeof window !== 'undefined') {
  window.$ = window.jQuery = $;
}

function matchesFilter(filterValue, rowValue) {
  if (!filterValue) return true;
  return (
    String(rowValue || '').toLowerCase() === String(filterValue).toLowerCase()
  );
}

export default function DevicesDataTable({ devices, filters, onFilteredCount }) {
  const tableRef = useRef(null);
  const dtRef = useRef(null);
  const filtersRef = useRef(filters);
  const drawTimerRef = useRef(null);
  filtersRef.current = filters;

  useEffect(() => {
    if (!tableRef.current) return undefined;

    const filterPlugin = (settings, _searchData, dataIndex) => {
      if (settings.nTable !== tableRef.current) return true;

      const row = settings.aoData?.[dataIndex]?.nTr;
      if (!row) return true;

      const f = filtersRef.current;
      const query = (f.search || '').trim().toLowerCase();

      if (query) {
        const haystack = [
          row.dataset.serial,
          row.dataset.retailer,
          row.dataset.city,
          row.dataset.country,
          row.dataset.model,
          row.dataset.modelCode,
          row.dataset.version,
          row.dataset.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      if (!matchesFilter(f.country, row.dataset.country)) return false;
      if (
        f.model &&
        !matchesFilter(f.model, row.dataset.model) &&
        !matchesFilter(f.model, row.dataset.modelCode)
      ) {
        return false;
      }
      if (f.version) {
        const ver = String(row.dataset.version || '').trim();
        const needle = String(f.version).replace(/^v/i, '');
        if (f.version === 'older') {
          const major = Number.parseFloat(ver);
          if (!ver || ver === '—' || ver === 'NULL') {
            /* keep */
          } else if (!Number.isFinite(major) || major >= 4.2) {
            return false;
          }
        } else if (!ver.startsWith(needle)) {
          return false;
        }
      }
      if (!matchesFilter(f.status, row.dataset.status)) return false;

      return true;
    };

    DataTable.ext.search.push(filterPlugin);

    const table = new DataTable(tableRef.current, {
      pageLength: 25,
      lengthMenu: [10, 25, 50, 100],
      deferRender: true,
      responsive: true,
      order: [[5, 'desc']],
      layout: {
        topStart: null,
        topEnd: null,
        bottomStart: 'info',
        bottomEnd: 'paging',
      },
      language: {
        lengthMenu: 'Show _MENU_ entries',
        info: 'Showing _START_ to _END_ of _TOTAL_ scanners',
        infoEmpty: 'No devices match the current filters',
        infoFiltered: '(filtered from _MAX_ total)',
        zeroRecords: 'No devices match the current filters',
        emptyTable: 'No devices available',
        paginate: {
          first: 'First',
          last: 'Last',
          next: 'Next',
          previous: 'Prev',
        },
      },
      columnDefs: [
        { orderable: false, targets: 7 },
        { className: 'dt-body-right', targets: 6 },
      ],
      initComplete() {
        const wrapper = document.getElementById('scanner-table_wrapper');
        if (wrapper) {
          wrapper.classList.add('devices-table-wrapper');
          const topRow = wrapper.querySelector('.dt-layout-row:first-child');
          if (
            topRow &&
            !topRow.querySelector('table') &&
            !topRow.querySelector('.dt-info') &&
            !topRow.querySelector('.dt-paging')
          ) {
            const empty =
              !topRow.textContent.trim() &&
              !topRow.querySelector('input, select, button');
            if (empty) topRow.remove();
          }
        }
        if (onFilteredCount) {
          onFilteredCount(this.api().rows({ search: 'applied' }).count());
        }
      },
    });

    dtRef.current = table;
    table.on('draw', () => {
      if (onFilteredCount) {
        onFilteredCount(table.rows({ search: 'applied' }).count());
      }
    });

    return () => {
      clearTimeout(drawTimerRef.current);
      DataTable.ext.search = DataTable.ext.search.filter(
        (fn) => fn !== filterPlugin
      );
      table.destroy();
      dtRef.current = null;
    };
  }, [devices, onFilteredCount]);

  useEffect(() => {
    clearTimeout(drawTimerRef.current);
    drawTimerRef.current = setTimeout(() => {
      if (dtRef.current) dtRef.current.draw();
    }, 150);
    return () => clearTimeout(drawTimerRef.current);
  }, [filters]);

  return (
    <div className="overflow-x-auto">
      <table
        id="scanner-table"
        ref={tableRef}
        className="w-full display responsive nowrap"
      >
        <thead>
          <tr>
            <th>Serial</th>
            <th>Model</th>
            <th>Retailer / Store</th>
            <th>Country</th>
            <th>Version</th>
            <th>Last Contact</th>
            <th>Scans 30d</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {devices.map((device) => (
            <tr
              key={device.serial || device.storeId}
              data-serial={device.serial}
              data-model={device.model}
              data-model-code={device.modelCode || ''}
              data-retailer={device.retailer}
              data-country={device.country}
              data-city={device.city}
              data-version={device.version}
              data-status={device.status}
            >
              <td>{device.serial}</td>
              <td>{device.model}</td>
              <td>{device.retailer}</td>
              <td>{device.country}</td>
              <td>{device.version}</td>
              <td data-order={device.lastContactOrder || ''}>
                {device.lastContact}
              </td>
              <td data-order={device.scans30d ?? 0}>
                {Number(device.scans30d || 0).toLocaleString('en-US')}
              </td>
              <td>
                <StatusBadge status={device.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
