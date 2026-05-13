import { Providers } from '@/app/providers';
import { AppRouter } from '@/app/router';
import { Header } from '@/components/layout/Header';

export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  );
}
