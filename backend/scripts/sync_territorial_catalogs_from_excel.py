#!/usr/bin/env python3
"""Carga/sincroniza catálogos territoriales Excel en BD."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy import text

sys.path.append(str(Path(__file__).parent.parent))

from app.data_loader import load_puestos_electorales, load_zonas_departamentos, normalize_text
from app.database import SessionLocal
from app.db_models import (
    TerritorioDepartamentoORM,
    TerritorioMunicipioORM,
    TerritorioZonaORM,
)


def _zone_lookup_by_departamento_norm() -> dict[str, tuple[str, str]]:
    zones = load_zonas_departamentos().copy()
    if zones.empty:
        return {}

    zones = zones.dropna(subset=["departamento_norm", "zone_id"]).copy()
    zones["zone_id"] = zones["zone_id"].astype(int)
    zones = zones.sort_values(["departamento_norm", "zone_id"]).drop_duplicates(
        subset=["departamento_norm"],
        keep="first",
    )

    lookup: dict[str, tuple[str, str]] = {}
    for row in zones.itertuples(index=False):
        dept_norm = str(getattr(row, "departamento_norm", "")).strip()
        if not dept_norm:
            continue
        zone_id = int(getattr(row, "zone_id"))
        zone_code = str(zone_id).zfill(2)
        zone_name = str(getattr(row, "zone_name", "")).strip() or f"Zona {zone_id}"
        lookup[dept_norm] = (zone_code, zone_name)

    return lookup


def _pick_mode_or_none(values: list[str]) -> str | None:
    cleaned = [v.strip() for v in values if v and str(v).strip()]
    if not cleaned:
        return None
    counts: dict[str, int] = {}
    for value in cleaned:
        counts[value] = counts.get(value, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))[0][0]


def build_catalog_rows() -> tuple[list[dict], list[dict], list[dict]]:
    puestos = load_puestos_electorales().copy()
    zone_by_dept_norm = _zone_lookup_by_departamento_norm()

    puestos["departamento_codigo"] = puestos["departamento_codigo"].astype(str).str.zfill(2)
    puestos["municipio_codigo"] = puestos["municipio_codigo"].astype(str).str.zfill(5)
    puestos["departamento"] = puestos["departamento"].astype(str).str.strip()
    puestos["municipio"] = puestos["municipio"].astype(str).str.strip()

    departamentos_rows: list[dict] = []
    zonas_rows: list[dict] = []
    municipios_rows: list[dict] = []

    dept_group = puestos.groupby("departamento_codigo", dropna=False)
    seen_zonas: set[str] = set()

    for dept_code, group in dept_group:
        dept_name = _pick_mode_or_none(group["departamento"].tolist()) or f"DEP-{dept_code}"
        dept_norm = normalize_text(dept_name)
        zone_data = zone_by_dept_norm.get(dept_norm)
        dept_zone = zone_data[0] if zone_data else None
        dept_zone_name = zone_data[1] if zone_data else None

        departamentos_rows.append(
            {
                "codigo": str(dept_code).zfill(2),
                "nombre": dept_name,
                "zona_codigo": dept_zone,
            }
        )

        if dept_zone and dept_zone not in seen_zonas:
            seen_zonas.add(dept_zone)
            zonas_rows.append(
                {
                    "codigo": dept_zone,
                    "nombre": dept_zone_name or f"Zona {int(dept_zone)}",
                }
            )

    mun_group = puestos.groupby("municipio_codigo", dropna=False)
    for mun_code, group in mun_group:
        mun_name = _pick_mode_or_none(group["municipio"].tolist()) or f"MUN-{mun_code}"
        dept_code = str(mun_code).zfill(5)[:2]
        municipios_rows.append(
            {
                "codigo": str(mun_code).zfill(5),
                "departamento_codigo": dept_code,
                "nombre": mun_name,
            }
        )

    departamentos_rows.sort(key=lambda row: row["codigo"])
    municipios_rows.sort(key=lambda row: row["codigo"])
    zonas_rows.sort(key=lambda row: row["codigo"])

    return zonas_rows, departamentos_rows, municipios_rows


def sync_catalogs(dry_run: bool = False) -> dict[str, int]:
    zonas_rows, departamentos_rows, municipios_rows = build_catalog_rows()
    active_zone_codes = {str(row["codigo"]).zfill(2) for row in zonas_rows}

    stats = {
        "zonas": len(zonas_rows),
        "departamentos": len(departamentos_rows),
        "municipios": len(municipios_rows),
    }

    if dry_run:
        return stats

    db = SessionLocal()
    try:
        dialect_name = db.bind.dialect.name if db.bind is not None else ""
        insert_fn = sqlite_insert if dialect_name == "sqlite" else pg_insert

        if zonas_rows:
            stmt = insert_fn(TerritorioZonaORM).values(zonas_rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["codigo"],
                set_={"nombre": stmt.excluded.nombre},
            )
            db.execute(stmt)

        if departamentos_rows:
            stmt = insert_fn(TerritorioDepartamentoORM).values(departamentos_rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["codigo"],
                set_={
                    "nombre": stmt.excluded.nombre,
                    "zona_codigo": stmt.excluded.zona_codigo,
                },
            )
            db.execute(stmt)

        if municipios_rows:
            stmt = insert_fn(TerritorioMunicipioORM).values(municipios_rows)
            stmt = stmt.on_conflict_do_update(
                index_elements=["codigo"],
                set_={
                    "nombre": stmt.excluded.nombre,
                    "departamento_codigo": stmt.excluded.departamento_codigo,
                },
            )
            db.execute(stmt)

        if active_zone_codes:
            placeholders = ", ".join([f":z{i}" for i in range(len(active_zone_codes))])
            params = {f"z{i}": code for i, code in enumerate(sorted(active_zone_codes))}
            db.execute(
                text(
                    f"DELETE FROM territorio_zona WHERE codigo NOT IN ({placeholders})"
                ),
                params,
            )
        else:
            db.execute(text("DELETE FROM territorio_zona"))

        db.commit()
        return stats
    finally:
        db.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Sincronizar catálogos territoriales (dd/mm/zz) desde Excel")
    parser.add_argument("--dry-run", action="store_true", help="No escribe en BD, solo resume")
    args = parser.parse_args()

    stats = sync_catalogs(dry_run=args.dry_run)

    mode = "DRY-RUN" if args.dry_run else "APLICADO"
    print(f"✅ Sync catálogos ({mode})")
    print(f"   Zonas: {stats['zonas']}")
    print(f"   Departamentos: {stats['departamentos']}")
    print(f"   Municipios: {stats['municipios']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
