import api from './api';

export interface Part {
    id: number;
    project_id: number;
    material_id: number;
    name: string;
    width: number;
    height: number;
    quantity: number;
    allow_rotation: boolean;
    grain_direction: number; // 0: None, 1: Horizontal, 2: Vertical
    edge_top_id?: number | null;
    edge_bottom_id?: number | null;
    edge_left_id?: number | null;
    edge_right_id?: number | null;
    notes?: string;
}

export interface Project {
    id: number;
    client_id?: number;
    name: string;
    description?: string;
    created_at?: string;
    updated_at?: string;
    status?: string;
    parts: Part[];
}

export const ProjectService = {
    getAll: async (): Promise<Project[]> => {
        const response = await api.get<Project[]>('/projects/');
        return response.data;
    },

    getById: async (id: number): Promise<Project> => {
        const response = await api.get<Project>(`/projects/${id}`);
        return response.data;
    },

    getStats: async (id: number): Promise<{ piece_count: number; material_count: number; estimated_area: number }> => {
        const response = await api.get(`/projects/${id}/stats`);
        return response.data;
    },

    create: async (data: { name: string; client_id?: number; description?: string }): Promise<Project> => {
        const response = await api.post<Project>('/projects/', data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/projects/${id}`);
    },

    updateStatus: async (id: number, status: string): Promise<Project> => {
        const response = await api.put<Project>(`/projects/${id}/status`, { status });
        return response.data;
    },

    addPart: async (projectId: number, data: Omit<Part, 'id' | 'project_id'>): Promise<Part> => {
        const response = await api.post<Part>(`/projects/${projectId}/parts`, data);
        return response.data;
    },

    updatePart: async (partId: number, data: Omit<Part, 'id' | 'project_id'>): Promise<Part> => {
        const response = await api.put<Part>(`/projects/parts/${partId}`, data);
        return response.data;
    },

    deletePart: async (partId: number): Promise<void> => {
        await api.delete(`/projects/parts/${partId}`);
    },
};
