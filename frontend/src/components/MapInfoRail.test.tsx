import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MapInfoRail } from "./MapInfoRail";

afterEach(() => {
  cleanup();
});

vi.mock("./PuestoDetailPanel", () => ({
  PuestoDetailPanel: () => <div data-testid="puesto-panel">Puesto Panel</div>,
}));

vi.mock("./TeritorioStatsPanel", () => ({
  TeritorioStatsPanel: () => (
    <div data-testid="stats-panel">Territorio Stats Panel</div>
  ),
}));

const baseProps = {
  currentJurisdiccion: {
    id: "colombia",
    layer: "pais" as const,
    name: "Colombia",
    code: "CO",
    center_lat: 4.5709,
    center_lon: -74.2973,
    zoom: 5.2,
  },
  selectedPuesto: null,
  selectedPuestoTerritory: null,
  territorioStats: null,
  territorioStatsLoading: false,
  territorioStatsError: false,
  territorioTipo: "pais" as const,
  selectedTerritoryName: null,
  selectedTerritoryCode: null,
  selectedTerritoryIntegrityError: false,
  onClosePuesto: () => undefined,
  onCloseTerritorio: () => undefined,
};

describe("MapInfoRail", () => {
  it("prioriza detalle de puesto sobre stats", () => {
    render(
      <MapInfoRail
        {...baseProps}
        selectedPuesto={{
          codigo_puesto: "P001",
          departamento_codigo: "05",
          municipio_codigo: "05001",
          departamento: "Antioquia",
          municipio: "Medellín",
          puesto: "Puesto Centro",
          latitud: 6.25184,
          longitud: -75.56359,
        }}
        territorioStats={{
          tipo: "pais",
          codigo: "CO",
          puestos_count: 1,
          mesas_sum: 1,
          total_sum: 1,
          mujeres_sum: 1,
          hombres_sum: 1,
        }}
      />,
    );

    expect(screen.queryByTestId("puesto-panel")).not.toBeNull();
    expect(screen.queryByTestId("stats-panel")).toBeNull();
  });

  it("muestra panel de stats cuando no hay puesto seleccionado", () => {
    render(
      <MapInfoRail
        {...baseProps}
        territorioStats={{
          tipo: "pais",
          codigo: "CO",
          puestos_count: 10,
          mesas_sum: 20,
          total_sum: 30,
          mujeres_sum: 15,
          hombres_sum: 15,
        }}
      />,
    );

    expect(screen.queryByTestId("stats-panel")).not.toBeNull();
    expect(screen.queryByTestId("puesto-panel")).toBeNull();
  });

  it("renderiza placeholder cuando no hay panel activo", () => {
    render(<MapInfoRail {...baseProps} />);
    expect(screen.queryByTestId("desktop-info-placeholder")).not.toBeNull();
  });
});
