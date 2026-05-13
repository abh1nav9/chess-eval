export interface ChessComPlayerBrief {
  username: string;
  name: string | null;
  title: string | null;
  avatar: string | null;
}

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
  white_display_name?: string | null;
  white_title?: string | null;
  black_display_name?: string | null;
  black_title?: string | null;
  already_analysed?: boolean;
  analysis_id?: string | null;
}

export interface ChessComRecentGamesResponse {
  username: string;
  games: ChessComGameBrief[];
  player_profiles: Record<string, ChessComPlayerBrief>;
}
