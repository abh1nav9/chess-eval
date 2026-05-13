export interface APIResponse<T> {
  data: T;
  status: number;
}

export interface APIError {
  error: string;
  message: string;
  detail?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface PGNAnalysisRequest {
  pgn: string;
  depth?: number;
  movetime?: number;
}

export interface FENAnalysisRequest {
  fen: string;
  depth?: number;
  num_lines?: number;
}
