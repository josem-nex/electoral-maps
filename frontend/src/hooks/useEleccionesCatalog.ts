import type { Modulo } from '../stores/uiFiltersStore';

export interface EleccionOption {
  id: string;
  label: string;
  modulo: Modulo;
  anio: number;
  corporacion: string;
}

export interface EleccionGroup {
  group: string;
  options: EleccionOption[];
}

const RESULTADOS: EleccionOption[] = [
  // Presidenciales
  { id: 'pres-2018-1', label: 'Presidencial 2018 · 1ª Vuelta', modulo: 'resultados', anio: 2018, corporacion: 'P01' },
  { id: 'pres-2018-2', label: 'Presidencial 2018 · 2ª Vuelta', modulo: 'resultados', anio: 2018, corporacion: 'P02' },
  { id: 'pres-2022-1', label: 'Presidencial 2022 · 1ª Vuelta', modulo: 'resultados', anio: 2022, corporacion: 'P01' },
  { id: 'pres-2022-2', label: 'Presidencial 2022 · 2ª Vuelta', modulo: 'resultados', anio: 2022, corporacion: 'P02' },
  // Congreso
  { id: 'sen-2022', label: 'Senado 2022', modulo: 'resultados', anio: 2022, corporacion: '001' },
  { id: 'cam-2022', label: 'Cámara 2022', modulo: 'resultados', anio: 2022, corporacion: '002' },
  { id: 'sen-2026', label: 'Senado 2026', modulo: 'resultados', anio: 2026, corporacion: '001' },
  { id: 'cam-2026', label: 'Cámara 2026', modulo: 'resultados', anio: 2026, corporacion: '002' },
  // Territoriales 2019
  { id: 'gob-2019', label: 'Gobernador 2019', modulo: 'resultados', anio: 2019, corporacion: '001' },
  { id: 'asa-2019', label: 'Asamblea 2019', modulo: 'resultados', anio: 2019, corporacion: '002' },
  { id: 'alc-2019', label: 'Alcalde 2019', modulo: 'resultados', anio: 2019, corporacion: '003' },
  { id: 'con-2019', label: 'Concejo 2019', modulo: 'resultados', anio: 2019, corporacion: '004' },
  { id: 'jal-2019', label: 'JAL 2019', modulo: 'resultados', anio: 2019, corporacion: '005' },
  // Territoriales 2023
  { id: 'gob-2023', label: 'Gobernador 2023', modulo: 'resultados', anio: 2023, corporacion: '001' },
  { id: 'asa-2023', label: 'Asamblea 2023', modulo: 'resultados', anio: 2023, corporacion: '002' },
  { id: 'alc-2023', label: 'Alcalde 2023', modulo: 'resultados', anio: 2023, corporacion: '003' },
  { id: 'con-2023', label: 'Concejo 2023', modulo: 'resultados', anio: 2023, corporacion: '004' },
  { id: 'jal-2023', label: 'JAL 2023', modulo: 'resultados', anio: 2023, corporacion: '005' },
];

const OPERATIVO: EleccionOption[] = [
  { id: 'puestos', label: 'Puestos electorales', modulo: 'puestos', anio: 0, corporacion: '' },
  { id: 'jurados', label: 'Jurados y Testigos', modulo: 'jurados-testigos', anio: 0, corporacion: '' },
];

export const ELECCIONES_GROUPS: EleccionGroup[] = [
  {
    group: 'Presidenciales',
    options: RESULTADOS.filter((o) => o.id.startsWith('pres-')),
  },
  {
    group: 'Congreso',
    options: RESULTADOS.filter((o) => o.id.startsWith('sen-') || o.id.startsWith('cam-')),
  },
  {
    group: 'Territoriales',
    options: RESULTADOS.filter((o) =>
      ['gob-', 'asa-', 'alc-', 'con-', 'jal-'].some((p) => o.id.startsWith(p)),
    ),
  },
  {
    group: 'Operativo',
    options: OPERATIVO,
  },
];

export const ELECCIONES_FLAT: EleccionOption[] = [...RESULTADOS, ...OPERATIVO];

export function findEleccion(modulo: Modulo, anio: number, corporacion: string): EleccionOption | undefined {
  return ELECCIONES_FLAT.find(
    (o) => o.modulo === modulo && o.anio === anio && o.corporacion === corporacion,
  );
}

export function useEleccionesCatalog() {
  return { groups: ELECCIONES_GROUPS, flat: ELECCIONES_FLAT, findEleccion };
}
