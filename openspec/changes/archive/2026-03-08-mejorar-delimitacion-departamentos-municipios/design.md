## Context

El MVP actual del mapa electoral permite seleccionar departamentos y navegar por zoom, pero el trazo de fronteras departamentales no tiene suficiente contraste para lectura operativa. Además, al entrar a un departamento no se renderizan polígonos municipales, por lo que se pierde la continuidad del drill-down territorial.

La base de datos geográfica ya existe en el repositorio: departamentos en GeoJSON y municipios en TopoJSON (`Colombia_departamentos_municipios_CNPV2018.topojson`). El frontend usa React-Leaflet y el backend FastAPI, por lo que la solución debe mantener este stack sin introducir librerías adicionales innecesarias.

## Goals / Non-Goals

**Goals:**

- Resaltar claramente límites departamentales en vista país y durante selección.
- Mantener el foco visual sobre Colombia evitando mostrar región externa irrelevante.
- Mostrar límites de municipios del departamento seleccionado con geometría real filtrada por código DANE de departamento.
- Conservar comportamiento de navegación existente (click en departamento, zoom, breadcrumbs).

**Non-Goals:**

- No implementar edición de geometrías ni geoprocesamiento avanzado.
- No agregar nuevas capas temáticas fuera de departamentos/municipios.
- No rediseñar el flujo completo de navegación a puesto electoral en este cambio.

## Decisions

1. **Exponer endpoint backend de municipios GeoJSON por departamento**
   - **Decisión**: agregar endpoint REST que entregue `FeatureCollection` filtrada por `DPTO_CCDGO`.
   - **Rationale**: reduce carga en frontend, evita parsing completo del TopoJSON en cliente y mejora tiempo de render al cargar solo el departamento activo.
   - **Alternativas consideradas**:
     - Parsear TopoJSON completo en frontend con `topojson-client` (descartado por peso y complejidad en cliente).
     - Convertir todo a GeoJSON estático por adelantado (descartado por duplicación de datos y menor flexibilidad).

2. **Aplicar estilo de doble contraste para límites departamentales**
   - **Decisión**: elevar `weight` y opacidad del borde, y aplicar estilo activo al departamento seleccionado.
   - **Rationale**: separación visual inmediata sin cambiar arquitectura ni dependencias.
   - **Alternativas consideradas**:
     - Cambiar basemap (descartado por impacto visual global y variabilidad externa).
     - Agregar glow/animaciones (descartado por no ser necesario para MVP).

3. **Restringir viewport del mapa al bbox de Colombia**
   - **Decisión**: configurar `maxBounds` y `maxBoundsViscosity` en Leaflet con límites de Colombia.
   - **Rationale**: evita navegación a otros países y mantiene contexto de uso electoral nacional.
   - **Alternativas consideradas**:
     - Forzar recentrado continuo (descartado por UX brusca).

4. **Renderizar municipios solo en capa departamento**
   - **Decisión**: al estar en `layer=departamentos`, solicitar municipios del departamento seleccionado y pintar GeoJSON con límites finos.
   - **Rationale**: mantiene performance y coherencia de drill-down.
   - **Alternativas consideradas**:
     - Renderizar municipios de todo el país (descartado por densidad visual y costo de render).

## Risks / Trade-offs

- **[Riesgo] Diferencias de codificación DANE entre fuentes (DPTO vs DPTO_CCDGO) → Mitigación**: normalizar con `zfill(2)` y validación de parámetro en backend.
- **[Riesgo] Mayor número de polígonos en departamentos grandes → Mitigación**: cargar municipios bajo demanda y limpiar capa anterior al cambiar selección.
- **[Riesgo] Estilo de frontera demasiado grueso en zoom alto → Mitigación**: ajustar grosor por capa (departamento vs municipio).

## Migration Plan

1. Implementar loader backend para extraer municipios desde TopoJSON y convertir a GeoJSON filtrado.
2. Publicar endpoint `GET /api/v1/geojson/municipios?departamento_codigo=XX`.
3. Actualizar cliente API frontend para consumir el nuevo endpoint.
4. Ajustar componente de mapa: límites de Colombia, estilos departamentales y capa municipal por departamento activo.
5. Validar manualmente flujo: país → departamento → visualización municipal.
6. Rollback: desactivar consumo de endpoint municipal y mantener solo capa departamental (feature-flag por condición en frontend).

## Open Questions

- ¿Se requiere etiqueta visible de nombre de municipio en esta fase o solo delimitación?
- ¿Se desea habilitar click sobre municipio inmediatamente o se mantiene para siguiente iteración?
