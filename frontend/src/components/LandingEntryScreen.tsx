import { useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../../../data/images/image_fondo_colombia.jpg";
import companyLogo from "../../../data/images/LOGO FINAL E DAY TECH.png";

const RESULT_YEARS = [2018, 2019, 2022, 2023, 2026] as const;

// SVG Icons
function IconPuestos() {
  return (
    <svg className="w-10 h-10 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconJurados() {
  return (
    <svg className="w-10 h-10 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function IconResultados() {
  return (
    <svg className="w-10 h-10 text-brand-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

export function LandingEntryScreen() {
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen w-screen bg-slate-50">
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[260px] max-h-[500px] w-full overflow-hidden">
        <img
          src={backgroundImage}
          alt="Fondo institucional de Colombia"
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_50%] blur-[2px]"
        />
        <div className="absolute inset-0 bg-blue-950/55" />

        {/* Logo */}
        <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-7">
          <img
            src={companyLogo}
            alt="Logo corporativo"
            className="h-20 w-auto rounded bg-white/90 px-3 py-2 shadow-lg sm:h-24"
          />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full flex-col items-center justify-end px-6 pb-10 text-center text-white sm:pb-12">
          <p className="text-sm font-semibold tracking-[0.3em] text-blue-100 sm:text-base">
            INFORMACIÓN ELECTORAL COLOMBIA
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Plataforma de Consulta Territorial
          </h1>
        </div>
      </section>

      {/* Cards section */}
      <main className="flex flex-1 flex-col w-full px-4 pt-6 pb-4 sm:px-6 lg:px-8">
        <h2 className="mb-5 text-center text-xl font-semibold text-gray-700">
          ¿Qué información desea consultar?
        </h2>

        <div className="flex-1 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card: Información de Puestos */}
          <button
            type="button"
            onClick={() => navigate("/puestos")}
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-brand-500 hover:shadow-lg h-full"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <IconPuestos />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Información de Puestos
            </h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Consulta puestos electorales, mesas, potencial electoral y distribución por territorio.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 group-hover:bg-brand-900">
              Consultar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          {/* Card: Jurados y Testigos */}
          <button
            type="button"
            onClick={() => navigate("/jurados-testigos")}
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-brand-500 hover:shadow-lg h-full"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <IconJurados />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Jurados y Testigos
            </h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Gestiona y consulta jurados electorales y testigos de partido asignados por puesto.
            </p>
            <span className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 group-hover:bg-brand-900">
              Consultar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>

          {/* Card: Resultados Electorales */}
          <button
            type="button"
            onClick={() => navigate(`/resultados/${selectedYear}`)}
            className="group flex flex-col items-center rounded-2xl border border-gray-200 bg-white p-7 text-center shadow-sm transition-all duration-200 hover:scale-[1.02] hover:border-brand-500 hover:shadow-lg sm:col-span-2 lg:col-span-1 h-full"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
              <IconResultados />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Resultados Electorales
            </h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">
              Explora resultados por partido, candidato y corporación para cada año electoral.
            </p>

            {/* Inline year selector */}
            <div
              className="mt-4 w-full max-w-[180px]"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm font-medium text-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 [text-align-last:center]"
              >
                {RESULT_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <span className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 group-hover:bg-brand-900">
              Consultar
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </button>
        </div>
      </main>
    </div>
  );
}
