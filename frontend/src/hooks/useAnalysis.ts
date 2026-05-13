import { useMutation, useQuery } from '@tanstack/react-query';
import { analysisService } from '@/services/analysisService';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import type { PGNAnalysisRequest, FENAnalysisRequest } from '@/types';
import type { ChessComBoardPlayerOverlay } from '@/utils/chessComBoardOverlay';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';

export type SubmitPgnMutationVariables = PGNAnalysisRequest & {
  chessComPlayerOverlay?: ChessComBoardPlayerOverlay | null;
};

export function useSubmitPGN() {
  const { setPGNResult, setAnalyzing, setError, setPendingAnalysisId, setChessComPlayerOverlay } =
    useAnalysisStore();
  const { loadGame } = useGameStore();

  return useMutation({
    mutationFn: ({ chessComPlayerOverlay: _overlay, ...request }: SubmitPgnMutationVariables) =>
      analysisService.analyzePGN(request),
    onMutate: (variables) => {
      setAnalyzing(true);
      setError(null);
      setChessComPlayerOverlay(variables.chessComPlayerOverlay ?? null);
    },
    onSuccess: (data) => {
      if (data.analysis_id) {
        setPendingAnalysisId(data.analysis_id);
      }
      loadGame(data.pgn);
      // We don't setAnalyzing(false) here because the background task is still running
    },
    onError: (error: Error) => {
      setError(error.message || 'Analysis failed');
    },
  });
}

export function useSubmitFEN() {
  const { setFENResult, setAnalyzing, setError } = useAnalysisStore();
  const { loadFen } = useGameStore();

  return useMutation({
    mutationFn: (request: FENAnalysisRequest) => analysisService.analyzeFEN(request),
    onMutate: () => {
      setAnalyzing(true);
      setError(null);
    },
    onSuccess: (data) => {
      setFENResult(data);
      loadFen(data.fen);
      setAnalyzing(false);
    },
    onError: (error: Error) => {
      setError(error.message || 'FEN analysis failed');
      setAnalyzing(false);
    },
  });
}

export function useGetAnalysis(analysisId: string | undefined) {
  const { setPGNResult, setChessComPlayerOverlay } = useAnalysisStore();
  const { loadGame } = useGameStore();

  return useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: async () => {
      if (!analysisId) throw new Error('No analysis ID');
      const data = await analysisService.getAnalysis(analysisId);
      setChessComPlayerOverlay(null);
      setPGNResult(data);
      loadGame(data.pgn);
      if (data.pgn) gameSoundCoordinator.onPgnAnalysisReady(data.pgn);
      return data;
    },
    enabled: !!analysisId,
    staleTime: Infinity,
  });
}

export function useListAnalyses(limit = 20, skip = 0) {
  return useQuery({
    queryKey: ['analyses', limit, skip],
    queryFn: () => analysisService.listAnalyses(limit, skip),
    staleTime: 30000,
  });
}

export function useHealthCheck() {
  return useQuery({
    queryKey: ['health'],
    queryFn: () => analysisService.healthCheck(),
    staleTime: 60000,
    retry: 1,
  });
}
