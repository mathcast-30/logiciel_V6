import api from './api';

export interface RawWoodParams {
    position_resolution: number;
    min_offcut_dimension: number;
    kerf: number;
    safety_margin: number;
    /** Si true: autorise le placement en largeur (Optimisation agressive) */
    allow_transverse_orientation: boolean;
    scoring_weights: {
        utilization: number;
        compactness: number;
        offcut_quality: number;
    };
}

export interface OptimizationRequest {
    project_id?: number;
    project_ids?: number[];
    engine?: 'auto' | 'panel' | 'raw_wood';
    piece_ids?: number[];
    stock_ids?: number[];
    kerf: number;
    trim_margin: number;
    safety_margin: number;
    export_formats: string[];
    validate_and_update_stock: boolean;
    high_precision: boolean;
    algorithm: 'guillotine' | 'rectpack' | 'next_fit' | 'best_fit';
    material_source: 'stock' | 'supplier';
    material_sources?: Record<number, 'stock' | 'supplier'>;
    raw_wood_params?: RawWoodParams;
    colors?: Record<string, string>;
}

export interface Placement {
    piece_id: number;
    piece_name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotated: boolean;
    project_id?: number;
    project_name?: string;
    grain_direction: number;
    longueur?: number;
    largeur?: number;
    epaisseur?: number;
}

export interface Offcut {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface PanelResult {
    panel_id: number;
    width: number;
    height: number;
    is_offcut: boolean;
    grain_direction: number;
    waste_percentage: number;
    placements: Placement[];
    offcuts: Offcut[];
    defects?: { type: 'knot' | 'crack' | 'split' | 'other'; polygon: { x: number; y: number }[] }[];
}

export interface MaterialResult {
    success: boolean;
    panels_used: number;
    total_pieces: number;
    pieces_placed: number;
    pieces_remaining: number;
    waste_percentage: number;
    panels: PanelResult[];
    remaining_pieces: { id: number; name: string }[];
    usable_offcuts: number;
    edge_banding_summary?: Record<number, { name: string; length: number; cost: number; thickness: number }>;
    edge_banding_total_cost?: number;
}

export interface OptimizationResponse {
    optimization_id: number;
    engine_used?: 'panel' | 'raw_wood';
    total_panels_used: number;
    waste_percentage: number;
    result_data: Record<string, MaterialResult>;
    export_files: Record<string, string>;
    error?: string;
    error_code?: string;
    // Computed locally after fetch:
    success?: boolean;
    panels?: PanelResult[];
    pieces_placed?: number;
    total_pieces?: number;
    pieces_remaining?: number;
    remaining_pieces?: { id: number; name: string }[];
    fallback_used?: boolean;
    optimizer_type?: string;
    metrics?: { execution_time_ms?: number; [key: string]: number | string | undefined };
}

export const OptimizeService = {
    run: async (request: OptimizationRequest, signal?: AbortSignal): Promise<OptimizationResponse> => {
        console.group('[Network Audit] POST /api/optimize/run');
        console.log('Payload:', request);
        console.log('Headers:', api.defaults.headers);

        try {
            const response = await api.post<OptimizationResponse>('/optimize/run', request, { timeout: 60000, signal });
            console.log('Status:', response.status);
            console.log('Response DATA:', response.data);
            console.groupEnd();
            return response.data;
        } catch (error: any) {
            console.error('API Error Status:', error?.response?.status);
            console.error('API Error Detail:', error?.response?.data || error.message);
            console.groupEnd();
            throw error;
        }
    },

    getHistory: async (projectId: number) => {
        const response = await api.get(`/optimize/history/${projectId}`);
        return response.data;
    },

    getResult: async (optimizationId: number) => {
        const response = await api.get(`/optimize/result/${optimizationId}`);
        return response.data;
    },

    getLatest: async (projectId: number): Promise<OptimizationResponse> => {
        const response = await api.get<OptimizationResponse>(`/optimize/project/${projectId}/latest`);
        return response.data;
    },

    validate: async (optimizationId: number) => {
        const response = await api.post(`/optimize/validate/${optimizationId}`);
        return response.data;
    },
};
