import { PageShell } from '@/components/layout/PageShell';
import { ChessBoard } from '@/components/board/ChessBoard';
import { BoardControls } from '@/components/board/BoardControls';
import { PlayerInfo } from '@/components/board/PlayerInfo';
import { EvalBar } from '@/components/board/EvalBar';
import { Card } from '@/components/ui/Card';
import { EvalGraph } from '@/components/charts/EvalGraph';
import { AnalysisSidebar } from '@/components/analysis/AnalysisSidebar';
import { SetupView } from '@/components/analysis/SetupView';
import { AnalysisProgressOverlay } from '@/components/analysis/AnalysisProgressOverlay';
import { useAnalysisStore } from '@/store/analysisStore';
import { useAnalysisWebSocket } from '@/hooks/useAnalysisWebSocket';
import { motion, AnimatePresence } from 'framer-motion';

export function AnalysisPage() {
  const { 
    pgnResult, 
    fenResult, 
    isAnalyzing, 
    analysisError, 
    selectedMoveIndex,
    pendingAnalysisId,
    analysisProgress
  } = useAnalysisStore();

  // Initialize WebSocket connection if there's a pending analysis
  useAnalysisWebSocket(pendingAnalysisId);

  // Get current eval for the eval bar
  let currentEval = 0;
  let currentMateIn: number | null = null;

  if (pgnResult) {
    if (selectedMoveIndex === -1 && pgnResult.moves.length > 0) {
      currentEval = pgnResult.moves[0].eval_before;
    } else if (selectedMoveIndex >= 0 && selectedMoveIndex < pgnResult.moves.length) {
      currentEval = pgnResult.moves[selectedMoveIndex].eval_after;
      currentMateIn = pgnResult.moves[selectedMoveIndex].mate_in;
    }
  } else if (fenResult) {
    currentEval = fenResult.eval;
    currentMateIn = fenResult.mate_in;
  }

  const hasAnalysis = pgnResult || fenResult;

  return (
    <PageShell>
      {!hasAnalysis && !isAnalyzing && !pendingAnalysisId ? (
        <SetupView />
      ) : (
        <div className="flex gap-5 items-start justify-center min-h-[calc(100vh-80px)] px-4">
          {/* Left: Eval Bar + Board */}
          <div className="flex gap-3 items-start shrink-0">
            {hasAnalysis && (
              <EvalBar eval_score={currentEval} mate_in={currentMateIn} />
            )}
            <div>
              <PlayerInfo 
                name={pgnResult?.metadata.black || 'Black'} 
                rating={pgnResult?.metadata.black_elo}
                color="black"
                active={
                  pgnResult ? (selectedMoveIndex >= 0 && pgnResult.moves[selectedMoveIndex]?.color === 'white') :
                  fenResult?.turn === 'black'
                }
              />
              {pgnResult?.metadata.opening && (
                <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-1">
                  {pgnResult.metadata.eco && (
                    <span className="font-mono text-[var(--color-accent)] font-semibold">
                      {pgnResult.metadata.eco}
                    </span>
                  )}
                  <span>{pgnResult.metadata.opening}</span>
                </div>
              )}
              <div className="my-2">
                <ChessBoard />
              </div>
              <PlayerInfo 
                name={pgnResult?.metadata.white || 'White'} 
                rating={pgnResult?.metadata.white_elo}
                color="white"
                active={
                  pgnResult ? (selectedMoveIndex === -1 || pgnResult.moves[selectedMoveIndex]?.color === 'black') :
                  fenResult?.turn === 'white'
                }
              />
              <div className="mt-4">
                <BoardControls />
              </div>
              {pgnResult && (
              <Card padding="sm" className="mt-4 linear-card">
                <EvalGraph />
              </Card>
            )}
            </div>
          </div>

          {/* Right: Sidebar */}
          <AnalysisSidebar />
        </div>
      )}

      <AnalysisProgressOverlay
        visible={isAnalyzing || (!!pendingAnalysisId && !pgnResult)}
        progress={analysisProgress}
      />

        {/* Error toast */}
        <AnimatePresence>
          {analysisError && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-red-500/10 border border-red-500/30 rounded-[var(--radius-md)] text-sm text-red-400"
            >
              {analysisError}
            </motion.div>
          )}
        </AnimatePresence>
    </PageShell>
  );
}
