import { api } from './api';

export interface StudyListItem {
  study_id: string;
  title: string;
  updated_at?: string;
}

export interface StudyDoc {
  study_id: string;
  title: string;
  chapters: Array<{
    chapter_id: string;
    title: string;
    start_fen: string;
    mainline_pgn: string;
    notes_by_ply: Record<string, string>;
  }>;
}

export const studyService = {
  async list(): Promise<{ items: StudyListItem[] }> {
    const { data } = await api.get('/api/v1/studies');
    return data;
  },

  async create(title?: string): Promise<{ study_id: string }> {
    const { data } = await api.post('/api/v1/studies', { title: title ?? 'New study' });
    return data;
  },

  async get(id: string): Promise<StudyDoc> {
    const { data } = await api.get(`/api/v1/studies/${encodeURIComponent(id)}`);
    return data;
  },

  async patch(id: string, body: Partial<{ title: string; chapters: StudyDoc['chapters'] }>): Promise<StudyDoc> {
    const { data } = await api.patch(`/api/v1/studies/${encodeURIComponent(id)}`, body);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/studies/${encodeURIComponent(id)}`);
  },
};
