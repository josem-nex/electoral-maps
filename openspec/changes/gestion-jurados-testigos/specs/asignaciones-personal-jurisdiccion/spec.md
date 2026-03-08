## ADDED Requirements

### Requirement: Vista consolidada de personal asignado

El sistema SHALL mostrar en una vista única los jurados y testigos asignados a la jurisdicción seleccionada.

#### Scenario: Consulta consolidada por departamento

- **WHEN** el operador selecciona un departamento en el módulo de asignaciones
- **THEN** el sistema MUST mostrar listado combinado de jurados y testigos de ese departamento

### Requirement: Alta directa desde vista de asignaciones

El sistema SHALL permitir crear un nuevo jurado o testigo desde la vista consolidada sin salir del contexto territorial.

#### Scenario: Crear testigo desde vista consolidada

- **WHEN** el operador ejecuta la acción “agregar testigo” en la vista consolidada
- **THEN** el sistema MUST abrir formulario de alta precargando la jurisdicción activa

### Requirement: Sincronización inmediata de cambios

El sistema SHALL reflejar en la vista consolidada cualquier alta, edición o eliminación realizada en jurados/testigos.

#### Scenario: Actualización de listado tras edición

- **WHEN** se actualiza un jurado en una jurisdicción activa
- **THEN** el listado consolidado MUST refrescarse y mostrar el valor actualizado
