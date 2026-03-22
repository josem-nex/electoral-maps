"""Territorial statistics cache utilities and aggregations."""
from __future__ import annotations

import re

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.data_loader import normalize_text
from app.db_models import (
    PuestoORM,
    TerritorioDepartamentoORM,
    TerritorioMunicipioORM,
    TerritorioStatsCacheORM,
    TerritorioZonaORM,
)

VALID_TERRITORIO_TIPOS = {"pais", "zona", "departamento", "municipio"}


def _normalize_text(value: str | None) -> str:
    return normalize_text(value)


def _municipio_names_match(expected_name: str | None, candidate_name: str | None) -> bool:
    expected = _normalize_text(expected_name)
    candidate = _normalize_text(candidate_name)
    if not expected or not candidate:
        return False
    if expected == candidate:
        return True
    return expected in candidate or candidate in expected


def aggregate_rows(rows: list[PuestoORM]) -> dict[str, int]:
    return dict(
        puestos_count=len(rows),
        mesas_sum=sum(r.mesas or 0 for r in rows),
        total_sum=sum(r.total or 0 for r in rows),
        mujeres_sum=sum(r.mujeres or 0 for r in rows),
        hombres_sum=sum(r.hombres or 0 for r in rows),
    )


def _aggregate_summary_rows(rows: list[dict[str, object]]) -> dict[str, int]:
    return dict(
        puestos_count=sum(int(row["puestos_count"] or 0) for row in rows),
        mesas_sum=sum(int(row["mesas_sum"] or 0) for row in rows),
        total_sum=sum(int(row["total_sum"] or 0) for row in rows),
        mujeres_sum=sum(int(row["mujeres_sum"] or 0) for row in rows),
        hombres_sum=sum(int(row["hombres_sum"] or 0) for row in rows),
    )


def normalize_tipo_codigo(tipo: str, codigo: str) -> tuple[str, str]:
    normalized_tipo = (tipo or "").strip().lower()
    raw_code = (codigo or "").strip()

    if normalized_tipo not in VALID_TERRITORIO_TIPOS:
        raise ValueError(f"tipo debe ser uno de: {sorted(VALID_TERRITORIO_TIPOS)}")

    if normalized_tipo == "pais":
        if raw_code and raw_code.upper() not in {"CO", "COL", "COLOMBIA"}:
            raise ValueError("Para tipo=pais, codigo debe ser 'CO' (o vacío)")
        return normalized_tipo, "CO"

    if normalized_tipo == "zona":
        if not re.fullmatch(r"\d{1,3}", raw_code):
            raise ValueError("Para tipo=zona, codigo debe ser numérico de 1 a 3 dígitos")
        zone_digits = str(int(raw_code))
        return normalized_tipo, zone_digits.zfill(2) if len(zone_digits) <= 2 else zone_digits

    if normalized_tipo == "departamento":
        if not re.fullmatch(r"\d{1,2}", raw_code):
            raise ValueError("Para tipo=departamento, codigo debe ser numérico de 1 o 2 dígitos")
        return normalized_tipo, raw_code.zfill(2)

    if not re.fullmatch(r"\d{1,5}", raw_code):
        raise ValueError("Para tipo=municipio, codigo debe ser numérico de hasta 5 dígitos")
    return normalized_tipo, raw_code.zfill(5)


def get_cached_territorio_stats(db: Session, tipo: str, codigo: str) -> dict | None:
    row = db.query(TerritorioStatsCacheORM).filter_by(tipo=tipo, codigo=codigo).first()
    if row is None:
        return None
    return {
        "tipo": row.tipo,
        "codigo": row.codigo,
        "nombre": row.nombre,
        "puestos_count": row.puestos_count,
        "mesas_sum": row.mesas_sum,
        "total_sum": row.total_sum,
        "mujeres_sum": row.mujeres_sum,
        "hombres_sum": row.hombres_sum,
    }


def upsert_territorio_stats_cache(db: Session, payload: dict) -> None:
    row = db.query(TerritorioStatsCacheORM).filter_by(
        tipo=payload["tipo"],
        codigo=payload["codigo"],
    ).first()

    if row is None:
        row = TerritorioStatsCacheORM(**payload)
        db.add(row)
        return

    row.nombre = payload.get("nombre")
    row.puestos_count = payload["puestos_count"]
    row.mesas_sum = payload["mesas_sum"]
    row.total_sum = payload["total_sum"]
    row.mujeres_sum = payload["mujeres_sum"]
    row.hombres_sum = payload["hombres_sum"]


def _departamento_name_by_code(db: Session) -> dict[str, str]:
    return {
        str(row.codigo).zfill(2): str(row.nombre).strip()
        for row in db.query(TerritorioDepartamentoORM).all()
        if row.codigo
    }


def _municipio_name_by_code(db: Session) -> dict[str, str]:
    return {
        str(row.codigo).zfill(5): str(row.nombre).strip()
        for row in db.query(TerritorioMunicipioORM).all()
        if row.codigo
    }


def _zona_name_by_code(db: Session) -> dict[str, str]:
    return {
        str(row.codigo).zfill(2): str(row.nombre).strip()
        for row in db.query(TerritorioZonaORM).all()
        if row.codigo
    }


def _departments_by_zone(db: Session) -> dict[str, set[str]]:
    mapping: dict[str, set[str]] = {}
    for row in db.query(TerritorioDepartamentoORM).all():
        if not row.zona_codigo:
            continue
        zone_code = str(row.zona_codigo).zfill(2)
        mapping.setdefault(zone_code, set()).add(str(row.codigo).zfill(2))
    return mapping


def compute_territorio_analytics(
    tipo: str,
    codigo: str,
    db: Session,
) -> dict:
    departamento_names = _departamento_name_by_code(db)
    municipio_names = _municipio_name_by_code(db)
    zona_names = _zona_name_by_code(db)

    if tipo == "pais":
        rows = db.query(PuestoORM).all()
        return {
            "tipo": "pais",
            "codigo": "CO",
            "nombre": "Colombia",
            **aggregate_rows(rows),
        }

    if tipo == "zona":
        zone_code = codigo.zfill(2) if len(codigo) <= 2 else codigo
        departments_by_zone = _departments_by_zone(db)
        dept_codes = departments_by_zone.get(zone_code, set())
        if not dept_codes:
            return {
                "tipo": "zona",
                "codigo": zone_code,
                "nombre": zona_names.get(zone_code) or f"Zona {int(zone_code)}",
                **aggregate_rows([]),
            }
        rows = db.query(PuestoORM).filter(PuestoORM.departamento_codigo.in_(dept_codes)).all()
        return {
            "tipo": "zona",
            "codigo": zone_code,
            "nombre": zona_names.get(zone_code) or f"Zona {int(zone_code)}",
            **aggregate_rows(rows),
        }

    if tipo == "departamento":
        dept_code = codigo.zfill(2)
        rows = db.query(PuestoORM).filter(PuestoORM.departamento_codigo == dept_code).all()
        nombre = departamento_names.get(dept_code)
        if not nombre and rows:
            nombre = str(rows[0].departamento or "").strip() or None

        return {
            "tipo": "departamento",
            "codigo": dept_code,
            "nombre": nombre,
            **aggregate_rows(rows),
        }

    mun_code = codigo.zfill(5)
    nombre = municipio_names.get(mun_code)
    rows = db.query(PuestoORM).filter(PuestoORM.municipio_codigo == mun_code).all()
    if not nombre and rows:
        nombre = str(rows[0].municipio or "").strip() or None

    return {
        "tipo": "municipio",
        "codigo": mun_code,
        "nombre": nombre,
        **aggregate_rows(rows),
    }


def refresh_territorio_stats_cache(
    db: Session,
) -> dict[str, int]:
    counts = {"pais": 0, "zona": 0, "departamento": 0, "municipio": 0}
    departamento_names = _departamento_name_by_code(db)
    municipio_names = _municipio_name_by_code(db)
    zona_names = _zona_name_by_code(db)
    dept_by_zone = _departments_by_zone(db)

    summary_rows = [
        {
            "departamento_codigo": str(row.departamento_codigo or "").strip().zfill(2),
            "departamento": row.departamento,
            "municipio_codigo": str(row.municipio_codigo or "").strip().zfill(5),
            "municipio": row.municipio,
            "puestos_count": int(row.puestos_count or 0),
            "mesas_sum": int(row.mesas_sum or 0),
            "total_sum": int(row.total_sum or 0),
            "mujeres_sum": int(row.mujeres_sum or 0),
            "hombres_sum": int(row.hombres_sum or 0),
        }
        for row in db.query(
            PuestoORM.departamento_codigo.label("departamento_codigo"),
            PuestoORM.departamento.label("departamento"),
            PuestoORM.municipio_codigo.label("municipio_codigo"),
            PuestoORM.municipio.label("municipio"),
            func.count(PuestoORM.id).label("puestos_count"),
            func.coalesce(func.sum(PuestoORM.mesas), 0).label("mesas_sum"),
            func.coalesce(func.sum(PuestoORM.total), 0).label("total_sum"),
            func.coalesce(func.sum(PuestoORM.mujeres), 0).label("mujeres_sum"),
            func.coalesce(func.sum(PuestoORM.hombres), 0).label("hombres_sum"),
        )
        .group_by(
            PuestoORM.departamento_codigo,
            PuestoORM.departamento,
            PuestoORM.municipio_codigo,
            PuestoORM.municipio,
        )
        .all()
    ]

    summaries_by_departamento_codigo: dict[str, list[dict[str, object]]] = {}
    summaries_by_municipio_codigo: dict[str, list[dict[str, object]]] = {}
    summaries_by_zona_codigo: dict[str, list[dict[str, object]]] = {}
    for row in summary_rows:
        summaries_by_departamento_codigo.setdefault(row["departamento_codigo"], []).append(row)
        summaries_by_municipio_codigo.setdefault(row["municipio_codigo"], []).append(row)
        zone_code = None
        for z_code, dept_codes in dept_by_zone.items():
            if row["departamento_codigo"] in dept_codes:
                zone_code = z_code
                break
        if zone_code:
            summaries_by_zona_codigo.setdefault(zone_code, []).append(row)

    targets: list[tuple[str, str]] = [("pais", "CO")]

    zone_codes = sorted(set(zona_names.keys()) | set(summaries_by_zona_codigo.keys()))
    targets.extend([("zona", code) for code in zone_codes])

    dept_codes = sorted(
        {
            code
            for code in (set(departamento_names.keys()) | set(summaries_by_departamento_codigo.keys()))
            if re.fullmatch(r"\d{2}", str(code))
        }
    )
    targets.extend([("departamento", code) for code in dept_codes])

    municipio_codes = sorted(
        {
            code
            for code in (set(municipio_names.keys()) | set(summaries_by_municipio_codigo.keys()))
            if re.fullmatch(r"\d{5}", str(code))
        }
    )
    targets.extend([("municipio", code) for code in municipio_codes])

    db.query(TerritorioStatsCacheORM).delete()

    for tipo, codigo in targets:
        if tipo == "pais":
            payload = {
                "tipo": "pais",
                "codigo": "CO",
                "nombre": "Colombia",
                **_aggregate_summary_rows(summary_rows),
            }
        elif tipo == "zona":
            zone_rows = summaries_by_zona_codigo.get(codigo, [])
            zone_name = zona_names.get(codigo)
            if not zone_rows:
                payload = {
                    "tipo": "zona",
                    "codigo": codigo,
                    "nombre": zone_name or f"Zona {int(codigo)}",
                    **_aggregate_summary_rows([]),
                }
            else:
                payload = {
                    "tipo": "zona",
                    "codigo": codigo,
                    "nombre": zone_name or f"Zona {int(codigo)}",
                    **_aggregate_summary_rows(zone_rows),
                }
        elif tipo == "departamento":
            nombre = departamento_names.get(codigo)
            dept_rows = summaries_by_departamento_codigo.get(codigo, [])
            if not nombre and dept_rows:
                fallback_nombre = str(dept_rows[0].get("departamento") or "").strip()
                nombre = fallback_nombre or None

            payload = {
                "tipo": "departamento",
                "codigo": codigo,
                "nombre": nombre,
                **_aggregate_summary_rows(dept_rows),
            }
        else:
            nombre = municipio_names.get(codigo)
            mun_rows = summaries_by_municipio_codigo.get(codigo, [])
            if not nombre and mun_rows:
                fallback_nombre = str(mun_rows[0].get("municipio") or "").strip()
                nombre = fallback_nombre or None

            payload = {
                "tipo": "municipio",
                "codigo": codigo,
                "nombre": nombre,
                **_aggregate_summary_rows(mun_rows),
            }

        upsert_territorio_stats_cache(db, payload)
        counts[tipo] += 1

    db.commit()
    return counts
