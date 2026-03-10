import { useEffect, useMemo, useRef, useState } from "react";
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
}

const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-4.4, -81.85],
  [13.6, -66.7],
];

function isLikelyColombiaCenter(lat: number, lng: number): boolean {
  return lat >= -6 && lat <= 15 && lng >= -83 && lng <= -65;
}

function normalizeDepartmentCode(value?: string): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  return digits.padStart(2, "0").slice(-2);
}

function normalizeMunicipioCode(value?: string): string | null {
  if (!value) {
    return null;
  }
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  return digits.padStart(5, "0").slice(-5);
}

function municipioCodeFromFeature(feature: any): string | null {
  const props = feature?.properties ?? {};

  const fullCode =
    props.MPIO_CDPMP ?? props.CODIGO_DANE ?? props.COD_DANE ?? props.MPIO;
  const normalizedFullCode = normalizeMunicipioCode(String(fullCode ?? ""));
  if (normalizedFullCode) {
    return normalizedFullCode;
  }

  const deptCode = normalizeDepartmentCode(
    String(props.DPTO_CCDGO ?? props.DPTO ?? ""),
  );
  const munDigits = String(props.MPIO_CCDGO ?? "").replace(/\D/g, "");
  if (deptCode && munDigits) {
    return `${deptCode}${munDigits.padStart(3, "0").slice(-3)}`;
  }

  return null;
}

function MapController({
  center,
  zoom,
  selectedDepartmentCode,
  selectedMunicipioCode,
  departmentGeoJSON,
  municipiosGeoJSON,
  isInDepartmentView,
}: MapControllerProps & { isInDepartmentView: boolean }) {
  const map = useMap();

  useEffect(() => {
    // Skip setView when a dept or municipality is selected — fitBounds handles
    // positioning in those cases, and having both animate causes conflicts.
    if (selectedMunicipioCode || selectedDepartmentCode) return;
    map.setView(center, zoom);
  }, [center, zoom, selectedMunicipioCode, selectedDepartmentCode, map]);

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

  // Handle automatic zoom when department is selected
  useEffect(() => {
    if (!selectedDepartmentCode || !departmentGeoJSON) return;

    const departmentFeature = departmentGeoJSON.features?.find(
      (feature: any) =>
        String(feature?.properties?.DPTO ?? "").padStart(2, "0") ===
        selectedDepartmentCode,
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
  }, [selectedDepartmentCode, departmentGeoJSON, map]);

  // Handle automatic zoom when municipality is selected from search
  useEffect(() => {
    if (!selectedMunicipioCode || !municipiosGeoJSON) return;

    const municipioFeature = municipiosGeoJSON.features?.find(
      (feature: any) =>
        municipioCodeFromFeature(feature) === selectedMunicipioCode,
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
    selectedMunicipioCode,
    setSelectedMunicipioCode,
  } = useNavigationStore();
  const [departamentosGeoJSON, setDepartamentosGeoJSON] = useState<any>(null);
  const [municipiosGeoJSON, setMunicipiosGeoJSON] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<Jurisdiccion[]>([]);
  const [puestos, setPuestos] = useState<PuestoElectoral[]>([]);
  const [selectedPuesto, setSelectedPuesto] = useState<PuestoElectoral | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  // Territory stats panel state
  const [territorioStats, setTerritorioStats] =
    useState<TerritorioStats | null>(null);
  const [territorioStatsLoading, setTerritorioStatsLoading] = useState(false);
  const [territorioStatsError, setTerritorioStatsError] = useState(false);
  const [territorioTipo, setTerritorioTipo] = useState<
    "departamento" | "municipio" | null
  >(null);

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

  const filteredDepartamentosGeoJSON = useMemo(() => {
    if (!departamentosGeoJSON) {
      return null;
    }

    const allFeatures = departamentosGeoJSON.features ?? [];
    let filteredFeatures = allFeatures;

    if (currentJurisdiccion?.layer === "zonas" && departamentos.length > 0) {
      const zoneDepartmentCodes = new Set(
        departamentos.map((dept) => dept.code),
      );
      filteredFeatures = allFeatures.filter((feature: any) => {
        const code = String(feature?.properties?.DPTO ?? "").padStart(2, "0");
        return zoneDepartmentCodes.has(code);
      });
    }

    if (
      currentJurisdiccion?.layer === "departamentos" &&
      selectedDepartmentCode
    ) {
      filteredFeatures = allFeatures.filter(
        (feature: any) =>
          String(feature?.properties?.DPTO ?? "").padStart(2, "0") ===
          selectedDepartmentCode,
      );
    }

    return {
      ...departamentosGeoJSON,
      features: filteredFeatures,
    };
  }, [
    currentJurisdiccion?.layer,
    departamentos,
    departamentosGeoJSON,
    selectedDepartmentCode,
  ]);

  // Load GeoJSON for departments
  useEffect(() => {
    api
      .getDepartamentosGeoJSON()
      .then(setDepartamentosGeoJSON)
      .catch(console.error);
  }, []);

  // Load data based on current layer
  useEffect(() => {
    if (!currentJurisdiccion) return;

    setLoading(true);

    const loadData = async () => {
      try {
        if (currentJurisdiccion.layer === "pais") {
          const deptsData = await api.getJurisdicciones("departamentos");
          setDepartamentos(deptsData);
          setMunicipiosGeoJSON(null);
          setPuestos([]);
        } else if (currentJurisdiccion.layer === "zonas") {
          const deptsData = await api.getJurisdiccionChildren(
            currentJurisdiccion.id,
          );
          setDepartamentos(deptsData);
          setMunicipiosGeoJSON(null);
          setPuestos([]);
        } else if (currentJurisdiccion.layer === "departamentos") {
          if (selectedDepartmentCode) {
            // Clear first so the GeoJSON layer unmounts and remounts with the
            // new data, ensuring the selected-municipality style is applied
            // correctly even when switching between departments.
            setMunicipiosGeoJSON(null);
            const municipiosData = await api.getMunicipiosGeoJSON(
              selectedDepartmentCode,
            );
            setMunicipiosGeoJSON(municipiosData);
          } else {
            setMunicipiosGeoJSON(null);
          }
          setPuestos([]);
        } else if (currentJurisdiccion.layer === "municipio") {
          setMunicipiosGeoJSON(null);
          // Check if Bogota (has localidades)
          const children = await api.getJurisdiccionChildren(
            currentJurisdiccion.id,
          );
          if (children.length > 0) {
            // Has localidades
            setDepartamentos([]);
            setPuestos([]);
          } else {
            // Load puestos directly
            const parts = currentJurisdiccion.id.split(":");
            const munCode = parts[1];
            const puestosData = await api.getPuestos({
              departamento_codigo: munCode.slice(0, 2),
              municipio_codigo: munCode,
              limit: 2500,
            });
            setPuestos(puestosData);
            setDepartamentos([]);
          }
        } else if (currentJurisdiccion.layer === "localidad") {
          setMunicipiosGeoJSON(null);
          // Load puestos for this localidad
          const parts = currentJurisdiccion.id.split(":");
          const locCode = parts[1];
          const puestosData = await api.getPuestos({
            municipio_codigo: "11001",
            localidad_codigo: locCode,
            limit: 2500,
          });
          setPuestos(puestosData);
          setDepartamentos([]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Use primitive/stable values as deps to avoid re-fetching when navigateTo
    // replaces the currentJurisdiccion reference but the underlying data hasn't
    // changed (e.g. same department, different selected municipality).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentJurisdiccion?.id,
    currentJurisdiccion?.layer,
    selectedDepartmentCode,
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
    currentJurisdiccion?.layer,
  ]);

  // Load aggregated territory statistics when a department or municipality is selected
  useEffect(() => {
    const layer = currentJurisdiccion?.layer;
    if (!layer || !["departamentos", "municipio"].includes(layer)) {
      setTerritorioStats(null);
      setTerritorioStatsError(false);
      return;
    }

    let tipo: "departamento" | "municipio" | null = null;
    let codigo: string | null = null;

    if (layer === "departamentos") {
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
    selectedDepartmentCode,
    selectedMunicipioCode,
  ]);

  const handleDepartmentClick = (feature: any) => {
    const deptCode = String(feature.properties.DPTO).padStart(2, "0");
    const deptName = feature.properties.NOMBRE_DPT;

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

  const getDepartmentStyle = (feature: any): L.PathOptions => {
    const deptCode = String(feature?.properties?.DPTO ?? "").padStart(2, "0");
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
    const canSelectDepartment =
      currentJurisdiccion &&
      ["pais", "zonas"].includes(currentJurisdiccion.layer);

    layer.on({
      click: () => {
        if (canSelectDepartment) {
          handleDepartmentClick(feature);
        }
      },
      mouseover: (e: any) => {
        if (canSelectDepartment) {
          e.target.setStyle({ fillOpacity: 0.3, weight: 3.4 });
        }
      },
      mouseout: (e: any) => {
        if (canSelectDepartment) {
          e.target.setStyle(getDepartmentStyle(feature));
        }
      },
    });

    layer.bindTooltip(feature.properties.NOMBRE_DPT, {
      permanent: false,
      direction: "center",
    });
  };

  const onEachMunicipioFeature = (feature: any, layer: any) => {
    const nombreMunicipio =
      feature.properties?.MPIO_CNMBR ||
      feature.properties?.NOMBRE_MPI ||
      feature.properties?.nombre;

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
        const featureCode = municipioCodeFromFeature(feature);
        if (featureCode) {
          setSelectedMunicipioCode(featureCode);
        }
      },
      mouseover: (e: any) => {
        const featureCode = municipioCodeFromFeature(feature);
        const isSelected =
          selectedMunicipioCodeRef.current &&
          featureCode === selectedMunicipioCodeRef.current;
        if (!isSelected) {
          e.target.setStyle({ fillOpacity: 0.14, weight: 1.4 });
        }
      },
      mouseout: (e: any) => {
        const featureCode = municipioCodeFromFeature(feature);
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
    const featureCode = municipioCodeFromFeature(feature);
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
      {loading && (
        <div className="absolute top-4 right-4 z-[1000] bg-white px-4 py-2 rounded shadow">
          <span>Cargando...</span>
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
        onClose={() => setSelectedPuesto(null)}
      />

      {/* Territory stats panel — only shown when no individual puesto is selected */}
      {!selectedPuesto && (
        <TeritorioStatsPanel
          stats={territorioStats}
          loading={territorioStatsLoading}
          error={territorioStatsError}
          tipo={territorioTipo}
          onClose={() => {
            setTerritorioStats(null);
            setTerritorioStatsError(false);
          }}
        />
      )}
    </div>
  );
}
