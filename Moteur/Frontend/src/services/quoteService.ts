import api from './api';

export interface QuoteItem {
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    vat_rate?: number;
    total?: number;
}

export interface Quote {
    id: number;
    number: string;
    client_id: number;
    project_id?: number;
    date: string;
    valid_until?: string;
    description?: string;
    notes?: string;
    total_ht: number;
    total_ttc: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'invoiced';
    items: QuoteItem[];
}

export interface QuoteCreateDTO {
    client_id: number;
    project_id?: number;
    description?: string;
    notes?: string;
    valid_until?: string;
    tva_rate?: number;
    items: QuoteItem[];
}

export const QuoteService = {
    getAll: async (): Promise<Quote[]> => {
        const response = await api.get<Quote[]>('/quotes/');
        return response.data;
    },

    getById: async (id: number): Promise<Quote> => {
        const response = await api.get<Quote>(`/quotes/${id}`);
        return response.data;
    },

    create: async (data: QuoteCreateDTO): Promise<Quote> => {
        const response = await api.post<Quote>('/quotes/', data);
        return response.data;
    },

    download: async (id: number, number: string): Promise<void> => {
        const response = await api.get(`/quotes/${id}/download`, {
            responseType: 'blob'
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Devis_${number}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    update: async (id: number, data: QuoteCreateDTO): Promise<Quote> => {
        const response = await api.put<Quote>(`/quotes/${id}`, data);
        return response.data;
    },

    updateStatus: async (id: number, status: string): Promise<Quote> => {
        const response = await api.patch<Quote>(`/quotes/${id}/status`, null, {
            params: { status }
        });
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await api.delete(`/quotes/${id}`);
    }
};
