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
import { evalToBarPercent } from '@/utils/evalBarPercent';

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
      winPct: evalToBarPercent(m.eval_after, m.mate_in),
      rawEval: m.eval_after,
      mateIn: m.mate_in,
      classification: m.classification,
    }));
  }, [pgnResult]);

  const colors = useMemo(() => getChartColors(theme), [theme]);

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.move),
      datasets: [
        {
          label: 'White win %',
          data: data.map((d) => d.winPct),
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
            if (!chartArea) return undefined;

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(5, 150, 105, 0.12)');
            gradient.addColorStop(0.5, 'rgba(5, 150, 105, 0.02)');
            gradient.addColorStop(0.5, 'rgba(220, 38, 38, 0.02)');
            gradient.addColorStop(1, 'rgba(220, 38, 38, 0.12)');

            return gradient;
          },
        },
      ],
    }),
    [data, colors],
  );

  const options: import('chart.js').ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      onClick: (_evt, elements) => {
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
            label: (ctx) => {
              const idx = ctx.dataIndex;
              const pt = data[idx];
              if (!pt) return '';
              const w = `${pt.winPct.toFixed(1)}% white`;
              if (pt.mateIn != null) {
                return `M${Math.abs(pt.mateIn)} · ${w}`;
              }
              const e = pt.rawEval;
              const ev = `${e >= 0 ? '+' : ''}${e.toFixed(2)}`;
              return `${ev} · ${w}`;
            },
          },
        },
        annotation: {
          annotations:
            selectedMoveIndex >= 0
              ? {
                  line1: {
                    type: 'line',
                    xMin: selectedMoveIndex,
                    xMax: selectedMoveIndex,
                    borderColor: colors.annotationLine,
                    borderWidth: 1,
                    borderDash: [4, 4],
                  },
                }
              : {},
        },
      },
      scales: {
        x: { display: false },
        y: {
          min: 0,
          max: 100,
          ticks: {
            stepSize: 25,
            color: colors.tickColor,
            font: { size: 9, family: '"JetBrains Mono", monospace' },
            callback: (tickValue) => `${tickValue}%`,
          },
          grid: {
            color: colors.gridColor,
            drawBorder: false,
          },
          border: { display: false },
        },
      },
    }),
    [colors, data, goToMove, selectedMoveIndex, setSelectedMove],
  );

  if (data.length === 0) return null;

  return (
    <div className="w-full h-[80px] py-1">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
