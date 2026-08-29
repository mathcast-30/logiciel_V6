/**
 * RawWoodConfigPanel Component
 * 
 * Configuration panel for raw wood optimization specific parameters
 */

import { Settings, Sliders } from 'lucide-react';
import { useState } from 'react';

import { type RawWoodParams } from '../../services/optimizeService';
export type { RawWoodParams };

interface RawWoodConfigPanelProps {
    params: RawWoodParams;
    onChange: (params: RawWoodParams) => void;
    algorithm: 'next_fit' | 'best_fit';
    onAlgorithmChange: (algorithm: 'next_fit' | 'best_fit') => void;
}

export function RawWoodConfigPanel({
    params,
    onChange,
    algorithm,
    onAlgorithmChange
}: RawWoodConfigPanelProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateWeight = (key: keyof typeof params.scoring_weights, value: number) => {
        onChange({
            ...params,
            scoring_weights: {
                ...params.scoring_weights,
                [key]: value
            }
        });
    };

    // Normalize weights to ensure they sum to 1.0
    const normalizeWeights = () => {
        const sum = Object.values(params.scoring_weights).reduce((a, b) => a + b, 0);
        if (sum === 0) return;

        const normalized = {
            utilization: params.scoring_weights.utilization / sum,
            compactness: params.scoring_weights.compactness / sum,
            offcut_quality: params.scoring_weights.offcut_quality / sum
        };

        onChange({ ...params, scoring_weights: normalized });
    };

    return (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Configuration Bois Massif
                    </h3>
                </div>
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                    <Sliders className="w-3 h-3" />
                    {showAdvanced ? 'Masquer avancé' : 'Afficher avancé'}
                </button>
            </div>

            {/* Algorithm Selection */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Algorithme de Placement
                </label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onAlgorithmChange('next_fit')}
                        className={`
              p-3 rounded-lg border-2 text-sm font-medium transition-all
              ${algorithm === 'next_fit'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                            }
            `}
                    >
                        <div>Next-Fit</div>
                        <div className="text-xs font-normal text-gray-600 dark:text-gray-400 mt-1">
                            Rapide, séquentiel
                        </div>
                    </button>
                    <button
                        onClick={() => onAlgorithmChange('best_fit')}
                        className={`
              p-3 rounded-lg border-2 text-sm font-medium transition-all
              ${algorithm === 'best_fit'
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                            }
            `}
                    >
                        <div>Best-Fit</div>
                        <div className="text-xs font-normal text-gray-600 dark:text-gray-400 mt-1">
                            Optimal, plus lent
                        </div>
                    </button>
                </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
                <>
                    {/* Position Resolution */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Résolution de Position (mm)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                aria-label="Résolution de position"
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={params.position_resolution}
                                onChange={(e) => onChange({ ...params, position_resolution: parseFloat(e.target.value) })}
                                className="flex-1"
                            />
                            <input
                                aria-label="Valeur de résolution"
                                type="number"
                                value={params.position_resolution}
                                onChange={(e) => onChange({ ...params, position_resolution: parseFloat(e.target.value) || 10 })}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Plus petit = plus précis mais plus lent. (Note: 10-15mm recommandé pour un bon compromis en mode Python)
                        </p>
                    </div>

                    {/* Min Offcut Size */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Taille Min. Chutes Réutilisables (mm)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                aria-label="Taille minimum chute"
                                type="range"
                                min="50"
                                max="500"
                                step="50"
                                value={params.min_offcut_dimension}
                                onChange={(e) => onChange({ ...params, min_offcut_dimension: parseFloat(e.target.value) })}
                                className="flex-1"
                            />
                            <input
                                aria-label="Valeur taille minimum"
                                type="number"
                                value={params.min_offcut_dimension}
                                onChange={(e) => onChange({ ...params, min_offcut_dimension: parseFloat(e.target.value) || 100 })}
                                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                            />
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Chutes plus petites seront ignorées
                        </p>
                    </div>

                    {/* Scoring Weights */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Pondération du Score
                            </label>
                            <button
                                onClick={normalizeWeights}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                Normaliser (100%)
                            </button>
                        </div>

                        {/* Utilization Weight */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300">Utilisation</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {Math.round(params.scoring_weights.utilization * 100)}%
                                </span>
                            </div>
                            <input
                                aria-label="Pondération utilisation"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={params.scoring_weights.utilization}
                                onChange={(e) => updateWeight('utilization', parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Compactness Weight */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300">Compacité</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {Math.round(params.scoring_weights.compactness * 100)}%
                                </span>
                            </div>
                            <input
                                aria-label="Pondération compacité"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={params.scoring_weights.compactness}
                                onChange={(e) => updateWeight('compactness', parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Offcut Quality Weight */}
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-700 dark:text-gray-300">Qualité Chutes</span>
                                <span className="text-gray-600 dark:text-gray-400">
                                    {Math.round(params.scoring_weights.offcut_quality * 100)}%
                                </span>
                            </div>
                            <input
                                aria-label="Pondération qualité chutes"
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={params.scoring_weights.offcut_quality}
                                onChange={(e) => updateWeight('offcut_quality', parseFloat(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Total Indicator */}
                        <div className="flex justify-between text-xs pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
                            <span className={`font-medium ${Math.abs(
                                params.scoring_weights.utilization +
                                params.scoring_weights.compactness +
                                params.scoring_weights.offcut_quality -
                                1.0
                            ) < 0.01
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-orange-600 dark:text-orange-400'
                                }`}>
                                {Math.round((params.scoring_weights.utilization + params.scoring_weights.compactness + params.scoring_weights.offcut_quality) * 100)}%
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
