import { Link, useLocation } from "react-router-dom";
import { useNavigationStore } from "../stores/navigationStore";

interface BreadcrumbsProps {
  dark?: boolean;
}

export function Breadcrumbs({ dark = false }: BreadcrumbsProps) {
  const {
    navigationStack,
    navigateToIndex,
    selectedMunicipioCode,
    selectedMunicipioName,
    setSelectedMunicipioCode,
  } = useNavigationStore();
  const location = useLocation();

  if (navigationStack.length === 0) return null;

  const separatorClass = dark ? 'text-white/30' : 'text-gray-300';
  const leafClass = dark ? 'font-semibold text-white' : 'font-semibold text-gray-900';
  const linkClass = dark
    ? 'text-white/60 transition-colors duration-200 hover:text-white hover:underline'
    : 'text-gray-500 transition-colors duration-200 hover:text-gray-900 hover:underline';

  // Derive the view prefix (e.g. '/puestos', '/resultados/2026')
  const segments = location.pathname.split('/').filter(Boolean);
  const viewPrefix =
    segments[0] === 'resultados'
      ? `/${segments[0]}/${segments[1] ?? ''}`
      : `/${segments[0] ?? ''}`;

  const buildHref = (index: number) => {
    const j = navigationStack[index];
    if (index === 0) return viewPrefix;
    if (j.layer === 'zonas') return `${viewPrefix}/${j.code}`;
    if (j.layer === 'departamentos') {
      const zone = navigationStack.find((s) => s.layer === 'zonas');
      return zone ? `${viewPrefix}/${zone.code}/${j.code}` : `${viewPrefix}/${j.code}`;
    }
    return viewPrefix;
  };

  // A municipality is "active" when selectedMunicipioCode is set at dept level
  const hasMuniSelected =
    !!selectedMunicipioCode &&
    navigationStack[navigationStack.length - 1]?.layer === 'departamentos';

  const isCurrentLeaf = (index: number) =>
    index === navigationStack.length - 1 && !hasMuniSelected;

  const handleDeptClickWithMuni = () => {
    setSelectedMunicipioCode(null);
  };

  return (
    <div className="mt-1.5 flex items-center gap-1 text-sm">
      {navigationStack.map((jurisdiccion, index) => (
        <div key={jurisdiccion.id} className="flex items-center gap-1">
          {index > 0 && <span className={`${separatorClass} select-none`}>›</span>}
          {isCurrentLeaf(index) ? (
            <span className={leafClass}>
              {jurisdiccion.name}
            </span>
          ) : (
            <Link
              to={buildHref(index)}
              onClick={() => {
                if (
                  hasMuniSelected &&
                  index === navigationStack.length - 1
                ) {
                  handleDeptClickWithMuni();
                } else {
                  navigateToIndex(index);
                }
              }}
              className={linkClass}
            >
              {jurisdiccion.name}
            </Link>
          )}
        </div>
      ))}

      {/* Municipality as the current (non-clickable) leaf */}
      {hasMuniSelected && (
        <div className="flex items-center gap-1">
          <span className={`${separatorClass} select-none`}>›</span>
          <span className={leafClass}>
            {selectedMunicipioName ?? selectedMunicipioCode}
          </span>
        </div>
      )}
    </div>
  );
}
