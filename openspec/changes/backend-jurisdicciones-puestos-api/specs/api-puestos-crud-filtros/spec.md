## ADDED Requirements

### Requirement: CRUD de puestos electorales

El sistema SHALL exponer `/api/v1/puestos/` con operaciones de listado, creación, actualización y eliminación de puestos electorales.

#### Scenario: Actualización de puesto existente

- **WHEN** un cliente envía una actualización válida para un puesto existente
- **THEN** la API MUST guardar cambios y retornar el recurso actualizado

### Requirement: Filtros por jurisdicción y mapa

El sistema SHALL permitir filtrar listados de puestos por municipio, bounding box y nivel de zoom.

#### Scenario: Consulta por viewport del mapa

- **WHEN** un cliente solicita puestos con parámetros `bbox` y `zoom`
- **THEN** la API MUST retornar únicamente puestos dentro del área solicitada y aplicar límites de resultados

### Requirement: Soporte de contexto electoral

El sistema SHALL aceptar filtros opcionales de año y corporación (Cámara/Senado) para consultas de puestos y sus métricas asociadas.

#### Scenario: Consulta de puestos con filtro electoral

- **WHEN** un cliente consulta puestos con `anio=2022` y `corporacion=senado`
- **THEN** la API MUST retornar el subconjunto de datos asociado a ese contexto electoral
