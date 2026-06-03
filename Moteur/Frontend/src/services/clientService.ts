import api from './api';
import type { Project } from './projectService';
import type { Quote } from './quoteService';

export interface Client {
    id: number;
    name: string;
    contact_email?: string;
    contact_phone?: string;
    address?: string;
    notes?: string;
    created_at?: string;
}

export interface ClientDetail extends Client {
    projects: Project[];
    quotes: Quote[];
}

export const ClientService = {
    getAll: async () => {
        const response = await api.get<Client[]>('/clients/');
        return response.data;
    },

    getById: async (id: number) => {
        const response = await api.get<ClientDetail>(`/clients/${id}`);
        return response.data;
    },

    create: async (data: Omit<Client, 'id' | 'created_at'>) => {
        const response = await api.post<Client>('/clients/', data);
        return response.data;
    },

    update: async (id: number, data: Partial<Client>) => {
        const response = await api.put<Client>(`/clients/${id}`, data);
        return response.data;
    },

    delete: async (id: number) => {
        await api.delete(`/clients/${id}`);
    },
};
