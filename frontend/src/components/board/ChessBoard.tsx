import { useMemo, useCallback, useState, useRef, useLayoutEffect, type CSSProperties, type FC, type ReactNode, type Ref } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Loader2 } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useAnalysisStore, type ExplorationMove } from '@/store/analysisStore';
import { CLASSIFICATION_ARROW_COLOR, CLASSIFICATION_CONFIG } from '@/constants';
import type { MoveClassification } from '@/types';
import type { Square } from 'chess.js';
import { analysisService } from '@/services/analysisService';
import { classifyLiveMove } from '@/utils/classifyLiveMove';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';
import { BOARD_THEMES, type BoardThemeId } from '@/constants/boardTheme';
import { ANALYSIS_BOARD_PIXEL_SIZE } from '@/constants/boardLayout';
import { useUIStore } from '@/store/uiStore';

function readCssBoardSquareColors(): { light: string; dark: string } {
  const cs = getComputedStyle(document.documentElement);
  return {
    light: cs.getPropertyValue('--color-white-square').trim(),
    dark: cs.getPropertyValue('--color-black-square').trim(),
  };
}

function fallbackSquareColors(boardTheme: BoardThemeId) {
  const t = BOARD_THEMES[boardTheme] ?? BOARD_THEMES.classic;
  return { light: t.light, dark: t.dark };
}

type ArrowTuple = [Square, Square, string?];

type CustomSquareProps = {
  children: ReactNode;
  ref: Ref<HTMLDivElement>;
  square: Square;
  squareColor: 'white' | 'black';
  style: Record<string, string | number>;
};

function rgbToRgba(rgb: string, alpha: number): string {
  const m = rgb.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (!m) return rgb;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}

function buildSquareRenderer(
  badgeSquare: Square | null,
  classification: MoveClassification | null,
  processingSquare: Square | null,
): FC<CustomSquareProps> {
  return function AnalysisSquare({ children, ref, square, style }) {
    const show = badgeSquare === square && classification !== null;
    const cfg = classification ? CLASSIFICATION_CONFIG[classification] : null;
    const arrowRgb = classification ? CLASSIFICATION_ARROW_COLOR[classification] : null;
    const showProcessing = processingSquare === square;

    const mergedStyle: CSSProperties = {
      ...(style as CSSProperties),
      position: 'relative',
    };

    return (
      <div ref={ref} style={mergedStyle}>
        {children}
        {showProcessing && (
          <span
            className="pointer-events-none absolute inset-0 z-[2] flex items-center justify-center rounded-sm bg-black/35"
            aria-live="polite"
            aria-label="Analyzing move"
          >
            <Loader2 size={22} className="text-white animate-spin drop-shadow-sm" aria-hidden />
          </span>
        )}
        {show && cfg && arrowRgb && (
          <span
            className="pointer-events-none absolute right-0.5 top-0.5 z-[1] flex min-h-[1rem] min-w-[1rem] max-w-[calc(100%-4px)] items-center justify-center rounded border px-0.5 text-[8px] font-bold leading-none shadow-md"
            style={{
              backgroundColor: rgbToRgba(arrowRgb, 0.88),
              color: '#0a0a0a',
              borderColor: rgbToRgba(arrowRgb, 0.95),
            }}
            title={cfg.label}
            aria-label={cfg.label}
          >
            {cfg.symbol}
          </span>
        )}
      </div>
    );
  };
}

function getLegalMovesForSquare(fen: string, square: Square): Square[] {
  try {
    const game = new Chess(fen);
    return game.moves({ square, verbose: true }).map((m) => m.to as Square);
  } catch {
    return [];
  }
}

/** Get current eval from the best available source. */
function getCurrentEval(): number {
  const { pgnResult, fenResult, selectedMoveIndex } = useAnalysisStore.getState();
  const { isExploring } = useGameStore.getState();

  if (isExploring && fenResult) return fenResult.eval;

  if (pgnResult && selectedMoveIndex >= 0 && selectedMoveIndex < pgnResult.moves.length) {
    return pgnResult.moves[selectedMoveIndex].eval_after;
  }
  if (pgnResult && pgnResult.moves.length > 0) {
    return pgnResult.moves[0].eval_before;
  }
  if (fenResult) return fenResult.eval;
  return 0;
}

export function ChessBoard() {
  const { currentFen, orientation, makeMove, isExploring, currentMoveIndex } = useGameStore();
  const boardTheme = useUIStore((s) => s.boardTheme);
  const appTheme = useUIStore((s) => s.theme);
  const [squareColors, setSquareColors] = useState(() => fallbackSquareColors(boardTheme));

  useLayoutEffect(() => {
    const { light, dark } = readCssBoardSquareColors();
    const fb = fallbackSquareColors(boardTheme);
    setSquareColors({
      light: light || fb.light,
      dark: dark || fb.dark,
    });
  }, [boardTheme, appTheme]);

  const {
    pgnResult,
    selectedMoveIndex,
    explorationMoves,
    addExplorationMove,
    clearExplorationMoves,
  } = useAnalysisStore();
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [liveAnalysisPending, setLiveAnalysisPending] = useState<{ id: number; square: Square } | null>(null);
  const livePendingIdRef = useRef(0);

  // Badge from PGN analysis OR exploration moves
  const { analysisStyles, customArrows, badgeSquare, classification } = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    const arrows: ArrowTuple[] = [];

    // Check exploration moves first when exploring
    if (isExploring) {
      const expMove = explorationMoves.find((m) => m.moveIndex === currentMoveIndex);
      if (expMove) {
        const fromSq = expMove.fromSquare as Square;
        const toSq = expMove.toSquare as Square;
        const cls = expMove.classification;
        const arrowRgb = CLASSIFICATION_ARROW_COLOR[cls];

        styles[fromSq] = { backgroundColor: rgbToRgba(arrowRgb, 0.18) };
        styles[toSq] = {
          backgroundColor: rgbToRgba(arrowRgb, 0.28),
          boxShadow: `inset 0 0 0 2px ${arrowRgb}`,
        };
        arrows.push([fromSq, toSq, arrowRgb]);

        if (expMove.bestMoveUci && expMove.moveUci !== expMove.bestMoveUci) {
          const bf = expMove.bestMoveUci.slice(0, 2) as Square;
          const bt = expMove.bestMoveUci.slice(2, 4) as Square;
          styles[bt] = {
            ...styles[bt],
            backgroundImage: `radial-gradient(circle, ${rgbToRgba(CLASSIFICATION_ARROW_COLOR.best, 0.35)} 0%, transparent 65%)`,
          };
          arrows.push([bf, bt, rgbToRgba(CLASSIFICATION_ARROW_COLOR.best, 0.55)]);
        }

        return { analysisStyles: styles, customArrows: arrows, badgeSquare: toSq, classification: cls };
      }
    }

    // Fall back to PGN analysis
    if (!pgnResult || selectedMoveIndex < 0 || selectedMoveIndex >= pgnResult.moves.length) {
      return {
        analysisStyles: styles,
        customArrows: arrows,
        badgeSquare: null as Square | null,
        classification: null as MoveClassification | null,
      };
    }

    const move = pgnResult.moves[selectedMoveIndex];
    const uci = move.move_uci;
    const cls = move.classification;
    const arrowRgb = CLASSIFICATION_ARROW_COLOR[cls];
    let fromSq: Square | null = null;
    let toSq: Square | null = null;

    if (uci.length >= 4) {
      fromSq = uci.slice(0, 2) as Square;
      toSq = uci.slice(2, 4) as Square;

      styles[fromSq] = { backgroundColor: rgbToRgba(arrowRgb, 0.18) };
      styles[toSq] = {
        backgroundColor: rgbToRgba(arrowRgb, 0.28),
        boxShadow: `inset 0 0 0 2px ${arrowRgb}`,
      };
      arrows.push([fromSq, toSq, arrowRgb]);

      if (
        move.best_move_uci &&
        move.best_move_uci.length >= 4 &&
        move.best_move_uci !== uci &&
        cls !== 'best' && cls !== 'brilliant' && cls !== 'great'
      ) {
        const bf = move.best_move_uci.slice(0, 2) as Square;
        const bt = move.best_move_uci.slice(2, 4) as Square;
        if (bf !== fromSq || bt !== toSq) {
          styles[bt] = {
            ...styles[bt],
            backgroundImage: `radial-gradient(circle, ${rgbToRgba(CLASSIFICATION_ARROW_COLOR.best, 0.35)} 0%, transparent 65%)`,
          };
          arrows.push([bf, bt, rgbToRgba(CLASSIFICATION_ARROW_COLOR.best, 0.55)]);
        }
      }
    }

    return { analysisStyles: styles, customArrows: arrows, badgeSquare: toSq, classification: cls };
  }, [pgnResult, selectedMoveIndex, isExploring, explorationMoves, currentMoveIndex]);

  // Merge analysis/exploration highlights with click-to-move hints
  const customSquareStyles = useMemo(() => {
    const merged: Record<string, CSSProperties> = { ...analysisStyles };

    if (selectedSquare) {
      merged[selectedSquare] = {
        ...merged[selectedSquare],
        backgroundColor: 'rgba(255, 255, 0, 0.4)',
      };
    }

    for (const sq of legalMoves) {
      const existing = merged[sq] || {};
      const hasPiece = (() => {
        try {
          return !!new Chess(currentFen).get(sq);
        } catch { return false; }
      })();

      merged[sq] = hasPiece
        ? { ...existing, background: 'radial-gradient(transparent 55%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.25) 67%, transparent 67%)' }
        : { ...existing, background: 'radial-gradient(circle, rgba(0,0,0,0.25) 25%, transparent 25%)' };
    }

    return merged;
  }, [analysisStyles, selectedSquare, legalMoves, currentFen]);

  const customSquare = useMemo(
    () =>
      buildSquareRenderer(
        badgeSquare,
        classification,
        liveAnalysisPending?.square ?? null,
      ),
    [badgeSquare, classification, liveAnalysisPending],
  );

  const attemptMove = useCallback(
    (from: string, to: string, promotion?: string) => {
      // Capture eval BEFORE the move for classification
      const evalBefore = getCurrentEval();
      const fenBefore = useGameStore.getState().currentFen;
      const turnBefore = new Chess(fenBefore).turn() === 'w' ? 'white' : 'black';

      const played = makeMove(from, to, promotion || 'q');
      if (!played) return false;

      try {
        const boardAfter = new Chess(played.after);
        gameSoundCoordinator.afterMove(played, boardAfter);
      } catch {
        /* invalid resulting FEN */
      }

      const newState = useGameStore.getState();
      const newFen = newState.currentFen;
      const moveIdx = newState.currentMoveIndex;
      const san = newState.moveHistory[moveIdx] || '';

      // Clear stale exploration data when starting a new branch
      if (explorationMoves.length > 0 && explorationMoves[0].moveIndex > moveIdx) {
        clearExplorationMoves();
      }

      const pendingId = ++livePendingIdRef.current;
      setLiveAnalysisPending({ id: pendingId, square: to as Square });

      analysisService
        .analyzeFEN({ fen: newFen, num_lines: 3 })
        .then((result) => {
          const { pgnResult: hasPgn, setFENResult, setExplorationFenEval } =
            useAnalysisStore.getState();
          if (hasPgn) setExplorationFenEval(result);
          else setFENResult(result);

          const moveUci = `${from}${to}`;
          const cls = classifyLiveMove(
            evalBefore,
            result.eval,
            result.top_lines?.[0]?.move_uci ?? null,
            moveUci,
            turnBefore as 'white' | 'black',
          );

          const expMove: ExplorationMove = {
            moveIndex: moveIdx,
            san,
            moveUci,
            evalBefore,
            evalAfter: result.eval,
            classification: cls,
            bestMoveUci: result.best_move_uci || null,
            fromSquare: from,
            toSquare: to,
          };

          addExplorationMove(expMove);
        })
        .catch(() => {})
        .finally(() => {
          setLiveAnalysisPending((p) => (p?.id === pendingId ? null : p));
        });

      return true;
    },
    [makeMove, addExplorationMove, clearExplorationMoves, explorationMoves],
  );

  const onPieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string, piece: string) => {
      setSelectedSquare(null);
      setLegalMoves([]);
      const promotion = piece[1]?.toLowerCase() === 'p' ? 'q' : undefined;
      return attemptMove(sourceSquare, targetSquare, promotion);
    },
    [attemptMove],
  );

  const onSquareClick = useCallback(
    (square: Square) => {
      if (selectedSquare) {
        if (square === selectedSquare) {
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
        if (legalMoves.includes(square)) {
          const success = attemptMove(selectedSquare, square);
          setSelectedSquare(null);
          setLegalMoves([]);
          if (success) return;
        }
      }

      try {
        const game = new Chess(currentFen);
        const piece = game.get(square);
        if (piece) {
          const moves = getLegalMovesForSquare(currentFen, square);
          if (moves.length > 0) {
            setSelectedSquare(square);
            setLegalMoves(moves);
            return;
          }
        }
      } catch { /* invalid fen */ }

      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [selectedSquare, legalMoves, currentFen, attemptMove],
  );

  const onPieceClick = useCallback(
    (_piece: string, square: Square) => onSquareClick(square),
    [onSquareClick],
  );

  return (
    <div className="chess-board-container">
      <Chessboard
        id="analysis-board"
        position={currentFen}
        boardOrientation={orientation}
        boardWidth={ANALYSIS_BOARD_PIXEL_SIZE}
        arePiecesDraggable={true}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceClick={onPieceClick}
        areArrowsAllowed={true}
        customArrows={customArrows}
        customBoardStyle={{ borderRadius: 'var(--radius-lg)' }}
        customDarkSquareStyle={{ backgroundColor: squareColors.dark }}
        customLightSquareStyle={{ backgroundColor: squareColors.light }}
        customSquareStyles={customSquareStyles}
        customSquare={customSquare}
        animationDuration={200}
      />
    </div>
  );
}
