import { useNavigate } from 'react-router-dom';
import { useNavigationStore } from '../../stores/navigationStore';
import { Breadcrumbs } from '../Breadcrumbs';
import { useUIFiltersStore } from '../../stores/uiFiltersStore';

export function NavigationStrip() {
  const navigate = useNavigate();
  const { navigationStack, navigateBack, reset, selectedMunicipioCode } = useNavigationStore();
  const { modulo, anio } = useUIFiltersStore();

  const hasDrillDown = navigationStack.length > 1 || !!selectedMunicipioCode;
  if (!hasDrillDown) return null;

  const homePath =
    modulo === 'resultados' ? `/resultados/${anio}` :
    modulo === 'puestos' ? '/puestos' :
    '/jurados-testigos';

  const handleHome = () => {
    reset();
    navigate(homePath);
  };

  const handleBack = () => {
    if (selectedMunicipioCode) {
      // Clear the municipio selection (drop the leaf, stay at depto)
      useNavigationStore.getState().setSelectedMunicipioCode(null);
      const segments = window.location.pathname.split('/').filter(Boolean);
      // Strip municipio segment from URL
      const newSegments = segments.slice(0, -1);
      navigate('/' + newSegments.join('/'));
      return;
    }
    navigateBack();
    navigate(-1);
  };

  return (
    <div
      className="civ-card flex shrink-0 items-center justify-between"
      style={{ padding: '8px 14px', gap: 12 }}
    >
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
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
