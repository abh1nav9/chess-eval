import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalysisPage } from '@/pages/AnalysisPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { StatsPage } from '@/pages/StatsPage';
import { RepertoirePage } from '@/pages/RepertoirePage';
import { StudiesPage } from '@/pages/StudiesPage';
import { StudyEditPage } from '@/pages/StudyEditPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<AnalysisPage />} />
        <Route path="/analysis/:id" element={<AnalysisPage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/repertoire" element={<RepertoirePage />} />
        <Route path="/studies" element={<StudiesPage />} />
        <Route path="/studies/:id" element={<StudyEditPage />} />
      </Route>
    </Routes>
  );
}
