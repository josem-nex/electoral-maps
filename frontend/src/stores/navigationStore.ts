import { create } from 'zustand';
import { normalizeMunicipioCode } from '../utils/territory';

export type ElectoralLayer = 'pais' | 'zonas' | 'departamentos' | 'municipio' | 'localidad' | 'puesto';

export interface Jurisdiccion {
  id: string;
  layer: ElectoralLayer;
  name: string;
  code: string;
  parent_code?: string;
  zone_id?: number;
  zone_name?: string;
  center_lat: number;
  center_lon: number;
  zoom: number;
}

interface NavigationStore {
  currentLayer: ElectoralLayer;
  currentJurisdiccion: Jurisdiccion | null;
  navigationStack: Jurisdiccion[];
  selectedMunicipioCode: string | null;
  selectedMunicipioName: string | null;

  navigateTo: (jurisdiccion: Jurisdiccion) => void;
  navigateBack: () => void;
  navigateToIndex: (index: number) => void;
  setSelectedMunicipioCode: (code: string | null, name?: string | null) => void;
  reset: () => void;
}

const initialJurisdiccion: Jurisdiccion = {
  id: 'colombia',
  layer: 'pais',
  name: 'Colombia',
  code: 'CO',
  center_lat: 4.5709,
  center_lon: -74.2973,
  zoom: 5.6,
};

export const useNavigationStore = create<NavigationStore>((set) => ({
  currentLayer: 'pais',
  currentJurisdiccion: initialJurisdiccion,
  navigationStack: [initialJurisdiccion],
  selectedMunicipioCode: null,
  selectedMunicipioName: null,

  navigateTo: (jurisdiccion) => set((state) => {
    const current = state.currentJurisdiccion;

    if (
      current &&
      current.layer === 'departamentos' &&
      jurisdiccion.layer === 'departamentos'
    ) {
      const updatedStack = [...state.navigationStack];
      updatedStack[updatedStack.length - 1] = jurisdiccion;
      return {
        currentLayer: jurisdiccion.layer,
        currentJurisdiccion: jurisdiccion,
        navigationStack: updatedStack,
        selectedMunicipioCode: null,
        selectedMunicipioName: null,
      };
    }

    return {
      currentLayer: jurisdiccion.layer,
      currentJurisdiccion: jurisdiccion,
      navigationStack: [...state.navigationStack, jurisdiccion],
      selectedMunicipioCode: null,
      selectedMunicipioName: null,
    };
  }),

  navigateBack: () => set((state) => {
    if (state.navigationStack.length <= 1) return state;
    const newStack = state.navigationStack.slice(0, -1);
    const previous = newStack[newStack.length - 1];
    return {
      navigationStack: newStack,
      currentLayer: previous.layer,
      currentJurisdiccion: previous,
      selectedMunicipioCode: null,
      selectedMunicipioName: null,
    };
  }),

  navigateToIndex: (index) => set((state) => {
    if (index < 0 || index >= state.navigationStack.length) return state;
    const newStack = state.navigationStack.slice(0, index + 1);
    const target = newStack[newStack.length - 1];
    return {
      navigationStack: newStack,
      currentLayer: target.layer,
      currentJurisdiccion: target,
      selectedMunicipioCode: null,
      selectedMunicipioName: null,
    };
  }),

  setSelectedMunicipioCode: (code, name) =>
    set({
      selectedMunicipioCode: code === null ? null : normalizeMunicipioCode(code),
      selectedMunicipioName: code === null ? null : (name ?? null),
    }),

  reset: () => set({
    currentLayer: 'pais',
    currentJurisdiccion: initialJurisdiccion,
    navigationStack: [initialJurisdiccion],
    selectedMunicipioCode: null,
    selectedMunicipioName: null,
  }),
}));
