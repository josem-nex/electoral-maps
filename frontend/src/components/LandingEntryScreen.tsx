import { useState } from "react";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../../../data/images/image_fondo_colombia.jpg";
import companyLogo from "../../../data/images/LOGO FINAL E DAY TECH.png";
import colombiaFlag from "../../../data/images/image_download.png";

type LandingView = "puestos" | "jurados-testigos" | "resultados";

const RESULT_YEARS = [2018, 2019, 2022, 2023, 2026] as const;

export function LandingEntryScreen() {
  const [selectedView, setSelectedView] = useState<LandingView>("puestos");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedView === "puestos") {
      navigate("/puestos");
    } else if (selectedView === "jurados-testigos") {
      navigate("/jurados-testigos");
    } else if (selectedView === "resultados") {
      navigate(`/resultados/${selectedYear}`);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-50">
      <section className="relative h-[58vh] min-h-[360px] max-h-[620px] w-full overflow-hidden">
        <img
          src={backgroundImage}
          alt="Fondo institucional de Colombia"
          className="absolute inset-0 h-full w-full scale-105 object-cover object-[center_50%] blur-[2px]"
        />
        <div className="absolute inset-0 bg-blue-950/65" />

        <div className="absolute right-5 top-5 z-20 sm:right-8 sm:top-7">
          <img
            src={companyLogo}
            alt="Logo corporativo"
            className="h-24 w-auto rounded bg-white/90 px-3 py-2 shadow-lg sm:h-28"
          />
        </div>

        <div className="relative z-10 mx-auto flex h-full w-full flex-col items-center justify-end px-6 pb-8 text-center text-white sm:pb-10">
          <p className="text-sm font-semibold tracking-[0.3em] text-blue-100 sm:text-base">
            INFORMACIÓN ELECTORAL COLOMBIA
          </p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl lg:text-6xl">
            Plataforma de Consulta Territorial
          </h1>
        </div>
      </section>

      <main className="w-full px-4 pt-4 pb-10 sm:px-8 sm:pt-5 sm:pb-12 lg:px-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
          <div className="relative mb-8 flex items-center justify-center">
            <h2 className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl">
              Seleccione la vista de información
            </h2>
            <img
              src={colombiaFlag}
              alt="Bandera de Colombia"
              className="absolute right-0 top-1/2 h-10 w-auto -translate-y-1/2 rounded border border-slate-200 sm:h-11"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => setSelectedView("puestos")}
              className={`flex min-h-[96px] items-center justify-center rounded-xl border px-6 py-7 text-center transition ${
                selectedView === "puestos"
                  ? "border-blue-700 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-lg font-semibold text-slate-900 sm:text-xl">
                INFORMACIÓN PUESTOS
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedView("jurados-testigos")}
              className={`flex min-h-[96px] items-center justify-center rounded-xl border px-6 py-7 text-center transition ${
                selectedView === "jurados-testigos"
                  ? "border-blue-700 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-lg font-semibold text-slate-900 sm:text-xl">
                JURADOS Y TESTIGOS
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedView("resultados")}
              className={`flex min-h-[96px] items-center justify-center rounded-xl border px-6 py-7 text-center transition ${
                selectedView === "resultados"
                  ? "border-blue-700 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-lg font-semibold text-slate-900 sm:text-xl">
                RESULTADOS ELECTORALES
              </p>
            </button>
          </div>

          {selectedView === "resultados" && (
            <div className="mt-7 flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 p-6 sm:p-7">
              <div className="flex w-full max-w-md flex-col items-center gap-3 text-center">
                <label
                  htmlFor="year-selector"
                  className="text-lg font-semibold text-slate-700"
                >
                  Año de resultados
                </label>
                <select
                  id="year-selector"
                  value={selectedYear}
                  onChange={(event) =>
                    setSelectedYear(Number(event.target.value))
                  }
                  className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-4 py-3 text-center text-lg text-slate-900 [text-align-last:center]"
                >
                  {RESULT_YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="mt-24 flex items-center justify-center">
          <button
            type="button"
            onClick={handleContinue}
            className="rounded-xl bg-blue-700 px-14 py-6 text-2xl font-semibold text-white transition hover:bg-blue-800"
          >
            Entrar
          </button>
        </div>
      </main>
    </div>
  );
}
