`## 1. Backend GeoJSON municipal

- [x] 1.1 Implementar en `backend/app/data_loader.py` la carga del TopoJSON municipal y conversión a GeoJSON filtrable por `DPTO_CCDGO`.
- [x] 1.2 Agregar en `backend/app/main.py` el endpoint `GET /api/v1/geojson/municipios` con parámetro requerido `departamento_codigo`.
- [x] 1.3 Validar normalización de códigos (`zfill(2)`) y manejo de errores para solicitudes inválidas.

## 2. Frontend de delimitación territorial

- [x] 2.1 Extender `frontend/src/api/client.ts` con método para consultar municipios por departamento.
- [x] 2.2 Actualizar `frontend/src/components/ElectoralMap.tsx` para aplicar estilos de alto contraste a límites departamentales y resaltar selección activa.
- [x] 2.3 Configurar en Leaflet límites de navegación (`maxBounds`) para mantener la vista dentro de Colombia.
- [x] 2.4 Renderizar capa GeoJSON de municipios al seleccionar un departamento y limpiar la capa previa al cambiar selección.

## 3. Verificación funcional

- [x] 3.1 Probar flujo país → selección de departamento → zoom y aparición de municipios delimitados.
- [x] 3.2 Verificar que no se pueda desplazar el mapa a otros países fuera del bbox de Colombia.
- [x] 3.3 Ejecutar build del frontend y smoke test del backend para confirmar que no se introdujeron regresiones.
