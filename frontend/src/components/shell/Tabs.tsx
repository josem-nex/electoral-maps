import { useNavigate, useLocation } from 'react-router-dom';
import { useUIFiltersStore, type ActiveTab } from '../../stores/uiFiltersStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useIsMobile } from '../../hooks/useIsMobile';

interface TabDef {
  id: ActiveTab;
  label: string;
  icon: JSX.Element;
}

function IconDash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}
function IconMap() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}
function IconReport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="14" x2="15" y2="14" />
      <line x1="9" y1="18" x2="15" y2="18" />
    </svg>
  );
}
function IconCompare() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 3h5v5" />
      <path d="M4 20l16-16" />
      <path d="M21 16v5h-5" />
      <path d="M15 15l6 6" />
      <path d="M4 4l5 5" />
    </svg>
  );
}

const ALL_TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <IconDash /> },
  { id: 'mapa', label: 'Mapa', icon: <IconMap /> },
  { id: 'reportes', label: 'Reportes', icon: <IconReport /> },
  { id: 'comparador', label: 'Comparador', icon: <IconCompare /> },
];

export function Tabs() {
  const { modulo, anio, activeTab, setActiveTab } = useUIFiltersStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();

  const tabs = ALL_TABS.filter((t) => {
    if (t.id === 'comparador' && modulo !== 'resultados') return false;
    return true;
  });

  const handleTabClick = (id: typeof activeTab) => {
    if (id !== 'mapa') {
      // Reset territorial state and strip drill-down segments from URL
      useNavigationStore.getState().reset();
      const basePath =
        modulo === 'resultados' ? `/resultados/${anio}` :
        modulo === 'puestos' ? '/puestos' :
        '/jurados-testigos';
      const search = new URLSearchParams(location.search);
      search.set('tab', id);
      const target = basePath + (search.toString() ? '?' + search.toString() : '');
      navigate(target, { replace: true });
    }
    setActiveTab(id);
  };

  return (
    <nav
      className="civ-card flex shrink-0 self-stretch overflow-x-auto sm:self-start"
      style={{ gap: 4, padding: 6 }}
    >
      {tabs.map((t) => {
        const active = t.id === activeTab;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleTabClick(t.id)}
            className="inline-flex shrink-0 items-center transition-all"
            style={{
              gap: 8,
              padding: isMobile ? '9px 14px' : '8px 14px',
              borderRadius: 8,
              fontSize: isMobile ? 14 : 13,
              fontWeight: 500,
              border: 0,
              cursor: 'pointer',
              minHeight: isMobile ? 40 : 36,
              background: active ? 'var(--civ-primary)' : 'transparent',
              color: active ? '#fff' : 'var(--civ-text-muted)',
              boxShadow: active ? '0 2px 6px rgba(29,78,137,0.25)' : undefined,
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'var(--civ-bg)';
                e.currentTarget.style.color = 'var(--civ-text)';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--civ-text-muted)';
              }
            }}
          >
            <span className="inline-flex">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
