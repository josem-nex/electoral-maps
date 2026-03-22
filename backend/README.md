# Backend API v1

API FastAPI para el MVP de jurisdicciones, puestos, búsqueda y analytics.

## OpenAPI

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`

## Endpoints clave

### Jurisdicciones

- `GET /api/v1/jurisdicciones`
- `POST /api/v1/jurisdicciones`
- `PUT /api/v1/jurisdicciones/{jurisdiccion_id}`
- `DELETE /api/v1/jurisdicciones/{jurisdiccion_id}`
- `GET /api/v1/jurisdicciones/{jurisdiccion_id}/children`

Ejemplo crear municipio:

```bash
curl -X POST http://localhost:8000/api/v1/jurisdicciones \
  -H "Content-Type: application/json" \
  -d '{
    "codigo_divipola": "05001",
    "nombre": "Medellín",
    "nivel": "municipio",
    "tipo": "territorial",
    "parent_id": 3,
    "center_lat": 6.2442,
    "center_lon": -75.5812,
    "zoom": 12
  }'
```

### Puestos electorales

- `GET /api/v1/puestos`
- `POST /api/v1/puestos`
- `PUT /api/v1/puestos/{puesto_id}`
- `DELETE /api/v1/puestos/{puesto_id}`

Ejemplo filtro de mapa + contexto electoral:

```bash
curl "http://localhost:8000/api/v1/puestos?bbox=-76,6,-75,7&zoom=8&anio=2022&corporacion=senado&limit=200"
```

### Búsqueda global

- `GET /api/v1/search`

Parámetros:

- `q` o `query`: término de búsqueda
- `types`: CSV de `municipio,puesto,persona`
- `limit`, `offset`

Ejemplo:

```bash
curl "http://localhost:8000/api/v1/search?query=medellin&types=municipio,puesto&limit=10&offset=0"
```

### Analytics básico

- `GET /api/v1/analytics`

Ejemplo:

```bash
curl "http://localhost:8000/api/v1/analytics?jurisdiccion_id=10&anio=2022&corporacion=senado"
```

## Migraciones Alembic

Desde `backend/`:

```bash
alembic upgrade head
```

Migración inicial incluida: `20260308_0001`.

## Pruebas

Desde `backend/`:

```bash
pytest -q
```

## Cache de analytics territorial

El endpoint `GET /api/v1/analytics/territorio` ahora soporta `tipo=pais|zona|departamento|municipio` y prioriza lectura desde cache persistente (`territorio_stats_cache`).

En caso de cache miss, el backend calcula el agregado, lo persiste (upsert) y devuelve la respuesta.

## Limpieza de cache y entorno (si moviste el proyecto)

Si cambiaste el directorio del repo, pueden quedar rutas viejas en variables de entorno o en el virtualenv.

1. Verifica `DATA_DIR` en `backend/.env` (recomendado: `DATA_DIR=../data`).
2. Reinicia el backend para limpiar caches en memoria (`lru_cache`).
3. Si persisten rutas antiguas en `.venv`, recréalo:

```bash
cd backend
rm -rf .venv
python3.10 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

4. (Opcional) limpia bytecode/cache de Python:

```bash
find backend -type d -name "__pycache__" -prune -exec rm -rf {} +
rm -rf backend/.pytest_cache
```

### Refresco completo de cache

Desde `backend/`:

```bash
python scripts/refresh_territorial_stats_cache.py
```

El comando recalcula y actualiza agregados para país, zonas, departamentos y municipios.

## Corrección de códigos territoriales en DB desde Excel

Si ya tienes datos cargados y necesitas alinear `departamento_codigo` y `municipio_codigo` con el Excel fuente (`INFO_X_Puesto.xlsx`), usa:

```bash
cd backend
python scripts/sync_puestos_codes_from_excel.py --dry-run
python scripts/sync_puestos_codes_from_excel.py
```

La sincronización cruza por `codigo_puesto`, actualiza códigos en `puestos_electorales` y mantiene el flujo de lectura actual desde base de datos.

## Sincronización de catálogos territoriales (dd/mm/zz)

Para poblar y actualizar catálogos persistentes de departamentos, municipios y zonas desde el Excel:

```bash
cd backend
python scripts/sync_territorial_catalogs_from_excel.py --dry-run
python scripts/sync_territorial_catalogs_from_excel.py
```

Los endpoints y analytics territoriales usan estos catálogos en runtime, evitando lecturas del Excel por request.

## Checklist de migración y rollback (IDs Excel)

### Migración

1. Ejecutar migraciones:

```bash
cd backend
alembic upgrade head
```

2. Sincronizar catálogos territoriales:

```bash
python scripts/sync_territorial_catalogs_from_excel.py
```

3. Reconciliar códigos de puestos:

```bash
python scripts/sync_puestos_codes_from_excel.py --dry-run
python scripts/sync_puestos_codes_from_excel.py
```

4. Regenerar cache territorial:

```bash
python scripts/refresh_territorial_stats_cache.py
```

### Rollback

1. Restaurar respaldo de `electoral.db` previo a la migración.
2. Ejecutar downgrade si aplica:

```bash
cd backend
alembic downgrade 20260310_0002
```

3. Reiniciar backend para limpiar estado de cache en memoria.
