import type { TerritorioStats } from "../api/client";

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
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-base text-gray-500">{label}</span>
      <span className="text-base font-semibold text-gray-800">{value}</span>
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
          ? "fixed inset-x-3 bottom-3 z-[1000] max-h-[calc(100vh-1.5rem)] overflow-y-auto rounded-2xl bg-white shadow-2xl lg:relative lg:inset-auto lg:flex lg:h-full lg:min-h-0 lg:w-full lg:flex-col lg:max-h-none lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xl"
          : "absolute top-4 right-4 z-[1000] max-h-[90vh] w-72 overflow-y-auto rounded-xl bg-white shadow-xl"
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-gradient-to-r from-blue-700 to-blue-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
          <h2 className="text-base font-semibold text-white">
            {tipoLabel} seleccionado
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-xl leading-none text-blue-200 transition-colors hover:text-white"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-400">
              Cargando estadísticas…
            </span>
          </div>
        )}

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
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Se detectó una inconsistencia entre el ID territorial
                seleccionado y sus metadatos. Se muestra la resolución canónica
                disponible.
              </div>
            )}
            {/* Nombre del territorio */}
            {(displayName || stats.nombre) && (
              <div className="mb-4">
                <p className="text-xl font-bold text-gray-800">
                  {displayName || stats.nombre}
                </p>
                <p className="text-sm text-gray-400">
                  Código: {displayCode || stats.codigo}
                </p>
              </div>
            )}

            {/* Estadísticas principales */}
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-blue-600">
                Cobertura electoral
              </p>
              <div className="text-3xl font-bold text-blue-700">
                {stats.puestos_count.toLocaleString()}
              </div>
              <p className="text-sm text-blue-500">
                {stats.puestos_count === 1
                  ? "puesto electoral"
                  : "puestos electorales"}
              </p>
            </div>

            {/* Métricas detalladas */}
            <div className="divide-y divide-gray-100">
              <StatRow
                label="Mesas"
                value={
                  stats.mesas_sum > 0 ? stats.mesas_sum.toLocaleString() : "—"
                }
              />
              <StatRow
                label="Potencial electoral total"
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
