import { ElectoralMap } from "./components/ElectoralMap";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SearchBar } from "./components/SearchBar";
import { useNavigationStore } from "./stores/navigationStore";

function App() {
  const { currentJurisdiccion, navigateBack, navigationStack } =
    useNavigationStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-md z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold">Mapas Electorales Colombia</h1>
            {navigationStack.length > 1 && (
              <button
                onClick={navigateBack}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Atrás
              </button>
            )}
          </div>
          <div className="max-w-2xl">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Map */}
      <main className="relative flex-1 min-h-0 bg-slate-100">
        <ElectoralMap />
      </main>

      {/* Footer / Info Panel */}
      <div className="bg-white border-t px-4 py-2 flex items-center justify-between text-sm text-gray-600 z-10">
        <div>
          <span className="font-semibold">Capa actual:</span>{" "}
          {currentJurisdiccion?.layer === "pais" && "País"}
          {currentJurisdiccion?.layer === "zonas" && "Zonas"}
          {currentJurisdiccion?.layer === "departamentos" && "Departamentos"}
          {currentJurisdiccion?.layer === "municipio" && "Municipio"}
          {currentJurisdiccion?.layer === "localidad" && "Localidad"}
          {currentJurisdiccion?.layer === "puesto" && "Puesto Electoral"}
        </div>
        <div className="text-xs text-gray-500">
          MVP - Sistema de Gestión de Representantes
        </div>
      </div>
    </div>
  );
}

export default App;
