import { Link, useLocation } from "react-router-dom";
import { useNavigationStore } from "../stores/navigationStore";

export function Breadcrumbs() {
  const {
    navigationStack,
    navigateToIndex,
    selectedMunicipioCode,
    selectedMunicipioName,
    setSelectedMunicipioCode,
  } = useNavigationStore();
  const location = useLocation();

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

  // When municipality is selected, the dept is no longer the "current leaf" —
  // it should be clickable to go back to dept view.
  const isCurrentLeaf = (index: number) =>
    index === navigationStack.length - 1 && !hasMuniSelected;

  const handleDeptClickWithMuni = () => {
    // Clear municipality selection to return to dept view
    setSelectedMunicipioCode(null);
  };

  return (
    <div className="mx-2 rounded-b-md border-x border-b bg-white px-5 py-3.5">
      <div className="flex items-center space-x-2 text-lg">
        {navigationStack.map((jurisdiccion, index) => (
          <div key={jurisdiccion.id} className="flex items-center">
            {index > 0 && <span className="mx-2 text-xl text-gray-400">/</span>}
            {isCurrentLeaf(index) ? (
              <span className="text-lg font-semibold text-blue-600">
                {jurisdiccion.name}
              </span>
            ) : (
              <Link
                to={buildHref(index)}
                onClick={() => {
                  // If clicking dept while muni is selected, just clear the muni
                  if (
                    hasMuniSelected &&
                    index === navigationStack.length - 1
                  ) {
                    handleDeptClickWithMuni();
                  } else {
                    navigateToIndex(index);
                  }
                }}
                className="text-lg text-gray-600 transition-colors hover:text-blue-600 hover:underline"
              >
                {jurisdiccion.name}
              </Link>
            )}
          </div>
        ))}

        {/* Municipality as the current (non-clickable) leaf */}
        {hasMuniSelected && (
          <div className="flex items-center">
            <span className="mx-2 text-xl text-gray-400">/</span>
            <span className="text-lg font-semibold text-blue-600">
              {selectedMunicipioName ?? selectedMunicipioCode}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
