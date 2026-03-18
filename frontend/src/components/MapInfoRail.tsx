import type { PuestoElectoral, TerritorioStats } from "../api/client";
import type { Jurisdiccion } from "../stores/navigationStore";
import { PuestoDetailPanel } from "./PuestoDetailPanel";
import { TeritorioStatsPanel } from "./TeritorioStatsPanel";

interface PuestoTerritoryContext {
  municipio: string | null;
  departamento: string | null;
  integrityError: boolean;
}

interface MapInfoRailProps {
  currentJurisdiccion: Jurisdiccion | null;
  selectedPuesto: PuestoElectoral | null;
  selectedPuestoTerritory: PuestoTerritoryContext | null;
  territorioStats: TerritorioStats | null;
  territorioStatsLoading: boolean;
  territorioStatsError: boolean;
  territorioTipo: "pais" | "zona" | "departamento" | "municipio" | null;
  selectedTerritoryName: string | null;
  selectedTerritoryCode: string | null;
  selectedTerritoryIntegrityError: boolean;
  onClosePuesto: () => void;
  onCloseTerritorio: () => void;
}

function layerLabel(layer?: Jurisdiccion["layer"] | null): string {
  switch (layer) {
    case "pais":
      return "País";
    case "zonas":
      return "Zona";
    case "departamentos":
      return "Departamento";
    case "municipio":
      return "Municipio";
    case "localidad":
      return "Localidad";
    case "puesto":
      return "Puesto";
    default:
      return "Territorio";
  }
}

export function MapInfoRail({
  currentJurisdiccion,
  selectedPuesto,
  selectedPuestoTerritory,
  territorioStats,
  territorioStatsLoading,
  territorioStatsError,
  territorioTipo,
  selectedTerritoryName,
  selectedTerritoryCode,
  selectedTerritoryIntegrityError,
  onClosePuesto,
  onCloseTerritorio,
}: MapInfoRailProps) {
  const currentContextLabel = currentJurisdiccion
    ? `${layerLabel(currentJurisdiccion.layer)} activo`
    : "Contexto territorial";

  return (
    <div className="contents lg:block lg:h-full lg:min-h-0">
      {selectedPuesto ? (
        <PuestoDetailPanel
          puesto={selectedPuesto}
          territoryContext={selectedPuestoTerritory}
          onClose={onClosePuesto}
          layout="rail"
        />
      ) : territorioStatsLoading || territorioStatsError || territorioStats ? (
        <TeritorioStatsPanel
          stats={territorioStats}
          loading={territorioStatsLoading}
          error={territorioStatsError}
          tipo={territorioTipo}
          displayName={selectedTerritoryName}
          displayCode={selectedTerritoryCode}
          integrityError={selectedTerritoryIntegrityError}
          onClose={onCloseTerritorio}
          layout="rail"
        />
      ) : (
        <div
          className="hidden h-full min-h-0 lg:flex lg:flex-col lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:shadow-sm"
          data-testid="desktop-info-placeholder"
        >
          <div className="border-b border-slate-200 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
              Panel lateral disponible
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              Información territorial
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {currentContextLabel}
              {currentJurisdiccion?.name
                ? ` · ${currentJurisdiccion.name}`
                : ""}
            </p>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-medium text-slate-900">Qué aparecerá aquí</p>
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>Estadísticas del territorio seleccionado.</li>
                <li>Detalle del puesto cuando selecciones un marcador.</li>
                <li>Espacio reservado para información futura.</li>
              </ul>
            </div>

            <div>
              <p className="font-medium text-slate-900">Sugerencia</p>
              <p className="mt-2 leading-6">
                Navega por zonas, departamentos o municipios para poblar este
                rail. El mapa queda libre en la mitad izquierda para priorizar
                lectura territorial.
              </p>
            </div>

            {selectedTerritoryCode && (
              <div className="rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-500">
                Último código territorial resuelto: {selectedTerritoryCode}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
