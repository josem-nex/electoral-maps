import { useState } from "react";
import { ElectoralMap } from "./components/ElectoralMap";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SearchBar } from "./components/SearchBar";
import { LandingEntryScreen } from "./components/LandingEntryScreen";
import { useNavigationStore } from "./stores/navigationStore";

function App() {
  const [isEntryComplete, setIsEntryComplete] = useState(false);
  const { currentJurisdiccion, navigateBack, navigationStack, reset } =
    useNavigationStore();

  const handleEnterPuestos = () => {
    reset();
    setIsEntryComplete(true);
  };

  if (!isEntryComplete) {
    return <LandingEntryScreen onEnterPuestos={handleEnterPuestos} />;
  }

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="z-10 bg-blue-600 text-white">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold">Mapas Electorales Colombia</h1>
            {navigationStack.length > 1 && (
              <button
                onClick={navigateBack}
                className="flex items-center gap-2 rounded-lg bg-blue-700 px-5 py-2.5 text-base transition-colors hover:bg-blue-800"
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
          <div className="max-w-3xl">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Map */}
      <main className="relative flex-1 min-h-0 bg-white">
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
