import { create } from 'zustand';
import { Chess, type Move } from 'chess.js';
import { INITIAL_FEN } from '@/constants';

interface GameState {
  game: Chess;

  // Original PGN data (immutable after loadGame)
  pgnFenHistory: string[];
  pgnMoveHistory: string[];

  // Active navigation history (follows PGN or branch)
  fenHistory: string[];
  moveHistory: string[];

  currentMoveIndex: number;
  orientation: 'white' | 'black';
  currentFen: string;

  // Branch tracking: index of last PGN move before divergence (-1 = no branch)
  branchStartIndex: number;
  isExploring: boolean;

  loadGame: (pgn: string) => void;
  loadFen: (fen: string) => void;
  goToMove: (index: number) => void;
  nextMove: () => void;
  prevMove: () => void;
  firstMove: () => void;
  lastMove: () => void;
  flipBoard: () => void;
  makeMove: (from: string, to: string, promotion?: string) => Move | null;
  reset: () => void;
}

function restorePgn(state: GameState) {
  return {
    fenHistory: [...state.pgnFenHistory],
    moveHistory: [...state.pgnMoveHistory],
    branchStartIndex: -1,
    isExploring: false,
  };
}

export const useGameStore = create<GameState>((set, get) => ({
  game: new Chess(),
  pgnFenHistory: [INITIAL_FEN],
  pgnMoveHistory: [],
  fenHistory: [INITIAL_FEN],
  moveHistory: [],
  currentMoveIndex: -1,
  orientation: 'white',
  currentFen: INITIAL_FEN,
  branchStartIndex: -1,
  isExploring: false,

  loadGame: (pgn: string) => {
    const game = new Chess();
    try {
      game.loadPgn(pgn);
    } catch {
      return;
    }

    const history = game.history();
    const replay = new Chess();
    const fens: string[] = [replay.fen()];

    for (const move of history) {
      replay.move(move);
      fens.push(replay.fen());
    }

    const orientMatch = pgn.match(/\[Orientation "(white|black)"\]/i);
    const orientation: 'white' | 'black' =
      orientMatch && orientMatch[1]?.toLowerCase() === 'black' ? 'black' : 'white';

    set({
      game,
      pgnFenHistory: fens,
      pgnMoveHistory: history,
      fenHistory: fens,
      moveHistory: history,
      currentMoveIndex: -1,
      currentFen: fens[0],
      branchStartIndex: -1,
      isExploring: false,
      orientation,
    });
  },

  loadFen: (fen: string) => {
    const game = new Chess(fen);
    set({
      game,
      pgnFenHistory: [fen],
      pgnMoveHistory: [],
      fenHistory: [fen],
      moveHistory: [],
      currentMoveIndex: -1,
      currentFen: fen,
      branchStartIndex: -1,
      isExploring: false,
    });
  },

  goToMove: (index: number) => {
    const state = get();
    let { fenHistory, moveHistory, branchStartIndex, isExploring } = state;
    const clampedIndex = Math.max(-1, Math.min(index, fenHistory.length - 2));

    // If navigating to or before branch point, restore PGN
    if (isExploring && branchStartIndex >= 0 && clampedIndex <= branchStartIndex) {
      const restored = restorePgn(state);
      fenHistory = restored.fenHistory;
      moveHistory = restored.moveHistory;
      branchStartIndex = restored.branchStartIndex;
      isExploring = restored.isExploring;

      const reClamp = Math.max(-1, Math.min(clampedIndex, fenHistory.length - 2));
      set({
        fenHistory,
        moveHistory,
        branchStartIndex,
        isExploring,
        currentMoveIndex: reClamp,
        currentFen: fenHistory[reClamp + 1],
      });
      return;
    }

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
    const state = get();
    const { currentMoveIndex } = state;
    if (currentMoveIndex < 0) return;

    const newIndex = currentMoveIndex - 1;

    // Navigating back to or before branch point → restore PGN
    if (state.isExploring && state.branchStartIndex >= 0 && newIndex <= state.branchStartIndex) {
      const restored = restorePgn(state);
      const reClamp = Math.max(-1, Math.min(newIndex, restored.fenHistory.length - 2));
      set({
        ...restored,
        currentMoveIndex: reClamp,
        currentFen: restored.fenHistory[reClamp + 1],
      });
      return;
    }

    set({
      currentMoveIndex: newIndex,
      currentFen: state.fenHistory[newIndex + 1],
    });
  },

  firstMove: () => {
    const state = get();

    // Going to start always restores PGN if branched
    if (state.isExploring && state.branchStartIndex >= 0) {
      const restored = restorePgn(state);
      set({
        ...restored,
        currentMoveIndex: -1,
        currentFen: restored.fenHistory[0],
      });
      return;
    }

    set({
      currentMoveIndex: -1,
      currentFen: state.fenHistory[0],
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
    set((s) => ({ orientation: s.orientation === 'white' ? 'black' : 'white' }));
  },

  makeMove: (from: string, to: string, promotion?: string) => {
    const state = get();
    const tempGame = new Chess(state.currentFen);

    try {
      const result = tempGame.move({ from, to, promotion: promotion || 'q' });
      if (!result) return null;

      const insertAt = state.currentMoveIndex + 1;

      // Set branch start on first divergence only
      const branchStart = state.isExploring
        ? state.branchStartIndex
        : state.currentMoveIndex;

      const newFenHistory = [
        ...state.fenHistory.slice(0, insertAt + 1),
        tempGame.fen(),
      ];
      const newMoveHistory = [
        ...state.moveHistory.slice(0, insertAt),
        result.san,
      ];

      set({
        game: tempGame,
        fenHistory: newFenHistory,
        moveHistory: newMoveHistory,
        currentMoveIndex: insertAt,
        currentFen: tempGame.fen(),
        branchStartIndex: branchStart,
        isExploring: true,
      });

      return result;
    } catch {
      return null;
    }
  },

  reset: () => {
    set({
      game: new Chess(),
      pgnFenHistory: [INITIAL_FEN],
      pgnMoveHistory: [],
      fenHistory: [INITIAL_FEN],
      moveHistory: [],
      currentMoveIndex: -1,
      currentFen: INITIAL_FEN,
      orientation: 'white',
      branchStartIndex: -1,
      isExploring: false,
    });
  },
}));
