## 1. Modelo de datos de personal electoral

- [ ] 1.1 Definir entidad base de persona asignada con rol jurado/testigo
- [ ] 1.2 Crear migraciones para tablas e índices de unicidad por jurisdicción
- [ ] 1.3 Definir validadores de campos obligatorios y formatos de documento

## 2. Endpoints CRUD por rol y jurisdicción

- [ ] 2.1 Implementar CRUD de jurados con filtro por jurisdicción
- [ ] 2.2 Implementar CRUD de testigos con filtro por jurisdicción
- [ ] 2.3 Implementar endpoint de listado consolidado de asignaciones

## 3. UI de gestión operativa

- [ ] 3.1 Construir tabla de jurados por jurisdicción con acciones crear/editar/eliminar
- [ ] 3.2 Construir tabla de testigos por jurisdicción con acciones crear/editar/eliminar
- [ ] 3.3 Agregar formulario lateral para alta/edición con validaciones

## 4. Importación inicial y consistencia

- [ ] 4.1 Implementar carga inicial desde plantillas de `data/usar/`
- [ ] 4.2 Detectar duplicados por documento y jurisdicción
- [ ] 4.3 Generar reporte de filas inválidas para corrección operativa

## 5. Pruebas de funcionalidad

- [ ] 5.1 Probar CRUD completo de jurados en múltiples jurisdicciones
- [ ] 5.2 Probar CRUD completo de testigos en múltiples jurisdicciones
- [ ] 5.3 Verificar sincronización entre vista de asignaciones y datos persistidos
