## ADDED Requirements

### Requirement: Matching territorial por DIVIPOLA

El sistema SHALL usar código DIVIPOLA como llave principal para asociar registros tabulares con jurisdicciones territoriales.

#### Scenario: Asociación directa por código

- **WHEN** un registro contiene código DIVIPOLA válido y existente
- **THEN** el sistema MUST asociar el registro a la jurisdicción correspondiente sin ambigüedad

### Requirement: Fallback controlado por nombre

El sistema SHALL permitir fallback por nombre solo cuando no exista código DIVIPOLA y registrar el mecanismo utilizado.

#### Scenario: Match por nombre con trazabilidad

- **WHEN** un registro no incluye código DIVIPOLA pero contiene nombre territorial normalizable
- **THEN** el sistema MUST intentar asociación por nombre y registrar que se aplicó fallback

### Requirement: Detección de conflictos territoriales

El sistema SHALL bloquear publicación de registros con conflicto de asociación territorial.

#### Scenario: Registro ambiguo entre dos jurisdicciones

- **WHEN** un registro coincide con más de una jurisdicción posible
- **THEN** el sistema MUST marcar el registro como conflicto y excluirlo de publicación
