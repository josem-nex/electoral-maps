import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigationStore } from "../stores/navigationStore";
import { api } from "../api/client";
import type { PuestoElectoral, TerritorioStats } from "../api/client";
import type { Jurisdiccion } from "../stores/navigationStore";
import { PuestoDetailPanel } from "./PuestoDetailPanel";
import { TeritorioStatsPanel } from "./TeritorioStatsPanel";
import {
  departmentCodeFromFeature,
  departmentNameFromFeature,
  municipalityCodeFromFeature,
  municipalityNameFromFeature,
  normalizeDepartmentCode,
  normalizeMunicipioCode,
  type CanonicalTerritorySelection,
} from "../utils/territory";

// Fix for default marker icons in webpack
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapControllerProps {
  center: [number, number];
  zoom: number;
  selectedDepartmentCode: string | null;
  selectedMunicipioCode: string | null;
  departmentGeoJSON: any;
  municipiosGeoJSON: any;
  isInDepartmentView: boolean;
  isConsuladosDepartmentView: boolean;
  selectedZoneId: number | null;
  zoneByDepartmentCode: Map<string, ZonaGroup>;
}

interface ZonaGroup {
  id: number;
  name: string;
  departmentCodes: string[];
}

interface ConsuladoMunicipioOption {
  code: string;
  name: string;
  puestosCount: number;
}

const CONSULADOS_DEPARTMENT_CODE = "88";
const CONSULADOS_VIEW_ID = "dept:88-consulados";
const COLOMBIA_CENTER: [number, number] = [4.5709, -74.2973];

const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-4.4, -81.85],
  [13.6, -66.7],
];

function isLikelyColombiaCenter(lat: number, lng: number): boolean {
  return lat >= -6 && lat <= 15 && lng >= -83 && lng <= -65;
}

function MapController({
  center,
  zoom,
  selectedDepartmentCode,
  selectedMunicipioCode,
  departmentGeoJSON,
  municipiosGeoJSON,
  isInDepartmentView,
  isConsuladosDepartmentView,
  selectedZoneId,
  zoneByDepartmentCode,
}: MapControllerProps) {
  const map = useMap();

  useEffect(() => {
    if (isConsuladosDepartmentView) {
      map.setView(center, zoom);
      return;
    }
    // Skip setView when a dept or municipality is selected — fitBounds handles
    // positioning in those cases, and having both animate causes conflicts.
    if (selectedMunicipioCode || selectedDepartmentCode) return;
    map.setView(center, zoom);
  }, [
    center,
    zoom,
    selectedMunicipioCode,
    selectedDepartmentCode,
    isConsuladosDepartmentView,
    map,
  ]);

  // Handle maxBounds based on view mode
  useEffect(() => {
    const colombiaBounds = L.latLngBounds(
      COLOMBIA_BOUNDS[0] as [number, number],
      COLOMBIA_BOUNDS[1] as [number, number],
    );
    if (isInDepartmentView) {
      // Use padded bounds for department view to allow centering border depts
      // pad(1.5) adds ~165km buffer around Colombia without showing too much world
      map.setMaxBounds(colombiaBounds.pad(1.5));
    } else {
      // Tight bounds in national view
      map.setMaxBounds(colombiaBounds);
    }
  }, [isInDepartmentView, map]);

  // Handle automatic zoom when a zone is selected
  useEffect(() => {
    if (!selectedZoneId || !departmentGeoJSON) return;

    const zoneFeatures = (departmentGeoJSON.features ?? []).filter((f: any) => {
      const code = departmentCodeFromFeature(f);
      if (!code) {
        return false;
      }
      return zoneByDepartmentCode.get(code)?.id === selectedZoneId;
    });
    if (zoneFeatures.length === 0) return;

    const geoJsonLayer = L.geoJSON({
      type: "FeatureCollection",
      features: zoneFeatures,
    } as any);
    const bounds = geoJsonLayer.getBounds();
    if (bounds.isValid()) {
      map.setMaxBounds(null as any);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
      const colombiaBounds = L.latLngBounds(
        COLOMBIA_BOUNDS[0] as [number, number],
        COLOMBIA_BOUNDS[1] as [number, number],
      );
      setTimeout(() => {
        map.setMaxBounds(colombiaBounds.pad(1.5));
      }, 400);
    }
  }, [selectedZoneId, departmentGeoJSON, zoneByDepartmentCode, map]);

  // Handle automatic zoom when department is selected
  useEffect(() => {
    if (isConsuladosDepartmentView) return;
    if (!selectedDepartmentCode || !departmentGeoJSON) return;

    const departmentFeature = departmentGeoJSON.features?.find(
      (feature: any) =>
        departmentCodeFromFeature(feature) === selectedDepartmentCode,
    );

    if (departmentFeature) {
      const geoJsonLayer = L.geoJSON(departmentFeature);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        const center = bounds.getCenter();
        if (!isLikelyColombiaCenter(center.lat, center.lng)) {
          return;
        }
        // Temporarily lift maxBounds so fitBounds is never clipped for
        // departments near Colombia's borders (e.g. Amazonas, Nariño, Guajira).
        map.setMaxBounds(null as any);
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 9 });
        // Restore generous padding once the animation settles (~350 ms).
        const colombiaBounds = L.latLngBounds(
          COLOMBIA_BOUNDS[0] as [number, number],
          COLOMBIA_BOUNDS[1] as [number, number],
        );
        setTimeout(() => {
          map.setMaxBounds(colombiaBounds.pad(1.5));
        }, 400);
      }
    }
  }, [
    selectedDepartmentCode,
    departmentGeoJSON,
    isConsuladosDepartmentView,
    map,
  ]);

  // Handle automatic zoom when municipality is selected from search
  useEffect(() => {
    if (!selectedMunicipioCode || !municipiosGeoJSON) return;

    const municipioFeature = municipiosGeoJSON.features?.find(
      (feature: any) =>
        municipalityCodeFromFeature(feature) === selectedMunicipioCode,
    );

    if (municipioFeature) {
      const geoJsonLayer = L.geoJSON(municipioFeature);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) {
        const center = bounds.getCenter();
        if (!isLikelyColombiaCenter(center.lat, center.lng)) {
          return;
        }
        // Same border-clipping fix as for departments.
        map.setMaxBounds(null as any);
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 });
        const colombiaBounds = L.latLngBounds(
          COLOMBIA_BOUNDS[0] as [number, number],
          COLOMBIA_BOUNDS[1] as [number, number],
        );
        setTimeout(() => {
          map.setMaxBounds(colombiaBounds.pad(1.5));
        }, 400);
      }
    }
  }, [selectedMunicipioCode, municipiosGeoJSON, map]);

  return null;
}

export function ElectoralMap() {
  const {
    currentJurisdiccion,
    navigateTo,
    navigateBack,
    reset,
    selectedMunicipioCode,
    setSelectedMunicipioCode,
  } = useNavigationStore();
  const [departamentosGeoJSON, setDepartamentosGeoJSON] = useState<any>(null);
  const [municipiosGeoJSON, setMunicipiosGeoJSON] = useState<any>(null);
  const [allDepartamentos, setAllDepartamentos] = useState<Jurisdiccion[]>([]);
  const [departamentos, setDepartamentos] = useState<Jurisdiccion[]>([]);
  const [puestos, setPuestos] = useState<PuestoElectoral[]>([]);
  const [selectedPuesto, setSelectedPuesto] = useState<PuestoElectoral | null>(
    null,
  );
  const [loadingCount, setLoadingCount] = useState(0);

  // Territory stats panel state
  const [territorioStats, setTerritorioStats] =
    useState<TerritorioStats | null>(null);
  const [territorioStatsLoading, setTerritorioStatsLoading] = useState(false);
  const [territorioStatsError, setTerritorioStatsError] = useState(false);
  const [territorioTipo, setTerritorioTipo] = useState<
    "pais" | "zona" | "departamento" | "municipio" | null
  >(null);
  const [consuladoMunicipios, setConsuladoMunicipios] = useState<
    ConsuladoMunicipioOption[]
  >([]);
  const [consuladoMunicipiosLoading, setConsuladoMunicipiosLoading] =
    useState(false);

  const beginMapLoading = useCallback(() => {
    setLoadingCount((count) => count + 1);
  }, []);

  const endMapLoading = useCallback(() => {
    setLoadingCount((count) => Math.max(0, count - 1));
  }, []);

  const loading = loadingCount > 0;

  // Ref to keep selectedMunicipioCode accessible in stale Leaflet closures
  const selectedMunicipioCodeRef = useRef<string | null>(selectedMunicipioCode);
  useEffect(() => {
    selectedMunicipioCodeRef.current = selectedMunicipioCode;
  }, [selectedMunicipioCode]);

  // Ref to the Leaflet GeoJSON layer so we can update styles without remounting
  const municipiosLayerRef = useRef<L.GeoJSON | null>(null);

  const center: [number, number] = currentJurisdiccion
    ? [currentJurisdiccion.center_lat, currentJurisdiccion.center_lon]
    : [4.5709, -74.2973];
  const zoom = currentJurisdiccion?.zoom || 5.2;
  const selectedDepartmentCode =
    currentJurisdiccion?.layer === "departamentos"
      ? normalizeDepartmentCode(currentJurisdiccion.code)
      : null;
  const isConsuladosDepartmentView =
    currentJurisdiccion?.layer === "departamentos" &&
    currentJurisdiccion.id === CONSULADOS_VIEW_ID;

  const openConsuladosView = () => {
    reset();
    setSelectedMunicipioCode(null);
    navigateTo({
      id: CONSULADOS_VIEW_ID,
      layer: "departamentos",
      name: "Consulados",
      code: CONSULADOS_DEPARTMENT_CODE,
      center_lat: COLOMBIA_CENTER[0],
      center_lon: COLOMBIA_CENTER[1],
      zoom: 5.2,
    });
  };

  const closeConsuladosView = () => {
    setSelectedMunicipioCode(null);
    navigateBack();
  };

  const zonas = useMemo<ZonaGroup[]>(() => {
    const byZone = new Map<number, ZonaGroup>();
    for (const dept of allDepartamentos) {
      const zoneId = dept.zone_id ?? 0;
      const zoneName = (dept.zone_name || "Sin zona").trim() || "Sin zona";
      const existing = byZone.get(zoneId);
      if (!existing) {
        byZone.set(zoneId, {
          id: zoneId,
          name: zoneName,
          departmentCodes: [dept.code],
        });
      } else {
        existing.departmentCodes.push(dept.code);
      }
    }

    return Array.from(byZone.values()).sort((a, b) => a.id - b.id);
  }, [allDepartamentos]);

  const selectedZoneId =
    currentJurisdiccion?.layer === "zonas"
      ? Number(currentJurisdiccion.code)
      : null;

  const loadingLabel = useMemo(() => {
    switch (currentJurisdiccion?.layer) {
      case "zonas":
        return "Actualizando departamentos de la zona";
      case "departamentos":
        return selectedDepartmentCode
          ? "Cargando municipios del departamento"
          : "Actualizando departamento";
      case "municipio":
      case "localidad":
        return "Cargando puestos electorales";
      default:
        return "Preparando mapa electoral";
    }
  }, [currentJurisdiccion?.layer, selectedDepartmentCode]);

  const zoneByDepartmentCode = useMemo(() => {
    const mapping = new Map<string, ZonaGroup>();
    for (const zona of zonas) {
      for (const code of zona.departmentCodes) {
        mapping.set(code, zona);
      }
    }
    return mapping;
  }, [zonas]);

  const departmentFeatureByCode = useMemo(() => {
    const mapping = new Map<string, any>();
    for (const feature of departamentosGeoJSON?.features ?? []) {
      const code = departmentCodeFromFeature(feature);
      if (code) {
        mapping.set(code, feature);
      }
    }
    return mapping;
  }, [departamentosGeoJSON]);

  const departmentNameByCode = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const [code, feature] of departmentFeatureByCode.entries()) {
      const name = departmentNameFromFeature(feature);
      if (name) {
        mapping.set(code, name);
      }
    }
    for (const dept of allDepartamentos) {
      const code = normalizeDepartmentCode(dept.code);
      const name = String(dept.name || "").trim();
      if (code && name && !mapping.has(code)) {
        mapping.set(code, name);
      }
    }

    if (!mapping.has(CONSULADOS_DEPARTMENT_CODE)) {
      mapping.set(CONSULADOS_DEPARTMENT_CODE, "CONSULADOS");
    }

    return mapping;
  }, [allDepartamentos, departmentFeatureByCode]);

  const municipioFeatureByCode = useMemo(() => {
    const mapping = new Map<string, any>();
    for (const feature of municipiosGeoJSON?.features ?? []) {
      const code = municipalityCodeFromFeature(feature);
      if (code) {
        mapping.set(code, feature);
      }
    }
    return mapping;
  }, [municipiosGeoJSON]);

  const municipioNameByCode = useMemo(() => {
    const mapping = new Map<string, string>();
    for (const [code, feature] of municipioFeatureByCode.entries()) {
      const name = municipalityNameFromFeature(feature);
      if (name) {
        mapping.set(code, name);
      }
    }
    for (const option of consuladoMunicipios) {
      if (option.code && option.name && !mapping.has(option.code)) {
        mapping.set(option.code, option.name);
      }
    }
    if (currentJurisdiccion?.layer === "municipio") {
      const currentMunicipioCode = normalizeMunicipioCode(
        currentJurisdiccion.code,
      );
      const currentMunicipioName = String(
        currentJurisdiccion.name || "",
      ).trim();
      if (
        currentMunicipioCode &&
        currentMunicipioName &&
        !mapping.has(currentMunicipioCode)
      ) {
        mapping.set(currentMunicipioCode, currentMunicipioName);
      }
    }
    return mapping;
  }, [
    consuladoMunicipios,
    currentJurisdiccion?.code,
    currentJurisdiccion?.layer,
    currentJurisdiccion?.name,
    municipioFeatureByCode,
  ]);

  const selectedTerritory = useMemo<CanonicalTerritorySelection | null>(() => {
    if (currentJurisdiccion?.layer === "municipio") {
      const canonicalId = normalizeMunicipioCode(currentJurisdiccion.code);
      return canonicalId ? { level: "municipio", canonicalId } : null;
    }
    if (selectedMunicipioCode) {
      return { level: "municipio", canonicalId: selectedMunicipioCode };
    }
    if (selectedDepartmentCode) {
      return { level: "departamento", canonicalId: selectedDepartmentCode };
    }
    return null;
  }, [
    currentJurisdiccion?.code,
    currentJurisdiccion?.layer,
    selectedDepartmentCode,
    selectedMunicipioCode,
  ]);

  const selectedTerritoryName = useMemo(() => {
    if (!selectedTerritory) {
      return null;
    }
    if (selectedTerritory.level === "departamento") {
      return departmentNameByCode.get(selectedTerritory.canonicalId) ?? null;
    }
    return municipioNameByCode.get(selectedTerritory.canonicalId) ?? null;
  }, [departmentNameByCode, municipioNameByCode, selectedTerritory]);

  const selectedTerritoryIntegrityError = useMemo(() => {
    if (!selectedTerritory) {
      return false;
    }
    if (selectedTerritory.level === "departamento") {
      return !departmentNameByCode.has(selectedTerritory.canonicalId);
    }
    return !municipioNameByCode.has(selectedTerritory.canonicalId);
  }, [departmentNameByCode, municipioNameByCode, selectedTerritory]);

  useEffect(() => {
    if (!selectedTerritory || !selectedTerritoryIntegrityError) {
      return;
    }
    console.error(
      "Territorial integrity error: unresolved canonical selection",
      selectedTerritory,
    );
  }, [selectedTerritory, selectedTerritoryIntegrityError]);

  const selectedPuestoTerritory = useMemo(() => {
    if (!selectedPuesto) {
      return null;
    }

    const municipioCode =
      selectedTerritory?.level === "municipio"
        ? selectedTerritory.canonicalId
        : normalizeMunicipioCode(selectedPuesto.municipio_codigo);
    const departamentoCode =
      selectedTerritory?.level === "departamento"
        ? selectedTerritory.canonicalId
        : (normalizeDepartmentCode(selectedPuesto.departamento_codigo) ??
          (municipioCode ? municipioCode.slice(0, 2) : null));

    const municipio = municipioCode
      ? (municipioNameByCode.get(municipioCode) ?? null)
      : null;
    const departamento = departamentoCode
      ? (departmentNameByCode.get(departamentoCode) ?? null)
      : null;

    return {
      municipio,
      departamento,
      integrityError: Boolean(
        (municipioCode && !municipio) || (departamentoCode && !departamento),
      ),
    };
  }, [
    departmentNameByCode,
    municipioNameByCode,
    selectedPuesto,
    selectedTerritory,
  ]);

  const filteredDepartamentosGeoJSON = useMemo(() => {
    if (!departamentosGeoJSON) {
      return null;
    }

    const allFeatures = departamentosGeoJSON.features ?? [];
    let filteredFeatures = allFeatures;

    if (currentJurisdiccion?.layer === "zonas" && selectedZoneId !== null) {
      filteredFeatures = allFeatures.filter((feature: any) => {
        const code = departmentCodeFromFeature(feature);
        if (!code) {
          return false;
        }
        return zoneByDepartmentCode.get(code)?.id === selectedZoneId;
      });
    }

    if (
      currentJurisdiccion?.layer === "departamentos" &&
      selectedDepartmentCode
    ) {
      filteredFeatures = allFeatures.filter(
        (feature: any) =>
          departmentCodeFromFeature(feature) === selectedDepartmentCode,
      );
    }

    return {
      ...departamentosGeoJSON,
      features: filteredFeatures,
    };
  }, [
    currentJurisdiccion?.layer,
    departamentosGeoJSON,
    selectedDepartmentCode,
    selectedZoneId,
    zoneByDepartmentCode,
  ]);

  // Load GeoJSON for departments
  useEffect(() => {
    let isActive = true;

    beginMapLoading();
    api
      .getDepartamentosGeoJSON()
      .then((data) => {
        if (isActive) {
          setDepartamentosGeoJSON(data);
        }
      })
      .catch((error) => {
        console.error("Error loading department GeoJSON:", error);
      })
      .finally(() => {
        endMapLoading();
      });

    return () => {
      isActive = false;
    };
  }, [beginMapLoading, endMapLoading]);

  // Load departments catalog once and reuse it for country/zone navigation
  useEffect(() => {
    let isActive = true;

    beginMapLoading();
    api
      .getDepartamentosCatalog()
      .then((data) => {
        if (isActive) {
          setAllDepartamentos(data);
        }
      })
      .catch((error) => {
        console.error("Error loading departments catalog:", error);
      })
      .finally(() => {
        endMapLoading();
      });

    return () => {
      isActive = false;
    };
  }, [beginMapLoading, endMapLoading]);

  // Load data based on current layer
  useEffect(() => {
    if (!currentJurisdiccion) return;

    let isActive = true;

    const loadData = async () => {
      let shouldTrackLoading = false;

      try {
        if (currentJurisdiccion.layer === "pais") {
          setDepartamentos([]);
          setMunicipiosGeoJSON(null);
          setPuestos([]);
          return;
        } else if (currentJurisdiccion.layer === "zonas") {
          const zoneId = Number(currentJurisdiccion.code);
          const deptsData = allDepartamentos.filter(
            (dept) => (dept.zone_id ?? 0) === zoneId,
          );
          if (isActive) {
            setDepartamentos(deptsData);
            setMunicipiosGeoJSON(null);
            setPuestos([]);
          }
          return;
        } else if (currentJurisdiccion.layer === "departamentos") {
          if (isConsuladosDepartmentView) {
            if (isActive) {
              setMunicipiosGeoJSON(null);
              setPuestos([]);
            }
            return;
          }

          shouldTrackLoading = true;
          beginMapLoading();

          if (selectedDepartmentCode) {
            // Clear first so the GeoJSON layer unmounts and remounts with the
            // new data, ensuring the selected-municipality style is applied
            // correctly even when switching between departments.
            if (isActive) {
              setMunicipiosGeoJSON(null);
            }
            const municipiosData = await api.getMunicipiosGeoJSON(
              selectedDepartmentCode,
            );
            if (isActive) {
              setMunicipiosGeoJSON(municipiosData);
            }
          } else {
            if (isActive) {
              setMunicipiosGeoJSON(null);
            }
          }
          if (isActive) {
            setPuestos([]);
          }
        } else if (currentJurisdiccion.layer === "municipio") {
          shouldTrackLoading = true;
          beginMapLoading();

          if (isActive) {
            setMunicipiosGeoJSON(null);
          }
          // Check if Bogota (has localidades)
          const children = await api.getJurisdiccionChildren(
            currentJurisdiccion.id,
          );
          if (children.length > 0) {
            // Has localidades
            if (isActive) {
              setDepartamentos([]);
              setPuestos([]);
            }
          } else {
            // Load puestos directly
            const parts = currentJurisdiccion.id.split(":");
            const munCode = parts[1];
            const puestosData = await api.getPuestos({
              departamento_codigo: munCode.slice(0, 2),
              municipio_codigo: munCode,
              limit: 2500,
            });
            if (isActive) {
              setPuestos(puestosData);
              setDepartamentos([]);
            }
          }
        } else if (currentJurisdiccion.layer === "localidad") {
          shouldTrackLoading = true;
          beginMapLoading();

          if (isActive) {
            setMunicipiosGeoJSON(null);
          }
          // Load puestos for this localidad
          const parts = currentJurisdiccion.id.split(":");
          const locCode = parts[1];
          const puestosData = await api.getPuestos({
            municipio_codigo: "11001",
            localidad_codigo: locCode,
            limit: 2500,
          });
          if (isActive) {
            setPuestos(puestosData);
            setDepartamentos([]);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        if (shouldTrackLoading) {
          endMapLoading();
        }
      }
    };

    loadData();
    return () => {
      isActive = false;
    };
    // Use primitive/stable values as deps to avoid re-fetching when navigateTo
    // replaces the currentJurisdiccion reference but the underlying data hasn't
    // changed (e.g. same department, different selected municipality).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentJurisdiccion?.id,
    currentJurisdiccion?.layer,
    currentJurisdiccion?.code,
    selectedDepartmentCode,
    allDepartamentos,
    beginMapLoading,
    endMapLoading,
  ]);

  useEffect(() => {
    if (!isConsuladosDepartmentView) {
      setConsuladoMunicipios([]);
      return;
    }

    let isActive = true;
    setConsuladoMunicipiosLoading(true);

    api
      .getPuestos({
        departamento_codigo: CONSULADOS_DEPARTMENT_CODE,
        limit: 2500,
      })
      .then((rows) => {
        if (!isActive) {
          return;
        }

        const byMunicipio = new Map<string, ConsuladoMunicipioOption>();
        for (const row of rows) {
          const municipioCode = normalizeMunicipioCode(row.municipio_codigo);
          if (
            !municipioCode ||
            !municipioCode.startsWith(CONSULADOS_DEPARTMENT_CODE)
          ) {
            continue;
          }

          const municipioName =
            String(row.municipio || "").trim() || municipioCode;
          const existing = byMunicipio.get(municipioCode);
          if (!existing) {
            byMunicipio.set(municipioCode, {
              code: municipioCode,
              name: municipioName,
              puestosCount: 1,
            });
          } else {
            existing.puestosCount += 1;
          }
        }

        const options = Array.from(byMunicipio.values()).sort((a, b) =>
          a.name.localeCompare(b.name, "es", { sensitivity: "base" }),
        );

        setConsuladoMunicipios(options);

        if (
          selectedMunicipioCode &&
          !options.some((option) => option.code === selectedMunicipioCode)
        ) {
          setSelectedMunicipioCode(null);
        }
      })
      .catch((error) => {
        console.error("Error loading consulados municipalities:", error);
        if (isActive) {
          setConsuladoMunicipios([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setConsuladoMunicipiosLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [
    isConsuladosDepartmentView,
    selectedMunicipioCode,
    setSelectedMunicipioCode,
  ]);

  // Update municipality styles imperatively when selection changes (avoids remounting)
  useEffect(() => {
    const layer = municipiosLayerRef.current as any;
    if (!layer || typeof layer.setStyle !== "function") return;
    layer.setStyle((feature: any) => municipioStyle(feature));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMunicipioCode]);

  // Load puestos when a municipio is selected from department view or search bar
  useEffect(() => {
    if (currentJurisdiccion?.layer !== "departamentos") return;
    if (isConsuladosDepartmentView) {
      setPuestos([]);
      setSelectedPuesto(null);
      return;
    }
    if (!selectedMunicipioCode) {
      setPuestos([]);
      setSelectedPuesto(null);
      return;
    }
    setSelectedPuesto(null);
    api
      .getPuestos({
        departamento_codigo: selectedDepartmentCode ?? undefined,
        municipio_codigo: selectedMunicipioCode,
        limit: 2500,
      })
      .then(setPuestos)
      .catch(console.error);
  }, [
    selectedMunicipioCode,
    selectedDepartmentCode,
    isConsuladosDepartmentView,
    currentJurisdiccion?.layer,
  ]);

  // Load aggregated territory statistics for the active territorial layer
  useEffect(() => {
    const layer = currentJurisdiccion?.layer;
    if (
      !layer ||
      !["pais", "zonas", "departamentos", "municipio"].includes(layer)
    ) {
      setTerritorioStats(null);
      setTerritorioStatsError(false);
      return;
    }

    let tipo: "pais" | "zona" | "departamento" | "municipio" | null = null;
    let codigo: string | null = null;

    if (layer === "pais") {
      tipo = "pais";
      codigo = "CO";
    } else if (layer === "zonas") {
      const zoneCode = currentJurisdiccion?.code?.trim();
      if (zoneCode) {
        tipo = "zona";
        codigo = zoneCode;
      }
    } else if (layer === "departamentos") {
      if (selectedMunicipioCode) {
        tipo = "municipio";
        codigo = selectedMunicipioCode;
      } else if (selectedDepartmentCode) {
        tipo = "departamento";
        codigo = selectedDepartmentCode;
      }
    } else if (layer === "municipio" && currentJurisdiccion?.id) {
      const parts = currentJurisdiccion.id.split(":");
      const munCode = parts[1];
      if (munCode) {
        tipo = "municipio";
        codigo = munCode;
      }
    }

    if (!tipo || !codigo) {
      setTerritorioStats(null);
      setTerritorioStatsError(false);
      return;
    }

    setTerritorioTipo(tipo);
    setTerritorioStatsLoading(true);
    setTerritorioStatsError(false);
    setTerritorioStats(null);

    api
      .getAnalyticsTerritorio(tipo, codigo)
      .then((data) => setTerritorioStats(data))
      .catch(() => setTerritorioStatsError(true))
      .finally(() => setTerritorioStatsLoading(false));
  }, [
    currentJurisdiccion?.layer,
    currentJurisdiccion?.id,
    currentJurisdiccion?.code,
    selectedDepartmentCode,
    selectedMunicipioCode,
  ]);

  const handleDepartmentClick = (feature: any) => {
    const deptCode = departmentCodeFromFeature(feature);
    const deptName =
      (deptCode ? departmentNameByCode.get(deptCode) : null) ??
      departmentNameFromFeature(feature) ??
      "Departamento";

    if (!deptCode) {
      console.error(
        "Territorial integrity error: department feature without canonical ID",
        feature,
      );
      return;
    }

    if (
      currentJurisdiccion?.layer === "departamentos" &&
      normalizeDepartmentCode(currentJurisdiccion.code) === deptCode
    ) {
      return;
    }

    // Find this department in the loaded data
    const dept = departamentos.find((d) => d.code === deptCode);
    if (dept) {
      setSelectedMunicipioCode(null);
      navigateTo(dept);
    } else {
      // Create jurisdiction on the fly
      const bounds = (L.geoJSON(feature) as any).getBounds();
      const center = bounds.getCenter();
      setSelectedMunicipioCode(null);
      navigateTo({
        id: `dept:${deptCode}`,
        layer: "departamentos",
        name: deptName,
        code: deptCode,
        center_lat: center.lat,
        center_lon: center.lng,
        zoom: 8.0,
      });
    }
  };

  const handleZoneClick = (feature: any) => {
    const deptCode = departmentCodeFromFeature(feature);
    if (!deptCode) {
      console.error(
        "Territorial integrity error: zone feature without canonical department ID",
        feature,
      );
      return;
    }
    const zone = zoneByDepartmentCode.get(deptCode);
    if (!zone) {
      return;
    }

    const zoneFeatures = (departamentosGeoJSON?.features ?? []).filter(
      (f: any) =>
        zone.departmentCodes.includes(departmentCodeFromFeature(f) ?? ""),
    );
    if (zoneFeatures.length === 0) {
      return;
    }

    const bounds = L.geoJSON({
      type: "FeatureCollection",
      features: zoneFeatures,
    } as any).getBounds();
    const center = bounds.getCenter();

    setSelectedMunicipioCode(null);
    navigateTo({
      id: `zone:${zone.id}`,
      layer: "zonas",
      name: zone.name,
      code: String(zone.id),
      center_lat: center.lat,
      center_lon: center.lng,
      zoom: 6.6,
    });
  };

  const zonePalette = [
    ["#0369a1", "#bae6fd"],
    ["#166534", "#bbf7d0"],
    ["#7c2d12", "#fed7aa"],
    ["#6b21a8", "#e9d5ff"],
    ["#92400e", "#fef08a"],
    ["#0f766e", "#99f6e4"],
    ["#1d4ed8", "#bfdbfe"],
    ["#be123c", "#fecdd3"],
  ] as const;

  const zoneStyleForDepartment = (deptCode: string): L.PathOptions => {
    const zone = zoneByDepartmentCode.get(deptCode);
    const zoneIndex = zone ? Math.abs(zone.id) % zonePalette.length : 0;
    const [stroke, fill] = zonePalette[zoneIndex];
    const isInSelectedZone = selectedZoneId
      ? zone?.id === selectedZoneId
      : false;

    return {
      color: stroke,
      weight: isInSelectedZone ? 3.4 : 2.2,
      opacity: 0.95,
      fillColor: fill,
      fillOpacity: isInSelectedZone ? 0.35 : 0.22,
    };
  };

  const getDepartmentStyle = (feature: any): L.PathOptions => {
    const deptCode = departmentCodeFromFeature(feature);

    if (!deptCode) {
      return {
        color: "#1d4ed8",
        weight: 2.4,
        opacity: 0.95,
        fillColor: "#93c5fd",
        fillOpacity: 0.12,
      };
    }

    if (currentJurisdiccion?.layer !== "departamentos") {
      return zoneStyleForDepartment(deptCode);
    }

    const isSelected = selectedDepartmentCode === deptCode;

    if (isSelected) {
      return {
        color: "#1e3a8a",
        weight: 4,
        opacity: 1,
        fillColor: "#60a5fa",
        fillOpacity: 0.22,
      };
    }

    return {
      color: "#1d4ed8",
      weight: 2.4,
      opacity: 0.95,
      fillColor: "#93c5fd",
      fillOpacity: 0.12,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const deptCode = departmentCodeFromFeature(feature);
    const zone = deptCode ? zoneByDepartmentCode.get(deptCode) : undefined;
    const currentLayer = currentJurisdiccion?.layer;

    layer.on({
      click: () => {
        if (currentLayer === "pais") {
          handleZoneClick(feature);
        } else if (currentLayer === "zonas") {
          handleDepartmentClick(feature);
        }
      },
      mouseover: (e: any) => {
        if (currentLayer === "pais" || currentLayer === "zonas") {
          e.target.setStyle({ fillOpacity: 0.3, weight: 3.4 });
        }
      },
      mouseout: (e: any) => {
        if (currentLayer === "pais" || currentLayer === "zonas") {
          e.target.setStyle(getDepartmentStyle(feature));
        }
      },
    });

    const tooltipText =
      currentLayer === "pais" && zone
        ? `${zone.name} • ${(deptCode ? departmentNameByCode.get(deptCode) : null) ?? departmentNameFromFeature(feature) ?? "Departamento"}`
        : ((deptCode ? departmentNameByCode.get(deptCode) : null) ??
          departmentNameFromFeature(feature) ??
          "Departamento");

    layer.bindTooltip(tooltipText, {
      permanent: false,
      direction: "center",
    });
  };

  const onEachMunicipioFeature = (feature: any, layer: any) => {
    const featureCode = municipalityCodeFromFeature(feature);
    const nombreMunicipio =
      (featureCode ? municipioNameByCode.get(featureCode) : null) ??
      municipalityNameFromFeature(feature);

    if (nombreMunicipio) {
      layer.bindTooltip(nombreMunicipio, {
        permanent: false,
        direction: "top",
        offset: [0, -3],
        sticky: true,
        className: "municipality-tooltip",
      });
    }

    layer.on({
      click: () => {
        const featureCode = municipalityCodeFromFeature(feature);
        if (featureCode) {
          setSelectedMunicipioCode(featureCode);
        } else {
          console.error(
            "Territorial integrity error: municipality feature without canonical ID",
            feature,
          );
        }
      },
      mouseover: (e: any) => {
        const featureCode = municipalityCodeFromFeature(feature);
        const isSelected =
          selectedMunicipioCodeRef.current &&
          featureCode === selectedMunicipioCodeRef.current;
        if (!isSelected) {
          e.target.setStyle({ fillOpacity: 0.14, weight: 1.4 });
        }
      },
      mouseout: (e: any) => {
        const featureCode = municipalityCodeFromFeature(feature);
        const isSelected =
          selectedMunicipioCodeRef.current &&
          featureCode === selectedMunicipioCodeRef.current;
        if (isSelected) {
          e.target.setStyle({
            color: "#b45309",
            weight: 2.2,
            opacity: 0.95,
            fillColor: "#f59e0b",
            fillOpacity: 0.2,
          });
        } else {
          e.target.setStyle({
            color: "#0f172a",
            weight: 1,
            opacity: 0.85,
            fillColor: "#cbd5e1",
            fillOpacity: 0.03,
          });
        }
      },
    });
  };

  const municipioStyle = (feature: any): L.PathOptions => {
    const featureCode = municipalityCodeFromFeature(feature);
    const isSelected =
      selectedMunicipioCode && featureCode === selectedMunicipioCode;

    if (isSelected) {
      return {
        color: "#b45309",
        weight: 2.2,
        opacity: 0.95,
        fillColor: "#f59e0b",
        fillOpacity: 0.2,
      };
    }

    return {
      color: "#0f172a",
      weight: 1,
      opacity: 0.85,
      fillColor: "#cbd5e1",
      fillOpacity: 0.03,
    };
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-20 z-[1000]">
        {!isConsuladosDepartmentView ? (
          <button
            onClick={openConsuladosView}
            className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
          >
            Ver Consulados
          </button>
        ) : (
          <div className="w-80 rounded-xl border border-blue-100 bg-white p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-blue-600">
                  Departamento especial
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  Consulados (88)
                </p>
              </div>
              <button
                onClick={closeConsuladosView}
                className="text-xs font-medium text-blue-700 hover:text-blue-900"
              >
                Cerrar
              </button>
            </div>

            <label className="mb-1 block text-xs font-medium text-slate-600">
              País (municipio)
            </label>
            <select
              value={selectedMunicipioCode ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedMunicipioCode(value || null);
              }}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-700"
              disabled={consuladoMunicipiosLoading}
            >
              <option value="">Todos los consulados</option>
              {consuladoMunicipios.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name} ({option.puestosCount} puestos)
                </option>
              ))}
            </select>

            {consuladoMunicipiosLoading && (
              <p className="mt-2 text-xs text-slate-500">
                Cargando países de consulados…
              </p>
            )}

            {!consuladoMunicipiosLoading &&
              consuladoMunicipios.length === 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  No hay municipios de consulados disponibles.
                </p>
              )}
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute top-4 right-4 z-[1000] pointer-events-none">
          <div className="flex items-center gap-3 rounded-full border border-blue-100 bg-white/95 px-4 py-2 shadow-lg backdrop-blur-sm">
            <div className="h-5 w-5 rounded-full border-2 border-blue-600/30 border-t-blue-600 animate-spin" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-slate-800">
                Cargando mapa
              </span>
              <span className="text-xs text-slate-500">{loadingLabel}</span>
            </div>
          </div>
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={true}
        maxBounds={COLOMBIA_BOUNDS}
        maxBoundsViscosity={1.0}
        minZoom={5}
      >
        <MapController
          center={center}
          zoom={zoom}
          selectedDepartmentCode={selectedDepartmentCode}
          selectedMunicipioCode={selectedMunicipioCode}
          departmentGeoJSON={departamentosGeoJSON}
          municipiosGeoJSON={municipiosGeoJSON}
          isInDepartmentView={currentJurisdiccion?.layer === "departamentos"}
          isConsuladosDepartmentView={isConsuladosDepartmentView}
          selectedZoneId={selectedZoneId}
          zoneByDepartmentCode={zoneByDepartmentCode}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Show departments GeoJSON in general view */}
        {currentJurisdiccion &&
          ["pais", "zonas"].includes(currentJurisdiccion.layer) &&
          filteredDepartamentosGeoJSON && (
            <GeoJSON
              key={`depts-${currentJurisdiccion.id}-${zoneByDepartmentCode.size}`}
              data={filteredDepartamentosGeoJSON}
              style={getDepartmentStyle}
              onEachFeature={onEachFeature}
            />
          )}

        {/* Show municipalities boundaries for selected department */}
        {currentJurisdiccion?.layer === "departamentos" &&
          municipiosGeoJSON && (
            <GeoJSON
              key={selectedDepartmentCode ?? "none"}
              ref={(r: any) => {
                municipiosLayerRef.current = r;
              }}
              data={municipiosGeoJSON}
              style={municipioStyle}
              interactive={true}
              onEachFeature={onEachMunicipioFeature}
            />
          )}

        {/* Removed municipality label markers - using GeoJSON tooltips instead */}

        {/* Show puestos markers */}
        {puestos.map((puesto) => (
          <Marker
            key={puesto.codigo_puesto}
            position={[puesto.latitud, puesto.longitud]}
            eventHandlers={{
              click: () => setSelectedPuesto(puesto),
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-bold">{puesto.puesto}</div>
                <div className="text-xs text-gray-600">
                  {puesto.codigo_puesto}
                </div>
                {puesto.direccion && (
                  <div className="text-xs mt-1">{puesto.direccion}</div>
                )}
                {puesto.mesas && (
                  <div className="text-xs mt-1">Mesas: {puesto.mesas}</div>
                )}
                {puesto.total && (
                  <div className="text-xs">
                    Potencial: {puesto.total.toLocaleString()}
                  </div>
                )}
                <button
                  className="mt-2 text-xs text-blue-600 underline"
                  onClick={() => setSelectedPuesto(puesto)}
                >
                  Ver detalles
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <PuestoDetailPanel
        puesto={selectedPuesto}
        territoryContext={selectedPuestoTerritory}
        onClose={() => setSelectedPuesto(null)}
      />

      {/* Territory stats panel — only shown when no individual puesto is selected */}
      {!selectedPuesto && (
        <TeritorioStatsPanel
          stats={territorioStats}
          loading={territorioStatsLoading}
          error={territorioStatsError}
          tipo={territorioTipo}
          displayName={selectedTerritoryName}
          displayCode={selectedTerritory?.canonicalId ?? null}
          integrityError={selectedTerritoryIntegrityError}
          onClose={() => {
            setTerritorioStats(null);
            setTerritorioStatsError(false);
          }}
        />
      )}
    </div>
  );
}
