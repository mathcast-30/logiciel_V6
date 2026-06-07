import api from './api';

// ─── Types ───────────────────────────────────────────────────────

export interface FileInfo {
    name: string;
    type: string;
    size: string;
    size_bytes: number;
    path: string;
    modified: string;
}

export interface OptimizationEntry {
    id: number;
    date: string | null;
    efficiency: number | null;
    waste_percentage: number | null;
    total_panels: number;
    total_cost: number;
    is_validated: boolean;
    files: FileInfo[];
}

export interface ProjectEntry {
    id: number;
    name: string;
    status: string;
    created_at: string | null;
    optimizations: OptimizationEntry[];
    orphan_files: FileInfo[];
    total_files: number;
}

export interface ClientEntry {
    id: number;
    name: string;
    projects: ProjectEntry[];
}

export interface FileTreeResponse {
    clients: ClientEntry[];
}

export interface OptimizationPreview {
    id: number;
    project_id: number;
    efficiency: number | null;
    waste_percentage: number | null;
    total_panels: number;
    total_cost: number;
    kerf: number;
    created_at: string | null;
    result_data: Record<string, unknown>;
}

// ─── API Service ─────────────────────────────────────────────────

const BASE = 'file-explorer';

export const FileService = {
    async getTree(): Promise<FileTreeResponse> {
        const { data } = await api.get<FileTreeResponse>(`${BASE}/tree`);
        return data;
    },

    async getPreview(optimizationId: number): Promise<OptimizationPreview> {
        const { data } = await api.get<OptimizationPreview>(`${BASE}/preview/${optimizationId}`);
        return data;
    },

    getDownloadUrl(filePath: string): string {
        return `http://localhost:8000/api/${BASE}/download/${encodeURIComponent(filePath)}`;
    },

    async downloadFile(filePath: string): Promise<void> {
        const url = this.getDownloadUrl(filePath);
        const link = document.createElement('a');
        link.href = url;
        link.download = filePath.split('/').pop() || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    async downloadAsZip(paths: string[]): Promise<void> {
        const response = await api.post(`${BASE}/download-zip`, paths, {
            responseType: 'blob',
        });
        const blob = new Blob([response.data as BlobPart], { type: 'application/zip' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'opticut_export.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    async openFolder(path: string): Promise<void> {
        await api.post(`${BASE}/open-folder`, { path });
    },
};
