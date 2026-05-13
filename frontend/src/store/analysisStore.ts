import { create } from 'zustand';
import type {
  PGNAnalysisResult,
  FENAnalysisResult,
  MoveEvaluation,
  MoveClassification,
  AnalysisProgressState,
} from '@/types';
import type { ChessComBoardPlayerOverlay } from '@/utils/chessComBoardOverlay';

/** Lightweight eval for a live (exploration) move. */
export interface ExplorationMove {
  moveIndex: number;
  san: string;
  moveUci: string;
  evalBefore: number;
  evalAfter: number;
  classification: MoveClassification;
  bestMoveUci: string | null;
  toSquare: string;
  fromSquare: string;
}

interface AnalysisState {
  pgnResult: PGNAnalysisResult | null;
  fenResult: FENAnalysisResult | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  mode: 'pgn' | 'fen' | null;
  selectedMoveIndex: number;
  pendingAnalysisId: string | null;
  analysisProgress: AnalysisProgressState | null;

  // Live exploration move evaluations (keyed by move index)
  explorationMoves: ExplorationMove[];

  /** Set when analyzing a game started from Chess.com import; drives board player chrome. */
  chessComPlayerOverlay: ChessComBoardPlayerOverlay | null;

  setPGNResult: (result: PGNAnalysisResult) => void;
  setFENResult: (result: FENAnalysisResult) => void;
  setAnalyzing: (loading: boolean) => void;
  setPendingAnalysisId: (id: string | null) => void;
  setProgress: (progress: AnalysisProgressState | null) => void;
  setError: (error: string | null) => void;
  setMode: (mode: 'pgn' | 'fen') => void;
  setSelectedMove: (index: number) => void;
  getCurrentMoveEval: () => MoveEvaluation | null;
  addExplorationMove: (move: ExplorationMove) => void;
  clearExplorationMoves: () => void;
  setChessComPlayerOverlay: (overlay: ChessComBoardPlayerOverlay | null) => void;
  reset: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set, get) => ({
  pgnResult: null,
  fenResult: null,
  isAnalyzing: false,
  analysisError: null,
  mode: null,
  selectedMoveIndex: -1,
  pendingAnalysisId: null,
  analysisProgress: null,
  explorationMoves: [],
  chessComPlayerOverlay: null,

  setPGNResult: (result) =>
    set({
      pgnResult: result,
      analysisError: null,
      mode: 'pgn',
      isAnalyzing: false,
      analysisProgress: null,
      pendingAnalysisId: null,
      selectedMoveIndex: -1,
      explorationMoves: [],
    }),
  setFENResult: (result) =>
    set({
      pgnResult: null,
      fenResult: result,
      analysisError: null,
      mode: 'fen',
      isAnalyzing: false,
      chessComPlayerOverlay: null,
      pendingAnalysisId: null,
      analysisProgress: null,
      selectedMoveIndex: -1,
      explorationMoves: [],
    }),
  setAnalyzing: (loading) => set({ isAnalyzing: loading }),
  setPendingAnalysisId: (id) => set({ pendingAnalysisId: id, isAnalyzing: true }),
  setProgress: (progress) => set({ analysisProgress: progress }),
  setError: (error) =>
    set({
      analysisError: error,
      isAnalyzing: false,
      analysisProgress: null,
      pendingAnalysisId: null,
      chessComPlayerOverlay: null,
    }),
  setMode: (mode) => set({ mode }),
  setSelectedMove: (index) => set({ selectedMoveIndex: index }),

  getCurrentMoveEval: () => {
    const { pgnResult, selectedMoveIndex } = get();
    if (!pgnResult || selectedMoveIndex < 0) return null;
    return pgnResult.moves[selectedMoveIndex] || null;
  },

  addExplorationMove: (move) =>
    set((s) => ({
      explorationMoves: [
        ...s.explorationMoves.filter((m) => m.moveIndex !== move.moveIndex),
        move,
      ],
    })),

  clearExplorationMoves: () => set({ explorationMoves: [] }),

  setChessComPlayerOverlay: (overlay) => set({ chessComPlayerOverlay: overlay }),

  reset: () =>
    set({
      pgnResult: null,
      fenResult: null,
      isAnalyzing: false,
      analysisError: null,
      mode: null,
      selectedMoveIndex: -1,
      analysisProgress: null,
      pendingAnalysisId: null,
      explorationMoves: [],
      chessComPlayerOverlay: null,
    }),
}));
