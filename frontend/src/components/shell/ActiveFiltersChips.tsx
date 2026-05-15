import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { findEleccion } from '../../hooks/useEleccionesCatalog';

interface ActiveFiltersChipsProps {
  onOpen: () => void;
}

export function ActiveFiltersChips({ onOpen }: ActiveFiltersChipsProps) {
  const { modulo, anio, corporacion, candidatoFiltro, partidoFiltro, activeTab } = useUIFiltersStore();
  const eleccion = findEleccion(modulo, anio, corporacion);

  const chips: string[] = [];
  if (eleccion) chips.push(eleccion.label);
  if (candidatoFiltro && activeTab === 'mapa') chips.push('Candidato seleccionado');
  if (partidoFiltro && (activeTab === 'mapa' || activeTab === 'comparador')) chips.push('Partido seleccionado');

  return (
    <div
      className="flex items-center gap-2 overflow-x-auto bg-white px-3 py-2 sm:hidden"
      style={{ borderBottom: '1px solid var(--civ-border)' }}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex shrink-0 min-h-11 items-center gap-1.5 rounded-full bg-white shadow-sm transition-colors hover:bg-[var(--civ-bg)]"
        style={{
          padding: '6px 12px',
          border: '1px solid var(--civ-border-strong)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--civ-text)',
        }}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
      </button>
      {chips.map((c, i) => (
        <span
          key={i}
          className="shrink-0 rounded-full"
          style={{
            padding: '4px 10px',
            background: 'var(--civ-primary-soft)',
            color: 'var(--civ-primary)',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {c}
        </span>
      ))}
    </div>
  );
}
