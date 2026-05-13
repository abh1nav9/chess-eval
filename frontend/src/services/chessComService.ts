import { api } from './api';
import type { ChessComRecentGamesResponse } from '@/types/chesscom';

export const chessComService = {
  async getRecentGames(
    username: string,
    limit = 10,
    timeClass?: string,
  ): Promise<ChessComRecentGamesResponse> {
    const encoded = encodeURIComponent(username.trim().toLowerCase());
    const { data } = await api.get<ChessComRecentGamesResponse>(
      `/api/v1/chesscom/player/${encoded}/recent-games`,
      {
        params: {
          limit,
          ...(timeClass ? { time_class: timeClass } : {}),
        },
        timeout: 60_000,
      },
    );
    return data;
  },

  async getGamesForMonth(
    username: string,
    year: number,
    month: number,
    timeClass?: string,
  ): Promise<ChessComRecentGamesResponse> {
    const encoded = encodeURIComponent(username.trim().toLowerCase());
    const { data } = await api.get<ChessComRecentGamesResponse>(
      `/api/v1/chesscom/player/${encoded}/games`,
      {
        params: { year, month, ...(timeClass ? { time_class: timeClass } : {}) },
        timeout: 60_000,
      },
    );
    return data;
  },
};
