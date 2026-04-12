import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api/client";
import type { SearchResult } from "../api/client";
import { useNavigationStore } from "../stores/navigationStore";
import type { Jurisdiccion } from "../stores/navigationStore";
import {
  normalizeDepartmentCode,
  normalizeMunicipioCode,
} from "../utils/territory";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { navigateTo, setSelectedMunicipioCode, reset } = useNavigationStore();
  const navigate = useNavigate();
  const location = useLocation();
  // Derive view base path including year for resultados (e.g. '/resultados/2026' or '/puestos')
  const segments = location.pathname.split('/').filter(Boolean);
  const viewPath = segments[0] === 'resultados'
    ? `/${segments[0]}/${segments[1] ?? ''}`
    : `/${segments[0] ?? ''}`;

  // Disable map interactions (pointer-events + tooltips) while dropdown is open
  useEffect(() => {
    if (showResults) {
      document.body.classList.add('search-active');
    } else {
      document.body.classList.remove('search-active');
    }
    return () => document.body.classList.remove('search-active');
  }, [showResults]);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    const normalizedQuery = searchQuery.trim();

    if (normalizedQuery.length < 1) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await api.search(normalizedQuery, 20);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = async (result: SearchResult) => {
    try {
      if (result.type === "municipio" && result.parent_code) {
        const municipioCode = normalizeMunicipioCode(result.code);
        const parentDepartmentCode = normalizeDepartmentCode(
          result.parent_code,
        );
        if (!municipioCode || !parentDepartmentCode) {
          return;
        }

        reset();
        const catalog = await api.getDepartamentosCatalog();
        const catalogDept = catalog.find(
          (d) => normalizeDepartmentCode(d.code) === parentDepartmentCode,
        );

        if (catalogDept) {
          const zoneCode = String(catalogDept.zone_id);
          const zoneDepts = catalog.filter((d) => String(d.zone_id) === zoneCode);
          const avgLat = zoneDepts.reduce((s, d) => s + d.center_lat, 0) / zoneDepts.length;
          const avgLon = zoneDepts.reduce((s, d) => s + d.center_lon, 0) / zoneDepts.length;
          const zone: Jurisdiccion = {
            id: `zone:${zoneCode}`,
            layer: 'zonas',
            name: catalogDept.zone_name ?? `Zona ${zoneCode}`,
            code: zoneCode,
            center_lat: avgLat,
            center_lon: avgLon,
            zoom: 6.6,
          };
          navigateTo(zone);
          navigateTo(catalogDept);
          setSelectedMunicipioCode(municipioCode, result.name);
          navigate(`${viewPath}/${zoneCode}/${catalogDept.code}/${municipioCode}`);
        } else {
          // Fallback: dept not in catalog — navigate by URL only; Zustand update is
          // intentionally omitted here because useRouteSync will reconstruct the full
          // navigationStack (zone + dept + muni) on the next render from the new URL.
          navigate(`${viewPath}/${parentDepartmentCode}`);
        }
      } else if (result.type === "departamento") {
        reset();
        const catalog = await api.getDepartamentosCatalog();
        const catalogDept = catalog.find((d) => d.code === result.code);
        if (catalogDept) {
          const zoneCode = String(catalogDept.zone_id);
          const zoneDepts = catalog.filter((d) => String(d.zone_id) === zoneCode);
          const avgLat = zoneDepts.reduce((s, d) => s + d.center_lat, 0) / zoneDepts.length;
          const avgLon = zoneDepts.reduce((s, d) => s + d.center_lon, 0) / zoneDepts.length;
          const zone: Jurisdiccion = {
            id: `zone:${zoneCode}`,
            layer: 'zonas',
            name: catalogDept.zone_name ?? `Zona ${zoneCode}`,
            code: zoneCode,
            center_lat: avgLat,
            center_lon: avgLon,
            zoom: 6.6,
          };
          navigateTo(zone);
          navigateTo(catalogDept);
          setSelectedMunicipioCode(null);
          navigate(`${viewPath}/${zoneCode}/${catalogDept.code}`);
        } else {
          // Fallback: not in catalog, let useRouteSync reconstruct from URL
          navigate(`${viewPath}/${result.code}`);
        }
      }
    } finally {
      setShowResults(false);
      setQuery("");
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setShowResults(query.trim().length > 0)}
        placeholder="Buscar departamento o municipio..."
        className="h-9 w-full rounded-lg border border-gray-200 bg-white px-4 pr-10 text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all duration-200"
      />
      {!isSearching && (
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      )}
      {isSearching && (
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <>
          {/* Transparent overlay — blocks map clicks/touches while dropdown is open */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => { setShowResults(false); setQuery(""); }}
            onTouchStart={() => { setShowResults(false); setQuery(""); }}
          />
          <div className="absolute z-[9999] mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-xl">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full border-b border-gray-100 bg-white px-5 py-4 text-left transition-all duration-200 last:border-b-0 hover:bg-gray-100"
              >
                <div className="text-lg font-semibold text-gray-900">
                  {result.name}
                </div>
                <div className="mt-1 text-base text-gray-600">
                  {result.type === "departamento" && "Departamento"}
                  {result.type === "municipio" &&
                    `Municipio${result.parent_name ? ` • ${result.parent_name}` : ""}`}
                  {result.direccion && ` • ${result.direccion}`}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {showResults &&
        results.length === 0 &&
        query.trim().length >= 1 &&
        !isSearching && (
          <div className="absolute z-[9999] mt-2 w-full rounded-lg border border-gray-300 bg-white p-5 text-center text-lg text-gray-500 shadow-xl">
            No se encontraron resultados
          </div>
        )}
    </div>
  );
}
