import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { findEleccion } from '../../hooks/useEleccionesCatalog';

interface ActiveFiltersChipsProps {
  onOpen: () => void;
}

export function ActiveFiltersChips({ onOpen }: ActiveFiltersChipsProps) {
  const { modulo, anio, corporacion, candidatoFiltro } = useUIFiltersStore();
  const eleccion = findEleccion(modulo, anio, corporacion);

  const chips: string[] = [];
  if (eleccion) chips.push(eleccion.label);
  if (candidatoFiltro) chips.push('Candidato seleccionado');

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 sm:hidden">
      <button
        type="button"
        onClick={onOpen}
        className="flex shrink-0 min-h-11 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
      </button>
      {chips.map((c, i) => (
        <span
          key={i}
          className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800"
        >
          {c}
        </span>
      ))}
    </div>
  );
}
