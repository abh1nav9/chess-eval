import type { ChessComGameBrief, ChessComPlayerBrief } from '@/types/chesscom';

/** Per-color display hints for the analysis board chrome (Chess.com import only). */
export interface ChessComBoardPlayerSide {
  username: string;
  displayName: string | null;
  title: string | null;
  avatar: string | null;
}

export interface ChessComBoardPlayerOverlay {
  white: ChessComBoardPlayerSide;
  black: ChessComBoardPlayerSide;
}

export function buildChessComBoardPlayerOverlay(
  game: ChessComGameBrief,
  profiles: Record<string, ChessComPlayerBrief>,
): ChessComBoardPlayerOverlay {
  const wKey = game.white_username.toLowerCase();
  const bKey = game.black_username.toLowerCase();
  const wp = profiles[wKey];
  const bp = profiles[bKey];
  return {
    white: {
      username: game.white_username,
      displayName: game.white_display_name ?? wp?.name ?? null,
      title: game.white_title ?? wp?.title ?? null,
      avatar: wp?.avatar ?? null,
    },
    black: {
      username: game.black_username,
      displayName: game.black_display_name ?? bp?.name ?? null,
      title: game.black_title ?? bp?.title ?? null,
      avatar: bp?.avatar ?? null,
    },
  };
}

export function resolveChessComPlayerBar(
  pgnHeaderName: string | undefined,
  color: 'white' | 'black',
  overlay: ChessComBoardPlayerOverlay | null,
): { lineName: string; title: string | null; avatarUrl: string | null } {
  const fallback = color === 'white' ? 'White' : 'Black';
  const header = pgnHeaderName?.trim() || fallback;
  const side = overlay?.[color];
  if (!side || side.username.toLowerCase() !== header.toLowerCase()) {
    return { lineName: header, title: null, avatarUrl: null };
  }
  return {
    lineName: side.displayName?.trim() || side.username,
    title: side.title?.trim() || null,
    avatarUrl: side.avatar?.trim() || null,
  };
}
