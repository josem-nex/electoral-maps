## ADDED Requirements

### Requirement: Búsqueda global de jurisdicción

El sistema SHALL permitir buscar jurisdicciones por nombre o código y mostrar coincidencias dentro de la capa aplicable.

#### Scenario: Selección de jurisdicción desde búsqueda

- **WHEN** el usuario selecciona una jurisdicción sugerida en el buscador
- **THEN** el sistema MUST activar la capa correspondiente y seleccionar esa jurisdicción

### Requirement: Centrado automático por selección

El sistema SHALL aplicar centrado y zoom automático al seleccionar una jurisdicción desde dropdown o búsqueda.

#### Scenario: Centrado de municipio seleccionado

- **WHEN** el usuario selecciona un municipio desde el dropdown
- **THEN** el mapa MUST ejecutar ajuste de vista para que la geometría del municipio quede visible y centrada

### Requirement: Persistencia de contexto en navegación

El sistema SHALL mantener sincronizado el contexto entre selector de capa, búsqueda y estado del mapa.

#### Scenario: Consistencia entre controles

- **WHEN** el usuario cambia de capa por selector después de una búsqueda
- **THEN** los controles MUST reflejar la misma selección territorial activa sin estado huérfano
