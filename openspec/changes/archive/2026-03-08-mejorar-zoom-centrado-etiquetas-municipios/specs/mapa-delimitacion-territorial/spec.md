## MODIFIED Requirements

### Requirement: Delimitación municipal por departamento seleccionado

El sistema SHALL mostrar la geometría municipal del departamento seleccionado después del zoom de drill-down con ajuste automático de viewport.

#### Scenario: Carga de municipios al seleccionar departamento

- **WHEN** el usuario selecciona un departamento en el mapa
- **THEN** el frontend solicita al backend la geometría municipal filtrada por código de departamento
- **AND** el mapa renderiza los municipios del departamento seleccionado con límites internos visibles

#### Scenario: Cambio de departamento seleccionado

- **WHEN** el usuario selecciona un departamento diferente
- **THEN** el sistema reemplaza la capa municipal anterior por la del nuevo departamento sin superponer geometrías antiguas

#### Scenario: Zoom automático al seleccionar departamento

- **WHEN** el usuario selecciona un departamento en el mapa
- **THEN** el mapa ejecuta zoom y centrado automático ajustando el viewport a los límites geográficos del departamento seleccionado
- **AND** el nivel de zoom resultante permite visualizar claramente los límites municipales internos

## ADDED Requirements

### Requirement: Centrado adaptativo para departamentos fronteras

El sistema SHALL ajustar el centrado de departamentos ubicados en fronteras nacionales para garantizar visualización completa del territorio sin violar restricciones de navegación.

#### Scenario: Selección de departamento frontera

- **WHEN** el usuario selecciona un departamento cuya geometría intersecta los límites del maxBounds configurado (ej. La Guajira, Amazonas, Guainía)
- **THEN** el mapa aplica un ajuste temporal de los límites de navegación para permitir centrado efectivo del departamento
- **AND** restaura los límites de navegación normales después de completar la animación de zoom

#### Scenario: Selección de departamento interior

- **WHEN** el usuario selecciona un departamento que no intersecta los límites de Colombia (ej. Cundinamarca, Antioquia)
- **THEN** el mapa aplica zoom y centrado estándar sin ajustes temporales a maxBounds
