import { create } from 'zustand';
import type { PuestoElectoral } from '../api/client';

interface PuestoModalStore {
  puesto: PuestoElectoral | null;
  open: (p: PuestoElectoral) => void;
  close: () => void;
}

export const usePuestoModalStore = create<PuestoModalStore>((set) => ({
  puesto: null,
  open: (p) => set({ puesto: p }),
  close: () => set({ puesto: null }),
}));
