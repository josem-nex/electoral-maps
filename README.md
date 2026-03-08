# Electoral Maps - Sistema de Gestión de Representantes

MVP del sistema de visualización electoral de Colombia con navegación por capas y drill-down.

## Stack Tecnológico

### Backend
- **FastAPI** - Framework REST API
- **Pandas** - Procesamiento de datos electorales
- **Openpyxl** - Lectura de archivos Excel (DIVIPOLA, puestos, zonas)
- **Pydantic** - Validación de datos y modelos

### Frontend
- **React 18.3** - UI framework
- **Vite** - Build tool y dev server
- **TypeScript** - Type safety
- **Tailwind CSS** - Estilos utilitarios
- **Leaflet + React-Leaflet** - Mapas interactivos
- **Zustand** - Estado global
- **Axios** - Cliente HTTP

## Estructura del Proyecto

```
electoral-maps/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # FastAPI app principal
│   │   ├── config.py         # Configuración con Pydantic Settings
│   │   ├── models.py         # Modelos Pydantic (API schemas)
│   │   └── data_loader.py    # Cargadores de datos Excel/GeoJSON
│   ├── requirements.txt
│   ├── .env                  # Configuración local (crear desde .env.example)
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ElectoralMap.tsx      # Mapa con drill-down
│   │   │   ├── Breadcrumbs.tsx       # Navegación jerárquica
│   │   │   └── SearchBar.tsx         # Búsqueda de jurisdicciones
│   │   ├── stores/
│   │   │   └── navigationStore.ts    # Estado de navegación (Zustand)
│   │   ├── api/
│   │   │   └── client.ts             # Cliente API con Axios
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── .env
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── vite.config.ts
│
└── data/
    ├── mapas/
    │   └── colombia.geo.json         # GeoJSON de departamentos
    └── usar/
        ├── INFO_X_Puesto.xlsx        # 13,742 puestos electorales
        ├── DIVIPOLA_Municipios.xlsx  # 1,122 municipios
        └── ZONAS VS MUNICIPIOS.xlsx  # 7 zonas electorales
```

## Instalación y Configuración

### Prerequisitos

- **Python 3.10+** (requerido para FastAPI 0.104+, Pydantic 2.5+)
- **Node.js 20.19+** (requerido para Vite 7.x)
- **npm 10+**

### Backend Setup

```bash
cd backend

# Crear entorno virtual
python3 -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con las rutas correctas

# Iniciar servidor de desarrollo
python app/main.py
# O con uvicorn directamente:
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

El backend estará disponible en http://localhost:8000

### Frontend Setup

```bash
cd frontend

# Instalar dependencias (usar --legacy-peer-deps si hay conflictos)
npm install

# Configurar API URL
# Crear .env con: VITE_API_URL=http://localhost:8000

# Iniciar dev server
npm run dev
```

El frontend estará disponible en http://localhost:5173

## API Endpoints

### Jurisdicciones

- `GET /api/v1/jurisdicciones?layer={layer}&parent_code={code}`  
  Obtener jurisdicciones por capa (país, zonas, departamentos, municipio, localidad)

- `GET /api/v1/jurisdicciones/{id}/children`  
  Obtener jurisdicciones hijas (drill-down)

### Puestos Electorales

- `GET /api/v1/puestos?departamento_codigo={dd}&municipio_codigo={mmmmm}&limit={n}`  
  Obtener puestos filtrados por jurisdicción

### Búsqueda

- `GET /api/v1/search?q={query}&limit={n}`  
  Buscar departamentos, municipios y puestos por nombre o código

### Datos Geográficos

- `GET /api/v1/geojson/departamentos`  
  Obtener GeoJSON de departamentos de Colombia

## Funcionalidades MVP

✅ **Navegación por Capas**
- País → Zonas (7) → Departamentos (33) → Municipios (1,122) → Localidades (solo Bogotá) → Puestos (13,742)
- Drill-down con clicks en el mapa
- Breadcrumbs navegables

✅ **Búsqueda Global**
- Búsqueda por nombre de departamento, municipio o puesto
- Resultados con autocompletado
- Click en resultado navega al lugar en el mapa

✅ **Visualización de Puestos**
- Marcadores en mapa con coordenadas reales
- Popups con información del puesto (dirección, mesas, potencial electoral)
- Overlay configurable de puestos por jurisdicción

✅ **Datos Reales**
- Integración con archivos Excel del proyecto electoral
- DIVIPOLA oficial para códigos de municipios
- GeoJSON de departamentos de Colombia

## Próximos Pasos (Post-MVP)

- [ ] Cargar resultados electorales históricos
- [ ] Visualizaciones de analytics (barras, tortas, líneas de tiempo)
- [ ] Gestión de jurados y testigos asignados por puesto
- [ ] Autenticación y roles de usuario
- [ ] Dashboard de monitoreo en tiempo real
- [ ] Exportación de reportes (PDF, Excel)

## Desarrollo

### Backend

El backend usa `@lru_cache` para cachear datos de Excel en memoria. Los archivos se cargan solo una vez al inicio.

Modelos principales:
- `ElectoralLayer` - Enum de capas (pais, zonas, departamentos, municipio, localidad, puesto)
- `Jurisdiccion` - Entidad territorial con coordenadas y zoom
- `PuestoElectoral` - Puesto de votación con coordenadas, mesas, potencial electoral

### Frontend

El frontend usa Zustand para estado global de navegación:
- `navigationStack` - Historial de navegación jerárquica
- `currentJurisdiccion` - Jurisdicción activa
- `navigateTo()`, `navigateBack()`, `navigateToIndex()`

Componentes principales:
- `ElectoralMap` - Mapa Leaflet con drill-down y marcadores de puestos
- `Breadcrumbs` - Navegación jerárquica visual
- `SearchBar` - Búsqueda global con autocompletado

## Troubleshooting

### Error: "ERESOLVE unable to resolve dependency tree"
Usar `npm install --legacy-peer-deps` para react-leaflet

### Error: "No matching distribution for fastapi>=0.104.0"
Actualizar Python a 3.10+ (`python3 --version`)

### Frontend no conecta con backend
Verificar CORS en `.env` del backend y `VITE_API_URL` en frontend

### Mapas no se muestran
Verificar que Leaflet CSS esté importado en `ElectoralMap.tsx`

## Licencia

Proyecto electoral MVP - Uso interno
