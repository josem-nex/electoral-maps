## 1. Preparación del entorno

- [x] 1.1 Instalar dependencia `@turf/centroid` en el frontend para cálculo de centroides municipales
- [x] 1.2 Verificar tipos TypeScript para @turf/centroid instalando `@types/turf__centroid` si es necesario

## 2. Zoom automático al seleccionar departamento

- [x] 2.1 Modificar `MapController` en `ElectoralMap.tsx` para detectar cambios en `selectedDepartmentCode`
- [x] 2.2 Implementar cálculo de bounds del departamento seleccionado usando `L.geoJSON().getBounds()` desde la geometría filtrada
- [x] 2.3 Aplicar `map.fitBounds()` con padding de `[50, 50]` al seleccionar departamento
- [x] 2.4 Verificar que el zoom se ejecuta solo una vez por selección y no causa loops de renderizado

## 3. Centrado adaptativo para departamentos fronteras

- [x] 3.1 Crear función utilitaria para detectar si geometría de departamento intersecta `COLOMBIA_BOUNDS`
- [x] 3.2 Implementar lógica de expansión temporal de `maxBounds` (+0.3 grados) cuando se detecta departamento frontera
- [x] 3.3 Aplicar `fitBounds` durante la expansión temporal de límites
- [x] 3.4 Restaurar `maxBounds` originales después de 500ms (tiempo de animación de zoom)
- [x] 3.5 Probar centrado en departamentos fronteras: La Guajira (44), Amazonas (91), Guainía (94), Vichada (99)

## 4. Etiquetas de nombres municipales

- [x] 4.1 Crear función para calcular centroides de municipios usando `turf.centroid()` desde GeoJSON
- [x] 4.2 Generar array de datos `{ nombre: string, coordenadas: [lat, lng] }` al recibir municipios del backend
- [x] 4.3 Renderizar `Marker` de `react-leaflet` por cada municipio con `divIcon` conteniendo el nombre
- [x] 4.4 Crear clase CSS para estilo de etiquetas municipales (font-size 10px, text-shadow blanco para contraste, pointer-events none)
- [x] 4.5 Condicionar renderizado de etiquetas a que `layer === 'departamentos'` (ocultar en vista nacional)
- [x] 4.6 Optimizar con `useMemo` para evitar recalcular centroides en cada render

## 5. Verificación funcional

- [x] 5.1 Verificar zoom automático en departamentos de tamaño variado (Amazonas grande vs Quindío pequeño)
- [x] 5.2 Validar centrado correcto de departamentos fronteras sin salir excesivamente de Colombia
- [x] 5.3 Confirmar visibilidad y legibilidad de etiquetas municipales en diferentes departamentos
- [x] 5.4 Probar navegación departamento → país → departamento diferente sin etiquetas residuales
- [x] 5.5 Ejecutar build de producción y verificar que @turf/centroid no incrementa bundle significativamente (< 10KB)
