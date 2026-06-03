import axios from 'axios';
import { CacheService } from './cacheService.ts';

// API configuration - same backend as desktop
const api = axios.create({
    baseURL: 'http://192.168.1.46:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Types
export interface Project {
    id: number;
    name: string;
    description?: string;
    status: string;
    client_id?: number;
    client?: Client;
    created_at: string;
}

export interface Client {
    id: number;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
}

export interface StockItem {
    id: number;
    material_id: number;
    width: number;
    height: number;
    quantity: number;
    is_offcut: boolean;
    label?: string;
    qr_code?: string;
    material?: Material;
}

export interface Material {
    id: number;
    name: string;
    thickness: number;
    cost_per_sqm: number;
}

export interface Optimization {
    id: number;
    project_id: number;
    total_panels_used: number;
    waste_percentage: number;
    total_cost: number;
    result_data: string;
    created_at: string;
    offcuts?: Array<{ width: number, height: number, x: number, y: number }>;
}

// Types for cutting plan visualization
export interface Placement {
    x: number;
    y: number;
    width: number;
    height: number;
    piece_name: string;
}

export interface Panel {
    width: number;
    height: number;
    placements?: Placement[];
}

export interface CuttingPlan {
    panels?: Panel[];
}

export interface QRScanResult {
    stock_item: StockItem;
    linked_project?: Project;
    optimization?: Optimization;
    cutting_plan?: CuttingPlan;
}

// Helper to wrap API calls with caching
async function getCached<T>(key: string, fetcher: () => Promise<{ data: T }>): Promise<{ data: T }> {
    try {
        const response = await fetcher();
        CacheService.save(key, response.data);
        return response;
    } catch (error) {
        const cached = CacheService.get<T>(key);
        if (cached) {
            console.log(`[Cache] Returning offline data for ${key}`);
            return { data: cached };
        }
        throw error;
    }
}

// API Functions
export const projectsApi = {
    getAll: () => getCached<Project[]>('projects', () => api.get<Project[]>('/projects/')),
    getById: (id: number) => getCached<Project>(`project_${id}`, () => api.get<Project>(`/projects/${id}`)),
};

export const clientsApi = {
    getAll: () => getCached<Client[]>('clients', () => api.get<Client[]>('/clients/')),
    getById: (id: number) => getCached<Client>(`client_${id}`, () => api.get<Client>(`/clients/${id}`)),
};

export const stockApi = {
    getAll: () => getCached<StockItem[]>('stock', () => api.get<StockItem[]>('/stock/')),
    getByQR: (qrCode: string) => getCached<QRScanResult>(`qr_${qrCode}`, () => api.get<QRScanResult>(`/qr/scan/${qrCode}`)),
    updateQuantity: (id: number, quantity: number) =>
        api.patch(`/stock/${id}`, { quantity }),
    markUsed: (id: number) => api.post(`/stock/${id}/use`),
    consumeBoard: (stockId: number, optimizationId?: number) =>
        api.post(`/qr/consume`, null, { params: { stock_id: stockId, optimization_id: optimizationId } }),
};

export const optimizationsApi = {
    getByProject: (projectId: number) =>
        getCached<Optimization[]>(`opt_proj_${projectId}`, () => api.get<Optimization[]>(`/optimize/history/${projectId}`)),
    getById: (id: number) =>
        getCached<Optimization>(`opt_result_${id}`, () => api.get<Optimization>(`/optimize/result/${id}`)),
};

export default api;
