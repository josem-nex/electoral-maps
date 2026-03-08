import { useEffect, useMemo, useState } from "react";
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
import type { PuestoElectoral } from "../api/client";
import type { Jurisdiccion } from "../stores/navigationStore";

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
  departmentGeoJSON: any;
  isInDepartmentView: boolean;
}

const COLOMBIA_BOUNDS: [[number, number], [number, number]] = [
  [-4.4, -81.85],
  [13.6, -66.7],
];

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

function MapController({
  center,
  zoom,
  selectedDepartmentCode,
  departmentGeoJSON,
  isInDepartmentView,
}: MapControllerProps & { isInDepartmentView: boolean }) {
  const map = useMap();
  const [lastZoomedDept, setLastZoomedDept] = useState<string | null>(null);

  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);

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
    if (
      !selectedDepartmentCode ||
      !departmentGeoJSON ||
      selectedDepartmentCode === lastZoomedDept
    ) {
      return;
    }

    const departmentFeature = departmentGeoJSON.features?.find(
      (feature: any) =>
        String(feature?.properties?.DPTO ?? "").padStart(2, "0") ===
        selectedDepartmentCode,
    );

    if (departmentFeature) {
      const geoJsonLayer = L.geoJSON(departmentFeature);
      const bounds = geoJsonLayer.getBounds();

      if (bounds.isValid()) {
        // Just use fitBounds without restrictions
        map.fitBounds(bounds, { padding: [50, 50] });
        setLastZoomedDept(selectedDepartmentCode);
      }
    }
  }, [selectedDepartmentCode, departmentGeoJSON, map, lastZoomedDept]);

  return null;
}

export function ElectoralMap() {
  const { currentJurisdiccion, navigateTo } = useNavigationStore();
  const [departamentosGeoJSON, setDepartamentosGeoJSON] = useState<any>(null);
  const [municipiosGeoJSON, setMunicipiosGeoJSON] = useState<any>(null);
  const [departamentos, setDepartamentos] = useState<Jurisdiccion[]>([]);
  const [puestos, setPuestos] = useState<PuestoElectoral[]>([]);
  const [loading, setLoading] = useState(false);

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
  }, [currentJurisdiccion, selectedDepartmentCode]);

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
      navigateTo(dept);
    } else {
      // Create jurisdiction on the fly
      const bounds = (L.geoJSON(feature) as any).getBounds();
      const center = bounds.getCenter();
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
  };

  const municipioStyle: L.PathOptions = {
    color: "#0f172a",
    weight: 1,
    opacity: 0.85,
    fillColor: "#cbd5e1",
    fillOpacity: 0.03,
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
          departmentGeoJSON={departamentosGeoJSON}
          isInDepartmentView={currentJurisdiccion?.layer === "departamentos"}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          noWrap={true}
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
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
