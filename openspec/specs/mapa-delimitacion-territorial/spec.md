## MODIFIED Requirements

### Requirement: Delimitación municipal por departamento seleccionado

El sistema SHALL mostrar la geometría municipal del departamento seleccionado después del zoom de drill-down, resolviendo la selección por IDs territoriales operativos del Excel (`dd` para departamento y `mm` para municipio).

#### Scenario: Carga de municipios al seleccionar departamento

- **WHEN** el usuario selecciona un departamento en el mapa
- **THEN** el frontend solicita al backend la geometría municipal filtrada por `dd`
- **AND** el mapa renderiza únicamente municipios cuyo `mm` pertenece al `dd` seleccionado

#### Scenario: Cambio de departamento seleccionado

- **WHEN** el usuario selecciona un departamento diferente
- **THEN** el sistema reemplaza la capa municipal anterior por la del nuevo `dd`
- **AND** cada etiqueta municipal corresponde al `mm` operativo de la feature

### Requirement: API de geometría municipal filtrada

El backend SHALL exponer un endpoint de municipios por departamento en formato GeoJSON cuyas propiedades incluyan IDs territoriales Excel (`dd` y `mm`) como llaves estables para interacción frontend.

#### Scenario: Solicitud válida de municipios

- **WHEN** el cliente invoca `GET /api/v1/geojson/municipios` con `departamento_codigo` válido de 2 dígitos (`dd`)
- **THEN** el backend responde `200` con un `FeatureCollection` de municipios del `dd` solicitado
- **AND** cada feature incluye `departamento_codigo=dd` y `municipio_codigo=mm`

#### Scenario: Solicitud inválida sin código de departamento

- **WHEN** el cliente invoca el endpoint sin `departamento_codigo`
- **THEN** el backend responde con error de validación y no retorna geometría municipal

## ADDED Requirements

### Requirement: Integridad territorial del panel de puesto basada en IDs Excel

El sistema SHALL resolver contexto territorial del panel de detalle de puesto usando `dd/mm` del Excel persistidos en BD, evitando falsos errores por discrepancia con IDs canónicos alternos.

#### Scenario: Apertura de puesto con códigos válidos en BD

- **WHEN** el usuario abre un puesto cuyo `dd/mm` existe en catálogos territoriales Excel de BD
- **THEN** el panel muestra municipio y departamento sin error de integridad territorial
- **AND** la resolución de etiquetas usa catálogos BD sin fallback a codificación canónica externa
