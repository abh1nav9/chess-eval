export interface ChessComGameBrief {
  url: string;
  uuid: string;
  pgn: string;
  end_time: number;
  time_class: string;
  rated: boolean;
  white_username: string;
  black_username: string;
  white_rating: number | null;
  black_rating: number | null;
}

export interface ChessComRecentGamesResponse {
  username: string;
  games: ChessComGameBrief[];
}
