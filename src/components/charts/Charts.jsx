import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { CHART_COLORS as colors } from '../../data/navigation';

ChartJS.defaults.font.family =
  "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
ChartJS.defaults.font.size = 11;
ChartJS.defaults.font.weight = '400';
ChartJS.defaults.color = colors.tick;
ChartJS.defaults.animation.duration = 400;

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend
);

const tooltipBase = {
  backgroundColor: colors.tooltip,
  titleFont: { size: 12, family: "'Segoe UI', sans-serif", weight: '400' },
  bodyFont: { size: 12, family: "'Segoe UI', sans-serif", weight: '400' },
  padding: 10,
  cornerRadius: 4,
};

const baseScale = {
  grid: { color: colors.grid, drawBorder: false },
  ticks: {
    color: colors.tick,
    font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
  },
  border: { display: false },
};

export function VersionChart() {
  const data = {
    labels: ['v4.5', 'v4.4', 'v4.3', 'v4.2', 'Older'],
    datasets: [
      {
        data: [3475, 380, 160, 98, 125],
        backgroundColor: [
          colors.teal,
          colors.blue,
          colors.green,
          colors.orange,
          colors.danger,
        ],
        borderRadius: 2,
        borderSkipped: false,
        barPercentage: 0.65,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: tooltipBase },
    scales: {
      x: { ...baseScale, grid: { display: false } },
      y: {
        ...baseScale,
        beginAtZero: true,
        ticks: { ...baseScale.ticks, maxTicksLimit: 5 },
      },
    },
  };

  return <Bar data={data} options={options} />;
}

export function ModelChart() {
  const data = {
    labels: ['Albert Pro', 'Albert 3DFit', 'Albert Pressure Scanner', 'Zoe Pro'],
    datasets: [
      {
        data: [38, 25, 13, 24],
        backgroundColor: [colors.blue, colors.green, colors.orange, colors.teal],
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 14,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
          color: '#333333',
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
}

export function AdoptionChart() {
  const labels = [
    'May 18',
    'May 25',
    'Jun 1',
    'Jun 8',
    'Jun 15',
    'Jun 22',
    'Jun 29',
    'Jul 6',
    'Jul 13',
  ];
  const adoptionData = [8, 18, 29, 41, 52, 61, 70, 77, 82];
  const targetData = labels.map(() => 90);

  const data = {
    labels,
    datasets: [
      {
        label: 'Adoption %',
        data: adoptionData,
        borderColor: colors.blue,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(26, 157, 212, 0.15)';
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(26, 157, 212, 0.15)');
          gradient.addColorStop(1, 'rgba(26, 157, 212, 0.01)');
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: colors.blue,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        order: 1,
      },
      {
        label: 'Target %',
        data: targetData,
        borderColor: colors.danger,
        borderWidth: 1.5,
        borderDash: [6, 4],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
        order: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          usePointStyle: true,
          pointStyle: 'line',
          padding: 16,
          font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
          color: '#333333',
        },
      },
      tooltip: {
        backgroundColor: colors.tooltip,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: colors.tick,
          font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
        },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        grid: { color: colors.grid, drawBorder: false },
        ticks: {
          color: colors.tick,
          stepSize: 25,
          callback: (v) => `${v}%`,
          font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
        },
        border: { display: false },
      },
    },
  };

  return <Line data={data} options={options} />;
}
