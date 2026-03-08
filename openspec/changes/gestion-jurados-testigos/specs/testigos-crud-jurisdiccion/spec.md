## ADDED Requirements

### Requirement: CRUD de testigos por jurisdicción

El sistema SHALL permitir crear, listar, actualizar y eliminar testigos asociados a una jurisdicción electoral.

#### Scenario: Edición de testigo existente

- **WHEN** un operador actualiza la información de contacto de un testigo existente
- **THEN** el sistema MUST persistir los cambios y actualizar la vista de listado

### Requirement: Integridad mínima de datos de testigo

El sistema SHALL exigir campos obligatorios definidos para testigos antes de persistir.

#### Scenario: Rechazo por datos incompletos

- **WHEN** un operador intenta crear un testigo sin campos obligatorios
- **THEN** el sistema MUST rechazar la creación indicando los campos faltantes

### Requirement: Eliminación controlada

El sistema SHALL permitir eliminación de testigo con confirmación explícita de la acción.

#### Scenario: Confirmación de eliminación

- **WHEN** un operador confirma eliminación de un testigo
- **THEN** el sistema MUST remover el registro y no mostrarlo en listados posteriores
