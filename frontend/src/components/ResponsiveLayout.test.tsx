import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SearchBar } from "./SearchBar";
import { MapInfoRail } from "./MapInfoRail";
import { TeritorioStatsPanel } from "./TeritorioStatsPanel";

describe("Responsive and touch-friendly layout", () => {
  it("mantiene SearchBar con altura táctil amplia", () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText("Buscar departamento o municipio...");
    expect(input.className).toContain("h-14");
    expect(input.className).toContain("text-lg");
  });

  it("mantiene placeholder del rail oculto en móvil y visible en desktop", () => {
    render(
      <MapInfoRail
        currentJurisdiccion={{
          id: "colombia",
          layer: "pais",
          name: "Colombia",
          code: "CO",
          center_lat: 4.5709,
          center_lon: -74.2973,
          zoom: 6,
        }}
        selectedPuesto={null}
        selectedPuestoTerritory={null}
        territorioStats={null}
        territorioStatsLoading={false}
        territorioStatsError={false}
        territorioTipo={null}
        selectedTerritoryName={null}
        selectedTerritoryCode={null}
        selectedTerritoryIntegrityError={false}
        onClosePuesto={() => undefined}
        onCloseTerritorio={() => undefined}
      />,
    );

    const placeholder = screen.getByTestId("desktop-info-placeholder");
    expect(placeholder.className).toContain("hidden");
    expect(placeholder.className).toContain("lg:flex");
  });

  it("mantiene panel de estadísticas en modo rail con fallback móvil + desktop", () => {
    const { container } = render(
      <TeritorioStatsPanel
        stats={{
          tipo: "pais",
          codigo: "CO",
          nombre: "Colombia",
          puestos_count: 13527,
          mesas_sum: 0,
          total_sum: 0,
          mujeres_sum: 0,
          hombres_sum: 0,
        }}
        loading={false}
        error={false}
        tipo="pais"
        onClose={() => undefined}
        layout="rail"
      />,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-x-3");
    expect(root.className).toContain("bottom-3");
    expect(root.className).toContain("lg:relative");
    expect(root.className).toContain("lg:inset-auto");
  });
});
