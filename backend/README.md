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
