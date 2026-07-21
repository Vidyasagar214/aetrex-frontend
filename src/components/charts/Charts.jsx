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

/** Fixed legend colors — match default fleet-by-count order, keyed by label + code */
const MODEL_SLICE_COLORS = {
  'Albert Pro': colors.blue,
  ALBERT2: colors.blue,
  GaitWay: colors.green,
  GAITWAY: colors.green,
  'Zoe Pro': colors.orange,
  ZOE: colors.orange,
  Nova: colors.teal,
  NOVA: colors.teal,
  'Albert Pressure Scanner': colors.danger,
  PRESSURE: colors.danger,
  'Albert 3DFit': colors.gray,
  '3DFIT': colors.gray,
  // Same as default palette wrap (7th slice reused blue)
  Albert: colors.blue,
  ALBERT: colors.blue,
};

const MODEL_FALLBACK_PALETTE = [
  colors.blue,
  colors.green,
  colors.orange,
  colors.teal,
  colors.danger,
  colors.gray,
];

const EMPTY_DONUT_GRAY = '#e6e6e6';
const REMAINDER_GRAY = '#ececec';
const HIDDEN_REMAINDER = '__remainder__';

function modelSliceColor(label, code, index = 0) {
  return (
    MODEL_SLICE_COLORS[label] ||
    MODEL_SLICE_COLORS[code] ||
    MODEL_FALLBACK_PALETTE[index % MODEL_FALLBACK_PALETTE.length]
  );
}

function resolveSelectedModelIndex(labels, codes, selectedModel, modelOptions) {
  if (!selectedModel) return -1;
  const needle = String(selectedModel).trim().toLowerCase();
  if (!needle) return -1;

  const opt = (modelOptions || []).find((m) => {
    const value = String(m?.value ?? m ?? '').toLowerCase();
    const label = String(m?.label ?? m ?? '').toLowerCase();
    return value === needle || label === needle;
  });
  const codeNeedle = String(opt?.value ?? selectedModel)
    .trim()
    .toLowerCase();
  const labelNeedle = String(opt?.label ?? selectedModel)
    .trim()
    .toLowerCase();

  return labels.findIndex((label, i) => {
    const lab = String(label || '').toLowerCase();
    const code = String(codes?.[i] || '').toLowerCase();
    return (
      lab === needle ||
      code === needle ||
      lab === labelNeedle ||
      code === codeNeedle
    );
  });
}

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

/**
 * Fleet-by-model doughnut.
 * - Colors are fixed per model (not by slice index).
 * - When selectedModel is set, only that model's fleet-% slice is shown;
 *   other models are replaced by a light-gray remainder (hidden from legend).
 * - Empty / no-match → solid light-gray empty ring.
 */
export function ModelChart({
  labels = [],
  values = [],
  percents = [],
  codes = [],
  selectedModel = '',
  modelOptions = [],
}) {
  const hasData = Array.isArray(labels) && labels.length > 0;
  const selectedIndex = resolveSelectedModelIndex(
    hasData ? labels : [],
    codes,
    selectedModel,
    modelOptions
  );
  const filtering = Boolean(String(selectedModel || '').trim());
  const selectedValue =
    selectedIndex >= 0 ? Number(values[selectedIndex]) || 0 : 0;
  const empty =
    !hasData ||
    values.every((v) => !Number(v)) ||
    (filtering && selectedValue <= 0);

  let chartLabels;
  let chartValues;
  let chartPercents;
  let chartColors;
  let legendFilter;

  if (empty) {
    chartLabels = ['No matching models'];
    chartValues = [1];
    chartPercents = [0];
    chartColors = [EMPTY_DONUT_GRAY];
    legendFilter = () => false;
  } else if (filtering && selectedIndex >= 0) {
    const total = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
    const remainder = Math.max(total - selectedValue, 0);
    const sliceColor = modelSliceColor(
      labels[selectedIndex],
      codes[selectedIndex],
      selectedIndex
    );
    if (remainder > 0) {
      chartLabels = [labels[selectedIndex], HIDDEN_REMAINDER];
      chartValues = [selectedValue, remainder];
      chartPercents = [percents[selectedIndex] ?? 0, null];
      chartColors = [sliceColor, REMAINDER_GRAY];
      legendFilter = (item) => item.text !== HIDDEN_REMAINDER;
    } else {
      chartLabels = [labels[selectedIndex]];
      chartValues = [selectedValue];
      chartPercents = [percents[selectedIndex] ?? 0];
      chartColors = [sliceColor];
      legendFilter = undefined;
    }
  } else {
    chartLabels = labels;
    chartValues = values;
    chartPercents = percents?.length ? percents : values.map(() => 0);
    chartColors = labels.map((label, i) =>
      modelSliceColor(label, codes[i], i)
    );
    legendFilter = undefined;
  }

  const data = {
    labels: chartLabels,
    datasets: [
      {
        data: chartValues,
        backgroundColor: chartColors,
        borderWidth: empty ? 0 : 2,
        borderColor: '#FFFFFF',
        hoverOffset: empty ? 0 : 4,
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
          filter: legendFilter,
        },
      },
      tooltip: {
        enabled: !empty,
        backgroundColor: colors.tooltip,
        filter: (item) => item.label !== HIDDEN_REMAINDER,
        callbacks: {
          label: (ctx) => {
            if (ctx.label === HIDDEN_REMAINDER) return null;
            const pct = chartPercents[ctx.dataIndex];
            const count = ctx.parsed;
            const pctText = pct != null ? `${pct}%` : `${count}`;
            return ` ${ctx.label}: ${Number(count).toLocaleString('en-US')} (${pctText})`;
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
