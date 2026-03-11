import { useState } from "react";
import { api } from "../api/client";
import type { SearchResult } from "../api/client";
import { useNavigationStore } from "../stores/navigationStore";
import type { Jurisdiccion } from "../stores/navigationStore";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const { navigateTo, setSelectedMunicipioCode, reset } = useNavigationStore();

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
        reset();
        const departamentos = await api.getJurisdicciones("departamentos");
        const dept = departamentos.find((d) => d.code === result.parent_code);

        if (dept) {
          navigateTo(dept);
          setSelectedMunicipioCode(result.code);
        } else {
          const fallbackDept: Jurisdiccion = {
            id: `dept:${result.parent_code}`,
            layer: "departamentos",
            name: result.parent_name || `Departamento ${result.parent_code}`,
            code: result.parent_code,
            center_lat: result.center_lat,
            center_lon: result.center_lon,
            zoom: 8,
          };
          navigateTo(fallbackDept);
          setSelectedMunicipioCode(result.code);
        }
      } else if (result.type === "departamento") {
        reset();
        const jurisdiccion: Jurisdiccion = {
          id: result.id,
          layer: "departamentos",
          name: result.name,
          code: result.code,
          parent_code: result.parent_code,
          center_lat: result.center_lat,
          center_lon: result.center_lon,
          zoom: result.zoom,
        };
        navigateTo(jurisdiccion);
        setSelectedMunicipioCode(null);
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
        className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <svg
        className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
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
      {isSearching && (
        <div className="absolute right-3 top-2.5">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((result) => (
            <button
              key={result.id}
              onClick={() => handleResultClick(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-100 border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-gray-900">{result.name}</div>
              <div className="text-sm text-gray-500">
                {result.type === "departamento" && "Departamento"}
                {result.type === "municipio" &&
                  `Municipio${result.parent_name ? ` • ${result.parent_name}` : ""}`}
                {result.direccion && ` • ${result.direccion}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults &&
        results.length === 0 &&
        query.trim().length >= 1 &&
        !isSearching && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
            No se encontraron resultados
          </div>
        )}
    </div>
  );
}
