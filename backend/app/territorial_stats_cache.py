"""Territorial statistics cache utilities and aggregations."""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Callable

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.data_loader import build_departamentos_catalog, build_municipios_catalog, normalize_text
from app.db_models import PuestoORM, TerritorioStatsCacheORM

VALID_TERRITORIO_TIPOS = {"pais", "zona", "departamento", "municipio"}
SPECIAL_DEPARTAMENTO_CODES_ALLOW_EXACT_FALLBACK = {"88"}
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
    if len(expected_tokens) == 1 and expected_tokens[0] in candidate_tokens:
        if len(expected_tokens[0]) >= 6:
            return True
    if len(candidate_tokens) == 1 and candidate_tokens[0] in expected_tokens:
        if len(candidate_tokens[0]) >= 6:
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
    return similarity >= 0.9


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
        return normalized_tipo, str(int(raw_code))

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


def compute_territorio_analytics(
    tipo: str,
    codigo: str,
    db: Session,
    departamento_name_by_code: Callable[[], dict[str, str]],
    municipio_name_by_code: Callable[[str], str | None],
) -> dict:
    if tipo == "pais":
        rows = db.query(PuestoORM).all()
        return {
            "tipo": "pais",
            "codigo": "CO",
            "nombre": "Colombia",
            **aggregate_rows(rows),
        }

    if tipo == "zona":
        zone_id = int(codigo)
        _, departamentos = build_departamentos_catalog()
        zone_departamentos = [d for d in departamentos if (d.zone_id or 0) == zone_id]

        if not zone_departamentos:
            return {
                "tipo": "zona",
                "codigo": codigo,
                "nombre": f"Zona {zone_id}",
                **aggregate_rows([]),
            }

        zone_name = next(
            (
                (dept.zone_name or "").strip()
                for dept in zone_departamentos
                if (dept.zone_name or "").strip()
            ),
            f"Zona {zone_id}",
        )
        departamento_names_norm = {_normalize_text(dept.name) for dept in zone_departamentos}
        rows = [
            row
            for row in db.query(PuestoORM).all()
            if _normalize_text(row.departamento) in departamento_names_norm
        ]
        return {
            "tipo": "zona",
            "codigo": codigo,
            "nombre": zone_name,
            **aggregate_rows(rows),
        }

    if tipo == "departamento":
        nombre = departamento_name_by_code().get(codigo)
        nombre_norm = _normalize_text(nombre) if nombre else None
        exact_rows = db.query(PuestoORM).filter(PuestoORM.departamento_codigo == codigo).all()
        used_special_exact_fallback = False

        if nombre_norm:
            matched_exact_rows = [
                r for r in exact_rows if _normalize_text(r.departamento) == nombre_norm
            ]
            if matched_exact_rows:
                rows = matched_exact_rows
            else:
                rows = [
                    r for r in db.query(PuestoORM).all() if _normalize_text(r.departamento) == nombre_norm
                ]
                if not rows and codigo in SPECIAL_DEPARTAMENTO_CODES_ALLOW_EXACT_FALLBACK:
                    rows = exact_rows
                    used_special_exact_fallback = bool(rows)
        else:
            rows = exact_rows

        if (not nombre or used_special_exact_fallback) and rows:
            fallback_nombre = str(rows[0].departamento or "").strip()
            nombre = fallback_nombre or None

        return {
            "tipo": "departamento",
            "codigo": codigo,
            "nombre": nombre,
            **aggregate_rows(rows),
        }

    nombre = municipio_name_by_code(codigo)
    dept_nombre = departamento_name_by_code().get(codigo[:2])
    dept_norm = _normalize_text(dept_nombre) if dept_nombre else None

    def _mun_matches(row: PuestoORM) -> bool:
        if not _municipio_names_match(nombre, row.municipio):
            return False
        if dept_norm and _normalize_text(row.departamento) != dept_norm:
            return False
        return True

    exact_rows = db.query(PuestoORM).filter(PuestoORM.municipio_codigo == codigo).all()
    if nombre:
        matched_exact_rows = [r for r in exact_rows if _mun_matches(r)]
        if matched_exact_rows:
            rows = matched_exact_rows
        else:
            rows = [r for r in db.query(PuestoORM).all() if _mun_matches(r)]
    else:
        rows = exact_rows

    if not nombre and rows:
        fallback_nombre = str(rows[0].municipio or "").strip()
        nombre = fallback_nombre or None

    return {
        "tipo": "municipio",
        "codigo": codigo,
        "nombre": nombre,
        **aggregate_rows(rows),
    }


def refresh_territorio_stats_cache(
    db: Session,
    departamento_name_by_code: Callable[[], dict[str, str]],
    municipio_name_by_code: Callable[[str], str | None],
) -> dict[str, int]:
    counts = {"pais": 0, "zona": 0, "departamento": 0, "municipio": 0}

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
    summaries_by_departamento_norm: dict[str, list[dict[str, object]]] = {}
    summaries_by_municipio_codigo: dict[str, list[dict[str, object]]] = {}
    for row in summary_rows:
        summaries_by_departamento_codigo.setdefault(row["departamento_codigo"], []).append(row)
        summaries_by_departamento_norm.setdefault(_normalize_text(row["departamento"]), []).append(row)
        summaries_by_municipio_codigo.setdefault(row["municipio_codigo"], []).append(row)

    targets: list[tuple[str, str]] = [("pais", "CO")]

    _, departamentos = build_departamentos_catalog()
    zone_ids = sorted({int(dept.zone_id or 0) for dept in departamentos})
    targets.extend([("zona", str(zone_id)) for zone_id in zone_ids])

    dept_codes = sorted(
        {
            code
            for code in (set(departamento_name_by_code().keys()) | set(summaries_by_departamento_codigo.keys()))
            if re.fullmatch(r"\d{2}", str(code))
        }
    )
    targets.extend([("departamento", code) for code in dept_codes])

    municipio_codes = sorted({
        code
        for code in (
            {
                str(municipio.code).strip().zfill(5)
                for municipio in build_municipios_catalog()
                if municipio.code
            }
            | set(summaries_by_municipio_codigo.keys())
        )
        if re.fullmatch(r"\d{5}", str(code))
    })
    targets.extend([("municipio", code) for code in municipio_codes])

    for tipo, codigo in targets:
        if tipo == "pais":
            payload = {
                "tipo": "pais",
                "codigo": "CO",
                "nombre": "Colombia",
                **_aggregate_summary_rows(summary_rows),
            }
        elif tipo == "zona":
            zone_id = int(codigo)
            zone_departamentos = [d for d in departamentos if (d.zone_id or 0) == zone_id]
            if not zone_departamentos:
                payload = {
                    "tipo": "zona",
                    "codigo": codigo,
                    "nombre": f"Zona {zone_id}",
                    **_aggregate_summary_rows([]),
                }
            else:
                zone_name = next(
                    (
                        (dept.zone_name or "").strip()
                        for dept in zone_departamentos
                        if (dept.zone_name or "").strip()
                    ),
                    f"Zona {zone_id}",
                )
                departamento_names_norm = {_normalize_text(dept.name) for dept in zone_departamentos}
                zone_rows = [
                    row for row in summary_rows
                    if _normalize_text(row["departamento"]) in departamento_names_norm
                ]
                payload = {
                    "tipo": "zona",
                    "codigo": codigo,
                    "nombre": zone_name,
                    **_aggregate_summary_rows(zone_rows),
                }
        elif tipo == "departamento":
            nombre = departamento_name_by_code().get(codigo)
            nombre_norm = _normalize_text(nombre) if nombre else None
            exact_dept_rows = summaries_by_departamento_codigo.get(codigo, [])
            used_special_exact_fallback = False

            if nombre_norm:
                matched = [
                    r for r in exact_dept_rows if _normalize_text(r["departamento"]) == nombre_norm
                ]
                if matched:
                    dept_rows = matched
                else:
                    dept_rows = summaries_by_departamento_norm.get(nombre_norm, [])
                    if (
                        not dept_rows
                        and codigo in SPECIAL_DEPARTAMENTO_CODES_ALLOW_EXACT_FALLBACK
                    ):
                        dept_rows = exact_dept_rows
                        used_special_exact_fallback = bool(dept_rows)
            else:
                dept_rows = exact_dept_rows

            if (not nombre or used_special_exact_fallback) and dept_rows:
                fallback_nombre = next(
                    (str(row.get("departamento") or "").strip() for row in dept_rows if str(row.get("departamento") or "").strip()),
                    "",
                )
                nombre = fallback_nombre or None

            payload = {
                "tipo": "departamento",
                "codigo": codigo,
                "nombre": nombre,
                **_aggregate_summary_rows(dept_rows),
            }
        else:
            nombre = municipio_name_by_code(codigo)
            dept_nombre = departamento_name_by_code().get(codigo[:2])
            dept_norm = _normalize_text(dept_nombre) if dept_nombre else None

            def _summary_matches(row: dict[str, object]) -> bool:
                if not _municipio_names_match(nombre, str(row["municipio"])):
                    return False
                if dept_norm and _normalize_text(str(row["departamento"])) != dept_norm:
                    return False
                return True

            exact_mun_rows = summaries_by_municipio_codigo.get(codigo, [])
            if nombre:
                matched = [row for row in exact_mun_rows if _summary_matches(row)]
                if matched:
                    mun_rows = matched
                elif dept_norm:
                    mun_rows = [
                        row
                        for row in summaries_by_departamento_norm.get(dept_norm, [])
                        if _summary_matches(row)
                    ]
                else:
                    mun_rows = []
            else:
                mun_rows = exact_mun_rows

            if not mun_rows and nombre and dept_norm:
                mun_rows = [
                    row
                    for row in summaries_by_departamento_norm.get(dept_norm, [])
                    if _summary_matches(row)
                ]

            if not nombre and mun_rows:
                fallback_nombre = next(
                    (str(row.get("municipio") or "").strip() for row in mun_rows if str(row.get("municipio") or "").strip()),
                    "",
                )
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
