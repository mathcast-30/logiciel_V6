/**
 * TypeScript service for STEP file import and management
 */
import api from './api';

export interface MachiningFeature {
    type: 'percage' | 'rainure' | 'mortaise_ou_poche' | string;
    bbox_width: number;
    bbox_height: number;
    position_center: [number, number];
}

export interface ExtractedPart {
    name: string;
    thickness: number;
    width: number;
    length: number;
    quantity: number;
    original_dimensions: { x: number; y: number; z: number };
    is_modified: boolean;
    volume_mm3: number;
    volume_accuracy?: number;
    obb_center: number[];
    material_id?: number;
    original_name: string;
    thickness_confidence?: number | null;
    thickness_method?: string;
    shape_type?: string;
    contour_2d?: [number, number][] | null;
    machining_features?: MachiningFeature[];
    warnings?: string[];
}

export interface StepImportResponse {
    step_model_id: number;
    filename: string;
    parts: ExtractedPart[];
    metadata: {
        total_parts: number;
        total_volume_mm3?: number;
        average_extraction_accuracy?: number;
        thickness_range?: { min: number; max: number };
        unit?: string;
        parser_version?: string;
    };
    warnings?: string[];
    has_low_confidence_pieces?: boolean;
    has_non_convex_pieces?: boolean;
}

export interface StepModel {
    id: number;
    filename: string;
    import_date: string;
    parts_count: number;
    metadata: Record<string, unknown>;
}

export interface MaterialAssignment {
    thickness: number;
    material_id: number;
}

export class StepService {
    /**
     * Import a STEP file for a project (Phase 1: Extraction)
     */
    static async importStepFile(
        projectId: number,
        file: File
    ): Promise<StepImportResponse> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await api.post<StepImportResponse>(
            `/step/projects/${projectId}/import-step`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            }
        );

        return response.data;
    }

    /**
     * Confirm and save extracted parts (Phase 2: Validation)
     */
    static async confirmImport(
        stepModelId: number,
        parts: ExtractedPart[]
    ): Promise<{ message: string; count: number }> {
        const response = await api.post(
            `/step/step-models/${stepModelId}/confirm`,
            parts
        );
        return response.data;
    }

    /**
     * Get all STEP models for a project
     */
    static async getStepModels(projectId: number): Promise<StepModel[]> {
        const response = await api.get<StepModel[]>(
            `/step/projects/${projectId}/step-models`
        );
        return response.data;
    }

    /**
     * Assign materials to parts in bulk based on thickness groups
     */
    static async assignMaterialsBulk(
        stepModelId: number,
        assignments: MaterialAssignment[]
    ): Promise<{ message: string; updated_count: number }> {
        const response = await api.post(
            `/step/step-models/${stepModelId}/assign-materials`,
            { assignments }
        );
        return response.data;
    }

    /**
     * Delete a STEP model and its parts
     */
    static async deleteStepModel(stepModelId: number): Promise<void> {
        await api.delete(`/step/step-models/${stepModelId}`);
    }
}
