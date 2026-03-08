## Context

El cliente aporta múltiples plantillas (puestos, jurados, testigos, resultados 2022 cámara/senado). El sistema debe soportar consultar todos los años por capa y mantener consistencia de territorialidad. El valor de negocio está en validar temprano y evitar reprocesos manuales.

## Goals / Non-Goals

**Goals:**

- Estandarizar pipeline de importación de Excel/CSV con validación y reporte de errores.
- Aplicar matching territorial por DIVIPOLA como llave principal.
- Consolidar resultados por año/corporación y nivel territorial para consulta rápida.

**Non-Goals:**

- No geocodificar automáticamente registros sin coordenadas en MVP.
- No construir ETL distribuido ni scheduler complejo.
- No implementar data lake ni BI fuera del alcance operativo.

## Decisions

1. Pipeline en dos etapas: staging + publicación
   - Primero ingresa a tablas de staging con validaciones, luego publica datos válidos.
   - Reduce riesgo de contaminar tablas operativas.

2. DIVIPOLA como clave maestra
   - Matching primario por código, matching secundario por nombre solo como fallback controlado.

3. Validación por contrato de plantilla
   - Cada tipo de archivo define columnas obligatorias, tipos y reglas de dominio.
   - Se devuelve reporte detallado por fila.

4. Agregación incremental por contexto electoral
   - Se generan agregados por `anio`, `corporacion`, `nivel`, `jurisdiccion_id`.

## Risks / Trade-offs

- [Riesgo] Archivos heterogéneos entre periodos → Mitigación: versionar plantilla y mapear columnas alias.
- [Riesgo] Nombres territoriales inconsistentes → Mitigación: priorizar DIVIPOLA y registrar conflictos.
- [Riesgo] Cargas voluminosas bloquean API → Mitigación: procesamiento asíncrono y paginación de errores.

## Migration Plan

1. Definir contratos de plantilla por tipo de importación.
2. Implementar endpoint de carga y validación en staging.
3. Implementar matching DIVIPOLA y reporte de errores.
4. Implementar publicación de registros válidos y agregados por año/corporación.
5. Exponer datos consolidados a endpoint analytics.

## Open Questions

- ¿Las plantillas de 2022 son referencia o contrato obligatorio para años futuros?
- ¿Se permite sobreescritura de resultados de un año ya publicado?
- ¿La operación requiere importación parcial por departamento o solo cargas nacionales?
