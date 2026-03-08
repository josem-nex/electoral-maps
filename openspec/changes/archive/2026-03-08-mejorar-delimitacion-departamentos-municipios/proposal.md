## Why

La navegación actual permite seleccionar un departamento, pero la delimitación visual entre departamentos es tenue y al hacer zoom no aparecen los municipios delimitados del departamento elegido. Esto dificulta la lectura territorial y el drill-down esperado para operación electoral.

## What Changes

- Fortalecer el contraste visual de límites departamentales en el mapa país para que la separación sea clara antes y durante la selección.
- Restringir la vista inicial a Colombia para evitar mostrar contexto regional innecesario fuera del país.
- Incorporar visualización de límites municipales del departamento seleccionado después del zoom.
- Habilitar consumo de geometría municipal filtrada por código de departamento desde backend para soportar la capa municipal en frontend.

## Capabilities

### New Capabilities

- `mapa-delimitacion-territorial`: Visualización jerárquica con límites departamentales destacados y renderizado de municipios delimitados por departamento seleccionado.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend: `frontend/src/components/ElectoralMap.tsx`, estilos de capas GeoJSON y control de viewport.
- Frontend API client: `frontend/src/api/client.ts` para endpoint de geometría municipal.
- Backend API: nuevo endpoint GeoJSON para municipios por departamento en `backend/app/main.py`.
- Backend data loading: carga de TopoJSON/GeoJSON municipal en `backend/app/data_loader.py`.
