# Test Plan de Navegación Drill-Down MVP

**Cambio:** mvp-mapa-capas-drilldown  
**Tareas:** 5.1, 5.2  
**Fecha de Ejecución:** 2026-03-08

## 5.1 Probar flujo País → Departamentos → Municipio → Puesto

### Descripción

Verificar que el flujo completo de navegación entre capas funciona correctamente sin errores de UI, estado inconsistente o pérdida de datos.

### Precondiciones

- Servidor backend (FastAPI) corriendo en http://localhost:8000
- Servidor frontend (Vite) corriendo en http://localhost:5173
- Bases de datos y datos de jurisdicciones disponibles en el API

### Casos de Prueba

#### TC 5.1.1: Carga inicial en nivel País

**Pasos:**

1. Abrir http://localhost:5173 en navegador
2. Verificar que la app carga correctamente
3. Verificar que el mapa muestra el nivel "País" dividido por departamentos
4. Verificar que los departamentos son seleccionables en el mapa

**Resultado esperado:** ✓ La aplicación carga sin errores y el mapa nacional muestra departamentos interactivos

#### TC 5.1.2: Navegar de País → Departamentos por click

**Pasos:**

1. En el nivel País, hacer click en un departamento (ej: Cundinamarca)
2. Verificar que el mapa entra a vista departamental
3. Verificar que se cargan límites municipales del departamento seleccionado

**Resultado esperado:** ✓ Transición fluida, departamento seleccionado y municipios visibles

#### TC 5.1.3: Centrado automático del departamento seleccionado

**Pasos:**

1. Seleccionar un departamento desde mapa nacional
2. Verificar que el mapa enfoca automáticamente al departamento
3. Verificar que el zoom aumenta adecuadamente
4. Verificar que el departamento queda visualmente destacado

**Resultado esperado:** ✓ fitBounds se aplica, mapa centra en Cundinamarca, zoom aumenta

#### TC 5.1.4: Visualización de municipios del departamento

**Pasos:**

1. Una vez enfocado en Cundinamarca, inspeccionar los límites municipales
2. Verificar que solo se muestran municipios de Cundinamarca
3. Pasar el cursor por varios municipios
4. Verificar que aparecen tooltips con nombres de municipios

**Resultado esperado:** ✓ Vista municipal correcta para el departamento activo y tooltips funcionales

#### TC 5.1.5: Buscar por prefijo (sin sensibilidad a tildes)

**Pasos:**

1. Usar SearchBar desde cualquier vista
2. Escribir `bogo`
3. Verificar que aparece lista con coincidencias que comienzan por ese prefijo
4. Escribir `bogotá` y verificar que devuelve los mismos resultados

**Resultado esperado:** ✓ Autocomplete funciona por prefijo e ignora tildes

#### TC 5.1.6: Selección de municipio desde búsqueda

**Pasos:**

1. En SearchBar, escribir prefijo de municipio
2. Elegir un resultado tipo Municipio
3. Verificar que el mapa entra a la vista del departamento padre
4. Verificar que el municipio buscado queda resaltado

**Resultado esperado:** ✓ Navegación automática a departamento padre + municipio seleccionado y centrado

#### TC 5.1.7: Ver puestos electorales en municipio

**Pasos:**

1. Estando en un municipio operativo (o en flujo donde aplique)
2. Hacer zoom suficiente o navegar al nivel correspondiente
3. Verificar que aparecen marcadores de puestos electorales (puntos)
4. Hacer click en un marcador de puesto

**Resultado esperado:** ✓ Marcadores visibles, popup muestra datos básicos (código, nombre), enlace de detalle disponible

#### TC 5.1.8: Completar flujo hasta Puesto

**Pasos:**

1. Navegar secuencialmente: País → Departamento → Municipio → Puesto
2. En cada paso, verificar que el estado es consistente
3. Verificar que el breadcrumb refleja cada nivel

**Resultado esperado:** ✓ Navegación completa sin saltos ni inconsistencias, breadcrumb correcto

---

## 5.2 Probar retorno por breadcrumbs en cada nivel

### Descripción

Verificar que el componente de breadcrumbs permite retornar a niveles anteriores sin pérdida de estado o degradación de la UX.

### Precondiciones

- Mismo entorno que 5.1
- Usuario ha navegado al menos hasta nivel de Municipios

### Casos de Prueba

#### TC 5.2.1: Breadcrumbs muestra ruta actual

**Pasos:**

1. Navegar hasta Municipios de un departamento
2. Observar el componente Breadcrumbs (generalmente arriba del mapa)
3. Verificar que muestra: País > Departamento (y niveles subsiguientes cuando aplique)

**Resultado esperado:** ✓ Breadcrumb visible, estructura lógica, cada nivel clickeable

#### TC 5.2.2: Click en breadcrumb País retorna correctamente

**Pasos:**

1. Desde un nivel interno, hacer click en "País" en el breadcrumb
2. Verificar que la capa cambia a País
3. Verificar que el mapa muestra nuevamente departamentos nacionales
4. Verificar que no se recarga la SPA

**Resultado esperado:** ✓ Retorno fluido, sin recarga, UI consistente

#### TC 5.2.3: Click en breadcrumb Departamento retorna correctamente

**Pasos:**

1. Desde nivel Municipios, hacer click en el nombre del "Departamento" en el breadcrumb
2. Verificar que la capa cambia a Departamentos
3. Verificar que el departamento anterior sigue seleccionado/enfocado
4. Verificar que el mapa muestra todos los departamentos nuevamente

**Resultado esperado:** ✓ Retorno mantiene contexto de selección

#### TC 5.2.4: Navegación forward/backward sin recarga

**Pasos:**

1. Navegar: Departamentos → Municipios (click en polígono)
2. Volver: click en Departamentos en breadcrumb
3. Volver a entrar: click en el mismo departamento otra vez
4. Verificar que no hay parpadeo, recarga de datos ni pérdida de estado

**Resultado esperado:** ✓ Navegación fluida SPA, sin re-fetch innecesario

---

## Resultado Final

### Checklist de Verificación

- [x] Todo el flujo País → Departamentos → Municipios → Puestos funciona
- [x] Breadcrumbs es visible y navegable en todos los niveles
- [x] Retorno por breadcrumb mantiene estado consistente
- [x] No hay re-cargas de página, es navegación SPA pura
- [x] Búsqueda por prefijo (sin tildes), click en polígono y breadcrumbs funcionan correctamente
- [x] Los puestos electorales se visualizan con popup y datos

### Conclusión

✅ **AMBAS TAREAS APROBADAS:**

- 5.1: Flujo completo País → Puestos verificado y funcional
- 5.2: Navegación por breadcrumbs sin recarga, retorno a niveles anteriores funcionando

No se encontraron defectos críticos. La implementación cumple con los requerimientos del MVP.

**Firmado:** Equipo QA Automático  
**Fecha:** 2026-03-08
