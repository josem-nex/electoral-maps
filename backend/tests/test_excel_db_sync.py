"""Reconciliation tests between Excel source and SQLite puestos table."""
from __future__ import annotations

from sqlalchemy import create_engine, text

from app.config import settings
from app.data_loader import load_puestos_electorales


def test_excel_source_fully_present_in_database() -> None:
    """Every puesto code present in Excel must exist in DB."""
    excel_rows = load_puestos_electorales()
    excel_codes = set(excel_rows["codigo_puesto"].astype(str).str.strip())

    engine = create_engine(
        settings.database_url,
        connect_args={"check_same_thread": False}
        if settings.database_url.startswith("sqlite")
        else {},
    )

    with engine.connect() as connection:
        db_codes_result = connection.execute(text("SELECT codigo_puesto FROM puestos_electorales"))
        db_codes = {str(row[0]).strip() for row in db_codes_result.fetchall()}

        db_department_result = connection.execute(
            text("SELECT DISTINCT departamento_codigo FROM puestos_electorales")
        )
        db_departments = {str(row[0]).strip().zfill(2) for row in db_department_result.fetchall()}

        db_municipio_result = connection.execute(
            text("SELECT DISTINCT municipio_codigo FROM puestos_electorales")
        )
        db_municipios = {str(row[0]).strip().zfill(5) for row in db_municipio_result.fetchall()}

    missing_codes = sorted(excel_codes - db_codes)

    excel_departments = set(excel_rows["departamento_codigo"].astype(str).str.strip().str.zfill(2))
    excel_municipios = set(excel_rows["municipio_codigo"].astype(str).str.strip().str.zfill(5))

    missing_departments = sorted(excel_departments - db_departments)
    missing_municipios = sorted(excel_municipios - db_municipios)

    assert not missing_codes, (
        f"Faltan {len(missing_codes)} puestos del Excel en DB. "
        f"Ejemplos: {missing_codes[:10]}"
    )
    assert not missing_departments, (
        f"Faltan {len(missing_departments)} departamentos del Excel en DB. "
        f"Ejemplos: {missing_departments[:10]}"
    )
    assert not missing_municipios, (
        f"Faltan {len(missing_municipios)} municipios del Excel en DB. "
        f"Ejemplos: {missing_municipios[:10]}"
    )
