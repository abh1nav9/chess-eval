import { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';
import { useUIStore } from '@/store/uiStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Filler,
  annotationPlugin
);

function getChartColors(theme: 'light' | 'dark') {
  const isDark = theme === 'dark';
  return {
    line: isDark ? '#8a857c' : '#6d6860',
    pointHoverBg: isDark ? '#e8e4dc' : '#2c2a26',
    pointHoverBorder: isDark ? '#262522' : '#f3f1ed',
    tooltipBg: isDark ? '#1e1d1a' : '#fdfcfa',
    tooltipTitle: isDark ? '#e8e4dc' : '#2c2a26',
    tooltipBody: isDark ? '#a39e94' : '#5c5852',
    tooltipBorder: isDark ? 'rgba(245, 240, 232, 0.08)' : 'rgba(44, 42, 38, 0.08)',
    annotationLine: isDark ? '#c9c2b5' : '#3d3a35',
    tickColor: isDark ? '#7a756c' : '#8a857c',
    gridColor: isDark ? 'rgba(245, 240, 232, 0.06)' : 'rgba(44, 42, 38, 0.06)',
  };
}

export function EvalGraph() {
  const { pgnResult, selectedMoveIndex, setSelectedMove } = useAnalysisStore();
  const { goToMove } = useGameStore();
  const theme = useUIStore((s) => s.theme);
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  const data = useMemo(() => {
    if (!pgnResult) return [];
    return pgnResult.moves.map((m, i) => ({
      index: i,
      move: `${m.move_number}${m.color === 'white' ? '.' : '...'} ${m.move}`,
      eval: Math.max(-5, Math.min(5, m.eval_after)),
      rawEval: m.eval_after,
      classification: m.classification,
    }));
  }, [pgnResult]);

  const colors = useMemo(() => getChartColors(theme), [theme]);

  if (data.length === 0) return null;

  const chartData = {
    labels: data.map((d) => d.move),
    datasets: [
      {
        label: 'Evaluation',
        data: data.map((d) => d.eval),
        borderColor: colors.line,
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: colors.pointHoverBg,
        pointHoverBorderColor: colors.pointHoverBorder,
        pointHoverBorderWidth: 2,
        tension: 0.2,
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;

          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(5, 150, 105, 0.12)');
          gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.02)');
          gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.02)');
          gradient.addColorStop(1, 'rgba(220, 38, 38, 0.12)');

          return gradient;
        },
      },
    ],
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (_: any, elements: any[]) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const prev = useGameStore.getState().currentMoveIndex;
        setSelectedMove(index);
        goToMove(index);
        const snap = useGameStore.getState();
        gameSoundCoordinator.onBoardNavigation(prev, snap.currentMoveIndex, snap);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipTitle,
        bodyColor: colors.tooltipBody,
        borderColor: colors.tooltipBorder,
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            const val = context.raw as number;
            return `Eval: ${val > 0 ? '+' : ''}${val.toFixed(2)}`;
          },
        },
      },
      annotation: {
        annotations: selectedMoveIndex >= 0 ? {
          line1: {
            type: 'line',
            xMin: selectedMoveIndex,
            xMax: selectedMoveIndex,
            borderColor: colors.annotationLine,
            borderWidth: 1,
            borderDash: [4, 4],
          }
        } : {},
      },
    },
    scales: {
      x: { display: false },
      y: {
        min: -5,
        max: 5,
        ticks: {
          stepSize: 2.5,
          color: colors.tickColor,
          font: { size: 9, family: '"JetBrains Mono", monospace' },
        },
        grid: {
          color: colors.gridColor,
          drawBorder: false,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="w-full h-[80px] py-1">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
