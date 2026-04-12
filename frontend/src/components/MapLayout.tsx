import { Outlet, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';
import { SearchBar } from './SearchBar';
import { useNavigationStore } from '../stores/navigationStore';
import { useRouteSync } from '../hooks/useRouteSync';
import companyLogo from '../../../data/images/LOGO FINAL E DAY TECH.png';

export function MapLayout() {
  useRouteSync();

  const navigate = useNavigate();
  const { navigateBack, navigationStack, reset } = useNavigationStore();

  const handleGoHome = () => {
    reset();
    navigate('/');
  };

  const handleBack = () => {
    navigateBack();
    navigate(-1);
  };

  return (
    <div className="h-screen w-screen flex flex-col lg:overflow-hidden">
      {/* Header */}
      <header className="relative z-50 bg-slate-900 shadow-md flex items-stretch">
        {/* Left side: search + nav + breadcrumbs */}
        <div className="flex flex-1 flex-col justify-center px-4 py-2 min-w-0">
          <div className="flex items-center gap-3">
            {/* Search bar — fills half the viewport on large screens (mirrors map width) */}
            <div className="flex-1 lg:max-w-[50vw]">
              <SearchBar />
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2 ml-auto flex-shrink-0">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-600 active:bg-blue-800"
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
                  onClick={handleBack}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Atrás
                </button>
              )}
            </div>
          </div>

          {/* Breadcrumbs as second line */}
          <Breadcrumbs dark />
        </div>

        {/* Right side: Logo — fills full header height */}
        <div className="flex-shrink-0 flex items-center border-l border-white/10 bg-slate-800 px-4 sm:px-5">
          <img
            src={companyLogo}
            alt="E-Day Tech"
            className="h-10 w-auto sm:h-12"
          />
        </div>
      </header>

      {/* Main content (ElectoralMap via Outlet) */}
      <main className="relative flex-1 lg:min-h-0 bg-white">
        <Outlet />
      </main>
    </div>
  );
}
