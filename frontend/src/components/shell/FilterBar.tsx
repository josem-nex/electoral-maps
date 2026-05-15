import { useState } from 'react';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { TipoEleccionSelect } from './TipoEleccionSelect';
import { CandidatoSelect, PartidoSelect } from './CandidatoSelect';
import { SearchBar } from '../SearchBar';
import { JuradosManagerModal } from '../views/JuradosUploadModal';

interface FilterFieldsProps {
  layout?: 'horizontal' | 'stacked';
}

const FIELD_LABEL: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--civ-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
  display: 'block',
};

/** Filter fields without the bar wrapper — reused inside the desktop bar and the mobile drawer. */
export function FilterFields({ layout = 'horizontal' }: FilterFieldsProps) {
  const { modulo, corporacion, activeTab } = useUIFiltersStore();
  const showResultsFilters = modulo === 'resultados';
  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';
  // Tab-based visibility:
  //   mapa       → Partido + Candidato + Buscar (per módulo applicability)
  //   comparador → solo Partido (filtra ambos lados de la comparación)
  //   dashboard  → ningún filtro de partido/candidato/buscar
  //   reportes   → ningún filtro de partido/candidato/buscar
  const partidoAllowedByTab = activeTab === 'mapa' || activeTab === 'comparador';
  const candidatoAllowedByTab = activeTab === 'mapa';
  const showPartido = showResultsFilters && !isPresidencial && partidoAllowedByTab;
  const showCandidato = showResultsFilters && candidatoAllowedByTab;
  const showBuscar = activeTab === 'mapa';
  const showJuradosManage = modulo === 'jurados-testigos';
  const [juradosOpen, setJuradosOpen] = useState(false);

  const stacked = layout === 'stacked';

  // Tipo (1.4) · [Partido 1.2] · [Candidato 1.4] · [Search 2] · [Personal auto]
  const cols: string[] = [];
  cols.push('1.4fr'); // Tipo
  if (showPartido) cols.push('1.2fr'); // Partido
  if (showCandidato) cols.push('1.4fr'); // Candidato
  if (showBuscar) cols.push('2fr'); // Buscar
  if (showJuradosManage) cols.push('auto'); // Personal
  const gridTemplate = stacked ? '1fr' : cols.join(' ');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        gap: stacked ? 12 : 14,
        alignItems: 'end',
      }}
    >
      <div className="min-w-0">
        <label style={FIELD_LABEL}>Tipo de Elección</label>
        <TipoEleccionSelect />
      </div>

      {showPartido && (
        <div className="min-w-0">
          <label style={FIELD_LABEL}>Partido</label>
          <PartidoSelect />
        </div>
      )}

      {showCandidato && (
        <div className="min-w-0">
          <label style={FIELD_LABEL}>Candidato</label>
          <CandidatoSelect />
        </div>
      )}

      {showBuscar && (
        <div className="min-w-0">
          <label style={FIELD_LABEL}>Buscar</label>
          <SearchBar />
        </div>
      )}

      {showJuradosManage && (
        <div className="min-w-0">
          <label style={FIELD_LABEL}>Personal</label>
          <button
            type="button"
            onClick={() => setJuradosOpen(true)}
            className="flex items-center justify-center"
            style={{
              height: 38,
              padding: '0 14px',
              borderRadius: 8,
              border: 0,
              background: 'var(--civ-primary)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Cargar / Eliminar
          </button>
        </div>
      )}

      <JuradosManagerModal open={juradosOpen} onClose={() => setJuradosOpen(false)} />
    </div>
  );
}

/** Desktop / tablet filter bar (hidden on mobile). */
export function FilterBar() {
  return (
    <div
      className="civ-card hidden shrink-0 sm:block"
      style={{ padding: '14px 16px' }}
    >
      <FilterFields layout="horizontal" />
    </div>
  );
}
