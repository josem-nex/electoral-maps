"""Main FastAPI application."""
import re

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

try:
    from app.config import settings
    from app.models import (
        ElectoralLayer,
        Jurisdiccion,
        PuestoElectoral,
        SearchResult,
    )
    from app.data_loader import (
        build_departamentos_catalog,
        build_municipios_catalog,
        build_localidades_bogota,
        get_municipios_geojson_by_departamento,
        get_puestos_by_filters,
        load_departamentos_geojson,
        normalize_text,
    )
except ModuleNotFoundError:
    from config import settings
    from models import (
        ElectoralLayer,
        Jurisdiccion,
        PuestoElectoral,
        SearchResult,
    )
    from data_loader import (
        build_departamentos_catalog,
        build_municipios_catalog,
        build_localidades_bogota,
        get_municipios_geojson_by_departamento,
        get_puestos_by_filters,
        load_departamentos_geojson,
        normalize_text,
    )

app = FastAPI(
    title="Electoral Maps API",
    description="API para visualización de mapas electorales de Colombia",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Electoral Maps API"}


@app.get("/api/v1/jurisdicciones", response_model=List[Jurisdiccion])
def get_jurisdicciones(
    layer: ElectoralLayer = Query(ElectoralLayer.DEPARTAMENTOS),
    parent_code: Optional[str] = Query(None),
):
    """Get jurisdictions by layer and optionally by parent."""
    if layer == ElectoralLayer.PAIS:
        return [
            Jurisdiccion(
                id="colombia",
                layer=ElectoralLayer.PAIS,
                name="Colombia",
                code="CO",
                center_lat=4.5709,
                center_lon=-74.2973,
                zoom=5.2,
            )
        ]
    
    elif layer == ElectoralLayer.ZONAS:
        _, departamentos = build_departamentos_catalog()
        zonas_map = {}
        for dept in departamentos:
            if dept.zone_id not in zonas_map:
                zonas_map[dept.zone_id] = Jurisdiccion(
                    id=f"zone:{dept.zone_id}",
                    layer=ElectoralLayer.ZONAS,
                    name=dept.zone_name,
                    code=str(dept.zone_id),
                    center_lat=4.5709,
                    center_lon=-74.2973,
                    zoom=5.8,
                )
        return list(zonas_map.values())
    
    elif layer == ElectoralLayer.DEPARTAMENTOS:
        _, departamentos = build_departamentos_catalog()
        if parent_code:
            # Filter by zone
            return [d for d in departamentos if str(d.zone_id) == parent_code]
        return departamentos
    
    elif layer == ElectoralLayer.MUNICIPIO:
        municipios = build_municipios_catalog()
        if parent_code:
            # Filter by department
            return [m for m in municipios if m.parent_code == parent_code]
        return municipios
    
    elif layer == ElectoralLayer.LOCALIDAD:
        localidades = build_localidades_bogota()
        if parent_code:
            # Only Bogota (11001) has localities
            return localidades if parent_code == "11001" else []
        return localidades
    
    return []


@app.get("/api/v1/jurisdicciones/{id}/children", response_model=List[Jurisdiccion])
def get_jurisdiccion_children(id: str):
    """Get children of a specific jurisdiction."""
    parts = id.split(":")
    if len(parts) != 2:
        raise HTTPException(status_code=400, detail="Invalid jurisdiction ID format")
    
    layer_type, code = parts
    
    if layer_type == "colombia":
        return get_jurisdicciones(layer=ElectoralLayer.ZONAS)
    
    elif layer_type == "zone":
        return get_jurisdicciones(layer=ElectoralLayer.DEPARTAMENTOS, parent_code=code)
    
    elif layer_type == "dept":
        return get_jurisdicciones(layer=ElectoralLayer.MUNICIPIO, parent_code=code)
    
    elif layer_type == "mun":
        if code == "11001":
            return get_jurisdicciones(layer=ElectoralLayer.LOCALIDAD, parent_code=code)
        return []
    
    return []


@app.get("/api/v1/puestos", response_model=List[PuestoElectoral])
def get_puestos(
    departamento_codigo: Optional[str] = Query(None),
    municipio_codigo: Optional[str] = Query(None),
    localidad_codigo: Optional[str] = Query(None),
    limit: int = Query(2500, le=5000),
):
    """Get electoral puestos filtered by jurisdiction."""
    return get_puestos_by_filters(
        departamento_codigo=departamento_codigo,
        municipio_codigo=municipio_codigo,
        localidad_codigo=localidad_codigo,
        limit=limit,
    )


@app.get("/api/v1/search", response_model=List[SearchResult])
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, le=50),
):
    """Search jurisdictions by prefix (departments and municipalities)."""
    q_norm = normalize_text(q)
    results = []

    if not q_norm:
        return []
    
    # Search departments
    _, departamentos = build_departamentos_catalog()
    dept_by_code = {dept.code: dept.name for dept in departamentos}
    for dept in departamentos:
        dept_name_norm = normalize_text(dept.name)
        if dept_name_norm.startswith(q_norm) or dept.code.startswith(q_norm):
            results.append(
                SearchResult(
                    id=dept.id,
                    type="departamento",
                    name=dept.name,
                    code=dept.code,
                    center_lat=dept.center_lat,
                    center_lon=dept.center_lon,
                    zoom=dept.zoom,
                )
            )
    
    # Search municipalities
    municipios = build_municipios_catalog()
    for mun in municipios:
        mun_name_norm = normalize_text(mun.name)
        if mun_name_norm.startswith(q_norm) or mun.code.startswith(q_norm):
            results.append(
                SearchResult(
                    id=mun.id,
                    type="municipio",
                    name=mun.name,
                    code=mun.code,
                    parent_code=mun.parent_code,
                    parent_name=dept_by_code.get(mun.parent_code or ""),
                    center_lat=mun.center_lat,
                    center_lon=mun.center_lon,
                    zoom=mun.zoom,
                )
            )
    
    return results[:limit]


@app.get("/api/v1/geojson/departamentos")
def get_departamentos_geojson():
    """Get GeoJSON for Colombia departments."""
    return load_departamentos_geojson()


@app.get("/api/v1/geojson/municipios")
def get_municipios_geojson(
    departamento_codigo: str = Query(..., description="Código DANE del departamento (1 o 2 dígitos)"),
):
    """Get GeoJSON municipalities filtered by department code."""
    if not re.fullmatch(r"\d{1,2}", departamento_codigo.strip()):
        raise HTTPException(
            status_code=422,
            detail="departamento_codigo must be numeric with 1 or 2 digits",
        )

    normalized_code = departamento_codigo.strip().zfill(2)
    return get_municipios_geojson_by_departamento(normalized_code)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host=settings.api_host,
        port=settings.api_port,
    )
