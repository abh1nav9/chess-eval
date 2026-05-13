import { create } from 'zustand';
import type { PGNAnalysisResult, FENAnalysisResult, MoveEvaluation, AnalysisProgressState } from '@/types';

interface AnalysisState {
  // PGN analysis data
  pgnResult: PGNAnalysisResult | null;
  // FEN analysis data
  fenResult: FENAnalysisResult | null;
  // Loading states
  isAnalyzing: boolean;
  analysisError: string | null;
  // Current mode
  mode: 'pgn' | 'fen' | null;
  // Selected move for detail view
  selectedMoveIndex: number;
  // Tracking async analysis
  pendingAnalysisId: string | null;
  // Progress status
  analysisProgress: AnalysisProgressState | null;

  // Actions
  setPGNResult: (result: PGNAnalysisResult) => void;
  setFENResult: (result: FENAnalysisResult) => void;
  setAnalyzing: (loading: boolean) => void;
  setPendingAnalysisId: (id: string | null) => void;
  setProgress: (progress: AnalysisProgressState | null) => void;
  setError: (error: string | null) => void;
  setMode: (mode: 'pgn' | 'fen') => void;
  setSelectedMove: (index: number) => void;
  getCurrentMoveEval: () => MoveEvaluation | null;
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

  setPGNResult: (result) =>
    set({
      pgnResult: result,
      analysisError: null,
      mode: 'pgn',
      isAnalyzing: false,
      analysisProgress: null,
      pendingAnalysisId: null,
      selectedMoveIndex: -1,
    }),
  setFENResult: (result) => set({ fenResult: result, analysisError: null, mode: 'fen', isAnalyzing: false }),
  setAnalyzing: (loading) => set({ isAnalyzing: loading }),
  setPendingAnalysisId: (id) => set({ pendingAnalysisId: id, isAnalyzing: true }),
  setProgress: (progress) => set({ analysisProgress: progress }),
  setError: (error) => set({ analysisError: error, isAnalyzing: false, analysisProgress: null, pendingAnalysisId: null }),
  setMode: (mode) => set({ mode }),
  setSelectedMove: (index) => set({ selectedMoveIndex: index }),

  getCurrentMoveEval: () => {
    const { pgnResult, selectedMoveIndex } = get();
    if (!pgnResult || selectedMoveIndex < 0) return null;
    return pgnResult.moves[selectedMoveIndex] || null;
  },

  reset: () => set({
    pgnResult: null,
    fenResult: null,
    isAnalyzing: false,
    analysisError: null,
    mode: null,
    selectedMoveIndex: -1,
    analysisProgress: null,
    pendingAnalysisId: null,
  }),
}));
