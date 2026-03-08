## Context

El proyecto define endpoints sugeridos en `/api/v1` para jurisdicciones, puestos, búsqueda y analytics. Para MVP no se requiere autenticación, pero sí consistencia de contrato, validación de parámetros y soporte para filtros territoriales y espaciales.

## Goals / Non-Goals

**Goals:**

- Establecer contrato API estable para navegación geográfica y overlay de puestos.
- Habilitar operaciones CRUD mínimas de jurisdicciones y puestos.
- Definir consultas eficientes para hijos por jerarquía y para filtros de mapa.
- Entregar búsqueda global y analítica básica por año/corporación.

**Non-Goals:**

- No incorporar JWT/roles en esta fase.
- No implementar motor de recomendación ni analítica avanzada.
- No desplegar infraestructura de tiles en este cambio.

## Decisions

1. Contrato REST en prefijo `/api/v1`
   - Se mantienen los endpoints sugeridos por especificación para minimizar fricción de integración.

2. Modelo de jurisdicción jerárquica
   - Tabla con `id`, `codigo_divipola`, `nivel`, `parent_id`, `nombre`, `geometria_ref`.
   - Permite `children` determinístico y navegación multi-capa.

3. Filtros de puestos por jurisdicción y viewport
   - Endpoint de listados acepta `municipio_id`, `bbox`, `zoom`, `anio`, `corporacion`.
   - Mantiene payload controlado cuando el mapa se mueve.

4. Búsqueda global unificada
   - Endpoint único `search` con `query`, `types[]`, `limit`, `offset`.
   - Resultado heterogéneo tipado para UI de autocompletar.

## Risks / Trade-offs

- [Riesgo] Jerarquía territorial incompleta en datos fuente → Mitigación: reglas de validación obligatoria para `parent_id` y nivel.
- [Riesgo] Consultas de puestos lentas en zoom bajo → Mitigación: límite de resultados, índice espacial y paginación.
- [Riesgo] Contrato demasiado rígido para evolución → Mitigación: versionado `/v1` y campos opcionales extensibles.

## Migration Plan

1. Crear modelos y migraciones iniciales de jurisdicciones y puestos.
2. Publicar endpoints CRUD base y endpoint children.
3. Agregar filtros espaciales de puestos y serialización de respuesta.
4. Implementar búsqueda global y analytics mínimo.
5. Verificar integración end-to-end con frontend de mapa.

## Open Questions

- ¿`analytics` responde agregados por partido desde MVP o solo totales de corporación?
- ¿se incluirá endpoint bulk para importaciones masivas en v1 o solo unitario?
- ¿`search` debe priorizar coincidencia exacta de DIVIPOLA sobre nombre?
