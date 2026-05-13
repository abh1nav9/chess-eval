import { api } from './api';
import type { ChessComRecentGamesResponse } from '@/types/chesscom';

export const lichessService = {
  async getRecentGames(username: string, max = 10): Promise<ChessComRecentGamesResponse> {
    const encoded = encodeURIComponent(username.trim());
    const { data } = await api.get<ChessComRecentGamesResponse>(
      `/api/v1/lichess/player/${encoded}/recent-games`,
      { params: { max }, timeout: 60_000 },
    );
    return data;
  },
};
