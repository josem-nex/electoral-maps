import { departmentCodeFromFeature } from "./territory";

export const COMPACT_ARCHIPELAGO_DEPARTMENT_CODE = "56";
const COMPACT_ARCHIPELAGO_SCALE = 5;
const COMPACT_ARCHIPELAGO_NORTHERN_THRESHOLD = 0.45;
const COMPACT_ARCHIPELAGO_NORTHERN_DOWN_SHIFT = 0.55;

const COMPACT_ARCHIPELAGO_TARGET = {
  lat: 11.8,
  lng: -77.35,
};

type Bounds = {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
};

function updateBoundsFromNode(node: unknown, bounds: Bounds | null): Bounds | null {
  if (!Array.isArray(node)) {
    return bounds;
  }

  if (
    node.length >= 2 &&
    typeof node[0] === "number" &&
    typeof node[1] === "number"
  ) {
    const lng = node[0];
    const lat = node[1];
    if (!bounds) {
      return {
        minLng: lng,
        maxLng: lng,
        minLat: lat,
        maxLat: lat,
      };
    }
    return {
      minLng: Math.min(bounds.minLng, lng),
      maxLng: Math.max(bounds.maxLng, lng),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    };
  }

  return node.reduce<Bounds | null>(
    (currentBounds, child) => updateBoundsFromNode(child, currentBounds),
    bounds,
  );
}

function featureCenter(feature: any): { lat: number; lng: number } | null {
  const bounds = updateBoundsFromNode(feature?.geometry?.coordinates, null);
  if (!bounds) {
    return null;
  }

  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

function translateCoordinateNode(
  node: unknown,
  centerLng: number,
  centerLat: number,
  scale: number,
  deltaLng: number,
  deltaLat: number,
): unknown {
  if (!Array.isArray(node)) {
    return node;
  }

  if (
    node.length >= 2 &&
    typeof node[0] === "number" &&
    typeof node[1] === "number"
  ) {
    const [lng, lat, ...rest] = node;
    const scaledLng = centerLng + (lng - centerLng) * scale;
    const scaledLat = centerLat + (lat - centerLat) * scale;
    return [scaledLng + deltaLng, scaledLat + deltaLat, ...rest];
  }

  return node.map((child) =>
    translateCoordinateNode(
      child,
      centerLng,
      centerLat,
      scale,
      deltaLng,
      deltaLat,
    ),
  );
}

function shiftLatitudeNode(node: unknown, latDelta: number): unknown {
  if (!Array.isArray(node)) {
    return node;
  }

  if (
    node.length >= 2 &&
    typeof node[0] === "number" &&
    typeof node[1] === "number"
  ) {
    const [lng, lat, ...rest] = node;
    return [lng, lat + latDelta, ...rest];
  }

  return node.map((child) => shiftLatitudeNode(child, latDelta));
}

function adjustNorthernArchipelagoGeometry(geometry: any, referenceLat: number): any {
  if (geometry?.type !== "MultiPolygon" || !Array.isArray(geometry?.coordinates)) {
    return geometry;
  }

  return {
    ...geometry,
    coordinates: geometry.coordinates.map((polygon: unknown) => {
      const bounds = updateBoundsFromNode(polygon, null);
      if (!bounds) {
        return polygon;
      }

      const polygonCenterLat = (bounds.minLat + bounds.maxLat) / 2;
      const isNorthernIsland =
        polygonCenterLat > referenceLat + COMPACT_ARCHIPELAGO_NORTHERN_THRESHOLD;

      if (!isNorthernIsland) {
        return polygon;
      }

      return shiftLatitudeNode(polygon, -COMPACT_ARCHIPELAGO_NORTHERN_DOWN_SHIFT);
    }),
  };
}

function translateFeature(
  feature: any,
  centerLng: number,
  centerLat: number,
  scale: number,
  deltaLng: number,
  deltaLat: number,
): any {
  if (!feature?.geometry?.coordinates) {
    return feature;
  }

  const translatedGeometry = {
    ...feature.geometry,
    coordinates: translateCoordinateNode(
      feature.geometry.coordinates,
      centerLng,
      centerLat,
      scale,
      deltaLng,
      deltaLat,
    ),
  };

  return {
    ...feature,
    geometry: adjustNorthernArchipelagoGeometry(
      translatedGeometry,
      COMPACT_ARCHIPELAGO_TARGET.lat,
    ),
  };
}

export function compactArchipelagoFeatureCollection<T extends { features?: any[] }>(
  featureCollection: T | null | undefined,
  enabled: boolean,
): T | null {
  if (!featureCollection) {
    return null;
  }

  if (!enabled) {
    return featureCollection;
  }

  const archipelagoFeature = (featureCollection.features ?? []).find(
    (feature) =>
      departmentCodeFromFeature(feature) === COMPACT_ARCHIPELAGO_DEPARTMENT_CODE,
  );

  if (!archipelagoFeature) {
    return featureCollection;
  }

  const center = featureCenter(archipelagoFeature);
  if (!center) {
    return featureCollection;
  }

  const deltaLng = COMPACT_ARCHIPELAGO_TARGET.lng - center.lng;
  const deltaLat = COMPACT_ARCHIPELAGO_TARGET.lat - center.lat;

  return {
    ...featureCollection,
    features: (featureCollection.features ?? []).map((feature) =>
      departmentCodeFromFeature(feature) === COMPACT_ARCHIPELAGO_DEPARTMENT_CODE
        ? translateFeature(
          feature,
          center.lng,
          center.lat,
          COMPACT_ARCHIPELAGO_SCALE,
          deltaLng,
          deltaLat,
        )
        : feature,
    ),
  };
}
