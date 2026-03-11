import type { TerritorioStats } from "../api/client";

interface TeritorioStatsPanelProps {
  stats: TerritorioStats | null;
  loading: boolean;
  error: boolean;
  tipo: "pais" | "zona" | "departamento" | "municipio" | null;
  onClose: () => void;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export function TeritorioStatsPanel({
  stats,
  loading,
  error,
  tipo,
  onClose,
}: TeritorioStatsPanelProps) {
  if (!loading && !error && !stats) return null;

  const tipoLabel =
    tipo === "pais"
      ? "País"
      : tipo === "zona"
        ? "Zona"
        : tipo === "departamento"
          ? "Departamento"
          : "Municipio";

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-xl shadow-xl w-72 max-h-[90vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-700 to-blue-600 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-200" />
          <h2 className="text-sm font-semibold text-white">
            {tipoLabel} seleccionado
          </h2>
        </div>
        <button
          onClick={onClose}
          className="text-blue-200 hover:text-white transition-colors text-lg leading-none"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>

      <div className="px-4 py-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-400">
              Cargando estadísticas…
            </span>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
            <span className="text-2xl">⚠️</span>
            <span className="text-xs text-gray-500">
              No fue posible cargar las estadísticas del territorio.
            </span>
          </div>
        )}

        {stats && !loading && (
          <>
            {/* Nombre del territorio */}
            {stats.nombre && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-0.5">
                  {tipoLabel}
                </p>
                <p className="text-base font-bold text-gray-800">
                  {stats.nombre}
                </p>
                <p className="text-xs text-gray-400">Código: {stats.codigo}</p>
              </div>
            )}

            {/* Estadísticas principales */}
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <p className="text-xs uppercase tracking-wide text-blue-600 mb-1 font-semibold">
                Cobertura electoral
              </p>
              <div className="text-2xl font-bold text-blue-700">
                {stats.puestos_count.toLocaleString()}
              </div>
              <p className="text-xs text-blue-500">
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
              <p className="text-xs text-center text-gray-400 mt-4">
                Sin datos de puestos registrados para este territorio.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
