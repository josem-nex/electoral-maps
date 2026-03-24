## 1. Base de datos — tabla `personal_electoral`

- [x] 1.1 Crear `PersonalElectoralORM` con campos: `id`, `tipo` (jurado/testigo), `cedula`, `primer_nombre`, `segundo_nombre`, `primer_apellido`, `segundo_apellido`, `telefono`, `celular`, `correo`, `codigo_puesto` (FK a `puestos_electorales.codigo_puesto`), `direccion`, `nivel_educativo`, `referenciado_por`
- [x] 1.2 Restricción de unicidad: `(cedula, tipo, codigo_puesto)` — permite misma cédula en distintos puestos o tipos
- [x] 1.3 Crear migración Alembic e incluir índices en `tipo` y `codigo_puesto`

## 2. Backend — parser de archivos

- [x] 2.1 Implementar `parse_personal_file(file, tipo_override=None)` que acepta .xlsx o .csv
- [x] 2.2 Detectar tipo automáticamente: presencia de `NIVEL EDUCATIVO`/`DIRECCION` → jurado; `PUESTO DE VOTACION OPCION 1` → testigo; si ambiguo usar `tipo_override`
- [x] 2.3 Normalizar texto de columnas (mayúsculas, sin tildes, sin dobles espacios) para resolución de puesto
- [x] 2.4 Resolver cada fila a `codigo_puesto` buscando en `puestos_electorales` por (departamento_codigo, municipio_codigo, nombre_puesto normalizado); acumular filas no resueltas en lista de errores
- [x] 2.5 Manejar columna CEDULA duplicada en plantilla Testigos (usar primera ocurrencia)

## 3. Backend — endpoints

- [x] 3.1 `POST /personal/cargar` — multipart file upload; devuelve `{ tipo, insertados, omitidos, errores: [{fila, razon}] }`
- [x] 3.2 Lógica de reemplazo en `POST /personal/cargar`: antes de insertar, borrar todos los registros del mismo tipo detectado
- [x] 3.3 `DELETE /personal/{tipo}` donde `tipo` es `jurado`, `testigo` o `todos`
- [x] 3.4 `GET /personal/conteos?nivel=pais|zona|departamento|municipio&codigo=...` — devuelve `{ jurados: N, testigos: N }`
- [x] 3.5 `GET /personal/puesto/{codigo_puesto}` — devuelve listas separadas `{ jurados: [...], testigos: [...] }`
- [x] 3.6 `GET /personal/estado` — devuelve si hay datos cargados por tipo: `{ jurados: N, testigos: N }` (para estado vacío en UI)

## 4. Frontend — LandingEntryScreen y App

- [x] 4.1 Renombrar botón "INFORMACIÓN JURADOS" a "JURADOS Y TESTIGOS" en `LandingEntryScreen`
- [x] 4.2 Añadir `'jurados-testigos'` a `LandingView` y `ActiveView`, conectar handler `onEnterJuradosTestigos` en `App.tsx`
- [x] 4.3 Habilitar el botón (quitar `"Disponible próximamente"`) y conectar al flujo de entrada

## 5. Frontend — panel `JuradosTestigosPanel`

- [x] 5.1 Crear componente `JuradosTestigosPanel` con estado vacío: panel limpio + botón "Cargar archivo" prominente cuando `estado.jurados === 0 && estado.testigos === 0`
- [x] 5.2 Implementar upload modal: input de archivo (.xlsx, .csv), selector manual de tipo si la detección automática no es concluyente, modal de confirmación si ya hay datos ("Reemplazará N registros existentes")
- [x] 5.3 Implementar tabs Jurados / Testigos (análogo al selector de corporación en `ResultadosElectoralesPanel`)
- [x] 5.4 Vista de conteo por territorio: mostrar `Jurados: N` / `Testigos: N` para país, zona, departamento o municipio activo
- [x] 5.5 Vista de lista por puesto: mostrar nombres y cédulas de personas asignadas al puesto seleccionado
- [x] 5.6 Botón secundario "Eliminar datos" con selector de tipo (jurados / testigos / ambos) y confirmación
- [x] 5.7 Mostrar resumen post-carga: insertados, omitidos y lista de filas con error de resolución de puesto

## 6. Frontend — integración con MapInfoRail

- [x] 6.1 Añadir rama `activeView === 'jurados-testigos'` en `MapInfoRail` que renderiza `JuradosTestigosPanel`
- [x] 6.2 Pasar `currentJurisdiccion` y `selectedPuesto` al panel para que resuelva el nivel correcto de consulta
- [x] 6.3 Añadir tipo `JuradosTestigosStats` e interfaz de lista en `api/client.ts`

## 7. Script de datos ficticios

- [x] 7.1 Crear `backend/scripts/generar_personal_ficticio.py` que:
  - Lee `puestos_electorales` de la DB para obtener `codigo_puesto` reales y sus DEPARTAMENTO/MUNICIPIO/PUESTO
  - Genera N jurados por puesto (configurable, ej. 3-6 por puesto) con nombres/cédulas ficticios
  - Genera N testigos por puesto (configurable, ej. 1-3 por puesto)
  - Produce dos archivos: `data/ficticio_jurados.xlsx` y `data/ficticio_testigos.xlsx` con la misma estructura que las plantillas originales (sheet `Formulario`)

## 8. Pruebas end-to-end

- [x] 8.1 Cargar `ficticio_jurados.xlsx` y verificar conteos en la UI por departamento y municipio
- [x] 8.2 Cargar `ficticio_testigos.xlsx` y verificar tabs Jurados / Testigos muestran valores correctos
- [x] 8.3 Cargar jurados nuevamente y verificar que los anteriores fueron reemplazados
- [x] 8.4 Eliminar testigos y verificar estado vacío en tab Testigos
- [x] 8.5 Verificar filas con puesto inválido aparecen en reporte de errores sin abortar la carga
