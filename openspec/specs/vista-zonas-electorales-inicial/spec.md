## ADDED Requirements

### Requirement: Vista inicial por zonas

El sistema SHALL mostrar una vista nacional por zonas electorales antes de la vista por departamentos cuando el usuario ingrese al mapa.

#### Scenario: Carga inicial del mapa en modo zona

- **WHEN** el usuario abre la aplicación en la pantalla principal del mapa
- **THEN** el sistema MUST presentar el nivel de zonas como vista inicial

### Requirement: Selección de zona y filtrado de departamentos

El sistema SHALL permitir seleccionar una zona y restringir la visualización/listado a los departamentos asociados a esa zona.

#### Scenario: Usuario selecciona una zona

- **WHEN** el usuario hace clic sobre una zona del mapa
- **THEN** el sistema MUST mostrar únicamente los departamentos pertenecientes a la zona seleccionada

### Requirement: Fuente de verdad para composición de zonas

El sistema SHALL construir la relación zona-departamento usando la información del archivo `data/usar/ZONAS VS MUNICIPIOS.xls`.

#### Scenario: Carga de relaciones territoriales por zona

- **WHEN** el sistema inicializa la configuración de zonas
- **THEN** el sistema MUST usar la asignación definida en `data/usar/ZONAS VS MUNICIPIOS.xls`
