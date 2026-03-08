## Why

Cada jurisdicción necesita gestionar personas clave (jurados y testigos) con operación CRUD simple y asignación visible. Sin este módulo, la herramienta no cubre la necesidad funcional central del cliente para administración territorial de equipos.

## What Changes

- Se define CRUD simple para jurados por jurisdicción.
- Se define CRUD simple para testigos por jurisdicción.
- Se define vista consolidada de asignaciones por jurisdicción.
- Se define importación básica desde plantillas existentes para carga inicial.

## Capabilities

### New Capabilities

- `jurados-crud-jurisdiccion`: alta, edición, consulta y eliminación de jurados por jurisdicción.
- `testigos-crud-jurisdiccion`: alta, edición, consulta y eliminación de testigos por jurisdicción.
- `asignaciones-personal-jurisdiccion`: visualización de personal asignado e incorporación de nuevos registros.

### Modified Capabilities

## Impact

- Backend de entidades de personas y asignaciones territoriales.
- Frontend en tablas CRUD por jurisdicción con formularios simples.
- Integración con datos de plantilla en `data/usar/` para carga inicial.
- Mejora operacional para seguimiento de cobertura territorial humana.
