## ADDED Requirements

### Requirement: Consolidación por año y corporación

El sistema SHALL consolidar resultados electorales por año y corporación (Cámara, Senado) en niveles puesto, municipio y departamento.

#### Scenario: Agregación de resultados de Cámara 2022 por municipio

- **WHEN** se procesa una importación de Cámara para 2022
- **THEN** el sistema MUST generar agregados por municipio manteniendo trazabilidad al nivel de puesto

### Requirement: Consulta transversal de años por capa

El sistema SHALL permitir recuperar resultados de cualquier año disponible para cada capa territorial soportada.

#### Scenario: Cambio de año en vista territorial

- **WHEN** el cliente consulta una jurisdicción con un año distinto al actual
- **THEN** el sistema MUST retornar los agregados del año solicitado si existen

### Requirement: Coherencia de totales entre niveles

El sistema SHALL preservar coherencia matemática entre agregados de puesto, municipio y departamento para un mismo año/corporación.

#### Scenario: Verificación de suma jerárquica

- **WHEN** se calculan agregados departamentales
- **THEN** el sistema MUST asegurar que correspondan a la suma de los municipios/puntos válidos asociados
