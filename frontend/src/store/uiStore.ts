import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  importModalOpen: boolean;
  fenInputOpen: boolean;
  activeTab: 'moves' | 'engine' | 'summary';

  toggleSidebar: () => void;
  setImportModal: (open: boolean) => void;
  setFenInput: (open: boolean) => void;
  setActiveTab: (tab: 'moves' | 'engine' | 'summary') => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  importModalOpen: false,
  fenInputOpen: false,
  activeTab: 'moves',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setImportModal: (open) => set({ importModalOpen: open }),
  setFenInput: (open) => set({ fenInputOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
