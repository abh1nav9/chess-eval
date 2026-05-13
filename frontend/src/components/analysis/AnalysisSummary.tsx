import { useAnalysisStore } from '@/store/analysisStore';
import { CLASSIFICATION_CONFIG } from '@/constants';
import type { MoveClassification } from '@/types';
import { Target, BarChart3 } from 'lucide-react';
import { ReanalyzePanel } from './ReanalyzePanel';

export function AnalysisSummary() {
  const { pgnResult } = useAnalysisStore();

  if (!pgnResult) return null;

  const { summary, metadata } = pgnResult;

  return (
    <div className="space-y-4">
      {/* Players */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-white border border-[var(--color-border)]" />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{metadata.white}</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{metadata.result}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{metadata.black}</span>
          <div className="w-3 h-3 rounded-sm bg-[var(--color-black-square)] border border-[var(--color-border)]" />
        </div>
      </div>

      {/* Opening */}
      {metadata.opening && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase">Opening</span>
          </div>
          <div className="flex items-center gap-2">
            {metadata.eco && (
              <span className="text-xs font-mono text-[var(--color-accent)] font-semibold">{metadata.eco}</span>
            )}
            <span className="text-sm text-[var(--color-text-primary)]">{metadata.opening}</span>
          </div>
        </div>
      )}

      {/* Accuracy */}
      <div className="grid grid-cols-2 gap-3">
        <AccuracyCard label="White Accuracy" value={summary.white_accuracy} />
        <AccuracyCard label="Black Accuracy" value={summary.black_accuracy} />
      </div>

      {/* ACPL */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<BarChart3 size={12} />}
          label="White ACPL"
          value={`${summary.avg_centipawn_loss_white.toFixed(0)} cp`}
        />
        <StatCard
          icon={<BarChart3 size={12} />}
          label="Black ACPL"
          value={`${summary.avg_centipawn_loss_black.toFixed(0)} cp`}
        />
      </div>

      {/* Classification breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          Move Quality
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(['brilliant', 'great', 'best', 'excellent', 'good', 'inaccuracy', 'mistake', 'miss', 'blunder'] as MoveClassification[]).map(
            (cls) => {
              const config = CLASSIFICATION_CONFIG[cls];
              const wCount = summary.white_classifications[cls] || 0;
              const bCount = summary.black_classifications[cls] || 0;
              if (wCount === 0 && bCount === 0) return null;
              return (
                <div key={cls} className="flex items-center justify-between py-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="text-xs text-[var(--color-text-secondary)]">{config.label}</span>
                  </div>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">
                    {wCount}/{bCount}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Re-analyze at different depth */}
      <ReanalyzePanel />
    </div>
  );
}

function AccuracyCard({ label, value }: { label: string; value: number }) {
  const color =
    value >= 90 ? 'var(--color-best)' :
    value >= 70 ? 'var(--color-good)' :
    value >= 50 ? 'var(--color-inaccuracy)' :
    'var(--color-blunder)';

  return (
    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 mb-1">
        <Target size={11} className="text-[var(--color-text-muted)]" />
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</span>
      </div>
      <span className="text-xl font-bold font-mono" style={{ color }}>
        {value.toFixed(1)}%
      </span>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-bg-primary)] border border-[var(--color-border)]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[var(--color-text-muted)]">{icon}</span>
        <span className="text-[10px] text-[var(--color-text-muted)] uppercase">{label}</span>
      </div>
      <span className="text-sm font-mono font-semibold text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
