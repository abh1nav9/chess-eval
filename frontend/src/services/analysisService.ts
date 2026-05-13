import { api } from './api';
import { API_BASE_URL } from '@/constants';
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

  async exportAnnotatedPgn(analysisId: string): Promise<Blob> {
    const { data } = await api.get(`/api/v1/analysis/${analysisId}/export`, {
      params: { format: 'pgn' },
      responseType: 'blob',
      timeout: 120_000,
    });
    return data as Blob;
  },

  async listAnalyses(limit = 20, skip = 0, before?: string) {
    const { data } = await api.get('/api/v1/analyses', {
      params: { limit, skip, ...(before ? { before } : {}) },
    });
    return data;
  },

  htmlReportUrl(analysisId: string): string {
    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}/api/v1/analysis/${encodeURIComponent(analysisId)}/report?format=html`;
  },

  async uploadBulkPgn(file: File): Promise<{ analysis_ids: string[]; count: number }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post('/api/v1/analyze/pgn/bulk', form, {
      timeout: 120_000,
    });
    return data;
  },

  async getStatsDashboard() {
    const { data } = await api.get('/api/v1/stats/dashboard');
    return data;
  },

  async getRepertoireSummary(color: 'white' | 'black') {
    const { data } = await api.get('/api/v1/repertoire/summary', { params: { color } });
    return data;
  },

  async healthCheck() {
    const { data } = await api.get('/api/v1/health');
    return data;
  },
};
