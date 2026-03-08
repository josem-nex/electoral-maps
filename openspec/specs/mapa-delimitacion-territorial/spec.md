# mapa-delimitacion-territorial Specification

## Purpose

TBD - created by archiving change mejorar-delimitacion-departamentos-municipios. Update Purpose after archive.

## Requirements

### Requirement: Límites departamentales con alto contraste

El sistema SHALL renderizar los departamentos de Colombia con límites claramente distinguibles para facilitar lectura territorial en la vista nacional.

#### Scenario: Visualización de departamentos en vista país

- **WHEN** el usuario abre el mapa en capa país
- **THEN** el mapa muestra todos los departamentos con bordes visibles y separación clara entre polígonos adyacentes

#### Scenario: Resaltado del departamento seleccionado

- **WHEN** el usuario hace clic sobre un departamento
- **THEN** el departamento seleccionado se renderiza con un estilo de borde y relleno más destacado que el resto

### Requirement: Vista restringida al territorio colombiano

El sistema SHALL limitar la navegación del mapa al territorio de Colombia para evitar mostrar países externos durante la operación.

#### Scenario: Desplazamiento fuera de Colombia

- **WHEN** el usuario intenta arrastrar el mapa fuera del límite nacional
- **THEN** el mapa mantiene la vista dentro de los límites configurados de Colombia

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

### Requirement: API de geometría municipal filtrada

El backend SHALL exponer un endpoint de consulta de municipios por departamento en formato GeoJSON.

#### Scenario: Solicitud válida de municipios

- **WHEN** el cliente invoca `GET /api/v1/geojson/municipios` con `departamento_codigo` válido
- **THEN** el backend responde `200` con un `FeatureCollection` de municipios del departamento solicitado

#### Scenario: Solicitud inválida sin código de departamento

- **WHEN** el cliente invoca el endpoint sin `departamento_codigo`
- **THEN** el backend responde con error de validación y no retorna geometría municipal

### Requirement: Centrado adaptativo para departamentos fronteras

El sistema SHALL ajustar el centrado de departamentos ubicados en fronteras nacionales para garantizar visualización completa del territorio sin violar restricciones de navegación.

#### Scenario: Selección de departamento frontera

- **WHEN** el usuario selecciona un departamento cuya geometría intersecta los límites del maxBounds configurado (ej. La Guajira, Amazonas, Guainía)
- **THEN** el mapa aplica un ajuste temporal de los límites de navegación para permitir centrado efectivo del departamento
- **AND** restaura los límites de navegación normales después de completar la animación de zoom

#### Scenario: Selección de departamento interior

- **WHEN** el usuario selecciona un departamento que no intersecta los límites de Colombia (ej. Cundinamarca, Antioquia)
- **THEN** el mapa aplica zoom y centrado estándar sin ajustes temporales a maxBounds
