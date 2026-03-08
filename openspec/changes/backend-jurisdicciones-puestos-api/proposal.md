## Why

El frontend requiere una API mínima y estable para navegar jerarquía territorial, consultar/editar puestos y soportar búsqueda analítica básica. Sin este contrato, las vistas de mapa y CRUD no pueden operar de forma consistente.

## What Changes

- Se define API CRUD para jurisdicciones con consulta jerárquica de hijos.
- Se define API CRUD y filtros para puestos electorales (incluyendo filtro espacial por bounding box y zoom).
- Se define endpoint de búsqueda global para municipio, puesto y persona.
- Se define endpoint analítico básico por año, jurisdicción y corporación.

## Capabilities

### New Capabilities

- `api-jurisdicciones-hierarchy`: gestión de jurisdicciones y navegación padre-hijo.
- `api-puestos-crud-filtros`: CRUD de puestos con filtros espaciales y por jurisdicción.
- `api-search-analytics-minimo`: búsqueda global y analítica base para el MVP.

### Modified Capabilities

## Impact

- Backend FastAPI y esquemas Pydantic para endpoints `v1`.
- Modelo de datos de jurisdicciones, puestos y agregados de resultados.
- Integración directa con frontend para navegación, popups y filtros.
- Base para evolución posterior con PostGIS, cache y optimización.
