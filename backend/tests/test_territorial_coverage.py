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
from app.db_models import PuestoORM
from app.main import _aggregate_rows


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

