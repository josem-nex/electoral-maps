import { useState } from "react";
import { ElectoralMap } from "./components/ElectoralMap";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { SearchBar } from "./components/SearchBar";
import { LandingEntryScreen } from "./components/LandingEntryScreen";
import { useNavigationStore } from "./stores/navigationStore";

export type ActiveView = 'puestos' | 'resultados' | 'jurados-testigos';

function App() {
  const [isEntryComplete, setIsEntryComplete] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('puestos');
  const [selectedYear, setSelectedYear] = useState<number>(2022);
  const { navigateBack, navigationStack, reset } =
    useNavigationStore();

  const handleEnterPuestos = () => {
    reset();
    setActiveView('puestos');
    setIsEntryComplete(true);
  };

  const handleEnterJuradosTestigos = () => {
    reset();
    setActiveView('jurados-testigos');
    setIsEntryComplete(true);
  };

  const handleEnterResultados = (year: number) => {
    reset();
    setActiveView('resultados');
    setSelectedYear(year);
    setIsEntryComplete(true);
  };

  const handleGoHome = () => {
    reset();
    setIsEntryComplete(false);
  };

  if (!isEntryComplete) {
    return (
      <LandingEntryScreen
        onEnterPuestos={handleEnterPuestos}
        onEnterJuradosTestigos={handleEnterJuradosTestigos}
        onEnterResultados={handleEnterResultados}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col lg:overflow-hidden">
      {/* Header */}
      <header className="z-10 bg-blue-600 text-white">
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-3xl font-bold">Mapas Electorales Colombia</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 rounded-lg bg-blue-800 px-5 py-2.5 text-base transition-colors hover:bg-blue-900"
                title="Regresar al inicio"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Inicio
              </button>
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
          </div>
          <div className="max-w-3xl">
            <SearchBar />
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Main Map */}
      <main className="relative flex-1 lg:min-h-0 bg-white">
        <ElectoralMap activeView={activeView} selectedYear={selectedYear} />
      </main>


    </div>
  );
}

export default App;
