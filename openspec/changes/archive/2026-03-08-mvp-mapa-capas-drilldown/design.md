## Context

La aplicación debe operar como SPA con navegación fluida entre capas geográficas y fuerte enfoque en usabilidad institucional. Existe material cartográfico en `data/mapas/` (GeoJSON, TopoJSON y Shapefile) y datos de puestos con coordenadas entregadas por cliente. Se requiere click-to-drill-down y también navegación explícita por selector para que el usuario pueda saltar niveles.

## Goals / Non-Goals

**Goals:**

- Definir un modelo de estado único para capa actual, jurisdicción seleccionada y breadcrumbs.
- Estandarizar la interacción de selección por dropdown, click en polígono y búsqueda.
- Garantizar centrado/zoom determinístico en cada transición y selección.
- Mostrar puestos como overlay de puntos con popup de datos básicos y acción de detalle.

**Non-Goals:**

- No incluir autenticación ni control de permisos en esta fase.
- No incorporar animaciones avanzadas ni componentes fuera del alcance MVP.
- No resolver clustering masivo server-side en este cambio.

## Decisions

1. Estado de navegación centralizado
   - Se define un estado global (store) con: `currentLayer`, `selectedJurisdiction`, `breadcrumbs`, `activeElectionContext`.
   - Rationale: evita inconsistencias entre shell, mapa y panel lateral.
   - Alternativa descartada: estado local por componente, por alto riesgo de desincronización.

2. Mapa con jerarquía explícita de capas
   - Cada capa conoce su padre/hijo para habilitar drill-down y breadcrumbs.
   - Rationale: permite navegación bidireccional y simplifica lógica de transición.
   - Alternativa descartada: rutas ad-hoc por if/else, difícil de mantener.

3. Estrategia de zoom con `fitBounds`
   - Toda selección territorial aplica `fitBounds` de la geometría; para puestos puntuales usa `flyTo` con zoom objetivo.
   - Rationale: comportamiento predecible y reusable.

4. Overlay de puestos desacoplado
   - El overlay de puntos se renderiza como capa separada condicionada por contexto territorial y zoom.
   - Rationale: evitar recarga total del mapa y facilitar optimización posterior.

## Risks / Trade-offs

- [Riesgo] Geometrías pesadas a nivel municipio degradan UX inicial → Mitigación: preferir TopoJSON simplificado cuando exista y lazy-load por capa.
- [Riesgo] Datos de coordenadas de puestos inconsistentes → Mitigación: validación mínima y descarte controlado de puntos inválidos.
- [Riesgo] Dependencia de nombres en datos tabulares puede romper matching → Mitigación: usar DIVIPOLA como llave principal.

## Migration Plan

1. Introducir store de navegación y adapter de capas sin romper vista actual.
2. Migrar render del mapa a jerarquía de capas + callbacks de drill-down.
3. Integrar búsqueda/selector para disparar selección y centrado.
4. Activar overlay de puestos con popup y acción de detalle.
5. Verificar regresión manual de navegación entre todas las capas MVP.

## Open Questions

- ¿Se prioriza Leaflet por simplicidad inmediata o MapLibre por futura escalabilidad con vector tiles?
- ¿La capa de consulados entra como mapa separado, filtro especial o subcapa puntual en MVP?
- ¿Localidad/UPZ de Bogotá estará disponible desde inicio o se habilita con feature flag?
