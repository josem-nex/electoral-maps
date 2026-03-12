from __future__ import annotations

from time import perf_counter
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base
from app.db_models import PersonaORM, TerritorioStatsCacheORM
from app.data_loader import build_departamentos_catalog
from app.main import app, get_db, _municipio_names_match, _seed_catalogs


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


def _create_hierarchy(client: TestClient) -> dict[str, int]:
    pais_resp = client.get("/api/v1/jurisdicciones", params={"nivel": "pais"})
    assert pais_resp.status_code == 200
    pais_id = pais_resp.json()[0]["id"]

    zona_resp = client.post(
        "/api/v1/jurisdicciones",
        json={
            "codigo_divipola": "Z001",
            "nombre": "Zona Centro",
            "nivel": "zona",
            "tipo": "territorial",
            "parent_id": pais_id,
        },
    )
    assert zona_resp.status_code == 201
    zona_id = zona_resp.json()["id"]

    dept_resp = client.post(
        "/api/v1/jurisdicciones",
        json={
            "codigo_divipola": "05",
            "nombre": "Antioquia",
            "nivel": "departamento",
            "tipo": "territorial",
            "parent_id": zona_id,
        },
    )
    assert dept_resp.status_code == 201
    dept_id = dept_resp.json()["id"]

    mun_resp = client.post(
        "/api/v1/jurisdicciones",
        json={
            "codigo_divipola": "05001",
            "nombre": "Medellín",
            "nivel": "municipio",
            "tipo": "territorial",
            "parent_id": dept_id,
            "center_lat": 6.2442,
            "center_lon": -75.5812,
            "zoom": 12,
        },
    )
    assert mun_resp.status_code == 201
    mun_id = mun_resp.json()["id"]

    return {"pais": pais_id, "zona": zona_id, "dept": dept_id, "mun": mun_id}


def test_integridad_jerarquica_rechaza_parent_invalido(client: TestClient) -> None:
    pais_resp = client.get("/api/v1/jurisdicciones", params={"nivel": "pais"})
    pais_id = pais_resp.json()[0]["id"]

    invalid_dept_resp = client.post(
        "/api/v1/jurisdicciones",
        json={
            "codigo_divipola": "08",
            "nombre": "Atlántico",
            "nivel": "departamento",
            "tipo": "territorial",
            "parent_id": pais_id,
        },
    )
    assert invalid_dept_resp.status_code == 422

    invalid_mun_resp = client.post(
        "/api/v1/jurisdicciones",
        json={
            "codigo_divipola": "08001",
            "nombre": "Barranquilla",
            "nivel": "municipio",
            "tipo": "territorial",
        },
    )
    assert invalid_mun_resp.status_code == 422


def test_children_devuelve_hijos_directos(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    children_resp = client.get(f"/api/v1/jurisdicciones/{hierarchy['zona']}/children")
    assert children_resp.status_code == 200

    children = children_resp.json()
    assert len(children) == 1
    assert children[0]["id"] == hierarchy["dept"]
    assert children[0]["nivel"] == "departamento"


def test_puestos_filtros_bbox_zoom_anio_corporacion(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    p1_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P05001A",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "Antioquia",
            "municipio": "Medellín",
            "puesto": "IE Centro",
            "direccion": "Calle 10",
            "mujeres": 100,
            "hombres": 120,
            "total": 220,
            "mesas": 5,
            "latitud": 6.24,
            "longitud": -75.58,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert p1_resp.status_code == 201

    p2_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P05001B",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "Antioquia",
            "municipio": "Medellín",
            "puesto": "IE Norte",
            "direccion": "Carrera 20",
            "mujeres": 90,
            "hombres": 80,
            "total": 170,
            "mesas": 4,
            "latitud": 7.00,
            "longitud": -74.00,
            "anio": 2018,
            "corporacion": "camara",
        },
    )
    assert p2_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "bbox": "-76,6,-75,7",
            "zoom": 5,
            "anio": 2022,
            "corporacion": "senado",
            "limit": 2000,
        },
    )
    assert list_resp.status_code == 200

    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["limit"] == 1000
    assert payload["items"][0]["codigo_puesto"] == "P05001A"


def test_puestos_filtra_por_municipio_codigo(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    p1_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P05001M",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "Antioquia",
            "municipio": "Medellín",
            "puesto": "IE Centro",
            "latitud": 6.24,
            "longitud": -75.58,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert p1_resp.status_code == 201

    p2_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P76001C",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "76",
            "municipio_codigo": "76001",
            "departamento": "Valle del Cauca",
            "municipio": "Cali",
            "puesto": "IE Sur",
            "latitud": 3.45,
            "longitud": -76.53,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert p2_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "municipio_codigo": "76001",
            "limit": 500,
        },
    )
    assert list_resp.status_code == 200

    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == "P76001C"


def test_puestos_fallback_por_nombre_si_codigo_municipio_inconsistente(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    create_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-MED-LEGACY",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "01001",  # código legado/erróneo en datos cargados
            "departamento": "ANTIOQUIA",
            "municipio": "MEDELLIN",
            "puesto": "IE Centro",
            "latitud": 6.24,
            "longitud": -75.58,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert create_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "municipio_codigo": "05001",  # código correcto solicitado desde mapa
            "limit": 500,
        },
    )
    assert list_resp.status_code == 200

    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == "P-MED-LEGACY"


def test_puestos_ignora_codigo_conflictivo_y_prioriza_municipio_correcto(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    wrong_code_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-CONFLICT-WRONG",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "13",
            "municipio_codigo": "05031",  # código solicitado por Amalfi, pero aquí mal cargado
            "departamento": "BOLIVAR",
            "municipio": "MAHATES",
            "puesto": "IE Erroneo",
            "latitud": 10.2,
            "longitud": -75.2,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert wrong_code_resp.status_code == 201

    right_name_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-CONFLICT-RIGHT",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "01016",  # código legado/erróneo de Amalfi en la data
            "departamento": "ANTIOQUIA",
            "municipio": "AMALFI",
            "puesto": "IE Correcto",
            "latitud": 6.9,
            "longitud": -75.0,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert right_name_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "municipio_codigo": "05031",  # Amalfi en catálogo geográfico
            "limit": 500,
        },
    )
    assert list_resp.status_code == 200

    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == "P-CONFLICT-RIGHT"


def test_puestos_fallback_funciona_con_departamento_codigo_en_query(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    create_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-AMALFI-LEGACY",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "01",  # código legado incorrecto
            "municipio_codigo": "01016",  # código legado incorrecto
            "departamento": "ANTIOQUIA",
            "municipio": "AMALFI",
            "puesto": "IE Amalfi",
            "latitud": 6.9,
            "longitud": -75.0,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert create_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "departamento_codigo": "05",  # enviado por frontend
            "municipio_codigo": "05031",  # Amalfi catálogo
            "limit": 500,
        },
    )
    assert list_resp.status_code == 200

    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == "P-AMALFI-LEGACY"


def test_puestos_match_nombre_con_parentesis_y_variante_ortografica(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    san_miguel_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-PUT-SANMIGUEL",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "64",
            "municipio_codigo": "64018",  # legacy inconsistente
            "departamento": "PUTUMAYO",
            "municipio": "SAN MIGUEL (LA DORADA)",
            "puesto": "IE San Miguel",
            "latitud": 0.34,
            "longitud": -76.92,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert san_miguel_resp.status_code == 201

    guamuez_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-PUT-GUAMUEZ",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "64",
            "municipio_codigo": "64028",  # legacy inconsistente
            "departamento": "PUTUMAYO",
            "municipio": "VALLE DEL GUAMUEZ (LA HORMIGA)",
            "puesto": "IE Guamuez",
            "latitud": 0.37,
            "longitud": -76.91,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert guamuez_resp.status_code == 201

    san_miguel_query = client.get(
        "/api/v1/puestos",
        params={
            "departamento_codigo": "86",  # Putumayo en catálogo del mapa
            "municipio_codigo": "86757",  # SAN MIGUEL en mapa
            "limit": 500,
        },
    )
    assert san_miguel_query.status_code == 200
    san_miguel_payload = san_miguel_query.json()
    assert san_miguel_payload["total"] == 1
    assert san_miguel_payload["items"][0]["codigo_puesto"] == "P-PUT-SANMIGUEL"

    guamez_query = client.get(
        "/api/v1/puestos",
        params={
            "departamento_codigo": "86",  # Putumayo
            "municipio_codigo": "86865",  # VALLE DEL GUAMUEZ en mapa
            "limit": 500,
        },
    )
    assert guamez_query.status_code == 200
    guamez_payload = guamez_query.json()
    assert guamez_payload["total"] == 1
    assert guamez_payload["items"][0]["codigo_puesto"] == "P-PUT-GUAMUEZ"


def test_search_persona_y_analytics(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    create_puesto = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P05001C",
            "jurisdiccion_id": hierarchy["mun"],
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "Antioquia",
            "municipio": "Medellín",
            "puesto": "Colegio Bolívar",
            "direccion": "Avenida Siempre Viva",
            "mujeres": 50,
            "hombres": 40,
            "total": 90,
            "mesas": 2,
            "latitud": 6.25,
            "longitud": -75.57,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert create_puesto.status_code == 201

    with app.state.testing_session_local() as db:
        db.add(
            PersonaORM(
                nombre_completo="Ana Pérez",
                documento="100200300",
                rol="jurado",
                jurisdiccion_id=hierarchy["mun"],
                anio=2022,
            )
        )
        db.commit()

    search_resp = client.get(
        "/api/v1/search",
        params={"query": "ana", "types": "persona", "limit": 10, "offset": 0},
    )
    assert search_resp.status_code == 200
    search_payload = search_resp.json()
    assert search_payload["total"] >= 1
    assert search_payload["items"][0]["type"] == "persona"

    analytics_resp = client.get(
        "/api/v1/analytics",
        params={"jurisdiccion_id": hierarchy["mun"], "anio": 2022, "corporacion": "senado"},
    )
    assert analytics_resp.status_code == 200
    analytics_payload = analytics_resp.json()
    assert analytics_payload["datos"]["puestos"] == 1
    assert analytics_payload["datos"]["mesas"] == 2


def test_search_geo_departamento_por_subcadena_nombre_comun(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/search",
        params={"query": "san andres", "types": "geo", "limit": 20},
    )
    assert resp.status_code == 200
    payload = resp.json()

    dept_results = [item for item in payload["items"] if item["type"] == "departamento"]
    assert any(item["geo_code"] == "56" for item in dept_results)


def _create_puestos_for_territorio(client: TestClient) -> None:
    """Seed two puestos in Antioquia / Medellín for analytics territory tests."""
    for codigo, mujeres, hombres, total, mesas in [
        ("TPUESTO01", 100, 120, 220, 5),
        ("TPUESTO02", 80, 90, 170, 4),
    ]:
        resp = client.post(
            "/api/v1/puestos",
            json={
                "codigo_puesto": codigo,
                "departamento_codigo": "05",
                "municipio_codigo": "05001",
                "departamento": "Antioquia",
                "municipio": "Medellín",
                "puesto": f"Puesto {codigo}",
                "mujeres": mujeres,
                "hombres": hombres,
                "total": total,
                "mesas": mesas,
                "latitud": 6.24,
                "longitud": -75.58,
            },
        )
        assert resp.status_code == 201


def _create_puesto_consulado(client: TestClient) -> None:
    resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "CONSUL-001",
            "departamento_codigo": "88",
            "municipio_codigo": "88815",
            "departamento": "CONSULADOS",
            "municipio": "VENEZUELA",
            "puesto": "Consulado Caracas",
            "mujeres": 40,
            "hombres": 60,
            "total": 100,
            "mesas": 2,
            "latitud": 4.0,
            "longitud": -74.0,
        },
    )
    assert resp.status_code == 201


def test_analytics_territorio_departamento_valido(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "05"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "departamento"
    assert payload["codigo"] == "05"
    assert payload["puestos_count"] == 2
    assert payload["mesas_sum"] == 9       # 5 + 4
    assert payload["total_sum"] == 390     # 220 + 170
    assert payload["mujeres_sum"] == 180   # 100 + 80
    assert payload["hombres_sum"] == 210   # 120 + 90


def test_analytics_territorio_departamento_especial_consulados_nombre_fallback(
    client: TestClient,
) -> None:
    _create_puesto_consulado(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "88"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "departamento"
    assert payload["codigo"] == "88"
    assert payload["nombre"] == "CONSULADOS"
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 2
    assert payload["total_sum"] == 100


def test_analytics_territorio_municipio_especial_consulados_nombre_fallback(
    client: TestClient,
) -> None:
    _create_puesto_consulado(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "municipio", "codigo": "88815"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "municipio"
    assert payload["codigo"] == "88815"
    assert payload["nombre"] == "VENEZUELA"
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 2
    assert payload["total_sum"] == 100


def test_analytics_territorio_municipio_valido(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "municipio", "codigo": "05001"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "municipio"
    assert payload["codigo"] == "05001"
    assert payload["puestos_count"] == 2
    assert payload["mesas_sum"] == 9
    assert payload["mujeres_sum"] == 180


def test_analytics_territorio_pais_valido(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "pais", "codigo": "CO"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "pais"
    assert payload["codigo"] == "CO"
    assert payload["nombre"] == "Colombia"
    assert payload["puestos_count"] == 2
    assert payload["mesas_sum"] == 9


def test_analytics_territorio_pais_incluye_departamento_consulados(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)
    _create_puesto_consulado(client)

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "pais", "codigo": "CO"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["puestos_count"] == 3
    assert payload["mesas_sum"] == 11
    assert payload["total_sum"] == 490
    assert payload["mujeres_sum"] == 220
    assert payload["hombres_sum"] == 270


def test_analytics_territorio_zona_valido(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)

    _, departamentos = build_departamentos_catalog()
    antioquia = next((d for d in departamentos if d.code == "05"), None)
    assert antioquia is not None
    zone_id = antioquia.zone_id
    assert zone_id is not None

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "zona", "codigo": str(zone_id)},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["tipo"] == "zona"
    assert payload["codigo"] == str(zone_id)
    assert payload["puestos_count"] >= 2
    assert payload["mesas_sum"] >= 9


def test_analytics_territorio_cache_persistente(client: TestClient) -> None:
    _create_hierarchy(client)
    _create_puestos_for_territorio(client)

    first_resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "05"},
    )
    assert first_resp.status_code == 200

    with app.state.testing_session_local() as db:
        cached = db.query(TerritorioStatsCacheORM).filter_by(
            tipo="departamento",
            codigo="05",
        ).first()
        assert cached is not None
        assert cached.puestos_count == 2

    second_resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "05"},
    )
    assert second_resp.status_code == 200
    assert second_resp.json()["puestos_count"] == 2


def test_analytics_territorio_cache_viejo_consulados_se_autocorrige(
    client: TestClient,
) -> None:
    _create_puesto_consulado(client)

    with app.state.testing_session_local() as db:
        db.add(
            TerritorioStatsCacheORM(
                tipo="departamento",
                codigo="88",
                nombre="ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA",
                puestos_count=99,
                mesas_sum=999,
                total_sum=9999,
                mujeres_sum=5000,
                hombres_sum=4999,
            )
        )
        db.commit()

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "88"},
    )
    assert resp.status_code == 200
    payload = resp.json()

    assert payload["nombre"] == "CONSULADOS"
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 2
    assert payload["total_sum"] == 100

    with app.state.testing_session_local() as db:
        cached = db.query(TerritorioStatsCacheORM).filter_by(
            tipo="departamento",
            codigo="88",
        ).first()
        assert cached is not None
        assert cached.nombre == "CONSULADOS"
        assert cached.puestos_count == 1
        assert cached.mesas_sum == 2


def test_analytics_territorio_sin_puestos_devuelve_ceros(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "99"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["puestos_count"] == 0
    assert payload["mesas_sum"] == 0
    assert payload["total_sum"] == 0
    assert payload["mujeres_sum"] == 0
    assert payload["hombres_sum"] == 0


def test_analytics_territorio_tipo_invalido_devuelve_422(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "localidad", "codigo": "05001"},
    )
    assert resp.status_code == 422


def test_analytics_territorio_codigo_invalido_pais_devuelve_422(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "pais", "codigo": "XX"},
    )
    assert resp.status_code == 422


def test_analytics_territorio_codigo_invalido_zona_devuelve_422(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "zona", "codigo": "Z1"},
    )
    assert resp.status_code == 422


def test_analytics_territorio_codigo_invalido_departamento_devuelve_422(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "ABCD"},
    )
    assert resp.status_code == 422


def test_analytics_territorio_codigo_invalido_municipio_devuelve_422(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "municipio", "codigo": "ABCDE"},
    )
    assert resp.status_code == 422


def test_analytics_territorio_codigo_1_digito_departamento(client: TestClient) -> None:
    """Single-digit department code should be accepted (normalized to 2 digits)."""
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "5"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["codigo"] == "05"


def test_analytics_territorio_departamento_nombre_fallback(client: TestClient) -> None:
    """When DANE code != electoral code in DB, name-based fallback must find the puestos.

    Simulates: DANE código 05 = 'ANTIOQUIA' but the electoral system stores
    Antioquia puestos under departamento_codigo='01'. The endpoint should
    resolve by department name, not raw code.
    """
    # Seed puestos whose departamento_codigo ('01') won't match the DANE query
    # code ('05'), but whose departamento name IS 'Antioquia'.
    for codigo in ["FALLBACK01", "FALLBACK02"]:
        resp = client.post(
            "/api/v1/puestos",
            json={
                "codigo_puesto": codigo,
                "departamento_codigo": "01",         # electoral code for Antioquia
                "municipio_codigo": "01001",
                "departamento": "Antioquia",         # name matches DANE "05"
                "municipio": "Medellín",
                "puesto": f"Puesto {codigo}",
                "mujeres": 50,
                "hombres": 60,
                "total": 110,
                "mesas": 3,
                "latitud": 6.24,
                "longitud": -75.58,
            },
        )
        assert resp.status_code == 201

    # Query with DANE code 05 (Antioquia).  Direct code would return 0 (no
    # departamento_codigo='05' rows exist); name fallback should find 2.
    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "05"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["puestos_count"] == 2
    assert payload["mesas_sum"] == 6
    assert payload["mujeres_sum"] == 100
    assert payload["hombres_sum"] == 120


def test_analytics_territorio_departamento_ignora_codigo_exacto_con_nombre_conflictivo(
    client: TestClient,
) -> None:
    """Antioquia MUST NOT inherit Bolívar labels/data from contaminated exact-code rows."""
    wrong_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-DEPT-WRONG-05",
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "BOLIVAR",
            "municipio": "CARTAGENA",
            "puesto": "Puesto conflictivo",
            "mesas": 8,
            "mujeres": 80,
            "hombres": 90,
            "total": 170,
            "latitud": 10.4,
            "longitud": -75.5,
        },
    )
    assert wrong_resp.status_code == 201

    right_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-DEPT-RIGHT-FALLBACK",
            "departamento_codigo": "01",
            "municipio_codigo": "01001",
            "departamento": "ANTIOQUIA",
            "municipio": "MEDELLIN",
            "puesto": "Puesto correcto",
            "mesas": 3,
            "mujeres": 30,
            "hombres": 40,
            "total": 70,
            "latitud": 6.24,
            "longitud": -75.58,
        },
    )
    assert right_resp.status_code == 201

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": "05"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["codigo"] == "05"
    assert payload["nombre"] == "ANTIOQUIA"
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 3
    assert payload["total_sum"] == 70


def test_analytics_territorio_municipio_ignora_codigo_exacto_con_nombre_conflictivo(
    client: TestClient,
) -> None:
    """Medellín MUST NOT inherit Cartagena labels/data from contaminated exact-code rows."""
    wrong_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-MUN-WRONG-05001",
            "departamento_codigo": "05",
            "municipio_codigo": "05001",
            "departamento": "BOLIVAR",
            "municipio": "CARTAGENA",
            "puesto": "Puesto conflictivo",
            "mesas": 5,
            "mujeres": 50,
            "hombres": 60,
            "total": 110,
            "latitud": 10.4,
            "longitud": -75.5,
        },
    )
    assert wrong_resp.status_code == 201

    right_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-MUN-RIGHT-FALLBACK",
            "departamento_codigo": "01",
            "municipio_codigo": "01001",
            "departamento": "ANTIOQUIA",
            "municipio": "MEDELLIN",
            "puesto": "Puesto correcto",
            "mesas": 2,
            "mujeres": 20,
            "hombres": 25,
            "total": 45,
            "latitud": 6.24,
            "longitud": -75.58,
        },
    )
    assert right_resp.status_code == 201

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "municipio", "codigo": "05001"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["codigo"] == "05001"
    assert payload["nombre"] == "MEDELLÍN"
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 2
    assert payload["total_sum"] == 45


def test_geojson_municipios_incluye_llaves_canonicas(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/geojson/municipios",
        params={"departamento_codigo": "05"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["type"] == "FeatureCollection"
    assert payload["features"]

    medellin = next(
        feature
        for feature in payload["features"]
        if feature["properties"].get("municipio_codigo") == "05001"
    )
    props = medellin["properties"]
    assert props["canonical_id"] == "05001"
    assert props["departamento_codigo"] == "05"
    assert props["municipio_codigo"] == "05001"
    assert props["municipio_nombre"] == "MEDELLÍN"


def test_geojson_departamento_archipielago_queda_en_codigo_56(client: TestClient) -> None:
    resp = client.get("/api/v1/geojson/departamentos")
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["type"] == "FeatureCollection"

    san_andres = next(
        feature
        for feature in payload["features"]
        if "SAN ANDR" in str(feature["properties"].get("departamento_nombre", "")).upper()
    )
    props = san_andres["properties"]
    assert props["canonical_id"] == "56"
    assert props["departamento_codigo"] == "56"


def test_geojson_municipios_codigo_88_no_devuelve_archipielago(client: TestClient) -> None:
    resp = client.get(
        "/api/v1/geojson/municipios",
        params={"departamento_codigo": "88"},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["type"] == "FeatureCollection"
    assert payload["features"] == []


def test_puestos_municipio_nombre_largo_vs_corto_fallback(client: TestClient) -> None:
    """Official municipality long name should match short operational name.

    Example: SAN ANDRÉS DE TUMACO (official) vs TUMACO (stored in puestos).
    """
    create_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": "P-TUMACO-001",
            "departamento_codigo": "23",  # código legado en datos fuente
            "municipio_codigo": "23139",  # código legado en datos fuente
            "departamento": "NARIÑO",
            "municipio": "TUMACO",
            "puesto": "IE Tumaco Centro",
            "latitud": 1.81,
            "longitud": -78.76,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert create_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "municipio_codigo": "52835",  # DANE oficial: SAN ANDRÉS DE TUMACO
            "limit": 100,
        },
    )
    assert list_resp.status_code == 200
    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == "P-TUMACO-001"


@pytest.mark.parametrize(
    ("expected_name", "candidate_name"),
    [
        ("SANTA CRUZ DE MOMPOX", "MOMPOS"),
        ("PAPUNAHUA", "MORICHAL (PAPUNAGUA)"),
    ],
)
def test_municipio_names_match_variantes_catalogo(
    expected_name: str,
    candidate_name: str,
) -> None:
    assert _municipio_names_match(expected_name, candidate_name) is True


@pytest.mark.parametrize(
    ("codigo_puesto", "departamento_codigo", "municipio_codigo", "departamento", "municipio", "query_codigo"),
    [
        (
            "P-CUCUTA-001",
            "25",
            "25001",
            "NORTE DE SAN",
            "CUCUTA",
            "54001",
        ),
        (
            "P-CALI-001",
            "31",
            "31001",
            "VALLE",
            "CALI",
            "76001",
        ),
        (
            "P-MOMPOS-001",
            "05",
            "05043",
            "BOLIVAR",
            "MOMPOS",
            "13468",
        ),
        (
            "P-PACOA-001",
            "68",
            "68013",
            "VAUPES",
            "BUENOS AIRES (PACOA)",
            "97511",
        ),
    ],
)
def test_puestos_municipio_variantes_historicas_fallback(
    client: TestClient,
    codigo_puesto: str,
    departamento_codigo: str,
    municipio_codigo: str,
    departamento: str,
    municipio: str,
    query_codigo: str,
) -> None:
    create_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": codigo_puesto,
            "departamento_codigo": departamento_codigo,
            "municipio_codigo": municipio_codigo,
            "departamento": departamento,
            "municipio": municipio,
            "puesto": f"Puesto {codigo_puesto}",
            "latitud": 4.0,
            "longitud": -74.0,
            "anio": 2022,
            "corporacion": "senado",
        },
    )
    assert create_resp.status_code == 201

    list_resp = client.get(
        "/api/v1/puestos",
        params={
            "municipio_codigo": query_codigo,
            "limit": 100,
        },
    )
    assert list_resp.status_code == 200
    payload = list_resp.json()
    assert payload["total"] == 1
    assert payload["items"][0]["codigo_puesto"] == codigo_puesto


@pytest.mark.parametrize(
    ("departamento_codigo", "municipio_codigo", "departamento", "municipio", "query_codigo"),
    [
        ("25", "25001", "NORTE DE SAN", "CUCUTA", "54"),
        ("31", "31001", "VALLE", "CALI", "76"),
        ("56", "56001", "SAN ANDRES", "SAN ANDRES", "56"),
    ],
)
def test_analytics_territorio_departamento_alias_truncado_fallback(
    client: TestClient,
    departamento_codigo: str,
    municipio_codigo: str,
    departamento: str,
    municipio: str,
    query_codigo: str,
) -> None:
    create_resp = client.post(
        "/api/v1/puestos",
        json={
            "codigo_puesto": f"P-DEPT-{query_codigo}",
            "departamento_codigo": departamento_codigo,
            "municipio_codigo": municipio_codigo,
            "departamento": departamento,
            "municipio": municipio,
            "puesto": f"Puesto {query_codigo}",
            "mesas": 4,
            "mujeres": 40,
            "hombres": 60,
            "total": 100,
            "latitud": 4.0,
            "longitud": -74.0,
        },
    )
    assert create_resp.status_code == 201

    resp = client.get(
        "/api/v1/analytics/territorio",
        params={"tipo": "departamento", "codigo": query_codigo},
    )
    assert resp.status_code == 200
    payload = resp.json()
    assert payload["puestos_count"] == 1
    assert payload["mesas_sum"] == 4
    assert payload["mujeres_sum"] == 40
    assert payload["hombres_sum"] == 60
    assert payload["total_sum"] == 100


def test_analytics_endpoint_original_no_alterado(client: TestClient) -> None:
    """Ensure existing /api/v1/analytics endpoint still works without regression."""
    resp = client.get("/api/v1/analytics")
    assert resp.status_code == 200
    payload = resp.json()
    assert "datos" in payload
    assert "puestos" in payload["datos"]
    assert "mesas" in payload["datos"]


def test_latencia_bbox_objetivo_mvp(client: TestClient) -> None:
    hierarchy = _create_hierarchy(client)

    with app.state.testing_session_local() as db:
        from app.db_models import PuestoORM

        for idx in range(400):
            db.add(
                PuestoORM(
                    codigo_puesto=f"PFAST{idx:04d}",
                    jurisdiccion_id=hierarchy["mun"],
                    departamento_codigo="05",
                    municipio_codigo="05001",
                    departamento="Antioquia",
                    municipio="Medellín",
                    puesto=f"Puesto {idx}",
                    latitud=6.2 + (idx * 0.0001),
                    longitud=-75.6 + (idx * 0.0001),
                    anio=2022,
                    corporacion="senado",
                )
            )
        db.commit()

    start = perf_counter()
    response = client.get(
        "/api/v1/puestos",
        params={
            "bbox": "-76,6,-75,7",
            "zoom": 10,
            "anio": 2022,
            "corporacion": "senado",
            "limit": 500,
        },
    )
    elapsed = perf_counter() - start

    assert response.status_code == 200
    assert elapsed < 1.5
