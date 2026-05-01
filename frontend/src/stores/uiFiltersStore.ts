import { create } from 'zustand';
import { useNavigationStore } from './navigationStore';

export type Modulo = 'resultados' | 'puestos' | 'jurados-testigos';
export type ActiveTab = 'dashboard' | 'mapa' | 'reportes' | 'comparador';

export interface EleccionKey {
  modulo: Modulo;
  anio: number;
  corporacion: string;
}

interface UIFiltersStore {
  modulo: Modulo;
  anio: number;
  corporacion: string;
  candidatoFiltro: string | null;
  partidoFiltro: string | null;
  searchQuery: string;
  activeTab: ActiveTab;

  setModulo: (modulo: Modulo) => void;
  setEleccion: (key: EleccionKey) => void;
  setCandidatoFiltro: (id: string | null) => void;
  setPartidoFiltro: (id: string | null) => void;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

// Default = Senado 2026 (most recent loaded data per project_overview).
export const DEFAULT_FILTERS = {
  modulo: 'resultados' as Modulo,
  anio: 2026,
  corporacion: '001',
  candidatoFiltro: null as string | null,
  partidoFiltro: null as string | null,
  searchQuery: '',
  activeTab: 'mapa' as ActiveTab,
};

export const useUIFiltersStore = create<UIFiltersStore>((set) => ({
  ...DEFAULT_FILTERS,

  setModulo: (modulo) => {
    useNavigationStore.getState().reset();
    set({
      modulo,
      activeTab: 'mapa',
      candidatoFiltro: null,
      partidoFiltro: null,
      searchQuery: '',
    });
  },

  setEleccion: ({ modulo, anio, corporacion }) => {
    useNavigationStore.getState().reset();
    set((state) => {
      const tabStillValid = !(state.activeTab === 'comparador' && modulo !== 'resultados');
      return {
        modulo,
        anio,
        corporacion,
        candidatoFiltro: null,
        partidoFiltro: null,
        searchQuery: '',
        activeTab: tabStillValid ? state.activeTab : 'mapa',
      };
    });
  },

  setCandidatoFiltro: (candidatoFiltro) => set({ candidatoFiltro }),
  // Changing partido clears candidato (candidato dropdown is scoped to selected partido)
  setPartidoFiltro: (partidoFiltro) => set({ partidoFiltro, candidatoFiltro: null }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
