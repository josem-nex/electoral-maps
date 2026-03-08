## ADDED Requirements

### Requirement: Importación de archivos con validación estructural

El sistema SHALL aceptar archivos Excel/CSV y validar columnas obligatorias, tipos de dato y reglas mínimas de negocio antes de publicar datos.

#### Scenario: Rechazo por columna obligatoria faltante

- **WHEN** el usuario carga un archivo sin una columna obligatoria definida por la plantilla
- **THEN** el sistema MUST marcar la importación como inválida y reportar el error con detalle

### Requirement: Reporte de errores accionable

El sistema SHALL devolver un resumen de validación con errores por fila y campo para facilitar corrección operativa.

#### Scenario: Resultado de validación con errores parciales

- **WHEN** una importación contiene filas válidas e inválidas
- **THEN** el sistema MUST identificar cada error y su localización exacta dentro del archivo

### Requirement: Publicación controlada de datos válidos

El sistema SHALL publicar únicamente registros que superen validaciones y preservar trazabilidad de la corrida.

#### Scenario: Publicación parcial permitida

- **WHEN** una importación tiene al menos un subconjunto válido
- **THEN** el sistema MUST permitir publicar solo los registros válidos y mantener registro del lote
