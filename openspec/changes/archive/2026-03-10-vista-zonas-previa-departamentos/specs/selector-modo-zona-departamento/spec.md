## ADDED Requirements

### Requirement: Selector de modo territorial en panel izquierdo

El sistema SHALL incluir un menú desplegable junto al buscador para alternar entre vista por zona y vista por departamento.

#### Scenario: Render del control de modo

- **WHEN** se renderiza el panel izquierdo de navegación territorial
- **THEN** el sistema MUST mostrar un selector con opciones `Zona` y `Departamento`

### Requirement: Restricción de opciones disponibles

El sistema SHALL limitar el selector a dos opciones en esta iteración: zona y departamento.

#### Scenario: Usuario abre opciones del selector

- **WHEN** el usuario despliega el selector de modo territorial
- **THEN** el sistema MUST exponer únicamente las opciones `Zona` y `Departamento`

### Requirement: Conmutación de modo y consistencia de estado

El sistema SHALL actualizar la capa visible y limpiar selecciones incompatibles al cambiar de modo.

#### Scenario: Cambio de modo de departamento a zona

- **WHEN** el usuario cambia de `Departamento` a `Zona`
- **THEN** el sistema MUST regresar a la vista zonal y limpiar selección departamental/municipal activa

#### Scenario: Cambio de modo de zona a departamento

- **WHEN** el usuario cambia de `Zona` a `Departamento`
- **THEN** el sistema MUST mostrar la vista por departamentos sin requerir selección previa de zona
