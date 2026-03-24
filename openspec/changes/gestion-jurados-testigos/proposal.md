## Why

La herramienta necesita mostrar dónde están asignados los jurados y testigos electorales en el mapa territorial. Sin este módulo, el equipo operativo no puede visualizar cobertura humana por puesto, municipio o departamento, ni cargar las plantillas de personal que ya existen.

## What Changes

- Se añade la vista "JURADOS Y TESTIGOS" en la pantalla de inicio (renombrada desde "INFORMACIÓN JURADOS").
- Se implementa carga de archivo (.xlsx o .csv) como único mecanismo de ingesta de datos.
- La carga reemplaza todos los datos previos del tipo cargado (jurados o testigos).
- Se añade opción de eliminar todos los datos de jurados, de testigos, o de ambos.
- Se muestra en el panel derecho del mapa el conteo de jurados y testigos por territorio (país, zona, departamento, municipio) y la lista de personas al nivel de puesto.
- La separación Jurados / Testigos se maneja como dos tabs en el panel (análogo a Senado / Cámara en resultados).
- La persistencia es en base de datos SQLite vía nueva tabla `personal_electoral`.

## Capabilities

### New Capabilities

- `carga-personal-electoral`: ingesta, reemplazo y eliminación de jurados/testigos desde archivo xlsx/csv.
- `visualizacion-personal-por-territorio`: conteo agregado de jurados y testigos por nivel territorial y lista por puesto.

### Modified Capabilities

- `pantalla-inicial-seleccion-vistas-mapa`: botón "INFORMACIÓN JURADOS" renombrado a "JURADOS Y TESTIGOS" y conectado a la nueva vista.

## Impact

- Nueva tabla `personal_electoral` en DB con migración Alembic.
- Nuevo endpoint de carga (multipart file upload) y endpoint de eliminación.
- Nuevo endpoint de consulta de conteos agregados por territorio y lista por puesto.
- Nuevo panel frontend `JuradosTestigosPanel` en el rail derecho.
- Modificación de `LandingEntryScreen` y `App.tsx` para habilitar la vista.
- Script Python de generación de datos ficticios para pruebas (`scripts/generar_personal_ficticio.py`).
