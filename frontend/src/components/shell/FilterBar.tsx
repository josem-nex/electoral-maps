import { useState } from 'react';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';
import { TipoEleccionSelect } from './TipoEleccionSelect';
import { CandidatoSelect } from './CandidatoSelect';
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

const SELECT_STYLES: React.CSSProperties = {
  width: '100%',
  height: 38,
  padding: '0 10px',
  border: '1px solid var(--civ-border)',
  borderRadius: 8,
  background: '#fff',
  fontSize: 13,
  color: 'var(--civ-text)',
  outline: 'none',
  cursor: 'pointer',
};

/** Filter fields without the bar wrapper — reused inside the desktop bar and the mobile drawer. */
export function FilterFields({ layout = 'horizontal' }: FilterFieldsProps) {
  const { modulo, nivel, setNivel } = useUIFiltersStore();
  const showCandidato = modulo === 'resultados';
  const showJuradosManage = modulo === 'jurados-testigos';
  const [juradosOpen, setJuradosOpen] = useState(false);

  const stacked = layout === 'stacked';

  // Build the grid template based on visibility (matches design's 1.4fr 1fr 1.4fr 2fr auto)
  // Candidato (1.4) · Nivel (1) · Tipo (1.4) · Search (2) · [Personal btn auto]
  const gridTemplate = stacked
    ? '1fr'
    : showCandidato
      ? (showJuradosManage ? '1.4fr 1fr 1.4fr 2fr auto' : '1.4fr 1fr 1.4fr 2fr')
      : (showJuradosManage ? '1fr 1.4fr 2fr auto' : '1fr 1.4fr 2fr');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: gridTemplate,
        gap: stacked ? 12 : 14,
        alignItems: 'end',
      }}
    >
      {showCandidato && (
        <div className="min-w-0">
          <label style={FIELD_LABEL}>Candidato / Partido</label>
          <CandidatoSelect />
        </div>
      )}

      <div className="min-w-0">
        <label style={FIELD_LABEL}>Nivel</label>
        <select
          value={nivel}
          onChange={(e) => setNivel(e.target.value as 'departamentos' | 'municipio')}
          style={SELECT_STYLES}
        >
          <option value="departamentos">Departamentos</option>
          <option value="municipio">Municipios</option>
        </select>
      </div>

      <div className="min-w-0">
        <label style={FIELD_LABEL}>Tipo de Elección</label>
        <TipoEleccionSelect />
      </div>

      <div className="min-w-0">
        <label style={FIELD_LABEL}>Buscar</label>
        <SearchBar />
      </div>

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
