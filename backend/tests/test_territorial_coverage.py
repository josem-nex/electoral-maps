"""Test coverage report for territorial statistics using REAL database.

This test generates a report by:
1. Connecting to the REAL database (same as web uses)
2. Using the SAME analytics_territorio endpoint logic
3. Showing which departments/municipalities have electoral data
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.data_loader import build_departamentos_catalog, build_municipios_catalog
from app.db_models import PuestoORM
from app.main import _aggregate_rows
from app.territorial_stats_cache import _municipio_names_match, _normalize_text


def test_territorial_coverage_with_real_database():
    """
    Generate coverage report using REAL database (not test fixtures).
    
    This test:
    1. Connects to the actual database specified in settings
    2. Uses the same aggregation logic as analytics_territorio
    3. Reports on all departments and municipalities that have electoral data
    4. Shows which territories have data and which don't
    
    This ensures the test results match what the web shows.
    """
    # Connect to REAL database (same as web)
    engine = create_engine(settings.database_url, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get all unique departments from puestos table
        dept_result = db.execute(text('''
            SELECT DISTINCT departamento_codigo, departamento
            FROM puestos_electorales
            ORDER BY departamento_codigo
        '''))
        dept_rows = dept_result.fetchall()
        
        # Get all unique municipalities from puestos table
        mun_result = db.execute(text('''
            SELECT DISTINCT municipio_codigo, municipio, departamento_codigo, departamento
            FROM puestos_electorales
            ORDER BY departamento_codigo, municipio_codigo
        '''))
        mun_rows = mun_result.fetchall()
        
        report = {
            "timestamp": "2026-03-09",
            "database": str(settings.database_url),
            "departments": [],
            "municipalities": [],
        }
        
        # Query each department that has data in DB
        for dept_codigo, dept_nombre in dept_rows:
            # Get puestos for this department (same as analytics_territorio does)
            puestos = db.query(PuestoORM).filter(
                PuestoORM.departamento_codigo == dept_codigo
            ).all()
            
            if puestos:
                agg = _aggregate_rows(puestos)
                report["departments"].append({
                    "codigo": dept_codigo,
                    "nombre": dept_nombre,
                    "puestos_count": agg["puestos_count"],
                    "mesas_sum": agg["mesas_sum"],
                    "total_sum": agg["total_sum"],
                    "mujeres_sum": agg["mujeres_sum"],
                    "hombres_sum": agg["hombres_sum"],
                    "status": "✓",
                })
        
        # Query each municipality that has data in DB
        for mun_codigo, mun_nombre, dept_codigo, dept_nombre in mun_rows:
            # Get puestos for this municipality (same as analytics_territorio does)
            puestos = db.query(PuestoORM).filter(
                PuestoORM.municipio_codigo == mun_codigo
            ).all()
            
            if puestos:
                agg = _aggregate_rows(puestos)
                report["municipalities"].append({
                    "codigo": mun_codigo,
                    "nombre": mun_nombre,
                    "departamento_codigo": dept_codigo,
                    "departamento": dept_nombre,
                    "puestos_count": agg["puestos_count"],
                    "mesas_sum": agg["mesas_sum"],
                    "total_sum": agg["total_sum"],
                    "mujeres_sum": agg["mujeres_sum"],
                    "hombres_sum": agg["hombres_sum"],
                    "status": "✓",
                })
        
        # Print report
        print("\n" + "="*100)
        print("TERRITORIAL COVERAGE REPORT - REAL DATABASE")
        print("="*100)
        print(f"Database: {settings.database_url}\n")
        
        depts_count = len(report["departments"])
        muns_count = len(report["municipalities"])
        total_puestos = sum(d["puestos_count"] for d in report["departments"])
        total_votos = sum(d["total_sum"] for d in report["departments"])
        
        print(f"📊 SUMMARY")
        print(f"   Total Departments with data: {depts_count}")
        print(f"   Total Municipalities with data: {muns_count}")
        print(f"   Total Puestos de Votación: {total_puestos}")
        print(f"   Total Electoral Votes: {total_votos:,}\n")
        
        # Departments
        print(f"📍 DEPARTMENTS ({depts_count} with electoral data)")
        print("-" * 100)
        if depts_count > 0:
            for dept in sorted(report["departments"], key=lambda x: str(x.get("codigo", ""))):
                print(f"  ✓ {dept['codigo']:>3} | {dept['nombre']:<30} | "
                      f"{dept['puestos_count']:>6} puestos | {dept['total_sum']:>10,} votos")
        
        # Municipalities (sample)
        print(f"\n🏙️  MUNICIPALITIES ({muns_count} with electoral data)")
        print("-" * 100)
        if muns_count > 0:
            for mun in sorted(report["municipalities"][:20], key=lambda x: x["nombre"]):
                print(f"    {mun['codigo']:>6} | {mun['nombre']:<40} | "
                      f"{mun['departamento']:<20} | {mun['puestos_count']:>4} puestos")
            if muns_count > 20:
                print(f"    ... and {muns_count - 20} more municipalities")
        
        print("\n" + "="*100)
        print(f"Report timestamp: {report['timestamp']}")
        print("="*100 + "\n")
        
        # Save report
        report_path = Path(__file__).parent / "territorial_coverage_report_real.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"📄 Full report saved to: {report_path}\n")
        
        # Verify we have data
        assert depts_count > 0, "No departments with electoral data found in database"
        
    finally:
        db.close()


def test_catalog_municipios_coverage_gap_report():
    """
    Compare DIVIPOLA municipality catalog against real DB puestos.

    For EVERY municipality in the official DIVIPOLA catalog, checks whether the
    application can resolve any puestos using the same matching logic as the
    analytics_teritorio endpoint (exact code → name fallback → token containment).

    Prints a gap report with:
      - Total catalog entries
      - Municipalities WITH data (and their puestos count)
      - Municipalities WITHOUT data (vacíos) — the main value of this test

    The test never fails; it is a diagnostic/reporting test. Run with -s to see output.
    """
    engine = create_engine(settings.database_url, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # ── 1. Load catalog ──────────────────────────────────────────────────────
        catalog_municipios = build_municipios_catalog()
        _, catalog_departamentos = build_departamentos_catalog()

        dept_name_by_code: dict[str, str] = {d.code: d.name for d in catalog_departamentos}

        # ── 2. Load puestos summary from DB via a GROUP BY — no full ORM scan
        #    We only need counts + unique (municipio_codigo, municipio, departamento).
        count_result = db.execute(text("""
            SELECT municipio_codigo, municipio, departamento_codigo, departamento,
                   COUNT(*) AS puestos_count
            FROM puestos_electorales
            GROUP BY municipio_codigo, municipio, departamento_codigo, departamento
        """))
        db_mun_rows = count_result.fetchall()

        # Index 1: exact code → list of (db_mun_name, db_dept_name, count)
        puestos_by_exact_code: dict[str, list[tuple[str, str, int]]] = {}
        for row in db_mun_rows:
            puestos_by_exact_code.setdefault(row.municipio_codigo, []).append(
                (row.municipio, row.departamento, row.puestos_count)
            )

        # Index 2: dept_norm → list of (norm_mun, original_mun, count)
        # Used for the name-fallback scan — scoped to same department
        db_muns_by_dept_norm: dict[str, list[tuple[str, str, int]]] = {}
        for row in db_mun_rows:
            dept_n = _normalize_text(row.departamento)
            db_muns_by_dept_norm.setdefault(dept_n, []).append(
                (_normalize_text(row.municipio), row.municipio, row.puestos_count)
            )

        # ── 3. Match each catalog municipio against DB ───────────────────────────
        with_data: list[dict] = []
        without_data: list[dict] = []

        for mun in catalog_municipios:
            mun_code = mun.code          # e.g. "52835"
            mun_name = mun.name          # e.g. "SAN ANDRÉS DE TUMACO"
            dept_code = mun.parent_code  # e.g. "52"
            dept_name = dept_name_by_code.get(dept_code)
            dept_norm = _normalize_text(dept_name) if dept_name else None

            resolved_count = 0

            # --- Exact code match first ---
            if mun_code in puestos_by_exact_code:
                for db_mun_name, db_dept_name, cnt in puestos_by_exact_code[mun_code]:
                    if not mun_name or _municipio_names_match(mun_name, db_mun_name):
                        if not dept_norm or _normalize_text(db_dept_name) == dept_norm:
                            resolved_count += cnt

            # --- Name-based fallback (scoped to same dept — fast) ---
            if resolved_count == 0 and mun_name and dept_norm:
                for _norm_db_mun, orig_db_mun, cnt in db_muns_by_dept_norm.get(dept_norm, []):
                    if _municipio_names_match(mun_name, orig_db_mun):
                        resolved_count += cnt

            entry = {
                "codigo": mun_code,
                "nombre": mun_name,
                "departamento_codigo": dept_code,
                "departamento": dept_name or "",
                "puestos_count": resolved_count,
            }
            if resolved_count > 0:
                with_data.append(entry)
            else:
                without_data.append(entry)

        # ── 4. Print report ───────────────────────────────────────────────────────
        total = len(catalog_municipios)
        n_with = len(with_data)
        n_without = len(without_data)

        print("\n" + "=" * 100)
        print("CATALOG vs. DB GAP REPORT — MUNICIPIOS")
        print("=" * 100)
        print(f"Database : {settings.database_url}")
        print(f"Catalog  : {total} municipios (DIVIPOLA)")
        print(f"Con datos: {n_with}  ({n_with / total * 100:.1f}%)")
        print(f"Vacíos   : {n_without}  ({n_without / total * 100:.1f}%)\n")

        if without_data:
            print(f"⚠️  MUNICIPIOS SIN PUESTOS ({n_without})")
            print("-" * 100)
            for m in sorted(without_data, key=lambda x: (x["departamento_codigo"], x["codigo"])):
                print(
                    f"  ✗ {m['codigo']:>6} | {m['nombre']:<45} | "
                    f"Depto {m['departamento_codigo']} {m['departamento']}"
                )
        else:
            print("✅ Todos los municipios del catálogo tienen puestos en la DB.")

        print()
        if with_data:
            print(f"✅ MUESTRA — MUNICIPIOS CON DATOS (primeros 20 de {n_with})")
            print("-" * 100)
            for m in sorted(with_data, key=lambda x: -x["puestos_count"])[:20]:
                print(
                    f"  ✓ {m['codigo']:>6} | {m['nombre']:<45} | "
                    f"{m['puestos_count']:>5} puestos | {m['departamento']}"
                )

        print("\n" + "=" * 100 + "\n")

        # ── 5. Save JSON gap report ───────────────────────────────────────────────
        gap_report = {
            "summary": {
                "catalog_total": total,
                "with_data": n_with,
                "without_data": n_without,
                "coverage_pct": round(n_with / total * 100, 2),
            },
            "municipios_vacios": sorted(
                without_data, key=lambda x: (x["departamento_codigo"], x["codigo"])
            ),
            "municipios_con_datos": sorted(
                with_data, key=lambda x: -x["puestos_count"]
            ),
        }
        report_path = Path(__file__).parent / "catalog_coverage_gap_report.json"
        with open(report_path, "w", encoding="utf-8") as f:
            json.dump(gap_report, f, indent=2, ensure_ascii=False)
        print(f"📄 Gap report saved to: {report_path}\n")

    finally:
        db.close()
