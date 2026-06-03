import api from './api';

export interface TemplateParameter {
    name: string;
    label: string;
    default: number;
}

export interface TemplatePart {
    name: string;
    width: string;
    height: string;
    quantity: number | string;
}

export interface Template {
    id: number;
    name: string;
    description: string;
    category: string;
    definition: string; // JSON string
}

export interface ResolvedPart {
    name: string;
    width: number;
    height: number;
    quantity: number;
    material_id?: number;
}

export const LibraryService = {
    getAll: async () => {
        const response = await api.get<Template[]>('/templates');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get<Template>(`/templates/${id}`);
        return response.data;
    },

    resolve: async (id: number, parameters: Record<string, number>) => {
        const response = await api.post<ResolvedPart[]>(`/templates/${id}/resolve`, { parameters });
        return response.data;
    }
};
