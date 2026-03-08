## 1. Modelo de navegación por capas

- [x] 1.1 Definir enum y metadatos de capas electorales (padre, hijo, source de geometría)
- [x] 1.2 Implementar store global para capa actual, jurisdicción activa y breadcrumbs
- [x] 1.3 Conectar selector global de capa al estado de navegación

## 2. Interacción de mapa y drill-down

- [x] 2.1 Implementar handler de click en polígonos para navegar a la siguiente capa
- [x] 2.2 Implementar breadcrumbs para navegación ascendente sin recarga
- [x] 2.3 Unificar transición de capa para selector, click y breadcrumbs

## 3. Búsqueda y centrado automático

- [x] 3.1 Implementar búsqueda de jurisdicciones por nombre/código
- [x] 3.2 Aplicar `fitBounds`/`flyTo` al seleccionar resultado o valor del dropdown
- [x] 3.3 Validar consistencia entre estado de mapa y controles de UI

## 4. Overlay de puestos electorales

- [x] 4.1 Crear capa de marcadores de puestos basada en coordenadas fuente
- [x] 4.2 Implementar popup con datos básicos del puesto
- [x] 4.3 Agregar acción “ver detalle / editar” y enlace al panel de detalle

## 5. Verificación MVP de navegación

- [x] 5.1 Probar flujo País → Departamentos → Municipio → Puesto
- [x] 5.2 Probar retorno por breadcrumbs en cada nivel
- [x] 5.3 Documentar supuestos de Localidad/UPZ y Consulados en README técnico
