import { create } from 'zustand';
import { Chess } from 'chess.js';
import { INITIAL_FEN } from '@/constants';

interface GameState {
  // Chess instance
  game: Chess;
  // Array of FENs from the parsed/analyzed game
  fenHistory: string[];
  // Array of SAN moves
  moveHistory: string[];
  // Current move index (-1 = initial position, 0 = after first move, etc.)
  currentMoveIndex: number;
  // Board orientation
  orientation: 'white' | 'black';
  // Current FEN being displayed
  currentFen: string;

  // Actions
  loadGame: (pgn: string) => void;
  loadFen: (fen: string) => void;
  goToMove: (index: number) => void;
  nextMove: () => void;
  prevMove: () => void;
  firstMove: () => void;
  lastMove: () => void;
  flipBoard: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  game: new Chess(),
  fenHistory: [INITIAL_FEN],
  moveHistory: [],
  currentMoveIndex: -1,
  orientation: 'white',
  currentFen: INITIAL_FEN,

  loadGame: (pgn: string) => {
    const game = new Chess();
    try {
      game.loadPgn(pgn);
    } catch {
      console.error('Failed to load PGN');
      return;
    }

    const history = game.history();
    const fens: string[] = [INITIAL_FEN];
    const replay = new Chess();

    for (const move of history) {
      replay.move(move);
      fens.push(replay.fen());
    }

    set({
      game,
      fenHistory: fens,
      moveHistory: history,
      currentMoveIndex: -1,
      currentFen: INITIAL_FEN,
    });
  },

  loadFen: (fen: string) => {
    const game = new Chess(fen);
    set({
      game,
      fenHistory: [fen],
      moveHistory: [],
      currentMoveIndex: -1,
      currentFen: fen,
    });
  },

  goToMove: (index: number) => {
    const { fenHistory } = get();
    const clampedIndex = Math.max(-1, Math.min(index, fenHistory.length - 2));
    set({
      currentMoveIndex: clampedIndex,
      currentFen: fenHistory[clampedIndex + 1],
    });
  },

  nextMove: () => {
    const { currentMoveIndex, fenHistory } = get();
    if (currentMoveIndex < fenHistory.length - 2) {
      const newIndex = currentMoveIndex + 1;
      set({
        currentMoveIndex: newIndex,
        currentFen: fenHistory[newIndex + 1],
      });
    }
  },

  prevMove: () => {
    const { currentMoveIndex, fenHistory } = get();
    if (currentMoveIndex >= 0) {
      const newIndex = currentMoveIndex - 1;
      set({
        currentMoveIndex: newIndex,
        currentFen: fenHistory[newIndex + 1],
      });
    }
  },

  firstMove: () => {
    const { fenHistory } = get();
    set({
      currentMoveIndex: -1,
      currentFen: fenHistory[0],
    });
  },

  lastMove: () => {
    const { fenHistory } = get();
    set({
      currentMoveIndex: fenHistory.length - 2,
      currentFen: fenHistory[fenHistory.length - 1],
    });
  },

  flipBoard: () => {
    set((state) => ({
      orientation: state.orientation === 'white' ? 'black' : 'white',
    }));
  },

  reset: () => {
    set({
      game: new Chess(),
      fenHistory: [INITIAL_FEN],
      moveHistory: [],
      currentMoveIndex: -1,
      currentFen: INITIAL_FEN,
      orientation: 'white',
    });
  },
}));
