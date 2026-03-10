"""Test coverage report for territorial statistics (departments/municipalities).

This test generates a report showing:
- Which departments and municipalities have electoral data (puestos loaded)
- Which ones are missing data (empty results from analytics_territorio)
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.db_models import PersonaORM, PuestoORM
from app.main import app, get_db, _seed_catalogs
from app.data_loader import load_departamentos_geojson, get_municipios_geojson_by_departamento


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    with testing_session_local() as db:
        _seed_catalogs(db)
        # Create test data: sample puestos
        _create_test_puestos(db)

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    app.state.testing_session_local = testing_session_local

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _create_test_puestos(db):
    """Create test puestos data for coverage analysis."""
    # Add some test puestos for known departments/municipalities
    test_puestos = [
        # Antioquia (01)
        PuestoORM(
            codigo_puesto="01-001-0001",
            departamento_codigo="01",
            departamento="Antioquia",
            municipio_codigo="01001",
            municipio="Medellín",
            puesto="Puesto 1",
            latitud=6.2442,
            longitud=-75.5898,
            mujeres=100,
            hombres=150,
            total=250,
            mesas=2,
        ),
        PuestoORM(
            codigo_puesto="01-001-0002",
            departamento_codigo="01",
            departamento="Antioquia",
            municipio_codigo="01001",
            municipio="Medellín",
            puesto="Puesto 2",
            latitud=6.2300,
            longitud=-75.5900,
            mujeres=80,
            hombres=120,
            total=200,
            mesas=2,
        ),
        # Bolívar (05)
        PuestoORM(
            codigo_puesto="05-001-0001",
            departamento_codigo="05",
            departamento="Bolívar",
            municipio_codigo="05001",
            municipio="Cartagena",
            puesto="Puesto 1",
            latitud=10.3910,
            longitud=-75.4794,
            mujeres=50,
            hombres=75,
            total=125,
            mesas=1,
        ),
    ]
    db.add_all(test_puestos)
    db.commit()


def test_territorial_coverage_report(client: TestClient):
    """
    Generate coverage report for territorial statistics.
    
    This test:
    1. Queries the database for all unique departments and municipalities
    2. For each, calls analytics_territorio endpoint
    3. Generates a report of what has data and what doesn't
    """
    # Get the session to query the database directly
    db = next(app.dependency_overrides[get_db]())
    
    try:
        # Get unique departments from database
        result = db.execute(text('''
            SELECT DISTINCT departamento_codigo, departamento 
            FROM puestos_electorales 
            ORDER BY departamento_codigo
        '''))
        dept_rows = result.fetchall()
        
        # Get unique municipalities from database  
        result = db.execute(text('''
            SELECT DISTINCT municipio_codigo, municipio, departamento_codigo, departamento
            FROM puestos_electorales 
            ORDER BY departamento_codigo, municipio_codigo
        '''))
        mun_rows = result.fetchall()
        
        report = {
            "departments": [],
            "municipalities": [],
        }
        
        # Test all departments from database
        for dept_code, dept_name in dept_rows:
            response = client.get(
                "/api/v1/analytics/territorio",
                params={"tipo": "departamento", "codigo": str(dept_code)}
            )
            
            if response.status_code == 200:
                data = response.json()
                report["departments"].append({
                    "codigo": dept_code,
                    "nombre": dept_name,
                    "puestos_count": data.get("puestos_count", 0),
                    "mesas_sum": data.get("mesas_sum", 0),
                    "total_sum": data.get("total_sum", 0),
                    "mujeres_sum": data.get("mujeres_sum", 0),
                    "hombres_sum": data.get("hombres_sum", 0),
                    "status": "✓" if data.get("puestos_count", 0) > 0 else "✗",
                })
            else:
                report["departments"].append({
                    "codigo": dept_code,
                    "nombre": dept_name,
                    "status": f"ERROR {response.status_code}",
                })
        
        # Test all municipalities from database
        for mun_code, mun_name, dept_code, dept_name in mun_rows:
            response = client.get(
                "/api/v1/analytics/territorio",
                params={"tipo": "municipio", "codigo": str(mun_code)}
            )
            
            if response.status_code == 200:
                data = response.json()
                report["municipalities"].append({
                    "codigo": mun_code,
                    "nombre": mun_name,
                    "departamento_codigo": dept_code,
                    "departamento": dept_name,
                    "puestos_count": data.get("puestos_count", 0),
                    "mesas_sum": data.get("mesas_sum", 0),
                    "total_sum": data.get("total_sum", 0),
                    "status": "✓" if data.get("puestos_count", 0) > 0 else "✗",
                })
            else:
                report["municipalities"].append({
                    "codigo": mun_code,
                    "nombre": mun_name,
                    "departamento": dept_name,
                    "status": f"ERROR {response.status_code}",
                })
        
        # Print the report
        print("\n" + "="*100)
        print("TERRITORIAL COVERAGE REPORT - Electoral Data")
        print("="*100)
        
        # Summary counts
        depts_with_data = sum(1 for d in report["departments"] if d["status"] == "✓")
        muns_with_data = sum(1 for m in report["municipalities"] if m["status"] == "✓")
        
        print(f"\n📊 SUMMARY")
        print(f"   Departments with data: {depts_with_data}/{len(report['departments'])}")
        print(f"   Municipalities with data: {muns_with_data}/{len(report['municipalities'])}")
        
        # Departments report
        print(f"\n📍 DEPARTMENTS ({len(report['departments'])} total)")
        print("-" * 100)
        for dept in sorted(report["departments"], key=lambda x: str(x.get("codigo", ""))):
            if dept["status"] == "✓":
                print(f"  {dept['status']} {dept['codigo']:>3} | {dept['nombre']:<30} | "
                      f"{dept.get('puestos_count', 0):>5} puestos | "
                      f"{dept.get('total_sum', 0):>8} votos")
        
        print("\n🚫 DEPARTMENTS WITHOUT DATA")
        print("-" * 100)
        for dept in sorted(report["departments"], key=lambda x: str(x.get("codigo", ""))):
            if dept["status"] != "✓":
                print(f"  {dept['status']:^3} | {dept['codigo']:>3} | {dept['nombre']:<30}")
        
        # Municipalities report (showing a sample of those with data)
        print(f"\n🏙️  MUNICIPALITIES ({len(report['municipalities'])} total)")
        print("-" * 100)
        muns_with = [m for m in report["municipalities"] if m["status"] == "✓"]
        muns_without = [m for m in report["municipalities"] if m["status"] != "✓"]
        
        if muns_with:
            print(f"\n✓ WITH DATA ({len(muns_with)})")
            for mun in sorted(muns_with[:10], key=lambda x: x["nombre"]):
                print(f"    {mun['codigo']:>6} | {mun['nombre']:<40} | "
                      f"{mun['departamento']:<20} | {mun.get('puestos_count', 0):>4} puestos")
            if len(muns_with) > 10:
                print(f"    ... and {len(muns_with) - 10} more municipalities with data")
        
        if muns_without:
            print(f"\n✗ WITHOUT DATA ({len(muns_without)})")
            for mun in sorted(muns_without[:10], key=lambda x: x["nombre"]):
                print(f"    {mun['codigo']:>6} | {mun['nombre']:<40} | {mun['departamento']:<20}")
            if len(muns_without) > 10:
                print(f"    ... and {len(muns_without) - 10} more municipalities without data")
        
        print("\n" + "="*100 + "\n")
        
        # Save report to JSON
        report_path = Path(__file__).parent / "territorial_coverage_report.json"
        with open(report_path, "w") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"📄 Full report saved to: {report_path}\n")
        
    finally:
        db.close()


if __name__ == "__main__":
    # Allow running as standalone script for debugging
    pytest.main([__file__, "-v", "-s"])


if __name__ == "__main__":
    # Allow running as standalone script for debugging
    pytest.main([__file__, "-v", "-s"])
