import api from './api';

export const ExportService = {
    generate: async (optimizationId: number, formats: string[]): Promise<{ optimization_id: number }> => {
        const response = await api.post(`/exports/generate/${optimizationId}`, null, {
            params: { formats }
        });
        return response.data;
    },

    exportProject: async (projectId: number, formats: string[]): Promise<{ success: boolean, files: Record<string, string>, message: string }> => {
        const response = await api.post(`/exports/project/${projectId}`, formats);
        return response.data;
    },

    download: (filename: string): string => {
        const baseUrl = 'http://localhost:8000/api'; // Match api.ts
        return `${baseUrl}/exports/download/${filename.split('/').map(encodeURIComponent).join('/')}`;
    },

    generateLabels: async (projectId: number): Promise<{ total_labels: number }> => {
        const response = await api.post(`/exports/labels/${projectId}`);
        return response.data;
    },

    getImportTemplate: async (): Promise<Blob> => {
        const response = await api.get('/exports/import/template');
        return response.data;
    },

    importCSV: async (projectId: number, file: File): Promise<{ message: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/exports/import/csv/${projectId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    importExcel: async (projectId: number, file: File): Promise<{ message: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/exports/import/excel/${projectId}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },
};
