import type { AnalysisProgressState } from '@/types';

/** User-facing copy for the analysis progress overlay. */
export class AnalysisProgressOverlayCopy {
  static title(progress: AnalysisProgressState | null): string {
    if (!progress) return 'Analyzing Game';
    if (progress.totalMoves > 0) return 'Engine Progress';
    if (progress.statusMessage) return 'Preparing Engine';
    return 'Analyzing Game';
  }

  static subtitle(progress: AnalysisProgressState | null): string {
    if (!progress) {
      return 'Running Stockfish on every position. This can take a minute for long games.';
    }
    if (progress.totalMoves > 0) {
      const moveText = `Move ${progress.currentMove} of ${progress.totalMoves}`;
      if (progress.currentSan) {
        return `${moveText} — last analyzed: ${progress.currentSan}`;
      }
      return moveText;
    }
    if (progress.statusMessage) {
      return progress.statusMessage;
    }
    return 'Parsing moves and connecting to the engine...';
  }
}
