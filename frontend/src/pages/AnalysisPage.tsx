import { PageShell } from '@/components/layout/PageShell';
import { ChessBoard } from '@/components/board/ChessBoard';
import { BoardControls } from '@/components/board/BoardControls';
import { PlayerInfo } from '@/components/board/PlayerInfo';
import { EvalBar } from '@/components/board/EvalBar';
import { AnalysisSidebar } from '@/components/analysis/AnalysisSidebar';
import { SetupView } from '@/components/analysis/SetupView';
import { AnalysisProgressOverlay } from '@/components/analysis/AnalysisProgressOverlay';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
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
    analysisProgress,
  } = useAnalysisStore();
  const { isExploring, orientation } = useGameStore();

  useAnalysisWebSocket(pendingAnalysisId);

  let currentEval = 0;
  let currentMateIn: number | null = null;

  // When exploring, prefer live FEN eval
  if (isExploring && fenResult) {
    currentEval = fenResult.eval;
    currentMateIn = fenResult.mate_in;
  } else if (pgnResult) {
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

  const blackToMove = pgnResult
    ? selectedMoveIndex >= 0 && pgnResult.moves[selectedMoveIndex]?.color === 'white'
    : fenResult?.turn === 'black';

  const whiteToMove = pgnResult
    ? selectedMoveIndex === -1 ||
      (selectedMoveIndex >= 0 && pgnResult.moves[selectedMoveIndex]?.color === 'black')
    : fenResult?.turn === 'white';

  const boardTopIsBlack = orientation === 'white';

  return (
    <PageShell>
      {!hasAnalysis && !isAnalyzing && !pendingAnalysisId ? (
        <SetupView />
      ) : (
        <div className="flex gap-4 items-start justify-center min-h-[calc(100vh-80px)] px-4 py-4">
          {/* Left: Eval Bar + Board */}
          <div className="flex gap-2 items-start shrink-0">
            {hasAnalysis && (
              <EvalBar eval_score={currentEval} mate_in={currentMateIn} />
            )}
            <div>
              <PlayerInfo
                name={boardTopIsBlack ? pgnResult?.metadata.black || 'Black' : pgnResult?.metadata.white || 'White'}
                rating={boardTopIsBlack ? pgnResult?.metadata.black_elo : pgnResult?.metadata.white_elo}
                color={boardTopIsBlack ? 'black' : 'white'}
                active={boardTopIsBlack ? !!blackToMove : !!whiteToMove}
              />
              <div className="my-1">
                <ChessBoard />
              </div>
              <PlayerInfo
                name={boardTopIsBlack ? pgnResult?.metadata.white || 'White' : pgnResult?.metadata.black || 'Black'}
                rating={boardTopIsBlack ? pgnResult?.metadata.white_elo : pgnResult?.metadata.black_elo}
                color={boardTopIsBlack ? 'white' : 'black'}
                active={boardTopIsBlack ? !!whiteToMove : !!blackToMove}
              />
              <BoardControls />
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
