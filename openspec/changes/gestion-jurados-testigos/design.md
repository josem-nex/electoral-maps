## Context

El equipo operativo carga plantillas Excel con los jurados y testigos asignados a cada puesto de votación. La herramienta debe consumir esos archivos, resolver el puesto por nombre (DEPARTAMENTO + MUNICIPIO + COMUNA + NOMBRE PUESTO → `codigo_puesto`), persistir los registros y mostrar conteos en el mapa territorial. No hay autenticación, el foco es operación rápida y confiabilidad de datos.

## Goals / Non-Goals

**Goals:**

- Ingestar plantillas de jurados y testigos (.xlsx o .csv) y persistir en DB.
- Resolver cada persona al `codigo_puesto` correcto durante la importación.
- Reemplazar datos al cargar (carga nueva = borra anterior del mismo tipo).
- Permitir eliminar todos los datos de jurados, testigos, o ambos.
- Mostrar conteos agregados de jurados/testigos por nivel territorial en el panel del mapa.
- Mostrar lista de personas asignadas al seleccionar un puesto específico.
- Generar datos ficticios realistas para prueba.

**Non-Goals:**

- No hay formulario de alta/edición manual de personas individuales en MVP.
- No hay flujos de aprobación, auditoría avanzada ni permisos por rol.
- No hay año asociado al personal (dato atemporal).
- No se maneja "puesto de votación opción 2" ni relación N:M persona-puesto en esta fase.

## Decisions

### 1. Nueva tabla `personal_electoral` (no reutilizar `PersonaORM`)

`PersonaORM` está anclada a `JurisdiccionORM` (nivel territorial: zona, depto, municipio). Los jurados/testigos se anclan a `PuestoORM.codigo_puesto`. Son modelos conceptualmente distintos. Se crea `PersonalElectoralORM` independiente para evitar mezclar semánticas.

### 2. Cédula única por (cedula, tipo, codigo_puesto), no globalmente

Un mismo individuo podría hipotéticamente estar asignado a más de un puesto (ej. como suplente). La restricción de unicidad aplica a (cedula, tipo, codigo_puesto) — no solo a cedula. Esto permite casos legítimos sin forzar un modelo más complejo ahora.

### 3. Reemplazo total por tipo en cada carga

Cuando se carga un archivo de jurados, se eliminan todos los registros tipo `jurado` existentes y se insertan los nuevos. Mismo comportamiento para testigos. Esto simplifica la consistencia: la fuente de verdad es siempre el último archivo cargado.

### 4. Resolución de puesto por nombre durante importación

Las plantillas no incluyen `codigo_puesto`. El parser resuelve cada fila buscando en `puestos_electorales` por (departamento_codigo, municipio_codigo, nombre_puesto normalizado). Filas sin match se acumulan en un reporte de errores devuelto al frontend — no se aborta la carga completa.

### 5. Separación Jurados / Testigos como tabs (análogo a Senado / Cámara)

El panel `JuradosTestigosPanel` tendrá dos tabs: `Jurados` y `Testigos`. Cada tab muestra el conteo del territorio actual o la lista si es nivel puesto. El patrón replica lo que hace `ResultadosElectoralesPanel` con la corporación.

### 6. Estado vacío explícito con botón de carga

Si no hay datos cargados (o se eliminaron), el panel derecho muestra estado vacío con un botón prominente "Cargar archivo". Una vez cargados datos, el botón de carga se mueve a un área secundaria (ej. menú o icono) para no obstruir la vista de información.

### 7. Tipo inferido automáticamente del archivo

El parser detecta el tipo (jurado o testigo) por la presencia de columnas distintivas:
- Columna `NIVEL EDUCATIVO` o `DIRECCION` → jurado
- Columna `PUESTO DE VOTACION OPCION 1` → testigo

El usuario puede también seleccionar manualmente el tipo antes de cargar si la detección falla.

## Risks / Trade-offs

- **[Riesgo] Nombre de puesto no coincide exactamente** → Mitigación: normalización de texto (mayúsculas, sin tildes, sin dobles espacios) + reporte de filas no resueltas con nombre esperado vs candidatos cercanos.
- **[Riesgo] Carga de archivo grande bloquea UI** → Mitigación: el endpoint procesa síncronamente pero devuelve rápido el resumen; volúmenes esperados son manejables (miles, no millones).
- **[Riesgo] Columna CEDULA duplicada en plantilla Testigos** → Mitigación: el parser usa la primera ocurrencia de CEDULA y descarta la duplicada.
- **[Riesgo] Reemplazo borra datos válidos por error de operador** → Mitigación: mostrar modal de confirmación antes de procesar ("Esto reemplazará N registros existentes de testigos. ¿Continuar?").

## Migration Plan

1. Crear migración Alembic para tabla `personal_electoral` con índices.
2. Implementar parser de xlsx/csv con resolución de puesto.
3. Implementar endpoints: `POST /personal/cargar`, `DELETE /personal/{tipo}`, `GET /personal/conteos`, `GET /personal/puesto/{codigo_puesto}`.
4. Construir `JuradosTestigosPanel` con estado vacío, tabs y vistas de conteo/lista.
5. Actualizar `LandingEntryScreen` (renombrar botón, habilitar vista).
6. Conectar `App.tsx` y `MapInfoRail` a la nueva vista.
7. Escribir script de generación de datos ficticios.
8. Probar carga completa, reemplazo y eliminación con datos ficticios.

## Open Questions

*(todas resueltas)*

- ✅ El botón en landing se renombra a "JURADOS Y TESTIGOS".
- ✅ PUESTO OPCION 2 se ignora en MVP.
- ✅ Misma cédula puede aparecer en distintos puestos (unicidad por cedula+tipo+puesto).
- ✅ Carga nueva reemplaza datos anteriores del mismo tipo.
- ✅ Dato atemporal (sin año).
- ✅ Datos ficticios generados como script Python que produce xlsx.
- ✅ Persistencia en DB SQLite; eliminación también en DB.
