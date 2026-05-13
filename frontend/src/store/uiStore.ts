import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BoardThemeId } from '@/constants/boardTheme';

type Theme = 'light' | 'dark';

interface UIState {
  sidebarOpen: boolean;
  importModalOpen: boolean;
  fenInputOpen: boolean;
  activeTab: 'moves' | 'engine' | 'summary';
  theme: Theme;
  boardTheme: BoardThemeId;

  toggleSidebar: () => void;
  setImportModal: (open: boolean) => void;
  setFenInput: (open: boolean) => void;
  setActiveTab: (tab: 'moves' | 'engine' | 'summary') => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setBoardTheme: (t: BoardThemeId) => void;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      importModalOpen: false,
      fenInputOpen: false,
      activeTab: 'moves',
      theme: 'light',
      boardTheme: 'classic' as BoardThemeId,

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setImportModal: (open) => set({ importModalOpen: open }),
      setFenInput: (open) => set({ fenInputOpen: open }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light';
        applyTheme(next);
        set({ theme: next });
      },
      setBoardTheme: (t) => set({ boardTheme: t }),
    }),
    {
      name: 'chess-eval-ui',
      partialize: (state) => ({ theme: state.theme, boardTheme: state.boardTheme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    },
  ),
);
