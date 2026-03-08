import axios from 'axios';
import type { ElectoralLayer, Jurisdiccion } from '../stores/navigationStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface PuestoElectoral {
  codigo_puesto: string;
  departamento_codigo: string;
  municipio_codigo: string;
  departamento: string;
  municipio: string;
  puesto: string;
  comuna?: string;
  direccion?: string;
  mujeres?: number;
  hombres?: number;
  total?: number;
  mesas?: number;
  latitud: number;
  longitud: number;
}

export interface SearchResult {
  id: string;
  type: string;
  name: string;
  code: string;
  parent_code?: string;
  parent_name?: string;
  direccion?: string;
  center_lat: number;
  center_lon: number;
  zoom: number;
}

export const api = {
  // Get jurisdictions by layer
  async getJurisdicciones(layer: ElectoralLayer, parentCode?: string): Promise<Jurisdiccion[]> {
    const params: any = { layer };
    if (parentCode) params.parent_code = parentCode;
    const response = await apiClient.get('/api/v1/jurisdicciones', { params });
    return response.data;
  },

  // Get children of a jurisdiction
  async getJurisdiccionChildren(id: string): Promise<Jurisdiccion[]> {
    const response = await apiClient.get(`/api/v1/jurisdicciones/${id}/children`);
    return response.data;
  },

  // Get puestos filtered by jurisdiction
  async getPuestos(filters: {
    departamento_codigo?: string;
    municipio_codigo?: string;
    localidad_codigo?: string;
    limit?: number;
  }): Promise<PuestoElectoral[]> {
    const response = await apiClient.get('/api/v1/puestos', { params: filters });
    return response.data;
  },

  // Search
  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const response = await apiClient.get('/api/v1/search', { params: { q: query, limit } });
    return response.data;
  },

  // Get GeoJSON for departments
  async getDepartamentosGeoJSON(): Promise<any> {
    const response = await apiClient.get('/api/v1/geojson/departamentos');
    return response.data;
  },

  // Get GeoJSON for municipalities in one department
  async getMunicipiosGeoJSON(departamentoCodigo: string): Promise<any> {
    const response = await apiClient.get('/api/v1/geojson/municipios', {
      params: { departamento_codigo: departamentoCodigo },
    });
    return response.data;
  },
};
