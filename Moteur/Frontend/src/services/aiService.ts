import api from './api';

export interface GAParameters {
    population_size: number;
    generations: number;
    mutation_rate: number;
}

export interface AIStrategyResponse {
    ga_parameters: GAParameters;
    strategy_report: string;
}

export interface AIStatus {
    status: 'online' | 'offline';
    provider: string;
    models: string[];
    current_model: string;
}

export interface BatchSuggestion {
    id: string;
    title: string;
    description: string;
    project_ids: number[];
    project_names: string[];
    potential_saving: string;
    reason: string;
}

export interface SketchAnalysisResponse {
    project_name: string;
    parts: {
        name: string;
        width: number;
        height: number;
        quantity: number;
        material_hint?: string;
    }[];
    error?: string;
}

export interface AIExpertResponse {
    answer: string;
    source: string;
}

export const AIService = {
    getStatus: async (): Promise<AIStatus> => {
        const response = await api.get<AIStatus>('/ai/status');
        return response.data;
    },

    getBatchSuggestions: async (): Promise<BatchSuggestion[]> => {
        const response = await api.get<BatchSuggestion[]>('/ai/suggest-batches');
        return response.data;
    },

    analyzeStrategy: async (projectIds: number[]): Promise<AIStrategyResponse> => {
        const response = await api.post<AIStrategyResponse>('/ai/analyze-strategy', projectIds);
        return response.data;
    },

    askExpert: async (query: string): Promise<{ answer: string; source: string }> => {
        const response = await api.get<{ answer: string; source: string }>('/ai/expert', {
            params: { query }
        });
        return response.data;
    },

    analyzeSketch: async (base64Image: string): Promise<SketchAnalysisResponse> => {
        const response = await api.post<SketchAnalysisResponse>('/ai/vision/analyze-sketch', {
            image: base64Image
        });
        return response.data;
    }
};
