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
    const data = response.data;
    if (Array.isArray(data)) {
      return data;
    }
    if (data && Array.isArray(data.items)) {
      return data.items;
    }
    return [];
  },

  // Search
  async search(query: string, limit: number = 20): Promise<SearchResult[]> {
    const response = await apiClient.get('/api/v1/search', { params: { q: query, limit } });
    // El endpoint devuelve SearchPage { total, items } o un array directo
    const data = response.data;
    const items: any[] = Array.isArray(data) ? data : (data.items ?? []);
    return items
      .filter((item: any) => item.type === 'departamento' || item.type === 'municipio')
      .map((item: any): SearchResult => ({
        id: String(item.id),
        type: item.type,
        name: item.nombre_completo ?? '',
        code: item.geo_code ?? String(item.id),
        parent_code: item.parent_code,
        parent_name: item.parent_name,
        center_lat: item.center_lat ?? 4.57,
        center_lon: item.center_lon ?? -74.30,
        zoom: item.zoom ?? 8,
      }));
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
