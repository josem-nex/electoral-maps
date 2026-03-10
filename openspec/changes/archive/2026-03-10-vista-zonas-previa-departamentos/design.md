## Context

La aplicación actualmente inicia en una vista nacional por departamentos y luego desciende a municipios/puestos. El nuevo requerimiento agrega una capa superior por zonas, con relación zona-departamento basada en `data/usar/ZONAS VS MUNICIPIOS.xls`, y un selector de modo en el panel izquierdo para cambiar entre visualización por zona o por departamento.

## Goals / Non-Goals

**Goals:**

- Incorporar vista inicial por zonas sin romper la navegación existente por departamentos.
- Habilitar selección de zona para filtrar departamentos visibles.
- Habilitar conmutador explícito `Zona` / `Departamento` junto al buscador.
- Mantener consistencia de estado al alternar modos de vista.

**Non-Goals:**

- No agregar modo directo por municipios en este cambio.
- No rediseñar el buscador completo ni los paneles secundarios.
- No rehacer la cartografía base ni introducir nuevas capas geográficas fuera de zonas/departamentos.

## Decisions

1. Nivel territorial adicional en el estado de navegación
   - Se agrega `zona` como nivel superior del flujo territorial.
   - El estado de navegación conserva compatibilidad con `departamento` y `municipio`.

2. Selector de modo único en panel izquierdo
   - Se agrega un control de selección de modo junto al `SearchBar`.
   - Solo se exponen dos opciones: `Zona` y `Departamento`.

3. Fuente de datos de zonas desde archivo operativo
   - La relación zona-departamento se extrae de `data/usar/ZONAS VS MUNICIPIOS.xls`.
   - Se normalizan códigos y nombres de departamento para hacer matching robusto.

4. Conmutación con limpieza de selecciones incompatibles
   - Al pasar a modo zona se limpian selecciones de niveles inferiores.
   - Al pasar a modo departamento se vuelve a la vista departamental general.

5. Integración incremental
   - Se reutiliza la infraestructura actual de mapa y store para minimizar cambios.
   - Las nuevas estructuras (zonas y mappings) se encapsulan para no acoplar componentes no relacionados.

## Risks / Trade-offs

- [Riesgo] Inconsistencias entre nombres/códigos del Excel y capa territorial actual.
  - Mitigación: normalización por código DIVIPOLA y fallback por nombre controlado.

- [Riesgo] Complejidad de estado al introducir un nivel territorial extra.
  - Mitigación: centralizar transiciones en el store de navegación.

- [Riesgo] Experiencia de usuario confusa entre modo y selección actual.
  - Mitigación: reset explícito de selección al cambiar modo y etiquetas claras en UI.

## Migration Plan

1. Definir modelo de zona y parser de `ZONAS VS MUNICIPIOS.xls`.
2. Incorporar datos de zonas al flujo de carga territorial del frontend.
3. Agregar `viewMode` (`zona`/`departamento`) al store y transiciones.
4. Renderizar capa de zonas y flujo de selección zona → departamentos.
5. Agregar selector de modo junto al buscador.
6. Verificar navegación completa zona/departamento sin regresiones en niveles inferiores.

## Open Questions

- ¿La definición de zonas del archivo es única y estable para todos los ciclos electorales?
- ¿Si una zona no tiene departamentos válidos por matching, se oculta o se muestra como vacía?
- ¿El buscador en modo zona debe buscar también por nombre de zona en esta primera iteración?
