export const NAV_SECTIONS = [
  {
    label: 'Dashboards',
    items: [
      {
        path: '/',
        label: 'Fleet Overview',
        icon: 'fa-solid fa-border-all',
      },
      {
        path: '/location-explorer',
        label: 'Location Explorer',
        icon: 'fa-solid fa-map-location-dot',
      },
      {
        path: '/releases',
        label: 'Releases & Upgrades',
        icon: 'fa-solid fa-arrow-up-from-bracket',
      },
      {
        path: '/devices',
        label: 'Devices',
        icon: 'fa-solid fa-computer',
      },
    ],
  },
  {
    label: 'Roadmap Preview',
    items: [
      {
        path: '/activity-health',
        label: 'Activity & Health',
        icon: 'fa-solid fa-heart-pulse',
      },
      {
        path: '/hardware-inventory',
        label: 'Hardware Inventory',
        icon: 'fa-solid fa-microchip',
      },
      {
        path: '/alerts',
        label: 'Alerts',
        icon: 'fa-solid fa-bell',
      },
    ],
  },
];

export const PAGE_META = {
  '/': {
    title: 'Fleet Overview',
    subtitle: 'Real-time visibility into the deployed scanner ecosystem',
  },
  '/location-explorer': {
    title: 'Location Explorer',
    subtitle: 'Explore scanner density by metro and inspect online / offline availability',
  },
  '/releases': {
    title: 'Releases & Upgrades',
    subtitle: 'Version adoption, upgrade compliance and rollout health',
  },
  '/devices': {
    title: 'Devices',
    subtitle: 'Search, filter and inspect every scanner in the fleet',
  },
  '/activity-health': {
    title: 'Activity & Health',
    subtitle: 'Monitor scanner uptime, communication health and activity trends',
  },
  '/hardware-inventory': {
    title: 'Hardware Inventory',
    subtitle: 'Track hardware assets, serials and spare components across the fleet',
  },
  '/alerts': {
    title: 'Alerts',
    subtitle: 'Review and act on fleet, upgrade and connectivity notifications',
  },
};

export const CHART_COLORS = {
  teal: '#7bc9d7',
  blue: '#1a9dd4',
  green: '#5cb85c',
  orange: '#f0ad4e',
  danger: '#d9534f',
  gray: '#999999',
  grid: '#eeeeee',
  tick: '#888888',
  tooltip: '#333333',
};
