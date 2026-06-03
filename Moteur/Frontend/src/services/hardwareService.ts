import api from './api';

export interface Hardware {
    id: number;
    reference: string;
    name: string;
    category: 'hinge' | 'slide' | 'handle' | 'screw' | 'feet' | 'other';
    cost_unit: number;
    supplier?: string;
    product_url?: string;
    image_url?: string;
    stock_quantity: number;
    min_stock: number;
    specs?: string;
    created_at?: string;
}

export interface HardwareAssembly {
    id: number;
    name: string;
    description?: string;
    conditions: string; // JSON
    items: string; // JSON
}

export const HardwareService = {
    getAll: async (category?: string) => {
        const params = category && category !== 'all' ? { category } : {};
        const response = await api.get<Hardware[]>('/hardware', { params });
        return response.data;
    },

    create: async (data: Partial<Hardware>) => {
        const response = await api.post<Hardware>('/hardware', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Hardware>) => {
        const response = await api.patch<Hardware>(`/hardware/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/hardware/${id}`);
    },

    getAllAssemblies: async () => {
        const response = await api.get<HardwareAssembly[]>('/hardware/assemblies');
        return response.data;
    },

    createAssembly: async (data: Partial<HardwareAssembly>) => {
        const response = await api.post<HardwareAssembly>('/hardware/assemblies', data);
        return response.data;
    },

    calculateForProject: async (projectId: number) => {
        const response = await api.get<any[]>(`/hardware/calculate-for-project/${projectId}`);
        return response.data;
    }
};
