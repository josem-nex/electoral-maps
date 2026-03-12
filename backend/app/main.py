"""Main FastAPI application."""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from functools import lru_cache
from typing import Any, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

# try:
from app.config import settings
from app.database import Base, get_db  # noqa: F401 – re-exported for tests
from app.db_models import (
    CatalogoNivelTerritorial,
    CatalogoTipoJurisdiccion,
    JurisdiccionORM,
    PersonaORM,
    PuestoORM,
)
from app.data_loader import (
    build_departamentos_catalog,
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


@lru_cache(maxsize=1)
def _departamento_name_by_code() -> dict[str, str]:
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
            mapping[code] = name
    return mapping


def _municipio_name_by_code(municipio_code: str) -> str | None:
    dept_code = municipio_code[:2]
    geojson = get_municipios_geojson_by_departamento(dept_code)
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        feature_code = normalize_codigo_territorial(
            props.get("municipio_codigo")
            or props.get("canonical_id")
            or props.get("MPIO_CDPMP")
            or props.get("CODIGO_DANE")
            or props.get("COD_DANE")
            or props.get("MPIO"),
            5,
        )
        if feature_code == municipio_code:
            name = (
                props.get("municipio_nombre")
                or props.get("NOMBRE_MPI")
                or props.get("MPIO_CNMBR")
                or props.get("nombre")
            )
            if name:
                return str(name).strip()
    return None


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
def get_departamentos_catalog():
    """Return departamentos catalog enriched with zone mapping."""
    _, departamentos = build_departamentos_catalog()
    return [item.model_dump() for item in departamentos]


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

        municipio_name = _municipio_name_by_code(normalized_municipio_code)
        departamento_name = _departamento_name_by_code().get(normalized_municipio_code[:2])
        municipio_norm = _normalize_text(municipio_name)
        departamento_norm = _normalize_text(departamento_name)

        q_municipio = q.filter(PuestoORM.municipio_codigo == normalized_municipio_code)

        exact_rows = q_municipio.all()
        if exact_rows:
            if municipio_norm:
                exact_matching_rows = []
                for row in exact_rows:
                    if not _municipio_names_match(municipio_name, row.municipio):
                        continue
                    if departamento_norm and _normalize_text(row.departamento) != departamento_norm:
                        continue
                    exact_matching_rows.append(row)

                if exact_matching_rows:
                    effective_limit = min(limit, LIMIT_CAP)
                    return PuestosPage(
                        total=len(exact_matching_rows),
                        limit=effective_limit,
                        items=exact_matching_rows[:effective_limit],
                    )
            else:
                q = q_municipio
                effective_limit = min(limit, LIMIT_CAP)
                total = q.count()
                items = q.limit(effective_limit).all()
                return PuestosPage(total=total, limit=effective_limit, items=[PuestoRead.model_validate(item) for item in items])

        if municipio_name:
            fallback_rows = []
            for row in q.all():
                if not _municipio_names_match(municipio_name, row.municipio):
                    continue
                if departamento_norm and _normalize_text(row.departamento) != departamento_norm:
                    continue
                fallback_rows.append(row)

            effective_limit = min(limit, LIMIT_CAP)
            return PuestosPage(
                total=len(fallback_rows),
                limit=effective_limit,
                items=fallback_rows[:effective_limit],
            )

        effective_limit = min(limit, LIMIT_CAP)
        return PuestosPage(total=0, limit=effective_limit, items=[])

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
        # Search geographic catalog (CSV-backed) for autocomplete compatibility
        try:
            try:
                from app.data_loader import build_departamentos_catalog, build_municipios_catalog, normalize_text
            except ModuleNotFoundError:
                from data_loader import build_departamentos_catalog, build_municipios_catalog, normalize_text  # type: ignore

            q_norm = normalize_text(effective_query)
            _, departamentos = build_departamentos_catalog()
            dept_by_code = {dept.code: dept.name for dept in departamentos}

            for dept in departamentos:
                dept_name_norm = normalize_text(dept.name)
                if q_norm in dept_name_norm or dept.code.startswith(q_norm):
                    results.append(
                        SearchItem(
                            id=dept.id,
                            type="departamento",
                            nombre_completo=dept.name,
                            geo_code=dept.code,
                            center_lat=dept.center_lat,
                            center_lon=dept.center_lon,
                            zoom=dept.zoom,
                        )
                    )
                    total += 1

            for mun in build_municipios_catalog():
                mun_name_norm = normalize_text(mun.name)
                if q_norm in mun_name_norm or mun.code.startswith(q_norm):
                    results.append(
                        SearchItem(
                            id=mun.id,
                            type="municipio",
                            nombre_completo=mun.name,
                            geo_code=mun.code,
                            parent_code=mun.parent_code,
                            parent_name=dept_by_code.get(mun.parent_code or ""),
                            center_lat=mun.center_lat,
                            center_lon=mun.center_lon,
                            zoom=mun.zoom,
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
        if normalized_tipo in {"municipio", "departamento"}:
            recomputed = compute_territorio_analytics(
                tipo=normalized_tipo,
                codigo=normalized_codigo,
                db=db,
                departamento_name_by_code=_departamento_name_by_code,
                municipio_name_by_code=_municipio_name_by_code,
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
        departamento_name_by_code=_departamento_name_by_code,
        municipio_name_by_code=_municipio_name_by_code,
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


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=settings.api_host, port=settings.api_port)
