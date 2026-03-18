"""Data loaders for electoral maps."""
import json
import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional, Tuple

import pandas as pd

try:
    from app.config import settings
    from app.models import ElectoralLayer, Jurisdiccion, PuestoElectoral
except ModuleNotFoundError:
    from config import settings
    from models import ElectoralLayer, Jurisdiccion, PuestoElectoral


DEPARTMENT_ALIASES = {
    "BOGOTA D C": "BOGOTA",
    "SANTAFE DE BOGOTA D C": "BOGOTA",
    "SAN ANDRES": "SAN ANDRES",
    "SAN ANDRES PROVIDENCIA Y SANTA CATALINA": "SAN ANDRES",
    "ARCHIPIELAGO DE SAN ANDRES": "SAN ANDRES",
    "ARCHIPIELAGO DE SAN ANDRES PROVIDENCIA Y SANTA CATALINA": "SAN ANDRES",
    "NORTE DE SAN": "NORTE DE SANTANDER",
    "VALLE": "VALLE DEL CAUCA",
    "VAUPES": "VAUPES",
    "NARINO": "NARINO",
}

DEPARTMENT_CANONICAL_CODE_OVERRIDES = {
    "SAN ANDRES": "56",
}

DEPARTMENT_LEGACY_CODE_OVERRIDES = {
    "88": "56",
}


def normalize_codigo_territorial(value: Any, length: int) -> str:
    """Normalize a territorial code preserving left-zero padding."""
    if value is None:
        return ""
    digits = re.sub(r"\D+", "", str(value))
    if not digits:
        return ""
    return digits.zfill(length)[-length:]


@lru_cache(maxsize=1)
def canonical_department_code_by_norm_name() -> dict[str, str]:
    """Build canonical department code lookup from DIVIPOLA by normalized name."""
    municipios = load_municipios_divipola()
    if municipios.empty:
        return {}

    unique_departments = (
        municipios[["departamento_norm", "departamento_codigo"]]
        .dropna(subset=["departamento_norm", "departamento_codigo"])
        .drop_duplicates(subset=["departamento_norm"])
    )

    mapping: dict[str, str] = {}
    for row in unique_departments.itertuples(index=False):
        norm_name = str(row.departamento_norm).strip()
        code = normalize_codigo_territorial(row.departamento_codigo, 2)
        if norm_name and code:
            mapping[norm_name] = code

    return mapping


def canonicalize_department_code(raw_code: Any, raw_name: Any) -> str:
    """Resolve canonical department code preferring DIVIPOLA name-based mapping."""
    normalized_code = normalize_codigo_territorial(raw_code, 2)
    normalized_code = DEPARTMENT_LEGACY_CODE_OVERRIDES.get(normalized_code, normalized_code)
    normalized_name = normalize_text(raw_name)
    if not normalized_name:
        return normalized_code

    forced_code = DEPARTMENT_CANONICAL_CODE_OVERRIDES.get(normalized_name)
    if forced_code:
        return forced_code

    canonical_by_name = canonical_department_code_by_norm_name().get(normalized_name)
    return canonical_by_name or normalized_code


def normalize_text(value) -> str:
    """Normalize text for matching (remove accents, uppercase, clean)."""
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ""
    text = str(value).strip().upper()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"[^A-Z0-9 ]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return DEPARTMENT_ALIASES.get(text, text)


def extract_coords(node) -> List[Tuple[float, float]]:
    """Extract coordinates from GeoJSON geometry."""
    coords = []
    if isinstance(node, (list, tuple)):
        if len(node) >= 2 and isinstance(node[0], (int, float)) and isinstance(node[1], (int, float)):
            coords.append((float(node[0]), float(node[1])))
        else:
            for item in node:
                coords.extend(extract_coords(item))
    return coords


def geometry_bounds(geometry: dict) -> dict:
    """Calculate bounds of a geometry."""
    coords = extract_coords(geometry.get("coordinates", []))
    if not coords:
        return {"center_lat": 4.5709, "center_lon": -74.2973, "zoom": 5.2}
    
    lons = [coord[0] for coord in coords]
    lats = [coord[1] for coord in coords]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)
    center_lon = (min_lon + max_lon) / 2
    center_lat = (min_lat + max_lat) / 2
    
    span = max(max_lon - min_lon, max_lat - min_lat)
    zoom = float(max(4.6, min(12.2, 7.8 - (span + 1e-6) ** 0.5 * 2)))
    
    return {"center_lat": center_lat, "center_lon": center_lon, "zoom": zoom}


@lru_cache(maxsize=1)
def load_departamentos_geojson() -> dict:
    """Load Colombia departments as GeoJSON converted from TopoJSON source."""
    topojson = load_municipios_topojson()
    transform = topojson.get("transform", {})
    scale = transform.get("scale", [1, 1])
    translate = transform.get("translate", [0, 0])
    arcs = topojson.get("arcs", [])

    departamentos_object = topojson.get("objects", {}).get("MGN_ANM_DPTOS", {})
    geometries = departamentos_object.get("geometries", [])

    features = []
    for geometry in geometries:
        properties = dict(geometry.get("properties", {}))
        raw_dept_code = normalize_codigo_territorial(
            properties.get("DPTO_CCDGO") or properties.get("DPTO"),
            2,
        )
        dept_name = str(properties.get("DPTO_CNMBR", "")).strip()
        dept_code = canonicalize_department_code(raw_dept_code, dept_name)

        properties["DPTO"] = dept_code
        properties["DPTO_CCDGO"] = dept_code
        properties["NOMBRE_DPT"] = dept_name
        properties["canonical_id"] = dept_code
        properties["departamento_codigo"] = dept_code
        properties["departamento_nombre"] = dept_name

        geojson_geometry = topo_geometry_to_geojson(geometry, arcs, scale, translate)
        if geojson_geometry.get("type") == "GeometryCollection":
            continue

        features.append(
            {
                "type": "Feature",
                "properties": properties,
                "geometry": geojson_geometry,
            }
        )

    return {"type": "FeatureCollection", "features": features}


@lru_cache(maxsize=1)
def load_municipios_topojson() -> dict:
    """Load municipalities TopoJSON source."""
    topojson_path = settings.data_dir / "mapas" / "Colombia_departamentos_municipios_CNPV2018.topojson"
    with open(topojson_path, "r", encoding="utf-8") as fp:
        return json.load(fp)


def decode_topo_arc(arc_points: List[List[float]], scale: List[float], translate: List[float]) -> List[List[float]]:
    """Decode a TopoJSON delta-encoded arc into lon/lat coordinates."""
    x = 0
    y = 0
    coords = []
    for point in arc_points:
        x += point[0]
        y += point[1]
        coords.append([
            x * scale[0] + translate[0],
            y * scale[1] + translate[1],
        ])
    return coords


def resolve_arc(arcs: List[List[List[float]]], arc_index: int, scale: List[float], translate: List[float]) -> List[List[float]]:
    """Resolve an arc index (supports reverse arc with negative index)."""
    if arc_index >= 0:
        return decode_topo_arc(arcs[arc_index], scale, translate)

    reverse_index = -arc_index - 1
    return list(reversed(decode_topo_arc(arcs[reverse_index], scale, translate)))


def merge_ring_arcs(arcs: List[List[List[float]]], ring_arc_indexes: List[int], scale: List[float], translate: List[float]) -> List[List[float]]:
    """Merge multiple arcs into a single polygon ring."""
    ring_coords = []
    for arc_index in ring_arc_indexes:
        arc_coords = resolve_arc(arcs, arc_index, scale, translate)
        if not arc_coords:
            continue
        if ring_coords:
            ring_coords.extend(arc_coords[1:])
        else:
            ring_coords.extend(arc_coords)

    if ring_coords and ring_coords[0] != ring_coords[-1]:
        ring_coords.append(ring_coords[0])

    return ring_coords


def topo_geometry_to_geojson(geometry: dict, arcs: List[List[List[float]]], scale: List[float], translate: List[float]) -> dict:
    """Convert a TopoJSON Polygon/MultiPolygon geometry object to GeoJSON geometry."""
    geometry_type = geometry.get("type")
    geometry_arcs = geometry.get("arcs", [])

    if geometry_type == "Polygon":
        coordinates = [
            merge_ring_arcs(arcs, ring_arc_indexes, scale, translate)
            for ring_arc_indexes in geometry_arcs
        ]
        return {"type": "Polygon", "coordinates": coordinates}

    if geometry_type == "MultiPolygon":
        coordinates = []
        for polygon in geometry_arcs:
            polygon_coords = [
                merge_ring_arcs(arcs, ring_arc_indexes, scale, translate)
                for ring_arc_indexes in polygon
            ]
            coordinates.append(polygon_coords)
        return {"type": "MultiPolygon", "coordinates": coordinates}

    return {"type": "GeometryCollection", "geometries": []}


@lru_cache(maxsize=64)
def get_municipios_geojson_by_departamento(departamento_codigo: str) -> dict:
    """Return municipalities as GeoJSON FeatureCollection for one department code."""
    normalized_code = str(departamento_codigo).strip().zfill(2)
    topojson = load_municipios_topojson()
    transform = topojson.get("transform", {})
    scale = transform.get("scale", [1, 1])
    translate = transform.get("translate", [0, 0])
    arcs = topojson.get("arcs", [])

    municipios_object = topojson.get("objects", {}).get("MGN_ANM_MPIOS", {})
    geometries = municipios_object.get("geometries", [])

    features = []
    for geometry in geometries:
        properties = dict(geometry.get("properties", {}))
        raw_dept_code = normalize_codigo_territorial(
            properties.get("DPTO_CCDGO") or properties.get("DPTO"),
            2,
        )
        dept_name = str(
            properties.get("DPTO_CNMBR") or properties.get("NOMBRE_DPT") or ""
        ).strip()
        dept_code = canonicalize_department_code(raw_dept_code, dept_name)
        if dept_code != normalized_code:
            continue

        municipio_code = normalize_codigo_territorial(
            properties.get("MPIO_CDPMP")
            or properties.get("CODIGO_DANE")
            or properties.get("COD_DANE")
            or properties.get("MPIO"),
            5,
        )
        if municipio_code and not municipio_code.startswith(dept_code):
            municipio_code = f"{dept_code}{municipio_code[-3:]}"
        if not municipio_code:
            municipio_rel_code = normalize_codigo_territorial(properties.get("MPIO_CCDGO"), 3)
            if municipio_rel_code:
                municipio_code = f"{dept_code}{municipio_rel_code}"

        municipio_name = str(
            properties.get("MPIO_CNMBR")
            or properties.get("NOMBRE_MPI")
            or properties.get("nombre")
            or ""
        ).strip()

        properties["DPTO"] = dept_code
        properties["DPTO_CCDGO"] = dept_code
        properties["NOMBRE_DPT"] = dept_name
        properties["MPIO_CDPMP"] = municipio_code
        properties["canonical_id"] = municipio_code
        properties["departamento_codigo"] = dept_code
        properties["departamento_nombre"] = dept_name
        properties["municipio_codigo"] = municipio_code
        properties["municipio_nombre"] = municipio_name

        geojson_geometry = topo_geometry_to_geojson(geometry, arcs, scale, translate)
        if geojson_geometry.get("type") == "GeometryCollection":
            continue

        features.append({
            "type": "Feature",
            "properties": dict(properties),
            "geometry": geojson_geometry,
        })

    return {
        "type": "FeatureCollection",
        "features": features,
    }


@lru_cache(maxsize=1)
def load_zonas_departamentos() -> pd.DataFrame:
    """Load zones to departments mapping."""
    zones_path = settings.data_dir / "usar" / "ZONAS VS MUNICIPIOS.xlsx"
    raw = pd.read_excel(zones_path, header=None)
    header_row = raw.iloc[2]
    records = []
    
    for col_idx in range(raw.shape[1]):
        zone_name = header_row.iloc[col_idx]
        if pd.isna(zone_name):
            continue
        zone_name = str(zone_name).strip()
        match = re.search(r"ZONA\s*(\d+)", zone_name.upper())
        zone_id = int(match.group(1)) if match else 0
        for row_idx in range(3, raw.shape[0]):
            departamento = raw.iat[row_idx, col_idx]
            if pd.isna(departamento):
                continue
            records.append({
                "zone_id": zone_id,
                "zone_name": zone_name,
                "departamento": str(departamento).strip(),
                "departamento_norm": normalize_text(departamento),
            })
    
    return pd.DataFrame(records)


@lru_cache(maxsize=1)
def load_municipios_divipola() -> pd.DataFrame:
    """Load DIVIPOLA municipalities data."""
    divipola_path = settings.data_dir / "usar" / "DIVIPOLA_Municipios.xlsx"
    raw = pd.read_excel(divipola_path, sheet_name="Municipios", header=10)
    
    df = raw.rename(columns={
        "Código": "departamento_codigo",
        "Nombre": "departamento_nombre",
        " Código ": "municipio_codigo",
        " Nombre ": "municipio_nombre",
        "Longitud": "longitud",
        "Latitud": "latitud",
    })
    
    df["departamento_codigo"] = pd.to_numeric(df["departamento_codigo"], errors="coerce")
    df["municipio_codigo"] = pd.to_numeric(df["municipio_codigo"], errors="coerce")
    df["latitud"] = pd.to_numeric(df["latitud"], errors="coerce")
    df["longitud"] = pd.to_numeric(df["longitud"], errors="coerce")
    df = df.dropna(subset=["departamento_codigo", "municipio_codigo", "latitud", "longitud"]).copy()
    
    df["departamento_codigo"] = df["departamento_codigo"].astype(int).astype(str).str.zfill(2)
    df["municipio_codigo"] = df["municipio_codigo"].astype(int).astype(str).str.zfill(5)
    df["departamento_nombre"] = df["departamento_nombre"].astype(str).str.strip()
    df["municipio_nombre"] = df["municipio_nombre"].astype(str).str.strip()
    df["departamento_norm"] = df["departamento_nombre"].apply(normalize_text)
    df["municipio_norm"] = df["municipio_nombre"].apply(normalize_text)
    
    return df


@lru_cache(maxsize=1)
def load_puestos_electorales() -> pd.DataFrame:
    """Load electoral voting locations."""
    puestos_path = settings.data_dir / "usar" / "INFO_X_Puesto.xlsx"
    df = pd.read_excel(puestos_path, sheet_name="Pre-Divipole", header=7)
    
    df = df.rename(columns={
        "Cod unico": "codigo_puesto",
        "Latitud": "latitud",
        "Longitud": "longitud",
        "dirección": "direccion",
    })
    
    for col in ["dd", "mm", "zz", "pp", "mesas", "mujeres", "hombres", "total", "latitud", "longitud"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    
    df = df.dropna(subset=["dd", "mm", "latitud", "longitud", "codigo_puesto"]).copy()
    
    df["departamento_codigo"] = df["dd"].astype(int).astype(str).str.zfill(2)
    df["municipio_rel"] = df["mm"].astype(int).astype(str).str.zfill(3)
    df["municipio_codigo"] = df["departamento_codigo"] + df["municipio_rel"]
    df["departamento"] = df["departamento"].astype(str).str.strip()
    df["municipio"] = df["municipio"].astype(str).str.strip()
    df["puesto"] = df["puesto"].astype(str).str.strip()
    df["comuna"] = df["comuna"].astype(str).str.strip()
    df["codigo_puesto"] = df["codigo_puesto"].astype(str).str.strip()
    
    return df


@lru_cache(maxsize=1)
def build_departamentos_catalog() -> Tuple[dict, List[Jurisdiccion]]:
    """Build departments catalog with zones and bounds."""
    geojson = load_departamentos_geojson()
    zones = load_zonas_departamentos()
    
    zone_map = {}
    if not zones.empty:
        zone_map = (
            zones.drop_duplicates(subset=["departamento_norm"])
            .set_index("departamento_norm")[["zone_id", "zone_name"]]
            .to_dict("index")
        )
    
    jurisdicciones = []
    for idx, feature in enumerate(geojson.get("features", [])):
        props = feature.get("properties", {})
        dept_name = str(props.get("NOMBRE_DPT", "")).strip()
        dept_norm = normalize_text(dept_name)
        dept_code = str(props.get("DPTO", "")).zfill(2)
        zone_data = zone_map.get(dept_norm, {"zone_id": 0, "zone_name": "Sin zona"})
        bounds = geometry_bounds(feature.get("geometry", {}))
        
        jurisdicciones.append(Jurisdiccion(
            id=f"dept:{dept_code}",
            layer=ElectoralLayer.DEPARTAMENTOS,
            name=dept_name,
            code=dept_code,
            zone_id=zone_data["zone_id"],
            zone_name=zone_data["zone_name"],
            center_lat=bounds["center_lat"],
            center_lon=bounds["center_lon"],
            zoom=bounds["zoom"],
        ))
    
    return geojson, jurisdicciones


def build_municipios_catalog() -> List[Jurisdiccion]:
    """Build municipalities catalog."""
    municipios = load_municipios_divipola()
    jurisdicciones = []
    
    for row in municipios.itertuples(index=False):
        jurisdicciones.append(Jurisdiccion(
            id=f"mun:{row.municipio_codigo}",
            layer=ElectoralLayer.MUNICIPIO,
            name=str(row.municipio_nombre),
            code=str(row.municipio_codigo),
            parent_code=str(row.departamento_codigo),
            center_lat=float(row.latitud), # type: ignore
            center_lon=float(row.longitud), # type: ignore
            zoom=9.0,
        ))
    
    return jurisdicciones


def build_localidades_bogota() -> List[Jurisdiccion]:
    """Build Bogota localities catalog from puestos data."""
    puestos = load_puestos_electorales()
    bogota = puestos[puestos["municipio_codigo"] == "11001"].copy()
    
    if bogota.empty:
        return []
    
    grouped = (
        bogota.groupby("comuna", dropna=False)
        .agg(
            latitud=("latitud", "mean"),
            longitud=("longitud", "mean"),
            puestos=("codigo_puesto", "count"),
        )
        .reset_index()
    )
    grouped["comuna"] = grouped["comuna"].fillna("SIN LOCALIDAD")
    
    jurisdicciones = []
    for row in grouped.itertuples(index=False):
        loc_id = normalize_text(row.comuna)
        jurisdicciones.append(Jurisdiccion(
            id=f"loc:{loc_id}",
            layer=ElectoralLayer.LOCALIDAD,
            name=row.comuna,
            code=loc_id,
            parent_code="11001",
            center_lat=float(row.latitud),
            center_lon=float(row.longitud),
            zoom=11.3,
        ))
    
    return jurisdicciones


def get_puestos_by_filters(
    departamento_codigo: Optional[str] = None,
    municipio_codigo: Optional[str] = None,
    localidad_codigo: Optional[str] = None,
    limit: int = 2500,
) -> List[PuestoElectoral]:
    """Get puestos filtered by jurisdiction."""
    puestos = load_puestos_electorales()
    
    if departamento_codigo:
        puestos = puestos[puestos["departamento_codigo"] == departamento_codigo]
    if municipio_codigo:
        puestos = puestos[puestos["municipio_codigo"] == municipio_codigo]
    if localidad_codigo:
        puestos = puestos[puestos["comuna"].apply(normalize_text) == localidad_codigo]
    
    puestos = puestos.head(limit)
    
    results = []
    for row in puestos.itertuples(index=False):
        results.append(PuestoElectoral(
            codigo_puesto=row.codigo_puesto,
            departamento_codigo=row.departamento_codigo,
            municipio_codigo=row.municipio_codigo,
            departamento=row.departamento,
            municipio=row.municipio,
            puesto=row.puesto,
            comuna=row.comuna if pd.notna(row.comuna) else None,
            direccion=row.direccion if pd.notna(row.direccion) else None,
            mujeres=int(row.mujeres) if pd.notna(row.mujeres) else None,
            hombres=int(row.hombres) if pd.notna(row.hombres) else None,
            total=int(row.total) if pd.notna(row.total) else None,
            mesas=int(row.mesas) if pd.notna(row.mesas) else None,
            latitud=float(row.latitud),
            longitud=float(row.longitud),
        ))
    
    return results
