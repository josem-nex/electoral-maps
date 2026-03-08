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
  const { navigateTo } = useNavigationStore();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);

    if (searchQuery.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await api.search(searchQuery, 20);
      setResults(searchResults);
      setShowResults(true);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Map search result to jurisdiccion format
    const jurisdiccion: Jurisdiccion = {
      id: result.id,
      layer:
        result.type === "departamento"
          ? "departamentos"
          : result.type === "municipio"
            ? "municipio"
            : "puesto",
      name: result.name,
      code: result.code,
      parent_code: result.parent_code,
      center_lat: result.center_lat,
      center_lon: result.center_lon,
      zoom: result.zoom,
    };

    navigateTo(jurisdiccion);
    setShowResults(false);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setShowResults(results.length > 0)}
          placeholder="Buscar departamento, municipio o puesto..."
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
      </div>

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
                {result.type === "municipio" && "Municipio"}
                {result.type === "puesto" && "Puesto Electoral"}
                {result.direccion && ` • ${result.direccion}`}
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults &&
        results.length === 0 &&
        query.length >= 2 &&
        !isSearching && (
          <div className="absolute z-10 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500">
            No se encontraron resultados
          </div>
        )}
    </div>
  );
}
