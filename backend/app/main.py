"""Main FastAPI application."""
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from difflib import SequenceMatcher
from typing import Any, Iterable, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

# try:
from app.config import settings
from app.database import Base, get_db  # noqa: F401 – re-exported for tests
import json as _json
from typing import Literal

from app.db_models import (
    CatalogoNivelTerritorial,
    CatalogoTipoJurisdiccion,
    JurisdiccionORM,
    PersonaORM,
    PuestoORM,
    ResultadosDepartamentoORM,
    ResultadosMunicipioORM,
    ResultadosPaisORM,
    ResultadosPuestoORM,
    TerritorioDepartamentoORM,
    TerritorioMunicipioORM,
    TerritorioZonaORM,
)
from app.data_loader import (
    build_departamentos_catalog,
    canonicalize_municipio_code,
    get_municipios_geojson_by_departamento,
    load_departamentos_geojson,
    normalize_codigo_territorial,
    normalize_text,
)
from app.territorial_stats_cache import (
    VALID_TERRITORIO_TIPOS,
    aggregate_rows as aggregate_rows_cached,
    compute_territorio_analytics,
    get_cached_territorio_stats,
    normalize_tipo_codigo,
    upsert_territorio_stats_cache,
)
# except ModuleNotFoundError:
#     from config import settings  # type: ignore
#     from database import Base, get_db  # type: ignore  # noqa: F401
#     from db_models import (  # type: ignore
#         CatalogoNivelTerritorial,
#         CatalogoTipoJurisdiccion,
#         JurisdiccionORM,
#         PersonaORM,
#         PuestoORM,
#     )
#     from data_loader import (  # type: ignore
#         get_municipios_geojson_by_departamento,
#         load_departamentos_geojson,
#     )

# ---------------------------------------------------------------------------
# Hierarchy validation: nivel → expected parent nivel (None = top-level)
# ---------------------------------------------------------------------------
NIVEL_PARENT: dict[str, str | None] = {
    "pais": None,
    "zona": "pais",
    "departamento": "zona",
    "municipio": "departamento",
    "localidad": "municipio",
}

LIMIT_CAP = 1000
MUNICIPIO_NOISE_TOKENS = {
    "DE",
    "DEL",
    "LA",
    "LAS",
    "LOS",
    "EL",
    "SAN",
    "SANTA",
    "SANTO",
    "SANTIAGO",
    "VILLA",
    "CIUDAD",
    "DISTRITO",
    "GUADALAJARA",
    "CRUZ",
    "JOSE",
    "DIEGO",
    "LUIS",
}

# ---------------------------------------------------------------------------
# Pydantic request/response schemas
# ---------------------------------------------------------------------------


class JurisdiccionCreate(BaseModel):
    codigo_divipola: Optional[str] = None
    nombre: str
    nivel: str
    tipo: str = "territorial"
    parent_id: Optional[int] = None
    geometria_ref: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    zoom: Optional[float] = None


class JurisdiccionRead(BaseModel):
    id: int
    codigo_divipola: Optional[str] = None
    nombre: str
    nivel: str
    tipo: str
    parent_id: Optional[int] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    zoom: Optional[float] = None

    model_config = {"from_attributes": True}


class PuestoCreate(BaseModel):
    codigo_puesto: str
    jurisdiccion_id: Optional[int] = None
    departamento_codigo: str
    municipio_codigo: str
    departamento: str
    municipio: str
    puesto: str
    comuna: Optional[str] = None
    zona_codigo: Optional[str] = None
    puesto_codigo: Optional[str] = None
    direccion: Optional[str] = None
    mujeres: Optional[int] = None
    hombres: Optional[int] = None
    total: Optional[int] = None
    mesas: Optional[int] = None
    latitud: float
    longitud: float
    anio: Optional[int] = None
    corporacion: Optional[str] = None


class PuestoRead(PuestoCreate):
    id: int

    model_config = {"from_attributes": True}


class PuestosPage(BaseModel):
    total: int
    limit: int
    items: List[PuestoRead]


class SearchItem(BaseModel):
    id: Any
    type: str
    nombre_completo: Optional[str] = None
    documento: Optional[str] = None
    rol: Optional[str] = None
    jurisdiccion_id: Optional[int] = None
    # Geographic fields (departamentos / municipios from CSV catalog)
    geo_code: Optional[str] = None
    parent_code: Optional[str] = None
    parent_name: Optional[str] = None
    center_lat: Optional[float] = None
    center_lon: Optional[float] = None
    zoom: Optional[float] = None


class SearchPage(BaseModel):
    total: int
    items: List[SearchItem]


class AnalyticsDatos(BaseModel):
    puestos: int
    mesas: int


class AnalyticsResponse(BaseModel):
    jurisdiccion: Optional[str]
    anio: Optional[int]
    corporacion: Optional[str]
    datos: AnalyticsDatos


class TerritorioAnalyticsResponse(BaseModel):
    """Aggregated puestos statistics for pais/zona/departamento/municipio."""
    tipo: str
    codigo: str
    nombre: Optional[str] = None
    puestos_count: int
    mesas_sum: int
    total_sum: int
    mujeres_sum: int
    hombres_sum: int


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Electoral Maps API",
    description="API para visualización de mapas electorales de Colombia",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _seed_catalogs(db: Session) -> None:
    """Seed catalog tables and seed the root Colombia jurisdiction."""
    niveles = [
        ("pais", "País", 1),
        ("zona", "Zona", 2),
        ("departamento", "Departamento", 3),
        ("municipio", "Municipio", 4),
        ("localidad", "Localidad", 5),
        ("puesto", "Puesto", 6),
    ]
    for codigo, nombre, orden in niveles:
        if not db.query(CatalogoNivelTerritorial).filter_by(codigo=codigo).first():
            db.add(CatalogoNivelTerritorial(codigo=codigo, nombre=nombre, orden=orden))

    tipos = [("territorial", "Territorial"), ("especial", "Especial")]
    for codigo, nombre in tipos:
        if not db.query(CatalogoTipoJurisdiccion).filter_by(codigo=codigo).first():
            db.add(CatalogoTipoJurisdiccion(codigo=codigo, nombre=nombre))

    if not db.query(JurisdiccionORM).filter_by(nivel="pais").first():
        db.add(
            JurisdiccionORM(
                codigo_divipola="CO",
                nombre="Colombia",
                nivel="pais",
                tipo="territorial",
                center_lat=4.5709,
                center_lon=-74.2973,
                zoom=5.2,
            )
        )

    db.commit()


def _validate_parent(nivel: str, parent_id: int | None, db: Session) -> None:
    """Raise 422 if the parent relationship violates the hierarchy rules."""
    expected_parent_nivel = NIVEL_PARENT.get(nivel)
    if expected_parent_nivel is None:
        if parent_id is not None:
            raise HTTPException(status_code=422, detail=f"nivel='{nivel}' must not have a parent")
        return

    if parent_id is None:
        raise HTTPException(status_code=422, detail=f"nivel='{nivel}' requires a parent_id")

    parent = db.query(JurisdiccionORM).filter_by(id=parent_id).first()
    if parent is None:
        raise HTTPException(status_code=422, detail=f"parent_id={parent_id} not found")
    if parent.nivel != expected_parent_nivel:
        raise HTTPException(
            status_code=422,
            detail=(
                f"nivel='{nivel}' requires parent with nivel='{expected_parent_nivel}',"
                f" got '{parent.nivel}'"
            ),
        )


def _normalize_text(value: str | None) -> str:
    return normalize_text(value)


def _normalize_municipio_name(value: str | None) -> str:
    if value is None:
        return ""
    base = str(value).replace("(", " ").replace(")", " ")
    return _normalize_text(base)


def _municipio_informative_tokens(value: str | None) -> set[str]:
    return {
        token
        for token in _normalize_municipio_name(value).split()
        if len(token) >= 4 and token not in MUNICIPIO_NOISE_TOKENS
    }


def _municipio_names_match(expected_name: str | None, candidate_name: str | None) -> bool:
    expected = _normalize_municipio_name(expected_name)
    candidate = _normalize_municipio_name(candidate_name)

    if not expected or not candidate:
        return False
    if expected == candidate:
        return True

    if expected.startswith(candidate) or candidate.startswith(expected):
        shorter = expected if len(expected) <= len(candidate) else candidate
        if len(shorter) >= 6:
            return True

    expected_tokens = expected.split()
    candidate_tokens = candidate.split()
    if len(expected_tokens) == 1 and len(expected_tokens[0]) >= 6:
        if expected_tokens[0] in candidate_tokens:
            return True
    if len(candidate_tokens) == 1 and len(candidate_tokens[0]) >= 6:
        if candidate_tokens[0] in expected_tokens:
            return True

    expected_info = _municipio_informative_tokens(expected_name)
    candidate_info = _municipio_informative_tokens(candidate_name)
    if expected_info and candidate_info:
        if expected_info.issubset(candidate_info) or candidate_info.issubset(expected_info):
            return True

        if len(expected_info) == 1 or len(candidate_info) == 1:
            for expected_token in expected_info:
                for candidate_token in candidate_info:
                    if min(len(expected_token), len(candidate_token)) < 5:
                        continue
                    similarity = SequenceMatcher(None, expected_token, candidate_token).ratio()
                    if similarity >= 0.83:
                        return True

    compact_expected = expected.replace(" ", "")
    compact_candidate = candidate.replace(" ", "")
    similarity = SequenceMatcher(None, compact_expected, compact_candidate).ratio()
    if similarity >= 0.9:
        return True

    return False


def _departamento_name_by_code_from_db(db: Session) -> dict[str, str]:
    return {
        str(row.codigo).zfill(2): str(row.nombre).strip()
        for row in db.query(TerritorioDepartamentoORM).all()
        if row.codigo
    }


def _municipio_name_by_code_from_db(db: Session) -> dict[str, str]:
    return {
        str(row.codigo).zfill(5): str(row.nombre).strip()
        for row in db.query(TerritorioMunicipioORM).all()
        if row.codigo
    }


def _departamento_code_by_norm_name_from_geojson() -> dict[str, str]:
    mapping: dict[str, str] = {}
    geojson = load_departamentos_geojson()
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        code = normalize_codigo_territorial(
            props.get("departamento_codigo")
            or props.get("canonical_id")
            or props.get("DPTO")
            or props.get("DPTO_CCDGO"),
            2,
        )
        name = str(
            props.get("departamento_nombre")
            or props.get("NOMBRE_DPT")
            or props.get("DPTO_CNMBR")
            or ""
        ).strip()
        if code and name:
            mapping[_normalize_text(name)] = code
    return mapping


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@app.get("/")
def root():
    """Health check endpoint."""
    return {"status": "ok", "message": "Electoral Maps API"}


# ---------------------------------------------------------------------------
# Jurisdicciones
# ---------------------------------------------------------------------------


@app.get("/api/v1/jurisdicciones", response_model=List[JurisdiccionRead])
def list_jurisdicciones(
    nivel: Optional[str] = Query(None),
    layer: Optional[str] = Query(None),
    parent_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    """List jurisdictions, optionally filtered by nivel and/or parent_id."""
    q = db.query(JurisdiccionORM)
    effective_nivel = nivel or layer
    if effective_nivel is not None:
        q = q.filter(JurisdiccionORM.nivel == effective_nivel)
    if parent_id is not None:
        q = q.filter(JurisdiccionORM.parent_id == parent_id)
    return q.all()


@app.get("/api/v1/catalog/departamentos")
def get_departamentos_catalog(db: Session = Depends(get_db)):
    """Return departamentos catalog using Excel IDs persisted in DB."""
    catalog_rows = db.query(TerritorioDepartamentoORM).all()
    if not catalog_rows:
        _, departamentos = build_departamentos_catalog()
        return [item.model_dump() for item in departamentos]

    _, geo_departamentos = build_departamentos_catalog()
    geo_by_norm_name = {
        _normalize_text(dept.name): dept
        for dept in geo_departamentos
    }
    zonas_by_code = {
        str(zone.codigo).zfill(2): zone
        for zone in db.query(TerritorioZonaORM).all()
    }

    payload: list[dict[str, Any]] = []
    for row in sorted(catalog_rows, key=lambda item: str(item.codigo)):
        code = str(row.codigo).zfill(2)
        name = str(row.nombre or "").strip() or code
        geo_item = geo_by_norm_name.get(_normalize_text(name))
        zone_code = str(row.zona_codigo).zfill(2) if row.zona_codigo else None
        zone_item = zonas_by_code.get(zone_code or "")
        zone_name = str(zone_item.nombre).strip() if zone_item else (
            f"Zona {int(zone_code)}" if zone_code else "Sin zona"
        )

        payload.append(
            {
                "id": f"dept:{code}",
                "layer": "departamentos",
                "name": name,
                "code": code,
                "zone_id": int(zone_code) if zone_code else 0,
                "zone_name": zone_name,
                "center_lat": geo_item.center_lat if geo_item else 4.5709,
                "center_lon": geo_item.center_lon if geo_item else -74.2973,
                "zoom": geo_item.zoom if geo_item else 8.2,
            }
        )

    return payload


@app.post("/api/v1/jurisdicciones", response_model=JurisdiccionRead, status_code=201)
def create_jurisdiccion(body: JurisdiccionCreate, db: Session = Depends(get_db)):
    """Create a jurisdiction with hierarchy validation."""
    if body.nivel not in NIVEL_PARENT:
        raise HTTPException(status_code=422, detail=f"Unknown nivel '{body.nivel}'")
    _validate_parent(body.nivel, body.parent_id, db)
    jur = JurisdiccionORM(**body.model_dump())
    db.add(jur)
    db.commit()
    db.refresh(jur)
    return jur


@app.get("/api/v1/jurisdicciones/{jur_id}/children", response_model=List[JurisdiccionRead])
def get_children(jur_id: int, db: Session = Depends(get_db)):
    """Return direct children of a jurisdiction."""
    return db.query(JurisdiccionORM).filter_by(parent_id=jur_id).all()


@app.put("/api/v1/jurisdicciones/{jur_id}", response_model=JurisdiccionRead)
def update_jurisdiccion(jur_id: int, body: JurisdiccionCreate, db: Session = Depends(get_db)):
    """Update a jurisdiction."""
    jur = db.query(JurisdiccionORM).filter_by(id=jur_id).first()
    if jur is None:
        raise HTTPException(status_code=404, detail="Jurisdiction not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(jur, field, value)
    db.commit()
    db.refresh(jur)
    return jur


@app.delete("/api/v1/jurisdicciones/{jur_id}", status_code=204)
def delete_jurisdiccion(jur_id: int, db: Session = Depends(get_db)):
    """Delete a jurisdiction."""
    jur = db.query(JurisdiccionORM).filter_by(id=jur_id).first()
    if jur is None:
        raise HTTPException(status_code=404, detail="Jurisdiction not found")
    db.delete(jur)
    db.commit()


# ---------------------------------------------------------------------------
# Puestos electorales
# ---------------------------------------------------------------------------


@app.get("/api/v1/puestos", response_model=PuestosPage)
def list_puestos(
    municipio_id: Optional[int] = Query(None),
    departamento_codigo: Optional[str] = Query(None),
    municipio_codigo: Optional[str] = Query(None),
    localidad_codigo: Optional[str] = Query(None),
    bbox: Optional[str] = Query(None, description="lon_min,lat_min,lon_max,lat_max"),
    zoom: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    corporacion: Optional[str] = Query(None),
    limit: int = Query(LIMIT_CAP, le=LIMIT_CAP * 5),
    db: Session = Depends(get_db),
):
    """List electoral puestos with spatial and attribute filters."""
    q = db.query(PuestoORM)
    if municipio_id is not None:
        q = q.filter(PuestoORM.jurisdiccion_id == municipio_id)
    if localidad_codigo:
        q = q.filter(PuestoORM.comuna == localidad_codigo.strip())
    if bbox is not None:
        try:
            lon_min, lat_min, lon_max, lat_max = (float(v) for v in bbox.split(","))
        except ValueError:
            raise HTTPException(status_code=422, detail="bbox must be lon_min,lat_min,lon_max,lat_max")
        q = q.filter(
            PuestoORM.longitud >= lon_min,
            PuestoORM.longitud <= lon_max,
            PuestoORM.latitud >= lat_min,
            PuestoORM.latitud <= lat_max,
        )
    if anio is not None:
        q = q.filter(PuestoORM.anio == anio)
    if corporacion is not None:
        q = q.filter(PuestoORM.corporacion == corporacion)

    if municipio_codigo:
        normalized_municipio_code = municipio_codigo.strip().zfill(5)
        normalized_departamento_codigo = (
            departamento_codigo.strip().zfill(2) if departamento_codigo else None
        )

        if (
            normalized_departamento_codigo
            and normalized_departamento_codigo != normalized_municipio_code[:2]
        ):
            effective_limit = min(limit, LIMIT_CAP)
            return PuestosPage(total=0, limit=effective_limit, items=[])
        q = q.filter(PuestoORM.municipio_codigo == normalized_municipio_code)
        if normalized_departamento_codigo:
            q = q.filter(PuestoORM.departamento_codigo == normalized_departamento_codigo)

        effective_limit = min(limit, LIMIT_CAP)
        total = q.count()
        items = q.limit(effective_limit).all()
        return PuestosPage(
            total=total,
            limit=effective_limit,
            items=[PuestoRead.model_validate(item) for item in items],
        )

    if departamento_codigo:
        q = q.filter(PuestoORM.departamento_codigo == departamento_codigo.strip().zfill(2))

    effective_limit = min(limit, LIMIT_CAP)
    total = q.count()
    items = q.limit(effective_limit).all()
    return PuestosPage(total=total, limit=effective_limit, items=[PuestoRead.model_validate(item) for item in items])


@app.post("/api/v1/puestos", response_model=PuestoRead, status_code=201)
def create_puesto(body: PuestoCreate, db: Session = Depends(get_db)):
    """Create an electoral puesto."""
    puesto = PuestoORM(**body.model_dump())
    db.add(puesto)
    db.commit()
    db.refresh(puesto)
    return puesto


@app.put("/api/v1/puestos/{puesto_id}", response_model=PuestoRead)
def update_puesto(puesto_id: int, body: PuestoCreate, db: Session = Depends(get_db)):
    """Update an electoral puesto."""
    puesto = db.query(PuestoORM).filter_by(id=puesto_id).first()
    if puesto is None:
        raise HTTPException(status_code=404, detail="Puesto not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(puesto, field, value)
    db.commit()
    db.refresh(puesto)
    return puesto


@app.delete("/api/v1/puestos/{puesto_id}", status_code=204)
def delete_puesto(puesto_id: int, db: Session = Depends(get_db)):
    """Delete an electoral puesto."""
    puesto = db.query(PuestoORM).filter_by(id=puesto_id).first()
    if puesto is None:
        raise HTTPException(status_code=404, detail="Puesto not found")
    db.delete(puesto)
    db.commit()


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------


@app.get("/api/v1/search", response_model=SearchPage)
def search(
    query: Optional[str] = Query(None, min_length=1),
    q: Optional[str] = Query(None, min_length=1),
    types: Optional[List[str]] = Query(None),
    limit: int = Query(20, le=100),
    offset: int = Query(0),
    db: Session = Depends(get_db),
):
    """Global search across entity types. Accepts 'q' or 'query' as the search term."""
    effective_query = query or q
    if not effective_query:
        raise HTTPException(status_code=422, detail="Se requiere 'q' o 'query'")

    results: List[SearchItem] = []
    total = 0

    search_types = set(types) if types else {"persona", "jurisdiccion", "geo"}

    if "persona" in search_types:
        pq = db.query(PersonaORM).filter(PersonaORM.nombre_completo.ilike(f"%{effective_query}%"))
        total += pq.count()
        for p in pq.offset(offset).limit(limit).all():
            results.append(
                SearchItem(
                    id=p.id,
                    type="persona",
                    nombre_completo=p.nombre_completo,
                    documento=p.documento,
                    rol=p.rol,
                    jurisdiccion_id=p.jurisdiccion_id,
                )
            )

    if "jurisdiccion" in search_types:
        jq = db.query(JurisdiccionORM).filter(JurisdiccionORM.nombre.ilike(f"%{effective_query}%"))
        total += jq.count()
        for j in jq.offset(offset).limit(limit).all():
            results.append(SearchItem(id=j.id, type="jurisdiccion", nombre_completo=j.nombre))

    if "geo" in search_types:
        # Search using DB catalog (canonical codes) for code consistency across the app.
        # Coordinates are resolved from the geo CSV catalog matched by name.
        try:
            try:
                from app.data_loader import build_departamentos_catalog, build_municipios_catalog, normalize_text
            except ModuleNotFoundError:
                from data_loader import build_departamentos_catalog, build_municipios_catalog, normalize_text  # type: ignore

            q_norm = normalize_text(effective_query)

            # Build geo coordinate lookup by normalized dept name
            _, geo_depts = build_departamentos_catalog()
            geo_dept_by_norm_name = {normalize_text(d.name): d for d in geo_depts}

            # Build geo coordinate lookup by normalized muni name
            geo_muni_by_norm_name: dict[str, Any] = {}
            for m in build_municipios_catalog():
                key = normalize_text(m.name)
                if key not in geo_muni_by_norm_name:
                    geo_muni_by_norm_name[key] = m

            # All dept rows for parent_name lookups
            all_dept_rows = db.query(TerritorioDepartamentoORM).all()
            dept_name_by_code = {str(r.codigo).zfill(2): str(r.nombre).strip() for r in all_dept_rows}

            # Search departments in DB (canonical catalog codes)
            for dept_row in all_dept_rows:
                dept_name = str(dept_row.nombre).strip()
                dept_norm = normalize_text(dept_name)
                dept_code = str(dept_row.codigo).zfill(2)
                if q_norm not in dept_norm and not dept_code.startswith(q_norm):
                    continue
                geo = geo_dept_by_norm_name.get(dept_norm)
                results.append(
                    SearchItem(
                        id=f"dept:{dept_code}",
                        type="departamento",
                        nombre_completo=dept_name,
                        geo_code=dept_code,
                        center_lat=geo.center_lat if geo else 4.5709,
                        center_lon=geo.center_lon if geo else -74.2973,
                        zoom=geo.zoom if geo else 8.2,
                    )
                )
                total += 1

            # Search municipios in DB (canonical catalog codes)
            for muni_row in db.query(TerritorioMunicipioORM).all():
                muni_name = str(muni_row.nombre).strip()
                muni_norm = normalize_text(muni_name)
                muni_code = str(muni_row.codigo).zfill(5)
                if q_norm not in muni_norm and not muni_code.startswith(q_norm):
                    continue
                dept_code = str(muni_row.departamento_codigo).zfill(2)
                geo = geo_muni_by_norm_name.get(muni_norm)
                results.append(
                    SearchItem(
                        id=f"mun:{muni_code}",
                        type="municipio",
                        nombre_completo=muni_name,
                        geo_code=muni_code,
                        parent_code=dept_code,
                        parent_name=dept_name_by_code.get(dept_code, dept_code),
                        center_lat=geo.center_lat if geo else 4.5709,
                        center_lon=geo.center_lon if geo else -74.2973,
                        zoom=geo.zoom if geo else 9.0,
                    )
                )
                total += 1
        except Exception:
            pass  # geo catalog optional

    return SearchPage(total=total, items=results[:limit])


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------


@app.get("/api/v1/analytics", response_model=AnalyticsResponse)
def analytics(
    jurisdiccion_id: Optional[int] = Query(None),
    anio: Optional[int] = Query(None),
    corporacion: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Return basic aggregates for puestos."""
    q = db.query(PuestoORM)
    if jurisdiccion_id is not None:
        q = q.filter(PuestoORM.jurisdiccion_id == jurisdiccion_id)
    if anio is not None:
        q = q.filter(PuestoORM.anio == anio)
    if corporacion is not None:
        q = q.filter(PuestoORM.corporacion == corporacion)

    puestos_count = q.count()
    mesas_sum = q.with_entities(func.sum(PuestoORM.mesas)).scalar() or 0

    return AnalyticsResponse(
        jurisdiccion=str(jurisdiccion_id) if jurisdiccion_id is not None else None,
        anio=anio,
        corporacion=corporacion,
        datos=AnalyticsDatos(puestos=puestos_count, mesas=int(mesas_sum)),
    )


def _aggregate_rows(rows: list) -> dict:
    """Compute puestos aggregates from a list of PuestoORM rows."""
    return aggregate_rows_cached(rows)


@app.get("/api/v1/analytics/territorio", response_model=TerritorioAnalyticsResponse)
def analytics_territorio(
    tipo: str = Query(..., description="Tipo de territorio: 'pais', 'zona', 'departamento' o 'municipio'"),
    codigo: str = Query(..., description="Código DANE del territorio"),
    db: Session = Depends(get_db),
):
    """Return cached or computed aggregated puestos statistics by territory."""
    try:
        normalized_tipo, normalized_codigo = normalize_tipo_codigo(tipo, codigo)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    cache_available = True

    try:
        cached = get_cached_territorio_stats(db, normalized_tipo, normalized_codigo)
    except OperationalError as exc:
        if "territorio_stats_cache" not in str(exc).lower():
            raise
        db.rollback()
        cache_available = False
        cached = None

    if cached is not None:
        if normalized_tipo in {"pais", "municipio", "departamento"}:
            recomputed = compute_territorio_analytics(
                tipo=normalized_tipo,
                codigo=normalized_codigo,
                db=db,
            )
            if recomputed != cached:
                if cache_available:
                    try:
                        upsert_territorio_stats_cache(db, recomputed)
                        db.commit()
                    except OperationalError as exc:
                        if "territorio_stats_cache" not in str(exc).lower():
                            raise
                        db.rollback()
                return TerritorioAnalyticsResponse(**recomputed)
        return TerritorioAnalyticsResponse(**cached)

    payload = compute_territorio_analytics(
        tipo=normalized_tipo,
        codigo=normalized_codigo,
        db=db,
    )
    if cache_available:
        try:
            upsert_territorio_stats_cache(db, payload)
            db.commit()
        except OperationalError as exc:
            if "territorio_stats_cache" not in str(exc).lower():
                raise
            db.rollback()

    return TerritorioAnalyticsResponse(**payload)


# ---------------------------------------------------------------------------
# GeoJSON (mantiene compatibilidad con el frontend)
# ---------------------------------------------------------------------------


@app.get("/api/v1/geojson/departamentos")
def get_departamentos_geojson(db: Session = Depends(get_db)):
    """Get GeoJSON for Colombia departments with Excel `dd` codes."""
    geojson = load_departamentos_geojson()
    by_norm_name = {
        _normalize_text(str(row.nombre or "")): str(row.codigo).zfill(2)
        for row in db.query(TerritorioDepartamentoORM).all()
        if row.codigo and row.nombre
    }

    features = []
    for feature in geojson.get("features", []):
        props = dict(feature.get("properties", {}))
        dept_name = str(
            props.get("departamento_nombre")
            or props.get("NOMBRE_DPT")
            or props.get("DPTO_CNMBR")
            or ""
        ).strip()
        dept_norm = _normalize_text(dept_name)
        excel_code = by_norm_name.get(dept_norm)

        canonical_code = normalize_codigo_territorial(
            props.get("departamento_codigo")
            or props.get("canonical_id")
            or props.get("DPTO")
            or props.get("DPTO_CCDGO"),
            2,
        )

        resolved_code = excel_code or canonical_code
        if resolved_code:
            props["excel_id"] = resolved_code
            props["departamento_codigo"] = resolved_code
            props["canonical_id"] = resolved_code
            props["DPTO"] = resolved_code
            props["DPTO_CCDGO"] = resolved_code
            if canonical_code and canonical_code != resolved_code:
                props["source_canonical_id"] = canonical_code

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": feature.get("geometry"),
        })

    return {"type": "FeatureCollection", "features": features}


@app.get("/api/v1/geojson/municipios")
def get_municipios_geojson(
    departamento_codigo: str = Query(..., description="Código DANE del departamento (1 o 2 dígitos)"),
    db: Session = Depends(get_db),
):
    """Get GeoJSON municipalities filtered by Excel `dd` and emitted with Excel `mm`."""
    if not re.fullmatch(r"\d{1,2}", departamento_codigo.strip()):
        raise HTTPException(
            status_code=422,
            detail="departamento_codigo must be numeric with 1 or 2 digits",
        )
    requested_dd = departamento_codigo.strip().zfill(2)

    dept_row = db.query(TerritorioDepartamentoORM).filter_by(codigo=requested_dd).first()
    canonical_by_norm_name = _departamento_code_by_norm_name_from_geojson()

    canonical_dd = requested_dd
    if dept_row and dept_row.nombre:
        canonical_dd = canonical_by_norm_name.get(_normalize_text(dept_row.nombre), requested_dd)

    geojson = get_municipios_geojson_by_departamento(canonical_dd)

    municipio_rows = db.query(TerritorioMunicipioORM).filter_by(departamento_codigo=requested_dd).all()
    mm_by_norm_name = {
        _normalize_text(str(row.nombre or "")): str(row.codigo).zfill(5)
        for row in municipio_rows
        if row.codigo and row.nombre
    }

    features = []
    for feature in geojson.get("features", []):
        props = dict(feature.get("properties", {}))
        mun_name = str(
            props.get("municipio_nombre")
            or props.get("NOMBRE_MPI")
            or props.get("MPIO_CNMBR")
            or props.get("nombre")
            or ""
        ).strip()
        mun_norm = _normalize_text(mun_name)

        canonical_mm = normalize_codigo_territorial(
            props.get("municipio_codigo")
            or props.get("canonical_id")
            or props.get("MPIO_CDPMP")
            or props.get("CODIGO_DANE")
            or props.get("COD_DANE")
            or props.get("MPIO"),
            5,
        )

        # Resolución del código del muni en el catálogo del proyecto:
        # 1) match exacto por nombre normalizado (caso simple)
        # 2) helper compartido (lookup en territorio_municipio con strip de paréntesis
        #    + alias overrides) — necesario porque la BD lleva nombres tipo
        #    "PAZ DE ARIPORO (MORENO)" mientras que el topojson trae "PAZ DE ARIPORO".
        # 3) fallback al cálculo sintético dept + DANE[-3:] (sólo edge cases).
        excel_mm = mm_by_norm_name.get(mun_norm)
        if not excel_mm:
            synthetic = f"{requested_dd}{canonical_mm[-3:]}" if canonical_mm else ""
            excel_mm = canonicalize_municipio_code(requested_dd, mun_name, synthetic) or synthetic

        if excel_mm:
            props["excel_id"] = excel_mm
            props["municipio_codigo"] = excel_mm
            props["canonical_id"] = excel_mm
            props["MPIO_CDPMP"] = excel_mm
            if canonical_mm and canonical_mm != excel_mm:
                props["source_canonical_id"] = canonical_mm

        props["departamento_codigo"] = requested_dd
        props["DPTO"] = requested_dd
        props["DPTO_CCDGO"] = requested_dd

        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": feature.get("geometry"),
        })

    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Resultados Electorales — schemas
# ---------------------------------------------------------------------------


class ResultadosCandidatoSchema(BaseModel):
    codigo: str
    nombre: str
    votos: int


class ResultadosPartidoSchema(BaseModel):
    partido_codigo: str
    partido_nombre: str
    partido_votos: int
    pct_partido: float
    top5_candidatos: List[ResultadosCandidatoSchema]
    # Códigos legales originales del Registraduría que se agruparon bajo este partido.
    # Para Cámara una colectividad inscribe una lista por departamento, cada una con
    # su propio código; al agrupar por nombre exacto exponemos los códigos para auditoría.
    codigos_originales: Optional[List[str]] = None


class ResultadosElectoralesResponse(BaseModel):
    anio: int
    nivel: str
    nivel_codigo: str
    nivel_nombre: str
    corporacion_codigo: str
    corporacion_nombre: str
    votos_total: int
    votos_validos: int
    votos_nulos: int
    votos_blancos: int
    partidos: List[ResultadosPartidoSchema]


# ---------------------------------------------------------------------------
# Resultados Electorales — endpoint
# ---------------------------------------------------------------------------

_NIVEL_MODELO = {
    "pais": ResultadosPaisORM,
    "departamento": ResultadosDepartamentoORM,
    "municipio": ResultadosMunicipioORM,
    "puesto": ResultadosPuestoORM,
}

_NIVEL_CODIGO_FIELD = {
    "pais": None,
    "departamento": "dep_codigo",
    "municipio": "mun_codigo",
    "puesto": "codigo_puesto",
}

_NIVEL_NOMBRE_FIELD = {
    "pais": None,
    "departamento": "dep_nombre",
    "municipio": "mun_nombre",
    "puesto": None,
}


def _normalize_partido_name(name: str) -> str:
    """Clave estable para agrupar partidos por nombre.

    Aplica trim + uppercase + strip de acentos + colapso de espacios internos.
    NO parte por guiones ni elimina prefijos: el nombre completo es la unidad
    mínima de agrupación, así "PACTO HISTÓRICO" y "PACTO HISTÓRICO - ALIANZA VERDE"
    son dos entradas distintas (coaliciones se consideran entidades separadas con
    sus propios votos).
    """
    if not name:
        return ""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    return " ".join(s.upper().split())


def _aggregate_partidos_by_name(
    rows: Iterable[Any],
    votos_validos: int,
) -> List[ResultadosPartidoSchema]:
    """Agrupa filas ORM con el mismo partido_nombre exacto (normalizado).

    Suma votos a través de los distintos partido_codigo, mergea top5_candidatos
    por código de candidato, y produce un único `ResultadosPartidoSchema` por
    grupo. El `partido_codigo` resultante es el nombre normalizado — clave estable
    a través de todos los niveles territoriales para que el filtro `?part=` funcione
    en drill-down. La lista de códigos legales originales queda en `codigos_originales`.

    Para corporaciones donde cada partido ya tiene un único código (Senado,
    Presidencial, etc.) la operación es no-op semánticamente: 1 fila → 1 grupo.
    """
    groups: dict[str, dict] = {}
    for row in rows:
        key = _normalize_partido_name(row.partido_nombre)
        if not key:
            continue
        try:
            top5 = _json.loads(row.top5_candidatos or "[]")
        except Exception:
            top5 = []

        g = groups.get(key)
        if g is None:
            g = {
                "votos": 0,
                "nombre": row.partido_nombre,
                "_max_row_votos": -1,
                "codigos_originales": [],
                "candidatos": {},  # codigo_candidato -> {codigo, nombre, votos}
            }
            groups[key] = g

        votos = row.partido_votos or 0
        g["votos"] += votos
        if row.partido_codigo not in g["codigos_originales"]:
            g["codigos_originales"].append(row.partido_codigo)
        # Nombre "preferido": el del row con más votos individuales (preserva el casing
        # más representativo cuando hay variaciones menores entre listas).
        if votos > g["_max_row_votos"]:
            g["_max_row_votos"] = votos
            g["nombre"] = row.partido_nombre

        for cand in top5:
            cod = cand.get("codigo", "") or ""
            if not cod:
                continue
            existing = g["candidatos"].get(cod)
            if existing is None:
                g["candidatos"][cod] = {
                    "codigo": cod,
                    "nombre": cand.get("nombre", ""),
                    "votos": int(cand.get("votos", 0) or 0),
                }
            else:
                existing["votos"] += int(cand.get("votos", 0) or 0)

    out: List[ResultadosPartidoSchema] = []
    for key, g in groups.items():
        merged_top5 = sorted(g["candidatos"].values(), key=lambda c: -c["votos"])[:5]
        pct = round(g["votos"] / votos_validos * 100, 1) if votos_validos > 0 else 0.0
        out.append(ResultadosPartidoSchema(
            partido_codigo=key,
            partido_nombre=g["nombre"],
            partido_votos=g["votos"],
            pct_partido=pct,
            top5_candidatos=[ResultadosCandidatoSchema(**c) for c in merged_top5],
            codigos_originales=sorted(g["codigos_originales"]),
        ))
    out.sort(key=lambda p: p.partido_votos, reverse=True)
    return out


def _build_resultados_response(
    rows: list,
    anio: int,
    nivel: str,
    nivel_codigo: str,
    nivel_nombre: str,
    corporacion: str,
) -> ResultadosElectoralesResponse:
    """Build response from a list of resultados ORM rows (same-nivel, same-corp)."""
    first = rows[0]
    votos_validos = first.votos_validos

    partidos = _aggregate_partidos_by_name(rows, votos_validos)

    return ResultadosElectoralesResponse(
        anio=anio,
        nivel=nivel,
        nivel_codigo=nivel_codigo,
        nivel_nombre=nivel_nombre,
        corporacion_codigo=corporacion,
        corporacion_nombre=first.corporacion_nombre,
        votos_total=first.votos_total,
        votos_validos=first.votos_validos,
        votos_nulos=first.votos_nulos,
        votos_blancos=first.votos_blancos,
        partidos=partidos,
    )


def _aggregate_zona(
    dep_rows_by_dep: dict[str, list],
    anio: int,
    zona_codigo: str,
    zona_nombre: str,
    corporacion: str,
) -> ResultadosElectoralesResponse:
    """
    Aggregate resultados_departamento rows for multiple departments into one zone response.
    dep_rows_by_dep: {dep_codigo -> [ORM rows for that dep]}
    """
    # Aggregate totals: sum unique-dep totals (totals are same for all rows of a dep)
    votos_total = 0
    votos_validos = 0
    votos_nulos = 0
    votos_blancos = 0
    corp_nombre = ""

    for dep_rows in dep_rows_by_dep.values():
        if dep_rows:
            r = dep_rows[0]
            votos_total += r.votos_total
            votos_validos += r.votos_validos
            votos_nulos += r.votos_nulos
            votos_blancos += r.votos_blancos
            corp_nombre = r.corporacion_nombre

    # Agrupa filas departamentales por nombre normalizado de partido (cubre el caso
    # Cámara donde la misma colectividad tiene un partido_codigo distinto por
    # departamento). Para corporaciones con código nacional único, es no-op.
    all_rows = [row for dep_rows in dep_rows_by_dep.values() for row in dep_rows]
    partidos = _aggregate_partidos_by_name(all_rows, votos_validos)

    return ResultadosElectoralesResponse(
        anio=anio,
        nivel="zona",
        nivel_codigo=zona_codigo,
        nivel_nombre=zona_nombre,
        corporacion_codigo=corporacion,
        corporacion_nombre=corp_nombre,
        votos_total=votos_total,
        votos_validos=votos_validos,
        votos_nulos=votos_nulos,
        votos_blancos=votos_blancos,
        partidos=partidos,
    )


@app.get("/api/v1/resultados/electorales", response_model=ResultadosElectoralesResponse)
def get_resultados_electorales(
    anio: int = Query(..., description="Año electoral (ej. 2022)"),
    nivel: str = Query(..., description="Nivel territorial: pais | zona | departamento | municipio | puesto"),
    nivel_codigo: str = Query(..., description="Código del nivel (CO para país, zona_codigo 01-06 para zona, código DANE para otros)"),
    corporacion: str = Query(..., description="Código de corporación: 001=SENADO, 002=CAMARA"),
    db: Session = Depends(get_db),
):
    """
    Retorna resultados electorales para un nivel territorial, año y corporación.
    Niveles: pais | zona | departamento | municipio | puesto.
    Para zona, nivel_codigo es el zona_codigo (01-06); agrega sobre departamentos de esa zona.
    """
    valid_niveles = list(_NIVEL_MODELO.keys()) + ["zona"]
    if nivel not in valid_niveles:
        raise HTTPException(status_code=422, detail=f"nivel debe ser uno de: {valid_niveles}")

    # ── Zona: aggregate on-the-fly from resultados_departamento ──────────────
    if nivel == "zona":
        zona_codigo = nivel_codigo.zfill(2)
        zona = db.query(TerritorioZonaORM).filter(TerritorioZonaORM.codigo == zona_codigo).first()
        zona_nombre = zona.nombre if zona else f"Zona {zona_codigo}"

        dep_codigos = [
            r.codigo for r in
            db.query(TerritorioDepartamentoORM).filter(
                TerritorioDepartamentoORM.zona_codigo == zona_codigo
            ).all()
        ]
        if not dep_codigos:
            raise HTTPException(status_code=404, detail=f"No se encontraron departamentos para zona {zona_codigo}")

        all_dep_rows = (
            db.query(ResultadosDepartamentoORM)
            .filter(
                ResultadosDepartamentoORM.anio == anio,
                ResultadosDepartamentoORM.corporacion_codigo == corporacion,
                ResultadosDepartamentoORM.dep_codigo.in_(dep_codigos),
            )
            .all()
        )
        if not all_dep_rows:
            raise HTTPException(status_code=404, detail=f"No hay resultados para zona={zona_codigo}, anio={anio}, corporacion={corporacion}")

        dep_rows_by_dep: dict[str, list] = defaultdict(list)
        for row in all_dep_rows:
            dep_rows_by_dep[row.dep_codigo].append(row)

        return _aggregate_zona(dep_rows_by_dep, anio, zona_codigo, zona_nombre, corporacion)

    # ── Standard niveles ─────────────────────────────────────────────────────
    modelo = _NIVEL_MODELO[nivel]
    codigo_field = _NIVEL_CODIGO_FIELD[nivel]

    query = db.query(modelo).filter(
        modelo.anio == anio,
        modelo.corporacion_codigo == corporacion,
    )
    if codigo_field:
        query = query.filter(getattr(modelo, codigo_field) == nivel_codigo)

    rows = query.order_by(modelo.partido_votos.desc()).all()

    if not rows:
        raise HTTPException(
            status_code=404,
            detail=f"No hay resultados para nivel={nivel}, nivel_codigo={nivel_codigo}, anio={anio}, corporacion={corporacion}",
        )

    first = rows[0]
    nombre_field = _NIVEL_NOMBRE_FIELD.get(nivel)
    if nombre_field:
        nivel_nombre = getattr(first, nombre_field, nivel_codigo)
    elif nivel == "pais":
        nivel_nombre = "Colombia"
    else:
        nivel_nombre = nivel_codigo

    return _build_resultados_response(rows, anio, nivel, nivel_codigo, nivel_nombre, corporacion)


# ---------------------------------------------------------------------------
# Personal Electoral — jurados y testigos
# ---------------------------------------------------------------------------

from fastapi import UploadFile, File
from app.db_models import PersonalElectoralORM
from app.personal_parser import parse_personal_file, TipoPersonal


class PersonalEstadoResponse(BaseModel):
    jurados: int
    testigos: int


class PersonalConteoResponse(BaseModel):
    jurados: int
    testigos: int


class PersonaResumen(BaseModel):
    cedula: str
    primer_nombre: str
    segundo_nombre: Optional[str]
    primer_apellido: str
    segundo_apellido: Optional[str]
    telefono: Optional[str]
    celular: Optional[str]
    correo: Optional[str]
    direccion: Optional[str]
    nivel_educativo: Optional[str]
    referenciado_por: Optional[str]
    codigo_puesto: str


class PersonalPuestoResponse(BaseModel):
    jurados: List[PersonaResumen]
    testigos: List[PersonaResumen]


class CargaErrorItem(BaseModel):
    fila: int
    razon: str


class CargaResponse(BaseModel):
    tipo: str
    insertados: int
    omitidos: int
    errores: List[CargaErrorItem]


@app.get("/api/v1/personal/estado", response_model=PersonalEstadoResponse)
def get_personal_estado(db: Session = Depends(get_db)):
    """Devuelve cuántos registros hay de cada tipo. Usado para estado vacío en UI."""
    jurados = db.query(func.count(PersonalElectoralORM.id)).filter(PersonalElectoralORM.tipo == "jurado").scalar() or 0
    testigos = db.query(func.count(PersonalElectoralORM.id)).filter(PersonalElectoralORM.tipo == "testigo").scalar() or 0
    return PersonalEstadoResponse(jurados=jurados, testigos=testigos)


@app.get("/api/v1/personal/conteos", response_model=PersonalConteoResponse)
def get_personal_conteos(
    nivel: str = Query(..., description="pais | zona | departamento | municipio"),
    codigo: str = Query(..., description="Código del territorio"),
    db: Session = Depends(get_db),
):
    """Devuelve conteo de jurados y testigos para un territorio dado."""
    valid_niveles = {"pais", "zona", "departamento", "municipio"}
    if nivel not in valid_niveles:
        raise HTTPException(status_code=422, detail=f"nivel debe ser uno de: {sorted(valid_niveles)}")

    # Validate that the requested territory code actually exists so the endpoint
    # fails loudly with 404 instead of silently returning zeros for unknown codes.
    if nivel == "zona":
        exists = db.query(TerritorioZonaORM.codigo).filter(TerritorioZonaORM.codigo == codigo).first()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Zona no encontrada: '{codigo}'")
    elif nivel == "departamento":
        exists = db.query(TerritorioDepartamentoORM.codigo).filter(TerritorioDepartamentoORM.codigo == codigo).first()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Departamento no encontrado: '{codigo}'")
    elif nivel == "municipio":
        exists = db.query(TerritorioMunicipioORM.codigo).filter(TerritorioMunicipioORM.codigo == codigo).first()
        if not exists:
            raise HTTPException(status_code=404, detail=f"Municipio no encontrado: '{codigo}'")

    def count_tipo(tipo: str) -> int:
        q = db.query(func.count(PersonalElectoralORM.id)).filter(PersonalElectoralORM.tipo == tipo)
        if nivel == "pais":
            pass  # no filter
        elif nivel == "zona":
            puesto_codigos = db.query(PuestoORM.codigo_puesto).filter(PuestoORM.zona_codigo == codigo)
            q = q.filter(PersonalElectoralORM.codigo_puesto.in_(puesto_codigos.scalar_subquery()))
        elif nivel == "departamento":
            puesto_codigos = db.query(PuestoORM.codigo_puesto).filter(PuestoORM.departamento_codigo == codigo)
            q = q.filter(PersonalElectoralORM.codigo_puesto.in_(puesto_codigos.scalar_subquery()))
        elif nivel == "municipio":
            puesto_codigos = db.query(PuestoORM.codigo_puesto).filter(PuestoORM.municipio_codigo == codigo)
            q = q.filter(PersonalElectoralORM.codigo_puesto.in_(puesto_codigos.scalar_subquery()))
        return q.scalar() or 0

    return PersonalConteoResponse(
        jurados=count_tipo("jurado"),
        testigos=count_tipo("testigo"),
    )


@app.get("/api/v1/personal/puesto/{codigo_puesto}", response_model=PersonalPuestoResponse)
def get_personal_por_puesto(codigo_puesto: str, db: Session = Depends(get_db)):
    """Devuelve listas de jurados y testigos asignados a un puesto específico."""
    def query_tipo(tipo: str) -> list[PersonaResumen]:
        rows = (
            db.query(PersonalElectoralORM)
            .filter(PersonalElectoralORM.codigo_puesto == codigo_puesto, PersonalElectoralORM.tipo == tipo)
            .order_by(PersonalElectoralORM.primer_apellido, PersonalElectoralORM.primer_nombre)
            .all()
        )
        return [
            PersonaResumen(
                cedula=r.cedula,
                primer_nombre=r.primer_nombre,
                segundo_nombre=r.segundo_nombre,
                primer_apellido=r.primer_apellido,
                segundo_apellido=r.segundo_apellido,
                telefono=r.telefono,
                celular=r.celular,
                correo=r.correo,
                direccion=r.direccion,
                nivel_educativo=r.nivel_educativo,
                referenciado_por=r.referenciado_por,
                codigo_puesto=r.codigo_puesto,
            )
            for r in rows
        ]

    return PersonalPuestoResponse(jurados=query_tipo("jurado"), testigos=query_tipo("testigo"))


@app.post("/api/v1/personal/cargar", response_model=CargaResponse)
async def cargar_personal(
    file: UploadFile = File(...),
    tipo_override: Optional[str] = Query(None, description="Forzar tipo: 'jurado' o 'testigo'"),
    db: Session = Depends(get_db),
):
    """Carga un archivo .xlsx o .csv de jurados o testigos.
    Reemplaza todos los registros existentes del mismo tipo detectado.
    """
    override: Optional[TipoPersonal] = None
    if tipo_override in ("jurado", "testigo"):
        override = tipo_override  # type: ignore[assignment]

    contents = await file.read()
    filename = file.filename or "upload.xlsx"

    try:
        result = parse_personal_file(contents, filename, db, tipo_override=override)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Replace: delete all existing records of the detected tipo
    db.query(PersonalElectoralORM).filter(PersonalElectoralORM.tipo == result.tipo).delete()

    # Insert resolved rows (upsert handled by delete-first)
    for fila in result.filas:
        db.add(PersonalElectoralORM(**fila))

    db.commit()
    result.insertados = len(result.filas)

    return CargaResponse(
        tipo=result.tipo,
        insertados=result.insertados,
        omitidos=result.omitidos,
        errores=[CargaErrorItem(**e) for e in result.errores],
    )


@app.delete("/api/v1/personal/{tipo}")
def eliminar_personal(
    tipo: str,
    db: Session = Depends(get_db),
):
    """Elimina todos los registros de un tipo. tipo='todos' elimina jurados y testigos."""
    if tipo == "todos":
        deleted = db.query(PersonalElectoralORM).delete()
    elif tipo in ("jurado", "testigo"):
        deleted = db.query(PersonalElectoralORM).filter(PersonalElectoralORM.tipo == tipo).delete()
    else:
        raise HTTPException(status_code=422, detail="tipo debe ser 'jurado', 'testigo' o 'todos'")
    db.commit()
    return {"eliminados": deleted}


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
