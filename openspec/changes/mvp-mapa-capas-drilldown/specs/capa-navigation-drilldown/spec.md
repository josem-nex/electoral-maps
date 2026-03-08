## ADDED Requirements

### Requirement: Navegación por capas electorales

El sistema SHALL permitir seleccionar explícitamente la capa activa desde un menú desplegable global con las capas País, Zonas, Departamentos, Municipio, Localidad (Bogotá) y Puesto Electoral.

#### Scenario: Cambio de capa por selector global

- **WHEN** el usuario selecciona una capa distinta en el menú global
- **THEN** el mapa MUST renderizar la geometría correspondiente a esa capa y actualizar el estado de navegación

### Requirement: Drill-down por click en polígonos

El sistema SHALL permitir navegar a la siguiente capa al hacer click sobre un polígono de la capa actual, conservando el contexto territorial seleccionado.

#### Scenario: Navegación de departamento a municipio

- **WHEN** el usuario hace click sobre un departamento en la capa Departamentos
- **THEN** el sistema MUST abrir la capa Municipio filtrada por ese departamento

### Requirement: Navegación ascendente con breadcrumbs

El sistema SHALL exponer breadcrumbs para volver a capas superiores sin recargar la SPA.

#### Scenario: Regreso desde municipio a departamento

- **WHEN** el usuario hace click en el breadcrumb de Departamento
- **THEN** el mapa MUST restaurar la vista de departamento previamente seleccionada
