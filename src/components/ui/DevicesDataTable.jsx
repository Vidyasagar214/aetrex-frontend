import { useEffect, useRef } from 'react';
import $ from 'jquery';
import DataTable from 'datatables.net-dt';
import 'datatables.net-responsive-dt';

if (typeof window !== 'undefined') {
  window.$ = window.jQuery = $;
}

const STATUS_CLASS = {
  Active: 'status-online',
  Idle: 'status-pending',
  Offline: 'status-offline',
};

export default function DevicesDataTable({ devices, filters, onFilteredCount }) {
  const tableRef = useRef(null);
  const dtRef = useRef(null);
  const filtersRef = useRef(filters);
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
          row.dataset.version,
          row.dataset.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      return [
        ['country', 'country'],
        ['model', 'model'],
        ['version', 'version'],
        ['status', 'status'],
      ].every(([key, attr]) => {
        const value = f[key];
        return !value || row.dataset[attr] === value;
      });
    };

    DataTable.ext.search.push(filterPlugin);

    const table = new DataTable(tableRef.current, {
      pageLength: 10,
      lengthMenu: [10, 25, 50],
      responsive: true,
      order: [[5, 'desc']],
      layout: {
        topStart: null,
        topEnd: null,
        bottomStart: 'info',
        bottomEnd: 'paging',
      },
      language: {
        info: 'Showing _START_ to _END_ of _TOTAL_ scanners',
        infoEmpty: 'No devices match the current filters',
        infoFiltered: '(filtered from _MAX_ total)',
        zeroRecords: 'No devices match the current filters',
        emptyTable: 'No devices match the current filters',
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
      DataTable.ext.search = DataTable.ext.search.filter(
        (fn) => fn !== filterPlugin
      );
      table.destroy();
      dtRef.current = null;
    };
  }, [devices, onFilteredCount]);

  useEffect(() => {
    if (dtRef.current) dtRef.current.draw();
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
              key={device.serial}
              data-serial={device.serial}
              data-model={device.model}
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
              <td data-order={device.lastContactOrder}>{device.lastContact}</td>
              <td data-order={device.scans30d}>
                {device.scans30d.toLocaleString('en-US')}
              </td>
              <td>
                <span
                  className={`status-badge ${STATUS_CLASS[device.status] || 'status-inactive'}`}
                >
                  {device.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
