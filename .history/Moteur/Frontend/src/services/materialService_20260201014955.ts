import api from './api';

export interface Material {
    id: number;
    name: string;
    thickness: number;
    cost_per_sqm: number;
    price_type: 'm2' | 'm3' | 'unit';
    is_panel: boolean;
    supplier_ref?: string;
    has_grain: boolean;
    created_at?: string;
}

export interface EdgeBand {
    id: number;
    name: string;
    thickness: number;
    cost_per_m: number;
    color?: string;
    created_at?: string;
}

export interface Stock {
    id: number;
    material_id: number;
    width: number;
    height: number;
    quantity: number;
    is_offcut: boolean;
    grain_direction: number; // 1: Horizontal, 2: Vertical
    label?: string;
    created_at?: string;
}

export interface MaterialWithStock extends Material {
    stock_items?: Stock[];
}

export const MaterialService = {
    getAll: async (): Promise<Material[]> => {
        const response = await api.get<Material[]>('/materials/');
        return response.data;
    },

    getById: async (id: number): Promise<MaterialWithStock> => {
        const response = await api.get<MaterialWithStock>(`/materials/${id}`);
        return response.data;
    },

    create: async (data: Omit<Material, 'id' | 'created_at'>): Promise<Material> => {
        const response = await api.post<Material>('/materials/', data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/materials/${id}`);
    },

    getStock: async (materialId: number): Promise<Stock[]> => {
        const response = await api.get<Stock[]>(`/materials/${materialId}/stock`);
        return response.data;
    },

    addStock: async (materialId: number, data: Omit<Stock, 'id' | 'created_at' | 'material_id'>): Promise<Stock> => {
        const response = await api.post<Stock>(`/materials/${materialId}/stock`, data);
        return response.data;
    },

    updateStock: async (stockId: number, data: Partial<Omit<Stock, 'id' | 'created_at' | 'material_id'>>): Promise<Stock> => {
        const response = await api.put<Stock>(`/materials/stock/${stockId}`, data);
        return response.data;
    },

    deleteStock: async (stockId: number): Promise<void> => {
        await api.delete(`/materials/stock/${stockId}`);
    },

    // Edge Bands
    getEdgeBands: async (): Promise<EdgeBand[]> => {
        const response = await api.get<EdgeBand[]>('/materials/edge-bands');
        return response.data;
    },

    createEdgeBand: async (data: Omit<EdgeBand, 'id' | 'created_at'>): Promise<EdgeBand> => {
        const response = await api.post<EdgeBand>('/materials/edge-bands', data);
        return response.data;
    },

    deleteEdgeBand: async (id: number): Promise<void> => {
        await api.delete(`/materials/edge-bands/${id}`);
    },

    checkAvailability: async (materialIds: number[]): Promise<any> => {
        const response = await api.post('/stock/availability', { material_ids: materialIds });
        return response.data;
    },
};

