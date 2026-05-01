import { useNavigate, useLocation } from 'react-router-dom';
import { useNavigationStore } from '../../stores/navigationStore';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

export function NavigationStrip() {
  const navigate = useNavigate();
  const location = useLocation();
  const { navigationStack, selectedMunicipioCode, selectedMunicipioName } = useNavigationStore();
  const { modulo, anio, activeTab } = useUIFiltersStore();

  // Only show territorial breadcrumb on the map view; other tabs are global
  if (activeTab !== 'mapa') return null;

  const hasDrillDown = navigationStack.length > 1 || !!selectedMunicipioCode;
  if (!hasDrillDown) return null;

  const homePath =
    modulo === 'resultados' ? `/resultados/${anio}` :
    modulo === 'puestos' ? '/puestos' :
    '/jurados-testigos';

  const handleHome = () => {
    navigate(homePath + location.search);
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div
      className="civ-card flex shrink-0 items-center justify-between"
      style={{ padding: '8px 14px', gap: 12 }}
    >
      <div className="min-w-0 flex-1 flex items-center gap-1 text-xs text-slate-500 truncate">
        {navigationStack.map((j, i) => (
          <span key={j.id} className="flex items-center gap-1 min-w-0">
            {i > 0 && <span className="shrink-0 text-slate-300">/</span>}
            <span className={i === navigationStack.length - 1 && !selectedMunicipioCode ? 'font-medium text-slate-700 truncate' : 'truncate'}>{j.name}</span>
          </span>
        ))}
        {selectedMunicipioName && (
          <span className="flex items-center gap-1 min-w-0">
            <span className="shrink-0 text-slate-300">/</span>
            <span className="font-medium text-slate-700 truncate">{selectedMunicipioName}</span>
          </span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center"
          style={{
            gap: 6,
            height: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px solid var(--civ-border)',
            background: '#fff',
            color: 'var(--civ-text)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
          title="Atrás"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Atrás
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="inline-flex items-center"
          style={{
            gap: 6,
            height: 32,
            padding: '0 12px',
            borderRadius: 8,
            border: 0,
            background: 'var(--civ-primary)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Volver al inicio"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20A1 1 0 006 21H9M19 10L21 12M19 10V20A1 1 0 0118 21H15M9 21A1 1 0 0010 20V16A1 1 0 0111 15H13A1 1 0 0114 16V20A1 1 0 0015 21M9 21H15" />
          </svg>
          Inicio
        </button>
      </div>
    </div>
  );
}
