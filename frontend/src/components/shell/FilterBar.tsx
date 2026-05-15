import { useState } from 'react';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { TipoEleccionSelect } from './TipoEleccionSelect';
import { CandidatoSelect, PartidoSelect } from './CandidatoSelect';
import { SearchBar } from '../SearchBar';
import { JuradosManagerModal } from '../views/JuradosUploadModal';

interface FilterFieldsProps {
  layout?: 'horizontal' | 'stacked';
}

const FIELD_LABEL_BASE: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--civ-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: 6,
  display: 'block',
};
const FIELD_LABEL: React.CSSProperties = { ...FIELD_LABEL_BASE, fontSize: 11 };
const FIELD_LABEL_STACKED: React.CSSProperties = { ...FIELD_LABEL_BASE, fontSize: 13 };

/** Filter fields without the bar wrapper — reused inside the desktop bar and the mobile drawer. */
export function FilterFields({ layout = 'horizontal' }: FilterFieldsProps) {
  const { modulo, corporacion, activeTab } = useUIFiltersStore();
  const showResultsFilters = modulo === 'resultados';
  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';
  // Tab-based visibility:
  //   mapa       → Tipo + Partido + Candidato + Buscar (per módulo applicability)
  //   comparador → ningún filtro global (Tipo se controla en cada lado de la comparación)
  //   dashboard  → solo Tipo
  //   reportes   → solo Tipo
  const showTipo = activeTab !== 'comparador';
  const partidoAllowedByTab = activeTab === 'mapa' || activeTab === 'comparador';
  const candidatoAllowedByTab = activeTab === 'mapa';
  const showPartido = showResultsFilters && !isPresidencial && partidoAllowedByTab;
  const showCandidato = showResultsFilters && candidatoAllowedByTab;
  const showBuscar = activeTab === 'mapa';
  const showJuradosManage = modulo === 'jurados-testigos';
  const [juradosOpen, setJuradosOpen] = useState(false);

  const stacked = layout === 'stacked';

  // [Tipo 1.4] · [Partido 1.2] · [Candidato 1.4] · [Search 2] · [Personal auto]
  const cols: string[] = [];
  if (showTipo) cols.push('1.4fr');
  if (showPartido) cols.push('1.2fr');
  if (showCandidato) cols.push('1.4fr');
  if (showBuscar) cols.push('2fr');
  if (showJuradosManage) cols.push('auto');

  if (cols.length === 0) return null;

  // Cuando solo hay un campo (típicamente Tipo en Dashboard / Reportes), no
  // queremos que el dropdown ocupe todo el ancho. Le ponemos un cap razonable.
  let gridTemplate: string;
  if (stacked) gridTemplate = '1fr';
  else if (cols.length === 1) gridTemplate = 'minmax(260px, 28%)';
  else gridTemplate = cols.join(' ');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        gap: stacked ? 12 : 14,
        alignItems: 'end',
      }}
    >
      {showTipo && (
        <div className="min-w-0">
          <label style={stacked ? FIELD_LABEL_STACKED : FIELD_LABEL}>Tipo de Elección</label>
          <TipoEleccionSelect />
        </div>
      )}

      {showPartido && (
        <div className="min-w-0">
          <label style={stacked ? FIELD_LABEL_STACKED : FIELD_LABEL}>Partido</label>
          <PartidoSelect />
        </div>
      )}

      {showCandidato && (
        <div className="min-w-0">
          <label style={stacked ? FIELD_LABEL_STACKED : FIELD_LABEL}>Candidato</label>
          <CandidatoSelect />
        </div>
      )}

      {showBuscar && (
        <div className="min-w-0">
          <label style={stacked ? FIELD_LABEL_STACKED : FIELD_LABEL}>Buscar</label>
          <SearchBar />
        </div>
      )}

      {showJuradosManage && (
        <div className="min-w-0">
          <label style={stacked ? FIELD_LABEL_STACKED : FIELD_LABEL}>Personal</label>
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
  const { modulo, corporacion, activeTab } = useUIFiltersStore();
  const isPresidencial = corporacion === 'P01' || corporacion === 'P02';
  const showTipo = activeTab !== 'comparador';
  const showPartido = modulo === 'resultados' && !isPresidencial && (activeTab === 'mapa' || activeTab === 'comparador');
  const showCandidato = modulo === 'resultados' && activeTab === 'mapa';
  const showBuscar = activeTab === 'mapa';
  const showJuradosManage = modulo === 'jurados-testigos';
  const hasAnyField = showTipo || showPartido || showCandidato || showBuscar || showJuradosManage;
  if (!hasAnyField) return null;
  return (
    <div
      className="civ-card hidden shrink-0 sm:block"
      style={{ padding: '14px 16px' }}
    >
      <FilterFields layout="horizontal" />
    </div>
  );
}
