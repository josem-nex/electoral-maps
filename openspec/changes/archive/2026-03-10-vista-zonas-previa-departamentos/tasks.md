## 1. Datos de zonas y matching territorial

- [x] 1.1 Definir estructura `zona -> departamentos` a partir de `data/usar/ZONAS VS MUNICIPIOS.xls`
- [x] 1.2 Implementar normalización de códigos/nombres de departamento para matching consistente
- [x] 1.3 Exponer dataset de zonas al frontend (loader/local endpoint) con validación mínima

## 2. Estado de navegación y modo de vista

- [x] 2.1 Extender `navigationStore` con `viewMode` (`zona` | `departamento`)
- [x] 2.2 Implementar transiciones de estado al cambiar modo con limpieza de selecciones incompatibles
- [x] 2.3 Mantener compatibilidad con flujo existente de departamento → municipio → puesto

## 3. Render territorial por zonas

- [x] 3.1 Agregar capa/agrupación visual de zonas como vista inicial del mapa
- [x] 3.2 Implementar interacción de selección de zona
- [x] 3.3 Filtrar visualización/listado para mostrar solo departamentos de la zona seleccionada

## 4. UI de conmutación junto al buscador

- [x] 4.1 Agregar selector desplegable `Zona` / `Departamento` en el panel izquierdo
- [x] 4.2 Conectar selector con `navigationStore` y refresco de capa visible
- [x] 4.3 Ajustar comportamiento del buscador según modo activo sin introducir opción municipio

## 5. Validación funcional y regresión

- [x] 5.1 Verificar carga inicial en modo zona
- [x] 5.2 Verificar flujo zona seleccionada → departamentos filtrados
- [x] 5.3 Verificar conmutación zona/departamento y ausencia de regresiones en navegación actual
