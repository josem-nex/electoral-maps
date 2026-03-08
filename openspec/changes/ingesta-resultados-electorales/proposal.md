## Why

El proyecto depende de cargas recurrentes de Excel/CSV para puestos, jurados y resultados por año/corporación. Sin un flujo de ingesta con validación y agregación territorial por DIVIPOLA, la calidad de datos y la consistencia visual del mapa se degradan.

## What Changes

- Se define un flujo de importación de archivos con validación estructural y de negocio.
- Se definen reglas de matching territorial usando DIVIPOLA y, cuando aplique, asignación espacial por coordenadas.
- Se define consolidación de resultados electorales por año y corporación para nivel puesto/municipio/departamento.
- Se definen reportes de errores de importación accionables por fila/campo.

## Capabilities

### New Capabilities

- `importador-excel-validado`: importación de archivos con validación de estructura y contenidos.
- `matching-territorial-divipola`: emparejamiento robusto de datos tabulares con jerarquía territorial.
- `consolidacion-resultados-por-ano`: agregación de resultados por año, corporación y nivel territorial.

### Modified Capabilities

## Impact

- Backend de importación y validación de datasets.
- Modelos de staging y tablas de hechos agregados.
- Integración con APIs de analytics y visualización en frontend.
- Trazabilidad de errores de carga para operación funcional.
