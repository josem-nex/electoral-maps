## Why

La navegación actual del mapa presenta problemas de usabilidad al seleccionar departamentos: no hace zoom suficiente para visualizar municipios con detalle, los departamentos fronteras no se centran correctamente por las restricciones del límite nacional, y no hay identificación visual de los nombres de municipios, dificultando la interpretación de los datos electorales a nivel municipal.

## What Changes

- Implementar zoom automático al viewport del departamento seleccionado para visualizar municipios con mayor detalle
- Mejorar el algoritmo de centrado para departamentos fronteras ajustando la vista dentro de los límites de Colombia sin perder el foco territorial
- Añadir capa de etiquetas con nombres de municipios visibles al seleccionar un departamento, similar a la visualización de nombres de departamentos en la vista nacional

## Capabilities

### New Capabilities

- `etiquetas-municipios`: Renderizado de nombres de municipios como marcadores de texto sobre el mapa cuando se visualiza la capa departamental

### Modified Capabilities

- `mapa-delimitacion-territorial`: Cambios en el comportamiento de zoom y centrado al seleccionar departamentos para mejorar la visualización municipal y el manejo de territorios fronteras

## Impact

- **Frontend**: Componente `ElectoralMap.tsx` requiere lógica de zoom adaptativo basado en bounds del departamento y manejo especial para departamentos en fronteras
- **Frontend**: Nueva capa de etiquetas municipales con `react-leaflet` Markers o Tooltips permanentes
- **API**: Posible extensión del endpoint de municipios para incluir centroides o coordenadas representativas para posicionamiento de etiquetas
- **UX**: Mejora significativa en navegabilidad y comprensión territorial del mapa electoral
