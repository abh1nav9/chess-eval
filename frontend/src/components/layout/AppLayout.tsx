import { Outlet } from 'react-router-dom';
import { Header } from '@/components/layout/Header';

export function AppLayout() {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-[var(--color-bg-primary)]">
      <Header />
      <main className="flex-1 flex flex-col items-center w-full max-w-[1200px] mx-auto px-4 md:px-6 py-6">
        <Outlet />
      </main>
    </div>
  );
}
