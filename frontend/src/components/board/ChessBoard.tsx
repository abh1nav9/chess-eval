import { useMemo, type CSSProperties, type FC, type ReactNode, type Ref } from 'react';
import { Chessboard } from 'react-chessboard';
import { useGameStore } from '@/store/gameStore';
import { useAnalysisStore } from '@/store/analysisStore';
import { CLASSIFICATION_ARROW_COLOR, CLASSIFICATION_CONFIG } from '@/constants';
import type { MoveClassification } from '@/types';
import type { Square } from 'chess.js';

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
): FC<CustomSquareProps> {
  return function AnalysisSquare({ children, ref, square, style }) {
    const show = badgeSquare === square && classification !== null;
    const cfg = classification ? CLASSIFICATION_CONFIG[classification] : null;
    const arrowRgb = classification ? CLASSIFICATION_ARROW_COLOR[classification] : null;

    const mergedStyle: CSSProperties = {
      ...(style as CSSProperties),
      position: 'relative',
    };

    return (
      <div ref={ref} style={mergedStyle}>
        {children}
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

export function ChessBoard() {
  const { currentFen, orientation } = useGameStore();
  const { pgnResult, selectedMoveIndex } = useAnalysisStore();

  const { customSquareStyles, customArrows, badgeSquare, classification } = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    const arrows: ArrowTuple[] = [];

    if (!pgnResult || selectedMoveIndex < 0 || selectedMoveIndex >= pgnResult.moves.length) {
      return {
        customSquareStyles: styles,
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

      styles[fromSq] = {
        backgroundColor: rgbToRgba(arrowRgb, 0.18),
      };
      styles[toSq] = {
        backgroundColor: rgbToRgba(arrowRgb, 0.28),
        boxShadow: `inset 0 0 0 2px ${arrowRgb}`,
      };

      arrows.push([fromSq, toSq, arrowRgb]);

      if (
        move.best_move_uci &&
        move.best_move_uci.length >= 4 &&
        move.best_move_uci !== uci &&
        move.classification !== 'best' &&
        move.classification !== 'brilliant'
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

    return {
      customSquareStyles: styles,
      customArrows: arrows,
      badgeSquare: toSq,
      classification: cls,
    };
  }, [pgnResult, selectedMoveIndex]);

  const customSquare = useMemo(
    () => buildSquareRenderer(badgeSquare, classification),
    [badgeSquare, classification],
  );

  return (
    <div className="chess-board-container">
      <Chessboard
        id="analysis-board"
        position={currentFen}
        boardOrientation={orientation}
        boardWidth={560}
        arePiecesDraggable={false}
        areArrowsAllowed={false}
        customArrows={customArrows}
        customBoardStyle={{
          borderRadius: 'var(--radius-lg)',
        }}
        customDarkSquareStyle={{ backgroundColor: '#739552' }}
        customLightSquareStyle={{ backgroundColor: '#ebecd0' }}
        customSquareStyles={customSquareStyles}
        customSquare={customSquare}
        animationDuration={200}
      />
    </div>
  );
}
