"""Data models for the electoral maps API."""
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class ElectoralLayer(str, Enum):
    """Electoral territorial layers."""
    PAIS = "pais"
    ZONAS = "zonas"
    DEPARTAMENTOS = "departamentos"
    MUNICIPIO = "municipio"
    LOCALIDAD = "localidad"
    PUESTO = "puesto"


class Jurisdiccion(BaseModel):
    """Territorial jurisdiction model."""
    id: str
    layer: ElectoralLayer
    name: str
    code: str
    parent_code: Optional[str] = None
    zone_id: Optional[int] = None
    zone_name: Optional[str] = None
    center_lat: float
    center_lon: float
    zoom: float
    
    class Config:
        use_enum_values = True


class PuestoElectoral(BaseModel):
    """Electoral voting location model."""
    codigo_puesto: str
    departamento_codigo: str
    municipio_codigo: str
    departamento: str
    municipio: str
    puesto: str
    comuna: Optional[str] = None
    direccion: Optional[str] = None
    mujeres: Optional[int] = None
    hombres: Optional[int] = None
    total: Optional[int] = None
    mesas: Optional[int] = None
    latitud: float
    longitud: float


class SearchResult(BaseModel):
    """Search result model."""
    id: str
    type: str
    name: str
    code: str
    parent_code: Optional[str] = None
    parent_name: Optional[str] = None
    direccion: Optional[str] = None
    center_lat: float
    center_lon: float
    zoom: float
    
    class Config:
        use_enum_values = True


class ResultadoElectoral(BaseModel):
    """Electoral result model."""
    jurisdiccion_codigo: str
    jurisdiccion_nombre: str
    nivel: str
    anio: int
    corporacion: str  # "Camara" o "Senado"
    votos_totales: Optional[int] = None
    votos_validos: Optional[int] = None
    votos_nulos: Optional[int] = None
    votos_blancos: Optional[int] = None
    censo: Optional[int] = None
    
    class Config:
        use_enum_values = True


class AnalyticsResponse(BaseModel):
    """Analytics aggregated response."""
    jurisdiccion: str
    anio: int
    corporacion: str
    datos: dict
