## Context

El mapa electoral actual utiliza Leaflet con restricciones de navegación (`maxBounds`) configuradas al territorio colombiano para evitar mostrar países externos. Al seleccionar un departamento, el componente `ElectoralMap.tsx` navega a la capa departamental pero mantiene el nivel de zoom nacional, dificultando la visualización de municipios. Los departamentos fronteras (como Amazonas, Guainía, La Guajira) presentan problemas adicionales porque su geometría toca los límites del `maxBounds`, causando que `fitBounds` no pueda centrarlos correctamente.

Actualmente, los nombres de departamentos se renderizan en la vista nacional usando `react-leaflet` Markers, pero no existe equivalente para municipios.

## Goals / Non-Goals

**Goals:**

- Zoom automático al departamento seleccionado que permita visualizar claramente los límites municipales
- Centrado funcional para todos los departamentos, incluyendo territorios fronteras
- Etiquetas de nombres municipales legibles y posicionadas correctamente
- Mantener la restricción territorial de Colombia en la navegación general

**Non-Goals:**

- Permitir navegación fuera de Colombia (maxBounds se mantiene activo)
- Etiquetas municipales en la vista nacional (solo en capa departamental)
- Clustering o agrupamiento de etiquetas por nivel de zoom

## Decisions

### Decisión 1: Zoom adaptativo usando fitBounds con bounds del departamento

**Enfoque**: Calcular el bounding box del departamento seleccionado desde su geometría GeoJSON y usar `map.fitBounds()` con padding.

**Rationale**: Leaflet ya provee `L.geoJSON().getBounds()` que calcula bounds automáticamente desde la geometría. Esto es más preciso que zoom fijo y se adapta al tamaño variable de cada departamento.

**Alternativas consideradas**:

- Zoom fijo (nivel 9-10): No se adapta a departamentos grandes (Amazonas) vs pequeños (Quindío)
- Centroide + zoom: Requiere calcular centroides y no garantiza que toda la geometría sea visible

**Implementación**: En `MapController` (componente de efectos de Leaflet), detectar cambio de `selectedDepartmentCode` y aplicar `fitBounds` con `padding: [50, 50]`.

### Decisión 2: Ajuste temporal de maxBounds para departamentos fronteras

**Enfoque**: Al seleccionar un departamento frontera, expandir temporalmente `maxBounds` con padding adicional para permitir centrado, luego restaurar límites normales.

**Rationale**: El problema de centrado ocurre porque `fitBounds` respeta `maxBounds` y no puede desplazar el mapa más allá de Colombia. Expandir temporalmente el límite (ej. 0.5 grados) permite centrar sin mostrar países completos, solo márgenes pequeños de territorio externo.

**Alternativas consideradas**:

- Eliminar maxBounds completamente: Permitiría navegación fuera de Colombia, contra requerimientos
- Usar bounds del departamento como nuevos maxBounds: Demasiado restrictivo, impide navegación dentro del departamento
- Padding asimétrico en fitBounds: No resuelve el problema fundamental de maxBounds

**Implementación**: Detectar si el departamento intersecta COLOMBIA_BOUNDS, expandir maxBounds temporalmente antes de fitBounds, restaurar después de 500ms (tiempo para completar animación de zoom).

### Decisión 3: Etiquetas municipales con Marker + divIcon permanente

**Enfoque**: Usar `react-leaflet` Marker con `divIcon` conteniendo el nombre del municipio, posicionado en el centroide de cada polígono municipal.

**Rationale**: Los divIcon permiten HTML/CSS personalizado (fuentes, tamaños, bordes), mejor control visual que Tooltip. Al ser Markers permanentes no requieren hover. Los centroides pueden calcularse en frontend usando `turf.centroid()` desde GeoJSON sin modificar el backend.

**Alternativas consideradas**:

- Tooltip permanente: Requiere `permanent={true}` pero menos flexible visualmente
- SVG overlay: Mayor rendimiento pero más complejo de implementar sin beneficio claro para ~50-100 municipios por departamento
- Canvas rendering: Overkill para este caso de uso, mapa ya usa SVG renderer de Leaflet

**Implementación**:

- Añadir dependencia `@turf/centroid` al frontend
- Calcular centroides al recibir municipios GeoJSON
- Renderizar Markers con divIcon usando clase CSS para estilo consistente (font-size 10px, text-shadow para legibilidad sobre diversos fondos)

### Decisión 4: No extender API backend para centroides

**Enfoque**: Calcular centroides en el frontend usando biblioteca Turf.js.

**Rationale**: Los centroides son derivables directamente de la geometría GeoJSON que ya recibimos. Calcularlos en frontend evita modificar el backend, reduce payload de red (centroides añadirían ~20-30% al tamaño de respuesta), y permite ajustes visuales sin redeploy del backend.

**Alternativas consideradas**:

- Backend calcula centroides en GeoJSON properties: Aumenta payload, acopla presentación con datos
- Backend endpoint separado de centroides: Requiere petición adicional de red

## Risks / Trade-offs

**[Rendimiento con muchas etiquetas]** → Limitar etiquetas a municipios visibles en viewport usando `useMemo` con bounds del mapa. Si un departamento tiene >100 municipios, considerar mostrar solo en zoom >9.

**[Etiquetas superpuestas en municipios pequeños]** → Aplicar font-size mínimo y considerar `pointer-events: none` en divIcon para evitar bloquear interacciones con el mapa.

**[Expansión temporal de maxBounds puede mostrar territorio externo]** → Limitar expansión a 0.3 grados (~33km) que es suficiente para centrado pero minimiza visualización de países vecinos.

**[Dependencia adicional Turf.js]** → Solo instalar `@turf/centroid` (paquete modular ~5KB) en lugar de `@turf/turf` completo para minimizar bundle size.

## Migration Plan

No aplica rollback complejo. Cambios son aditivos en frontend:

1. Deploy con feature flag si se desea validación progresiva
2. Si surgen problemas de rendimiento, deshabilitar etiquetas municipales sin afectar zoom/centrado
3. Monitorear bundle size tras añadir @turf/centroid
