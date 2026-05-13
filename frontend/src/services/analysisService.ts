import { api } from './api';
import type { PGNAnalysisResult, FENAnalysisResult, PGNAnalysisRequest, FENAnalysisRequest } from '@/types';

export const analysisService = {
  async analyzePGN(request: PGNAnalysisRequest): Promise<PGNAnalysisResult> {
    const { data } = await api.post('/api/v1/analyze/pgn', request);
    return data;
  },

  async analyzeFEN(request: FENAnalysisRequest): Promise<FENAnalysisResult> {
    const { data } = await api.post('/api/v1/analyze/fen', request);
    return data;
  },

  async getAnalysis(analysisId: string): Promise<PGNAnalysisResult> {
    const { data } = await api.get(`/api/v1/analysis/${analysisId}`);
    return data;
  },

  async listAnalyses(limit = 20, skip = 0) {
    const { data } = await api.get('/api/v1/analyses', { params: { limit, skip } });
    return data;
  },

  async healthCheck() {
    const { data } = await api.get('/api/v1/health');
    return data;
  },
};
