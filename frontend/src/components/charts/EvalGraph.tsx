import { useMemo, useRef, useEffect } from 'react';
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

export function EvalGraph() {
  const { pgnResult, selectedMoveIndex, setSelectedMove } = useAnalysisStore();
  const { goToMove } = useGameStore();
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  const data = useMemo(() => {
    if (!pgnResult) return [];
    return pgnResult.moves.map((m, i) => ({
      index: i,
      move: `${m.move_number}${m.color === 'white' ? '.' : '...'} ${m.move}`,
      eval: Math.max(-5, Math.min(5, m.eval_after)), // clamp for display
      rawEval: m.eval_after,
      classification: m.classification,
    }));
  }, [pgnResult]);

  if (data.length === 0) return null;

  const chartData = {
    labels: data.map((d) => d.move),
    datasets: [
      {
        label: 'Evaluation',
        data: data.map((d) => d.eval),
        borderColor: '#a1a1aa',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#ffffff',
        pointHoverBorderColor: '#000000',
        pointHoverBorderWidth: 2,
        tension: 0.2, // slight curve
        fill: true,
        backgroundColor: (context: any) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return null;
          
          // Create gradient from top to bottom
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          // Positive eval (green) at top
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
          gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.02)');
          // Negative eval (red) at bottom
          gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.02)');
          gradient.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
          
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
        setSelectedMove(index);
        goToMove(index);
      }
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#111111',
        titleColor: '#ededed',
        bodyColor: '#a1a1aa',
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
            borderColor: '#ffffff',
            borderWidth: 1,
            borderDash: [4, 4],
          }
        } : {},
      },
    },
    scales: {
      x: {
        display: false,
      },
      y: {
        min: -5,
        max: 5,
        ticks: {
          stepSize: 2.5,
          color: '#71717a',
          font: {
            size: 9,
            family: '"JetBrains Mono", monospace'
          },
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          drawBorder: false,
        },
        border: {
          display: false,
        }
      },
    },
  };

  return (
    <div className="w-full h-[120px] mt-3">
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
