import { api } from './api';
import type { ChessComRecentGamesResponse } from '@/types/chesscom';

export const chessComService = {
  async getRecentGames(username: string, limit = 10): Promise<ChessComRecentGamesResponse> {
    const encoded = encodeURIComponent(username.trim().toLowerCase());
    const { data } = await api.get<ChessComRecentGamesResponse>(
      `/api/v1/chesscom/player/${encoded}/recent-games`,
      { params: { limit }, timeout: 60_000 },
    );
    return data;
  },
};
