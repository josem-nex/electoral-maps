## Why

El MVP necesita navegación geoespacial completa por capas electorales para uso operativo diario (país → zona → departamento → municipio → localidad → puesto). Sin una interacción consistente de drill-down, centrado automático y visualización de puestos, no se puede explotar la información territorial ni preparar las demás funciones de gestión.

## What Changes

- Se implementa navegación por capas desde un selector global y por click directo en el mapa.
- Se define comportamiento de zoom/centrado automático al seleccionar jurisdicción por dropdown o búsqueda.
- Se incorpora overlay de puestos electorales con popup y acción de ver detalle/editar.
- Se incorpora flujo de navegación con breadcrumbs para subir de nivel sin recargar.

## Capabilities

### New Capabilities

- `capa-navigation-drilldown`: navegación entre capas territoriales con selector global y click en polígonos.
- `mapa-zoom-busqueda-jurisdiccion`: búsqueda y centrado automático sobre la jurisdicción objetivo.
- `overlay-puestos-electorales`: visualización de puestos como puntos con popup y acción de detalle.

### Modified Capabilities

## Impact

- Frontend SPA (React + Vite + TypeScript) en módulo de mapa, shell y navegación.
- Componentes de mapa (Leaflet/MapLibre), estado global de capa y selección territorial.
- Integración con endpoints de jurisdicciones y puestos para cargar geometrías y marcadores.
- Base para UX de drill-down y para capas analíticas por año.
