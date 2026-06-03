/**
 * EngineSelector Component
 * 
 * Allows user to select between Panel and Raw Wood optimization engines.
 * Auto-detects material type from selected pieces when set to "auto".
 */

import { Box, Layers } from 'lucide-react';
import { useState } from 'react';

export type EngineType = 'auto' | 'panel' | 'raw_wood';

interface EngineSelectorProps {
    value: EngineType;
    onChange: (engine: EngineType) => void;
    detectedEngine?: 'panel' | 'raw_wood' | null;
    disabled?: boolean;
}

export function EngineSelector({
    value,
    onChange,
    detectedEngine = null,
    disabled = false
}: EngineSelectorProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    const engines = [
        {
            value: 'auto' as const,
            label: 'Auto',
            icon: Layers,
            description: 'Détection automatique basée sur le type de matériau'
        },
        {
            value: 'panel' as const,
            label: 'Panneaux',
            icon: Box,
            description: 'Optimisation pour panneaux rectangulaires (MDF, contreplaqué, etc.)'
        },
        {
            value: 'raw_wood' as const,
            label: 'Bois Massif',
            icon: Box,
            description: 'Optimisation pour bois brut avec prise en compte du fil et des défauts'
        }
    ];

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Moteur d'Optimisation
                </label>
                {detectedEngine && value === 'auto' && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        Détecté: {detectedEngine === 'panel' ? 'Panneaux' : 'Bois Massif'}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-3 gap-3">
                {engines.map((engine) => {
                    const Icon = engine.icon;
                    const isSelected = value === engine.value;
                    const isAutoDetected = value === 'auto' && detectedEngine === engine.value;

                    return (
                        <button
                            key={engine.value}
                            type="button"
                            onClick={() => !disabled && onChange(engine.value)}
                            disabled={disabled}
                            className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isSelected
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }
                ${isAutoDetected ? 'ring-2 ring-green-400' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <Icon
                                    className={`w-6 h-6 ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'}`}
                                />
                                <span className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {engine.label}
                                </span>
                            </div>

                            {/* Tooltip */}
                            {showTooltip && isSelected && (
                                <div className="absolute z-10 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg">
                                    {engine.description}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Warning for mixed materials */}
            {value === 'auto' && detectedEngine === null && (
                <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <Box className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Sélectionnez des projets pour activer la détection automatique
                    </p>
                </div>
            )}
        </div>
    );
}
