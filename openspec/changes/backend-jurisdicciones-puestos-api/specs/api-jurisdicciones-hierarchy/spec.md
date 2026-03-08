## ADDED Requirements

### Requirement: CRUD de jurisdicciones electorales

El sistema SHALL exponer `/api/v1/jurisdicciones/` para listar, crear, actualizar y eliminar jurisdicciones con validación de nivel territorial y código DIVIPOLA.

#### Scenario: Creación válida de jurisdicción

- **WHEN** un cliente envía una jurisdicción con nivel válido, nombre y código DIVIPOLA único
- **THEN** la API MUST persistir la jurisdicción y retornar su identificador

### Requirement: Consulta de hijos por jerarquía

El sistema SHALL exponer `/api/v1/jurisdicciones/{id}/children` para obtener la lista de entidades hijas directas de una jurisdicción.

#### Scenario: Consulta de municipios de un departamento

- **WHEN** un cliente consulta `children` para una jurisdicción de nivel departamento
- **THEN** la API MUST retornar únicamente municipios cuyo `parent_id` corresponda al departamento solicitado

### Requirement: Integridad jerárquica

El sistema SHALL rechazar operaciones que rompan la jerarquía electoral (por ejemplo, municipio sin departamento padre).

#### Scenario: Rechazo de parent inválido

- **WHEN** un cliente crea o actualiza una jurisdicción con `parent_id` incompatible con su nivel
- **THEN** la API MUST responder error de validación y no persistir cambios
