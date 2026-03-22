from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.db_models import (
    TerritorioDepartamentoORM,
    TerritorioMunicipioORM,
    TerritorioZonaORM,
)
from app.main import app, get_db, _seed_catalogs


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
        db.add(TerritorioZonaORM(codigo="03", nombre="Zona 3"))
        db.add(TerritorioDepartamentoORM(codigo="01", nombre="ANTIOQUIA", zona_codigo="03"))
        db.add(TerritorioMunicipioORM(codigo="01001", departamento_codigo="01", nombre="MEDELLIN"))
        db.commit()

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _create_puesto(client: TestClient, codigo: str, total: int) -> None:
    resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": codigo,
            "departamento_codigo": "01",
            "municipio_codigo": "01001",
            "departamento": "ANTIOQUIA",
            "municipio": "MEDELLIN",
            "puesto": f"Puesto {codigo}",
            "zona_codigo": "03",
            "puesto_codigo": codigo[-2:],
            "mujeres": total // 2,
            "hombres": total - (total // 2),
            "total": total,
            "mesas": 2,
            "latitud": 6.24,
            "longitud": -75.58,
        },
    )
    assert resp.status_code == 201


def test_analytics_territorio_usa_ids_excel(client: TestClient) -> None:
    _create_puesto(client, "010010101", 100)
    _create_puesto(client, "010010102", 200)

    pais = client.get("/api/v1/analytics/territorio", params={"tipo": "pais", "codigo": "CO"})
    assert pais.status_code == 200
    assert pais.json()["codigo"] == "CO"
    assert pais.json()["puestos_count"] == 2

    zona = client.get("/api/v1/analytics/territorio", params={"tipo": "zona", "codigo": "03"})
    assert zona.status_code == 200
    assert zona.json()["codigo"] == "03"
    assert zona.json()["puestos_count"] == 2

    departamento = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "01"},
    )
    assert departamento.status_code == 200
    assert departamento.json()["codigo"] == "01"
    assert departamento.json()["puestos_count"] == 2

    municipio = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "municipio", "codigo": "01001"},
    )
    assert municipio.status_code == 200
    assert municipio.json()["codigo"] == "01001"
    assert municipio.json()["puestos_count"] == 2


def test_puestos_filtra_por_dd_mm_excel(client: TestClient) -> None:
    _create_puesto(client, "010010201", 50)

    ok_resp = client.get(
        "/api/v1/puestos",
        params={"departamento_codigo": "01", "municipio_codigo": "01001"},
    )
    assert ok_resp.status_code == 200
    assert ok_resp.json()["total"] == 1

    mismatch_resp = client.get(
        "/api/v1/puestos",
        params={"departamento_codigo": "03", "municipio_codigo": "01001"},
    )
    assert mismatch_resp.status_code == 200
    assert mismatch_resp.json()["total"] == 0
