import type { PuestoElectoral } from "../api/client";

interface PuestoTerritoryContext {
  municipio: string | null;
  departamento: string | null;
  integrityError: boolean;
}

interface PuestoDetailPanelProps {
  puesto: PuestoElectoral | null;
  territoryContext?: PuestoTerritoryContext | null;
  onClose: () => void;
  layout?: "floating" | "rail";
}

export function PuestoDetailPanel({
  puesto,
  territoryContext,
  onClose,
  layout = "floating",
}: PuestoDetailPanelProps) {
  if (!puesto) return null;

  const isRailLayout = layout === "rail";

  const resolvedMunicipio = territoryContext?.municipio ?? puesto.municipio;
  const resolvedDepartamento =
    territoryContext?.departamento ?? puesto.departamento;
  const hasTerritoryIntegrityError = Boolean(territoryContext?.integrityError);

  return (
    <>
      {/* Overlay oscuro para móvil (solo en layout no-rail) */}
      {!isRailLayout && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 z-[999] md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={
          isRailLayout
            ? "relative w-full flex flex-col overflow-hidden bg-white shadow-md lg:h-full lg:min-h-0 lg:w-full lg:rounded-2xl lg:border lg:border-slate-200 lg:shadow-xl"
            : "fixed right-0 top-0 bottom-0 z-[1000] flex w-full flex-col overflow-hidden bg-white shadow-2xl md:bottom-4 md:right-4 md:top-4 md:w-96 md:rounded-lg"
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Puesto seleccionado</p>
            <h3 className="mt-0.5 font-semibold text-lg text-gray-900">
              Detalle del Puesto
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-all duration-200 hover:text-gray-700"
            aria-label="Cerrar panel"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Contenido con scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Nombre del puesto */}
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Nombre del Puesto
            </h4>
            <p className="text-lg font-semibold text-gray-900">
              {puesto.puesto}
            </p>
          </section>

          {/* Código */}
          <section>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Código
            </h4>
            <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded inline-block text-gray-700">
              {puesto.codigo_puesto}
            </p>
          </section>

          {/* Ubicación */}
          <section className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Ubicación Territorial
            </h4>
            {hasTerritoryIntegrityError && (
              <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Error de integridad territorial: no fue posible resolver la
                etiqueta canónica del territorio seleccionado.
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-start">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {resolvedMunicipio}
                  </p>
                  <p className="text-xs text-gray-500">
                    {resolvedDepartamento}
                  </p>
                </div>
              </div>

              {puesto.direccion && (
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  <p className="text-sm text-gray-700">{puesto.direccion}</p>
                </div>
              )}

              {puesto.comuna && (
                <div className="flex items-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-gray-400 mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                    />
                  </svg>
                  <p className="text-sm text-gray-700">
                    Comuna/Zona: {puesto.comuna}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Información Electoral */}
          <section className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Información Electoral
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {puesto.mesas !== null && puesto.mesas !== undefined && (
                <div className="bg-brand-50 rounded-xl p-3 border border-brand-100">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                    Mesas
                  </div>
                  <div className="text-xl font-bold text-brand-700">
                    {puesto.mesas}
                  </div>
                </div>
              )}

              {puesto.total !== null && puesto.total !== undefined && (
                <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                    Potencial Total
                  </div>
                  <div className="text-xl font-bold text-green-700">
                    {puesto.total.toLocaleString()}
                  </div>
                </div>
              )}

              {puesto.mujeres !== null && puesto.mujeres !== undefined && (
                <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                    Mujeres
                  </div>
                  <div className="text-lg font-semibold text-pink-700">
                    {puesto.mujeres.toLocaleString()}
                  </div>
                </div>
              )}

              {puesto.hombres !== null && puesto.hombres !== undefined && (
                <div className="bg-sky-50 rounded-xl p-3 border border-sky-100">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">
                    Hombres
                  </div>
                  <div className="text-lg font-semibold text-sky-700">
                    {puesto.hombres.toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Coordenadas */}
          <section className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Coordenadas Geográficas
            </h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Latitud:</span>
                <span className="font-mono font-medium text-gray-900">
                  {puesto.latitud.toFixed(6)}°
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="text-gray-600">Longitud:</span>
                <span className="font-mono font-medium text-gray-900">
                  {puesto.longitud.toFixed(6)}°
                </span>
              </div>
            </div>
          </section>

          {/* Información adicional (si está disponible) */}
          {((puesto as any).anio || (puesto as any).corporacion) && (
            <section className="pt-2 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Datos Electorales
              </h4>
              <div className="space-y-1 text-sm">
                {(puesto as any).anio && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Año:</span>
                    <span className="font-medium text-gray-900">
                      {(puesto as any).anio}
                    </span>
                  </div>
                )}
                {(puesto as any).corporacion && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Corporación:</span>
                    <span className="font-medium text-gray-900">
                      {(puesto as any).corporacion}
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-50 hover:text-gray-900"
          >
            Cerrar
          </button>
        </div>
      </div>
    </>
  );
}
