import { create } from 'zustand';

export type Modulo = 'resultados' | 'puestos' | 'jurados-testigos';
export type Nivel = 'departamentos' | 'municipio';
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
  nivel: Nivel;
  searchQuery: string;
  activeTab: ActiveTab;

  setModulo: (modulo: Modulo) => void;
  setEleccion: (key: EleccionKey) => void;
  setCandidatoFiltro: (id: string | null) => void;
  setNivel: (nivel: Nivel) => void;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const useUIFiltersStore = create<UIFiltersStore>((set) => ({
  modulo: 'resultados',
  anio: 2022,
  corporacion: 'P01',
  candidatoFiltro: null,
  nivel: 'departamentos',
  searchQuery: '',
  activeTab: 'mapa',

  setModulo: (modulo) =>
    set((state) => ({
      modulo,
      activeTab: 'mapa',
      candidatoFiltro: modulo === 'resultados' ? state.candidatoFiltro : null,
    })),

  setEleccion: ({ modulo, anio, corporacion }) =>
    set((state) => {
      // If switching away from resultados, comparador tab is no longer available
      const tabStillValid = !(state.activeTab === 'comparador' && modulo !== 'resultados');
      return {
        modulo,
        anio,
        corporacion,
        candidatoFiltro: null,
        activeTab: tabStillValid ? state.activeTab : 'mapa',
      };
    }),

  setCandidatoFiltro: (candidatoFiltro) => set({ candidatoFiltro }),
  setNivel: (nivel) => set({ nivel }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTab: (activeTab) => set({ activeTab }),
}));
