## 1. Contrato de importación y staging

- [ ] 1.1 Definir esquemas de columnas obligatorias por tipo de archivo
- [ ] 1.2 Crear tablas de staging y modelo de estado de importación
- [ ] 1.3 Implementar parser de Excel/CSV con validación de tipos

## 2. Validación y matching territorial

- [ ] 2.1 Implementar validación de códigos DIVIPOLA y niveles territoriales
- [ ] 2.2 Implementar fallback controlado por nombre cuando falte DIVIPOLA
- [ ] 2.3 Generar reporte de errores por fila/campo con severidad

## 3. Publicación y agregados electorales

- [ ] 3.1 Publicar registros válidos en tablas operativas de puestos/resultados
- [ ] 3.2 Implementar consolidación por año, corporación y jurisdicción
- [ ] 3.3 Versionar corridas de importación para trazabilidad y rollback

## 4. Integración con APIs y operación

- [ ] 4.1 Exponer endpoint de importación con estado y resumen de validación
- [ ] 4.2 Conectar agregados con endpoint de analytics
- [ ] 4.3 Documentar plantillas y flujo operativo para usuarios de datos

## 5. Pruebas del pipeline

- [ ] 5.1 Crear fixtures de archivos válidos e inválidos
- [ ] 5.2 Probar matching territorial y consolidación por contexto electoral
- [ ] 5.3 Validar consistencia de resultados contra datasets de referencia 2022
