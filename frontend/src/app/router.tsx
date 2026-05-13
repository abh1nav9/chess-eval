import { Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { AnalysisPage } from '@/pages/AnalysisPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<AnalysisPage />} />
        <Route path="/analysis/:id" element={<AnalysisPage />} />
      </Route>
    </Routes>
  );
}
