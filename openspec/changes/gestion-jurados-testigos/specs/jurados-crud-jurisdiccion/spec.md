## ADDED Requirements

### Requirement: CRUD de jurados por jurisdicción

El sistema SHALL permitir crear, listar, actualizar y eliminar jurados asociados a una jurisdicción electoral.

#### Scenario: Alta de jurado en jurisdicción activa

- **WHEN** un operador registra un jurado con datos obligatorios válidos y jurisdicción seleccionada
- **THEN** el sistema MUST almacenar el jurado y reflejarlo en el listado de la jurisdicción

### Requirement: Validación de unicidad operativa

El sistema SHALL prevenir duplicidad de jurados por combinación de documento y jurisdicción.

#### Scenario: Rechazo de jurado duplicado

- **WHEN** se intenta registrar un jurado con mismo documento en la misma jurisdicción
- **THEN** el sistema MUST rechazar la operación con mensaje de validación

### Requirement: Consulta filtrada por jurisdicción

El sistema SHALL listar jurados filtrando por jurisdicción objetivo.

#### Scenario: Visualización de jurados de municipio

- **WHEN** un operador selecciona un municipio en el módulo de gestión
- **THEN** el sistema MUST mostrar únicamente jurados asignados a ese municipio
