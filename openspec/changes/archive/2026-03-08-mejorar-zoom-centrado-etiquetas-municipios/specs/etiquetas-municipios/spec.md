## ADDED Requirements

### Requirement: Renderizado de nombres municipales en capa departamental

El sistema SHALL mostrar etiquetas con los nombres de los municipios cuando el usuario navega a la vista de un departamento específico.

#### Scenario: Visualización de etiquetas al seleccionar departamento

- **WHEN** el usuario selecciona un departamento en el mapa
- **THEN** el mapa renderiza etiquetas de texto con el nombre de cada municipio del departamento seleccionado
- **AND** cada etiqueta se posiciona en el centroide geométrico del polígono municipal correspondiente

#### Scenario: Ocultamiento de etiquetas en vista nacional

- **WHEN** el usuario navega de vuelta a la vista nacional (capa país)
- **THEN** el sistema oculta todas las etiquetas municipales y muestra solo nombres de departamentos

#### Scenario: Legibilidad de etiquetas sobre fondos variados

- **WHEN** las etiquetas municipales se renderizan sobre el mapa
- **THEN** el texto incluye efectos visuales (sombra o contorno) que garantizan legibilidad sobre diferentes colores de fondo departamental

### Requirement: Cálculo automático de centroides municipales

El sistema SHALL calcular dinámicamente las coordenadas de posicionamiento de etiquetas a partir de la geometría GeoJSON de municipios.

#### Scenario: Cálculo de centroide para municipio regular

- **WHEN** el sistema recibe la geometría de un municipio de tipo Polygon
- **THEN** calcula el centroide geométrico y posiciona la etiqueta en esas coordenadas

#### Scenario: Cálculo de centroide para municipio con geometría compleja

- **WHEN** el sistema recibe la geometría de un municipio de tipo MultiPolygon
- **THEN** calcula el centroide del polígono más grande y posiciona la etiqueta en esas coordenadas
