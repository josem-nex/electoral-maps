import { describe, expect, it } from "vitest";
import { compactArchipelagoFeatureCollection } from "./mapGeometry";

function polygon(lng: number, lat: number) {
  return {
    type: "Polygon",
    coordinates: [
      [
        [lng, lat],
        [lng + 0.2, lat],
        [lng + 0.2, lat + 0.2],
        [lng, lat + 0.2],
        [lng, lat],
      ],
    ],
  };
}

function polygonCenterLat(polygonCoordinates: number[][][]) {
  const latitudes = polygonCoordinates[0].map((point) => point[1]);
  return (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
}

describe("compactArchipelagoFeatureCollection", () => {
  it("no modifica nada cuando está deshabilitado", () => {
    const data = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { canonical_id: "56" },
          geometry: polygon(-81.6, 12.4),
        },
      ],
    };

    const result = compactArchipelagoFeatureCollection(data, false);
    expect(result).toBe(data);
  });

  it("mueve solo el archipiélago y conserva otros features", () => {
    const mainland = {
      type: "Feature",
      properties: { canonical_id: "05" },
      geometry: polygon(-75.6, 6.2),
    };

    const archipelago = {
      type: "Feature",
      properties: { canonical_id: "56" },
      geometry: polygon(-81.8, 12.5),
    };

    const data = {
      type: "FeatureCollection",
      features: [mainland, archipelago],
    };

    const result = compactArchipelagoFeatureCollection(data, true);
    expect(result).not.toBeNull();
    expect(result).not.toBe(data);
    expect(result?.features?.length).toBe(2);

    const movedMainland = result?.features?.[0];
    const movedArchipelago = result?.features?.[1];

    expect(movedMainland).toBe(mainland);
    expect(movedArchipelago).toBeDefined();
    expect(movedArchipelago!.properties.canonical_id).toBe("56");

    const originalArchCoord = archipelago.geometry.coordinates[0][0];
    const movedArchCoord = movedArchipelago!.geometry.coordinates[0][0];

    expect(movedArchCoord[0]).not.toBe(originalArchCoord[0]);
    expect(movedArchCoord[1]).not.toBe(originalArchCoord[1]);

    const originalWidth =
      archipelago.geometry.coordinates[0][1][0] -
      archipelago.geometry.coordinates[0][0][0];
    const movedWidth =
      movedArchipelago!.geometry.coordinates[0][1][0] -
      movedArchipelago!.geometry.coordinates[0][0][0];

    expect(movedWidth).toBeGreaterThan(originalWidth * 4.8);
    expect(movedWidth).toBeLessThan(originalWidth * 5.2);
  });

  it("desplaza hacia abajo la isla superior tras compactar", () => {
    const archipelago = {
      type: "Feature",
      properties: { canonical_id: "56" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-81.7, 12.0],
              [-81.5, 12.0],
              [-81.5, 12.2],
              [-81.7, 12.2],
              [-81.7, 12.0],
            ],
          ],
          [
            [
              [-81.9, 12.8],
              [-81.7, 12.8],
              [-81.7, 13.0],
              [-81.9, 13.0],
              [-81.9, 12.8],
            ],
          ],
        ],
      },
    };

    const data = {
      type: "FeatureCollection",
      features: [archipelago],
    };

    const result = compactArchipelagoFeatureCollection(data, true);
    const moved = result?.features?.[0];
    expect(moved).toBeDefined();

    const movedCoordinates = moved?.geometry?.coordinates;
    expect(Array.isArray(movedCoordinates)).toBe(true);

    const lowerPolygon = movedCoordinates![0][0] as number[][];
    const upperPolygon = movedCoordinates![1][0] as number[][];

    const lowerCenterLat = polygonCenterLat([lowerPolygon]);
    const upperCenterLat = polygonCenterLat([upperPolygon]);
    const movedGap = upperCenterLat - lowerCenterLat;

    expect(movedGap).toBeGreaterThan(3.2);
    expect(movedGap).toBeLessThan(3.8);
    expect(upperCenterLat).toBeLessThan(13.4);
  });
});
