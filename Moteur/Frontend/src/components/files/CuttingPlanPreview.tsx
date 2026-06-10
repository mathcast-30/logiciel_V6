import React from 'react';
import type { OptimizationPreview } from '../../services/fileService';

interface CuttingPlanPreviewProps {
    previewData: OptimizationPreview | null;
    isLoading: boolean;
}

export const CuttingPlanPreview: React.FC<CuttingPlanPreviewProps> = ({ previewData, isLoading }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>Chargement de l'aperçu...</p>
                </div>
            </div>
        );
    }

    if (!previewData) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>Sélectionnez une optimisation pour voir l'aperçu.</p>
            </div>
        );
    }

    return (
        <div className="p-4 h-full flex flex-col custom-scrollbar overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-4">Aperçu - Opt. #{previewData.id}</h3>
            
            <div className="bg-slate-800 rounded-lg p-4 border border-slate-700 flex-1 overflow-hidden flex flex-col">
                <h4 className="text-sm font-semibold text-slate-400 mb-2">Données de découpe (JSON)</h4>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <pre className="text-xs text-slate-300">
                        {JSON.stringify(previewData.result_data, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};
