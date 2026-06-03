/**
 * MaterialBreakdown Component
 *
 * Analyzes selected pieces and displays identified materials
 * Shows material statistics and allows source selection
 */
import { useState, useEffect } from 'react';
import { AlertCircle, Loader } from 'lucide-react';
import api from '../../services/api';

export interface IdentifiedMaterial {
    id: number;
    name: string;
    species: string | null;
    is_panel: boolean;
    piece_count: number;
    total_quantity: number;
    estimated_area: number;
    estimated_weight: number;
    cost_per_unit: number;
    estimated_total_cost: number;
}

interface MaterialBreakdownProps {
    selectedPieceIds: number[];
    projectIds: number[];
}

export function MaterialBreakdown({
    selectedPieceIds,
    projectIds,
}: MaterialBreakdownProps) {
    const [materials, setMaterials] = useState<IdentifiedMaterial[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedPieceIds.length === 0) {
            setMaterials([]);
            setError(null);
            return;
        }

        loadMaterials();
    }, [selectedPieceIds, projectIds]);

    const loadMaterials = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/api/pieces/materials', {
                piece_ids: selectedPieceIds,
                project_ids: projectIds,
            });
            setMaterials(response.data.materials || []);
        } catch (err) {
            console.error('Error loading materials:', err);
            setError('Erreur lors de la charge des matériaux');
        } finally {
            setIsLoading(false);
        }
    };

    if (selectedPieceIds.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Sélectionnez d'abord des pièces pour voir les matériaux
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                    <Loader className="h-5 w-5 animate-spin" />
                    <span>Analyse des matériaux...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-red-900 dark:text-red-100">Erreur</h4>
                        <p className="text-sm text-red-700 dark:text-red-200 mt-1">{error}</p>
                        <button
                            onClick={loadMaterials}
                            className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (materials.length === 0) {
        return (
            <div className="p-6 text-center rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
                <AlertCircle className="h-8 w-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                <p className="text-yellow-900 dark:text-yellow-100 font-medium">
                    Aucun matériau identifié
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-200 mt-1">
                    Les pièces sélectionnées n'ont pas de matériau assigné
                </p>
            </div>
        );
    }

    // Calculate totals
    const totalPieces = materials.reduce((sum, m) => sum + m.piece_count, 0);
    const totalArea = materials.reduce((sum, m) => sum + m.estimated_area, 0);
    const totalCost = materials.reduce((sum, m) => sum + m.estimated_total_cost, 0);

    return (
        <div className="space-y-4">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Matériaux identifiés</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {materials.length}
                    </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Pièces à optimiser</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {totalPieces}
                    </p>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Surface estimée</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {totalArea.toFixed(2)} m²
                    </p>
                </div>
            </div>

            {/* Materials Table */}
            <div className="border rounded-lg overflow-hidden dark:border-slate-700">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="text-left px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Matériau
                            </th>
                            <th className="text-left px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Type
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Pièces
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Quantité
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Surface
                            </th>
                            <th className="text-right px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                                Coût estimé
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                        {materials.map((material) => (
                            <tr key={material.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-slate-100">
                                            {material.name}
                                        </p>
                                        {material.species && (
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {material.species}
                                            </p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        material.is_panel
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                        {material.is_panel ? 'Panneau' : 'Bois brut'}
                                    </span>
                                </td>
                                <td className="text-right px-4 py-3 text-slate-700 dark:text-slate-300">
                                    {material.piece_count}
                                </td>
                                <td className="text-right px-4 py-3 text-slate-700 dark:text-slate-300">
                                    {material.total_quantity}
                                </td>
                                <td className="text-right px-4 py-3 text-slate-700 dark:text-slate-300">
                                    <span className="font-medium">{material.estimated_area.toFixed(2)}</span>
                                    <span className="text-xs text-slate-600 dark:text-slate-400 ml-1">m²</span>
                                </td>
                                <td className="text-right px-4 py-3">
                                    <span className="font-medium text-slate-900 dark:text-slate-100">
                                        {material.estimated_total_cost.toFixed(2)} €
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {/* Footer with totals */}
                        <tr className="bg-slate-100 dark:bg-slate-800/50 font-semibold">
                            <td colSpan={2} className="px-4 py-3 text-slate-900 dark:text-slate-100">
                                TOTAL
                            </td>
                            <td className="text-right px-4 py-3 text-slate-900 dark:text-slate-100">
                                {totalPieces}
                            </td>
                            <td colSpan={1} className="text-right px-4 py-3 text-slate-900 dark:text-slate-100"></td>
                            <td className="text-right px-4 py-3 text-slate-900 dark:text-slate-100">
                                {totalArea.toFixed(2)} m²
                            </td>
                            <td className="text-right px-4 py-3 text-slate-900 dark:text-slate-100">
                                {totalCost.toFixed(2)} €
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Info Alert */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-700 dark:text-blue-200">
                        <p className="font-medium">À l'étape suivante</p>
                        <p className="mt-1 opacity-90">
                            Sélectionnez pour chaque matériau si vous préférez utiliser le stock existant ou commander auprès d'un fournisseur
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
