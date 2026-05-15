// Move classification types matching the backend
export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'
  | 'book';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface MoveEvaluation {
  move_number: number;
  move: string;
  move_uci: string;
  color: 'white' | 'black';
  fen_before: string;
  fen_after: string;
  eval_before: number;
  eval_after: number;
  centipawn_loss: number;
  classification: MoveClassification;
  best_move: string | null;
  best_move_uci: string | null;
  best_move_eval: number | null;
  pv: string[];
  is_check: boolean;
  is_capture: boolean;
  is_castle: boolean;
  mate_in: number | null;
  phase?: string | null;
  comment?: string | null;
  lichess_accuracy?: number | null;
  lichess_win_pct_played?: number | null;
  lichess_played_cp_white_pov?: number | null;
  coach_message?: string | null;
}

export interface GameMetadata {
  white: string;
  black: string;
  event: string;
  date: string;
  result: string;
  eco: string;
  opening: string;
  time_control: string;
  white_elo?: string;
  black_elo?: string;
  site: string;
}

export interface AnalysisSummary {
  total_moves: number;
  white_accuracy: number;
  black_accuracy: number;
  white_classifications: Record<string, number>;
  black_classifications: Record<string, number>;
  avg_centipawn_loss_white: number;
  avg_centipawn_loss_black: number;
}

export interface PGNAnalysisResult {
  analysis_id: string;
  game_id: string;
  status: AnalysisStatus;
  metadata: GameMetadata;
  moves: MoveEvaluation[];
  summary: AnalysisSummary;
  pgn: string;
  /** Requested PGN search depth (may differ from per-position tiered depth when 26). */
  depth?: number;
  created_at: string;
  completed_at: string | null;
}

export interface EngineLine {
  rank: number;
  eval: number;
  move: string;
  move_uci: string;
  pv: string[];
  mate_in: number | null;
  depth: number;
}

/** Live PGN analysis progress from the WebSocket. */
export interface AnalysisProgressState {
  percentage: number;
  currentMove: number;
  totalMoves: number;
  currentSan: string | null;
  statusMessage: string | null;
  /** Wall-clock ms when first progress with known move count arrived (for ETA). */
  startedAtMs?: number;
}

export interface FENAnalysisResult {
  fen: string;
  eval: number;
  best_move: string;
  best_move_uci: string;
  pv: string[];
  mate_in: number | null;
  depth: number;
  is_check: boolean;
  is_checkmate: boolean;
  is_stalemate: boolean;
  turn: 'white' | 'black';
  top_lines: EngineLine[];
}
