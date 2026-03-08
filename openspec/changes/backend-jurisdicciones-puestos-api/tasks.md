## 1. Base de dominio y migraciones

- [ ] 1.1 Definir modelos SQLAlchemy para jurisdicción y puesto electoral
- [ ] 1.2 Crear migraciones Alembic iniciales para tablas e índices requeridos
- [ ] 1.3 Sembrar catálogo inicial de niveles territoriales y tipos de jurisdicción

## 2. API de jurisdicciones

- [ ] 2.1 Implementar `GET/POST/PUT/DELETE /api/v1/jurisdicciones`
- [ ] 2.2 Implementar `GET /api/v1/jurisdicciones/{id}/children`
- [ ] 2.3 Validar reglas de integridad jerárquica (nivel y parent_id)

## 3. API de puestos con filtros

- [ ] 3.1 Implementar `GET/POST/PUT/DELETE /api/v1/puestos`
- [ ] 3.2 Implementar filtros por municipio, bbox, zoom, año y corporación
- [ ] 3.3 Implementar paginación y límites defensivos para consultas de mapa

## 4. Búsqueda y analytics

- [ ] 4.1 Implementar `GET /api/v1/search` con tipos de entidad
- [ ] 4.2 Implementar `GET /api/v1/analytics` para agregados básicos
- [ ] 4.3 Documentar contrato OpenAPI y ejemplos de uso para frontend

## 5. Verificación y calidad

- [ ] 5.1 Crear pruebas unitarias de validación de filtros y jerarquía
- [ ] 5.2 Crear pruebas de integración para endpoints críticos
- [ ] 5.3 Verificar latencia objetivo en consulta de puestos con bbox
