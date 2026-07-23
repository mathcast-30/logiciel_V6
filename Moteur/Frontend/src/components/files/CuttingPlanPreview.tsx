import React, { useState } from 'react';
import { Code, Image as ImageIcon } from 'lucide-react';
import type { OptimizationPreview } from '../../services/fileService';

interface CuttingPlanPreviewProps {
    previewData: OptimizationPreview | null;
    isLoading: boolean;
}

const colorsList = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

interface Placement {
    x: number;
    y: number;
    width: number;
    height: number;
    piece_name?: string;
    name?: string;
    is_rotated?: boolean;
    rotated?: boolean;
    is_offcut?: boolean;
    polygon_coords?: [number, number][];
}

interface Offcut {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PanelData {
    width: number;
    height: number;
    placements?: Placement[];
    placed_pieces?: Placement[];
    offcuts?: Offcut[];
    waste_percentage?: number;
}

const SvgPanelPreview: React.FC<{ panel: PanelData; index: number; materialName: string }> = ({ panel, index, materialName }) => {
    const placements = panel.placements || panel.placed_pieces || [];
    const offcuts = panel.offcuts || [];
    const waste = panel.waste_percentage != null ? panel.waste_percentage.toFixed(1) : '0.0';

    // Pour éviter un SVG trop grand, on utilise un viewBox basé sur les vraies dimensions
    const viewBoxWidth = panel.width || 1000;
    const viewBoxHeight = panel.height || 1000;

    return (
        <div className="mb-8">
            <h5 className="text-theme-text-main font-semibold mb-2">
                {materialName} - Panneau {index + 1} <span className="text-sm font-normal opacity-75">({waste}% de déchets)</span>
            </h5>
            <div className="bg-slate-100 p-4 rounded-lg shadow-inner overflow-hidden flex justify-center items-center">
                <svg
                    viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                    className="w-full h-auto max-h-[600px] border border-slate-400"
                    style={{ maxHeight: '600px', display: 'block' }}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Fond du panneau */}
                    <rect x="0" y="0" width={viewBoxWidth} height={viewBoxHeight} fill="#f8fafc" />

                    {/* Pièces placées */}
                    {placements.map((p, i) => {
                        // Traitement pour ne dessiner que les pièces (pas les chutes)
                        if (p.is_offcut) return null;

                        const isRotated = p.is_rotated || p.rotated;
                        const pw = p.width;
                        const ph = p.height;
                        const px = p.x;
                        const py = p.y;
                        const name = p.piece_name || p.name || `Pièce ${i+1}`;
                        const color = colorsList[i % colorsList.length];

                        // Polygones (découpes spéciales)
                        if (p.polygon_coords && p.polygon_coords.length > 2) {
                            const points = p.polygon_coords.map(coord => `${coord[0]},${coord[1]}`).join(' ');
                            const xs = p.polygon_coords.map(c => c[0]);
                            const ys = p.polygon_coords.map(c => c[1]);
                            const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
                            const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
                            const fs = Math.min(100, (Math.max(...xs) - Math.min(...xs)) / 5);
                            return (
                                <g key={i}>
                                    <polygon points={points} fill={color} stroke="#1e293b" strokeWidth={viewBoxWidth / 1000 * 2} opacity={0.85} />
                                    <text x={cx} y={cy} fill="white" fontSize={fs} textAnchor="middle" dominantBaseline="middle" fontWeight="bold">
                                        {name}
                                    </text>
                                </g>
                            );
                        }

                        // Rectangles standards
                        return (
                            <g key={i}>
                                <rect 
                                    x={px} 
                                    y={py} 
                                    width={pw} 
                                    height={ph} 
                                    fill={color} 
                                    stroke="#1e293b" 
                                    strokeWidth={viewBoxWidth / 1000 * 2} 
                                    opacity={0.85} 
                                />
                                <text 
                                    x={px + pw / 2} 
                                    y={py + ph / 2} 
                                    fill="white" 
                                    fontSize={Math.min(ph * 0.4, pw * 0.2, 80)} 
                                    textAnchor="middle" 
                                    dominantBaseline="middle" 
                                    fontWeight="bold"
                                    transform={isRotated ? `rotate(-90 ${px + pw / 2} ${py + ph / 2})` : undefined}
                                >
                                    {name}
                                </text>
                            </g>
                        );
                    })}

                    {/* Chutes explicites dans offcuts[] */}
                    {offcuts.map((o, i) => (
                        <rect 
                            key={`offcut-${i}`}
                            x={o.x} 
                            y={o.y} 
                            width={o.width} 
                            height={o.height} 
                            fill="rgba(148, 163, 184, 0.2)" 
                            stroke="#94a3b8" 
                            strokeWidth={viewBoxWidth / 1000 * 4} 
                            strokeDasharray={`${viewBoxWidth / 1000 * 10},${viewBoxWidth / 1000 * 10}`}
                        />
                    ))}
                    
                    {/* Chutes définies via is_offcut dans placements[] */}
                    {placements.filter(p => p.is_offcut).map((o, i) => (
                        <rect 
                            key={`offcut-p-${i}`}
                            x={o.x} 
                            y={o.y} 
                            width={o.width} 
                            height={o.height} 
                            fill="url(#diagonalHatch)" 
                            stroke="#94a3b8" 
                            strokeWidth={viewBoxWidth / 1000 * 2} 
                        />
                    ))}

                    <defs>
                        <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                            <line x1="0" y1="0" x2="0" y2="10" stroke="#94a3b8" strokeWidth="2" opacity="0.5" />
                        </pattern>
                    </defs>
                </svg>
            </div>
        </div>
    );
};


export const CuttingPlanPreview: React.FC<CuttingPlanPreviewProps> = ({ previewData, isLoading }) => {
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

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

    const resultData = previewData.result_data || {};
    
    // Parse panels from the nested structure
    const allPanels: { panel: PanelData; index: number; materialName: string }[] = [];
    
    if (resultData.panneaux && Array.isArray(resultData.panneaux)) {
        // Direct panels array (fallback if custom structure)
        resultData.panneaux.forEach((panel: any, idx: number) => {
            allPanels.push({ panel, index: idx, materialName: "Panneau" });
        });
    } else {
        // Default OptiCut structure by materials
        Object.entries(resultData).forEach(([materialName, materialData]: [string, any]) => {
            if (materialData && Array.isArray(materialData.panels)) {
                materialData.panels.forEach((panel: any, idx: number) => {
                    allPanels.push({ panel, index: idx, materialName });
                });
            }
        });
    }

    return (
        <div className="p-4 h-full flex flex-col custom-scrollbar overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Aperçu - Opt. #{previewData.id}</h3>
                <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button
                        onClick={() => setViewMode('visual')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'visual' 
                                ? 'bg-blue-600 text-white' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        <ImageIcon size={16} />
                        Plan
                    </button>
                    <button
                        onClick={() => setViewMode('json')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            viewMode === 'json' 
                                ? 'bg-slate-700 text-white' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                        }`}
                    >
                        <Code size={16} />
                        JSON
                    </button>
                </div>
            </div>
            
            <div className="bg-theme-bg-card rounded-lg p-4 border border-slate-700 flex-1 overflow-hidden flex flex-col">
                {viewMode === 'json' ? (
                    <>
                        <h4 className="text-sm font-semibold text-slate-400 mb-2">Données brutes</h4>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <pre className="text-xs text-slate-300">
                                {JSON.stringify(previewData.result_data, null, 2)}
                            </pre>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {allPanels.length > 0 ? (
                            allPanels.map((item, i) => (
                                <SvgPanelPreview 
                                    key={`${item.materialName}-${item.index}-${i}`} 
                                    panel={item.panel} 
                                    index={item.index} 
                                    materialName={item.materialName} 
                                />
                            ))
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-3">
                                <ImageIcon size={48} className="opacity-20" />
                                <p>Aucun plan de découpe généré.</p>
                                <button onClick={() => setViewMode('json')} className="text-blue-400 hover:underline text-sm">
                                    Voir les données JSON
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
