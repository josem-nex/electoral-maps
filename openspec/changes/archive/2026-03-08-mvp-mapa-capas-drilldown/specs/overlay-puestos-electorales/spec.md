## ADDED Requirements

### Requirement: Overlay de puestos con coordenadas de cliente

El sistema SHALL representar puestos electorales como puntos usando exactamente las coordenadas entregadas por cliente, sin geocodificación automática.

#### Scenario: Carga de puntos en mapa

- **WHEN** existe un conjunto válido de puestos para la jurisdicción activa
- **THEN** el mapa MUST renderizar marcadores en las coordenadas fuente

### Requirement: Popup de información básica

El sistema SHALL mostrar popup al seleccionar un puesto con datos básicos de identificación y ubicación.

#### Scenario: Apertura de popup de puesto

- **WHEN** el usuario hace click en un marcador de puesto
- **THEN** se MUST mostrar popup con nombre/código, dirección o referencia, y datos operativos mínimos

### Requirement: Acción de ver detalle o editar

El sistema SHALL incluir en el popup una acción explícita para abrir detalle/edición del puesto en panel lateral o formulario.

#### Scenario: Navegación a detalle desde popup

- **WHEN** el usuario activa “ver detalle / editar” en un popup
- **THEN** el sistema MUST abrir la vista de detalle del puesto seleccionado
