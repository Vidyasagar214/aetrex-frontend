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

export function VersionChart({ labels, values }) {
  const chartLabels = labels?.length > 0 ? labels : ['—'];
  const chartValues = values?.length > 0 ? values : [0];

  const palette = [
    colors.teal,
    colors.blue,
    colors.green,
    colors.orange,
    colors.danger,
    colors.gray,
  ];

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: chartLabels.map(
          (_, i) => palette[i % palette.length]
        ),
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

export function ModelChart({ labels, values, percents }) {
  const chartLabels = labels?.length > 0 ? labels : ['—'];
  const chartValues = values?.length > 0 ? values : [0];
  const chartPercents =
    percents?.length > 0 ? percents : chartValues.map(() => 0);

  const palette = [
    colors.blue,
    colors.green,
    colors.orange,
    colors.teal,
    colors.danger,
    colors.gray,
  ];

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: chartLabels.map(
          (_, i) => palette[i % palette.length]
        ),
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
          label: (ctx) => {
            const pct = chartPercents[ctx.dataIndex];
            const count = ctx.parsed;
            const pctText =
              pct != null ? `${pct}%` : `${count}`;
            return ` ${ctx.label}: ${count.toLocaleString('en-US')} (${pctText})`;
          },
        },
      },
    },
  };

  return <Doughnut data={data} options={options} />;
}

export function AdoptionChart({
  labels = [],
  adoption = [],
  target = [],
  targetPct = 90,
}) {
  const chartLabels = labels?.length > 0 ? labels : ['—'];
  const adoptionData =
    adoption?.length > 0 ? adoption : chartLabels.map(() => 0);
  const targetData =
    target?.length > 0 ? target : chartLabels.map(() => targetPct);

  const data = {
    labels: chartLabels,
    datasets: [
      {
        label: 'Adoption %',
        data: adoptionData,
        borderColor: colors.blue,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return 'rgba(26, 157, 212, 0.15)';
          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          gradient.addColorStop(0, 'rgba(26, 157, 212, 0.25)');
          gradient.addColorStop(1, 'rgba(26, 157, 212, 0.02)');
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.3,
        pointBackgroundColor: colors.blue,
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: chartLabels.length > 20 ? 2 : 3,
        pointHoverRadius: 5,
        order: 1,
      },
      {
        label: `Target ${targetPct}%`,
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
    interaction: { mode: 'index', intersect: false },
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
        ...tooltipBase,
        callbacks: {
          label: (ctx) => {
            const y = ctx.parsed.y;
            const value =
              typeof y === 'number' ? `${y.toFixed(y % 1 === 0 ? 0 : 1)}%` : y;
            return ` ${ctx.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: {
          color: colors.tick,
          font: { size: 11, family: "'Segoe UI', sans-serif", weight: '400' },
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 10,
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
