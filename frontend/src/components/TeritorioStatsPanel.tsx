import type { TerritorioStats } from "../api/client";
import { SkeletonLoader } from "./SkeletonLoader";

interface TeritorioStatsPanelProps {
  stats: TerritorioStats | null;
  loading: boolean;
  error: boolean;
  tipo: "pais" | "zona" | "departamento" | "municipio" | null;
  displayName?: string | null;
  displayCode?: string | null;
  integrityError?: boolean;
  onClose: () => void;
  layout?: "floating" | "rail";
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 uppercase tracking-wide">{label}</span>
      <span className="text-lg font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function GenderBar({ mujeres, hombres }: { mujeres: number; hombres: number }) {
  const total = mujeres + hombres;
  if (total === 0) return null;
  const pctMujeres = Math.round((mujeres / total) * 100);
  const pctHombres = 100 - pctMujeres;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Mujeres</span>
        <span>Hombres</span>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-l-full bg-pink-400 transition-all duration-300"
          style={{ width: `${pctMujeres}%` }}
        />
        <div
          className="h-full rounded-r-full bg-blue-400 transition-all duration-300"
          style={{ width: `${pctHombres}%` }}
        />
      </div>
      <div className="flex justify-between text-xs font-medium mt-1">
        <span className="text-pink-600">{pctMujeres}%</span>
        <span className="text-blue-600">{pctHombres}%</span>
      </div>
    </div>
  );
}

export function TeritorioStatsPanel({
  stats,
  loading,
  error,
  tipo,
  displayName,
  displayCode,
  integrityError = false,
  onClose,
  layout = "floating",
}: TeritorioStatsPanelProps) {
  if (!loading && !error && !stats) return null;

  const isRailLayout = layout === "rail";

  const tipoLabel =
    tipo === "pais"
      ? "País"
      : tipo === "zona"
        ? "Zona"
        : tipo === "departamento"
          ? "Departamento"
          : "Municipio";

  return (
    <div
      className={
        isRailLayout
          ? "relative w-full overflow-y-auto rounded-2xl bg-white shadow-md lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col lg:max-h-none lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xl"
          : "absolute top-4 right-4 z-[1000] max-h-[90vh] w-72 overflow-y-auto rounded-xl bg-white shadow-xl"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-gray-100 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-brand-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {tipoLabel} seleccionado
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 transition-colors duration-200 hover:text-gray-700"
          aria-label="Cerrar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-5">
        {loading && <SkeletonLoader />}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <span className="text-2xl">⚠️</span>
            <span className="text-sm text-gray-500">
              No fue posible cargar las estadísticas del territorio.
            </span>
          </div>
        )}

        {stats && !loading && (
          <>
            {integrityError && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Se detectó una inconsistencia entre el ID territorial
                seleccionado y sus metadatos. Se muestra la resolución canónica
                disponible.
              </div>
            )}

            {/* Nombre del territorio */}
            {(displayName || stats.nombre) && (
              <div className="mb-5">
                <p className="text-2xl font-bold text-gray-900">
                  {displayName || stats.nombre}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Código: {displayCode || stats.codigo}
                </p>
              </div>
            )}

            {/* Métricas */}
            <div>
              <StatRow
                label="Puestos electorales"
                value={stats.puestos_count > 0 ? stats.puestos_count.toLocaleString() : "—"}
              />
              <StatRow
                label="Mesas"
                value={
                  stats.mesas_sum > 0 ? stats.mesas_sum.toLocaleString() : "—"
                }
              />
              <StatRow
                label="Potencial electoral"
                value={
                  stats.total_sum > 0 ? stats.total_sum.toLocaleString() : "—"
                }
              />
              <StatRow
                label="Mujeres"
                value={
                  stats.mujeres_sum > 0
                    ? stats.mujeres_sum.toLocaleString()
                    : "—"
                }
              />
              <StatRow
                label="Hombres"
                value={
                  stats.hombres_sum > 0
                    ? stats.hombres_sum.toLocaleString()
                    : "—"
                }
              />
            </div>

            {/* Gender distribution bar */}
            {stats.mujeres_sum > 0 && stats.hombres_sum > 0 && (
              <GenderBar mujeres={stats.mujeres_sum} hombres={stats.hombres_sum} />
            )}

            {stats.puestos_count === 0 && (
              <p className="mt-4 text-center text-sm text-gray-400">
                Sin datos de puestos registrados para este territorio.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
