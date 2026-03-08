## ADDED Requirements

### Requirement: Búsqueda global de entidades electorales

El sistema SHALL exponer `/api/v1/search` para buscar municipios, puestos y personas con un término único y filtros por tipo.

#### Scenario: Búsqueda combinada de municipio y puesto

- **WHEN** un cliente envía un término de búsqueda y tipos `municipio,puesto`
- **THEN** la API MUST devolver resultados tipados y ordenados por relevancia

### Requirement: Analytics básico por jurisdicción y año

El sistema SHALL exponer `/api/v1/analytics` para retornar métricas agregadas por jurisdicción, año y corporación.

#### Scenario: Consulta de resultados agregados por departamento

- **WHEN** un cliente solicita analytics para un departamento y año específico
- **THEN** la API MUST retornar agregados disponibles para Cámara o Senado según filtro

### Requirement: Contrato de respuesta consistente

El sistema SHALL devolver estructura de respuesta estable con metadatos de paginación cuando aplique.

#### Scenario: Respuesta paginada de búsqueda

- **WHEN** los resultados exceden el límite por página
- **THEN** la API MUST incluir total, límite, offset y colección de items
