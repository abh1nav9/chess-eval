const base = import.meta.env.BASE_URL;

export type ChessSoundEvent =
  | 'gamestart'
  | 'piecemove'
  | 'castling'
  | 'check'
  | 'checkmate'
  | 'stalemate'
  | 'timeout'
  | 'piececaptured';

export const CHESS_SOUND_PATHS: Record<ChessSoundEvent, string> = {
  gamestart: `${base}sounds/game-start.mp3`,
  piecemove: `${base}sounds/piece-moved.mp3`,
  castling: `${base}sounds/castle.mp3`,
  check: `${base}sounds/check.mp3`,
  checkmate: `${base}sounds/checkmate.mp3`,
  stalemate: `${base}sounds/stalemate.mp3`,
  timeout: `${base}sounds/timeout.mp3`,
  piececaptured: `${base}sounds/piece-captured.mp3`,
};
