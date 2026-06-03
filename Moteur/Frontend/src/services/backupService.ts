import axios from 'axios';

const API_URL = 'http://localhost:8000/api/backups';

export interface BackupInfo {
    filename: string;
    size_bytes: number;
    created_at: string;
    type: 'auto' | 'manual' | 'synthesis' | 'database_only' | 'legacy';
}

export interface BackupStats {
    total_backups: number;
    total_size_bytes: number;
    oldest_backup: string | null;
    newest_backup: string | null;
    auto_count: number;
    manual_count: number;
}

export const BackupService = {
    getAll: async (): Promise<BackupInfo[]> => {
        const response = await axios.get<BackupInfo[]>(API_URL);
        return response.data;
    },

    getStats: async (): Promise<BackupStats> => {
        const response = await axios.get<BackupStats>(`${API_URL}/stats`);
        return response.data;
    },

    create: async (): Promise<{ filename: string; status: string; message: string }> => {
        const response = await axios.post(API_URL);
        return response.data;
    },

    restore: async (filename: string): Promise<{ status: string; message: string; warning?: string }> => {
        const response = await axios.post(`${API_URL}/${filename}/restore`);
        return response.data;
    },

    delete: async (filename: string): Promise<{ status: string; message: string }> => {
        const response = await axios.delete(`${API_URL}/${filename}`);
        return response.data;
    },

    downloadUrl: (filename: string): string => {
        return `${API_URL}/${filename}/download`;
    },

    upload: async (file: File): Promise<{ filename: string; status: string; message: string }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};

