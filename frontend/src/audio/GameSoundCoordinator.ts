import { Chess, type Move } from 'chess.js';
import { CHESS_SOUND_PATHS, type ChessSoundEvent } from '@/audio/chessSoundPaths';
import { getVerboseMoveAtHistoryIndex } from '@/utils/chessReplay';
import { isTimeoutTermination } from '@/utils/parsePgnTermination';

const DEFAULT_VOLUME = 0.42;

type GameSnapshot = {
  currentMoveIndex: number;
  fenHistory: string[];
  moveHistory: string[];
};

/**
 * Plays chess UI sounds: one-shot Web Audio via HTMLAudioElement.
 * Move outcome priority matches common chess clients (mate/stalemate before castle/capture/check).
 */
export class GameSoundCoordinator {
  private volume = DEFAULT_VOLUME;

  setVolume(level: number): void {
    this.volume = Math.max(0, Math.min(1, level));
  }

  playEvent(event: ChessSoundEvent): void {
    const url = CHESS_SOUND_PATHS[event];
    const audio = new Audio(url);
    audio.volume = this.volume;
    void audio.play().catch(() => {});
  }

  /** When a full PGN analysis session is ready to review. */
  onPgnAnalysisReady(pgn: string): void {
    if (isTimeoutTermination(pgn)) {
      this.playEvent('timeout');
      return;
    }
    this.playEvent('gamestart');
  }

  /** After a legal move on the current board (drag, click, or exploration). */
  afterMove(move: Move, boardAfter: Chess): void {
    if (boardAfter.isCheckmate()) {
      this.playEvent('checkmate');
      return;
    }
    if (boardAfter.isStalemate()) {
      this.playEvent('stalemate');
      return;
    }
    if (move.flags.includes('k') || move.flags.includes('q')) {
      this.playEvent('castling');
      return;
    }
    if (move.captured) {
      this.playEvent('piececaptured');
      return;
    }
    if (boardAfter.inCheck()) {
      this.playEvent('check');
      return;
    }
    this.playEvent('piecemove');
  }

  /**
   * PGN line navigation: one step forward/back uses move sounds; jump-to-end plays the terminal
   * move once; jump-to-start and other multi-step jumps are silent (analysis.md §4.14).
   */
  onBoardNavigation(prevIndex: number, nextIndex: number, snapshot: GameSnapshot): void {
    if (nextIndex > prevIndex) {
      this.navigateForwardSound(prevIndex, nextIndex, snapshot);
    } else if (nextIndex < prevIndex) {
      this.navigateBackwardSound(prevIndex, nextIndex, snapshot);
    }
  }

  private playSoundForMoveIndex(soundMoveIndex: number, snapshot: GameSnapshot): void {
    const move = getVerboseMoveAtHistoryIndex(
      snapshot.fenHistory,
      snapshot.moveHistory,
      soundMoveIndex,
    );
    if (!move) return;

    const fenAfter = snapshot.fenHistory[soundMoveIndex + 1];
    try {
      const boardAfter = new Chess(fenAfter);
      this.afterMove(move, boardAfter);
    } catch {
      /* invalid FEN */
    }
  }

  private navigateForwardSound(
    prevIndex: number,
    nextIndex: number,
    snapshot: GameSnapshot,
  ): void {
    const lastIdx = snapshot.fenHistory.length - 2;
    const delta = nextIndex - prevIndex;
    let soundMoveIndex: number | null = null;

    if (delta === 1) {
      soundMoveIndex = nextIndex;
    } else if (nextIndex === lastIdx && lastIdx >= 0) {
      soundMoveIndex = lastIdx;
    }

    if (soundMoveIndex === null) return;
    this.playSoundForMoveIndex(soundMoveIndex, snapshot);
  }

  private navigateBackwardSound(
    prevIndex: number,
    nextIndex: number,
    snapshot: GameSnapshot,
  ): void {
    if (nextIndex < 0) {
      return;
    }
    const delta = prevIndex - nextIndex;
    if (delta === 1) {
      this.playSoundForMoveIndex(prevIndex, snapshot);
      return;
    }
  }
}

export const gameSoundCoordinator = new GameSoundCoordinator();
