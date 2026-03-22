## MODIFIED Requirements

### Requirement: Vista inicial por zonas

El sistema SHALL mostrar una vista nacional por zonas electorales como primera vista del mapa después de que el usuario complete la selección de entrada en la pantalla inicial. El mapa iniciará con capa base de departamentos y estilos de zona aplicados, permitiendo visualización de límites de zonas electorales sin navegación previa al pais.

#### Scenario: Carga inicial del mapa en modo zona

- **WHEN** el usuario selecciona "Información Puestos" y accede al mapa funcional
- **THEN** el sistema MUST presentar la vista de departamentos con estilos de zona electorales aplicados, proporcionando contexto visual completo de divisiones territoriales de zonas sin requerir navegación intermedia

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

### Requirement: Legibilidad reforzada de la vista inicial por zonas

La vista inicial por zonas SHALL priorizar claridad visual mediante una paleta y estados interactivos que faciliten identificación rápida de cada zona electoral.

#### Scenario: Diferenciación de zonas en vista inicial

- **WHEN** el usuario abre la aplicación y se muestra el mapa en modo zonas
- **THEN** cada zona MUST presentar suficiente diferenciación visual frente a zonas vecinas y el fondo

#### Scenario: Estado hover y selección de zona

- **WHEN** el usuario pasa el cursor o selecciona una zona
- **THEN** el sistema MUST aplicar un estado visual más destacado que el estado base sin perder consistencia del mapa
