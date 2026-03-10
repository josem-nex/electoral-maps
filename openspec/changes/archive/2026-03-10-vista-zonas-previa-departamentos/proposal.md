## Why

La navegación actual inicia en vista nacional por departamentos. Para operación territorial, el equipo necesita una capa intermedia por zonas (cada zona con uno o varios departamentos) que simplifique el enfoque regional antes de bajar al detalle departamental. Además, se requiere una forma explícita de alternar entre vista por zonas y vista por departamentos desde la UI principal.

## What Changes

- Se agrega una vista inicial por zonas electorales antes de la vista por departamentos.
- Se define navegación zona → departamentos, mostrando únicamente los departamentos de la zona seleccionada.
- Se agrega selector de modo de vista (Zona / Departamento) junto al buscador en el panel izquierdo.
- Se define lectura de relaciones zona-departamento desde `data/usar/ZONAS VS MUNICIPIOS.xls`.

## Capabilities

### New Capabilities

- `vista-zonas-electorales-inicial`: render de zonas como nivel inicial de navegación del mapa.
- `selector-modo-zona-departamento`: control UI para conmutar entre vista por zonas y vista por departamentos.

### Modified Capabilities

- `electoral_map_enhancements`: ajuste de lógica de carga, zoom y selección para soportar el nivel zonal.

## Impact

- Frontend: estado de navegación, capas de mapa y controles de UI en componentes principales.
- Backend/datos: endpoint o estructura de datos de zonas y relación zona-departamento alimentada desde archivo fuente.
- Operación: flujo más claro para exploración regional antes de entrar a detalle departamental.
