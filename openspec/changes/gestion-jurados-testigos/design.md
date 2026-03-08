## Context

El cliente solicita CRUD simple para jurados y testigos por jurisdicción, con opción de agregar nuevos registros y visualización de asignados. No se requiere autenticación por ahora, por lo que el foco está en consistencia de datos, facilidad de uso y operación rápida.

## Goals / Non-Goals

**Goals:**

- Definir entidades de jurado/testigo con relación a jurisdicción.
- Habilitar operaciones CRUD simples y listados filtrados por jurisdicción.
- Permitir carga inicial desde plantillas y posterior edición manual.

**Non-Goals:**

- No incluir flujos de aprobación ni auditoría avanzada en MVP.
- No incluir modelo de permisos por rol en esta fase.
- No agregar funcionalidades de mensajería o notificaciones.

## Decisions

1. Modelo unificado de persona asignada
   - Se usa estructura común para datos personales y rol (`jurado` o `testigo`).
   - Reduce duplicación de validaciones y formularios.

2. CRUD por jurisdicción como eje principal
   - Todas las operaciones se contextualizan por jurisdicción activa.
   - Facilita consistencia con navegación geográfica del mapa.

3. Tabla editable con formulario lateral
   - Vista principal en tabla y edición en formulario simple.
   - Mantiene UX institucional clara y flujo rápido.

## Risks / Trade-offs

- [Riesgo] Datos duplicados de persona en jurisdicción → Mitigación: restricción por documento + jurisdicción + rol.
- [Riesgo] Carga inicial con campos incompletos → Mitigación: validación mínima obligatoria y reporte de filas rechazadas.
- [Riesgo] Escalamiento de volumen en listados → Mitigación: paginación y filtros por texto/estado.

## Migration Plan

1. Crear tablas y esquemas para jurados/testigos.
2. Implementar endpoints CRUD por rol y jurisdicción.
3. Construir tablas UI y formularios de alta/edición.
4. Implementar importación inicial desde plantilla.
5. Validar operación completa en dos jurisdicciones piloto.

## Open Questions

- ¿Se manejarán estados operativos (activo/inactivo/reemplazo) desde MVP?
- ¿Qué campos de contacto son obligatorios por rol?
- ¿La importación inicial debe mezclar jurados y testigos en un único archivo o separados?
