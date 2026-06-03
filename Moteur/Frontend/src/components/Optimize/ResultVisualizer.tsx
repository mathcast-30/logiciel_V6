import { AlertCircle, CheckCircle2, FileText, Download, AlertTriangle } from 'lucide-react';
import { PolygonViewer } from './PolygonViewer';
import { RawWoodResultViewer } from './RawWoodResultViewer';
import { memo } from 'react';

interface ResultVisualizerProps {
    result: any;
    isOptimizing: boolean;
    onDownloadPack?: (format: string) => void;
    optimizationId?: number;
}

export const ResultVisualizer = memo(function ResultVisualizer({
    result: data,
    isOptimizing,
    onDownloadPack,
    optimizationId
}: ResultVisualizerProps) {

    // Sécurité Anti-Crash demandée
    if (!data) return <p>Aucun résultat à afficher</p>;

    // 1. Fallback UI: Chargement
    if (isOptimizing) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-900 animate-pulse">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Optimisation en cours...</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                    Nos algorithmes calculent le meilleur placement pour vos pièces afin de minimiser les pertes.
                </p>
            </div>
        );
    }

    // 2. Fallback UI: Données vides
    if (typeof data === 'object' && Object.keys(data).length === 0) {
        return (
            <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Aucun résultat à afficher</p>
            </div>
        );
    }

    // 3. Fallback UI: Erreur de dépassement de dimension
    if (data?.error_code === 'DIMENSIONS_EXCEEDED') {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <div className="bg-red-100 dark:bg-red-800 p-3 rounded-lg">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-300" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200">Dimensions trop grandes</h3>
                        <p className="text-red-700 dark:text-red-300 mt-1">
                            Une ou plusieurs pièces dépassent les dimensions maximales du stock disponible.
                        </p>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-red-100 dark:border-red-900">
                                <span className="text-xs font-semibold uppercase text-red-500">Pièce concernée</span>
                                <p className="font-mono text-sm mt-1">{data?.piece_name || 'Inconnue'}</p>
                            </div>
                            <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-red-100 dark:border-red-900">
                                <span className="text-xs font-semibold uppercase text-red-500">Stock Maximal</span>
                                <p className="font-mono text-sm mt-1">
                                    L:{data?.max_stock_w || '?'} x H:{data?.max_stock_h || '?'} mm
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Mapping des données (Engine-Agnostic)
    const activeResults = data?.boards || data?.sheets || data?.panels || [];

    // Normalisation des résultats
    const normalizedResults = {
        ...data,
        panels: activeResults?.map((item: any) => ({
            ...item,
            id: item?.id || item?.panel_id || item?.board_id,
            // Normalisation des placements
            placements: item?.placed_pieces || item?.placements || []
        })) || []
    };

    const engineType = data?.optimizer_type || data?.engine_used || data?.engine || 'standard';
    const isRawWood = engineType === 'raw_wood' || data?.fallback_used === true || (Array.isArray(data?.boards) && data?.boards?.length > 0);

    const showPartialWarning = !data?.success && (normalizedResults?.panels?.length > 0 || Object.keys(data?.results || {}).length > 0);
    const partialWarning = showPartialWarning && (
        <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    Optimisation partielle —{' '}
                    {data?.pieces_remaining > 0
                        ? `${data.pieces_remaining} pièce${data.pieces_remaining > 1 ? 's' : ''} non-placée${data.pieces_remaining > 1 ? 's' : ''}`
                        : data?.error || 'Certaines contraintes n\'ont pas pu être respectées.'
                    }
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Les schémas ci-dessous montrent les placements réussis. Les pièces en rouge dépassent les limites.
                </p>
            </div>
        </div>
    );

    // BRANCHE 1 : RENDU BOIS MASSIF (Raw Wood)
    if (isRawWood) {
        if (normalizedResults?.panels?.length === 0 && !data?.success) {
            return (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200">Stock insuffisant</h3>
                    <p className="text-amber-700 dark:text-amber-300 mt-2 max-w-lg mx-auto">
                        L'optimisation bois massif n'a pas pu placer vos pièces. Veuillez vérifier vos dimensions ou ajouter du stock.
                    </p>
                </div>
            );
        }

        const stableKey = data?.optimization_id || optimizationId || `raw-${data?.metrics?.execution_time_ms || 'fallback'}`;

        return (
            <div className="space-y-4" key={`res-view-raw-${stableKey}`}>
                {partialWarning}
                <RawWoodResultViewer
                    result={normalizedResults}
                    optimizationId={optimizationId}
                    onDownloadPack={onDownloadPack}
                />
            </div>
        );
    }

    // BRANCHE 2 : RENDU PANNEAU STANDARD
    const panelDataWrapper = data?.results ?? data?.result_data ?? {};
    const hasPanelsStandard = panelDataWrapper && typeof panelDataWrapper === 'object' && Object.keys(panelDataWrapper).length > 0;

    if (hasPanelsStandard || activeResults?.length > 0) {
        // Option 1: grouped by material (standard engine formatting with `results` object)
        const entries = hasPanelsStandard ? Object.entries(panelDataWrapper) : [['Défaut', { sheets: activeResults }]];

        return (
            <div className="space-y-6" key={`res-view-panel-${optimizationId || 'default'}`}>
                {partialWarning}

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Optimisation terminée</h3>
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {data?.fallback_used ? '✅ Solution de repli générée' : '✅ Solution optimale trouvée'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => onDownloadPack?.('pdf')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-sm transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                            Pack PDF
                        </button>
                        <button
                            type="button"
                            onClick={() => onDownloadPack?.('dxf')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                        >
                            <Download className="w-4 h-4" />
                            Export DXF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    {entries?.map(([material, materialData]: [string, any], matIdx: number) => {
                        // Utilisation du mapping engine-agnostic ici aussi
                        const materialPanels = materialData?.boards || materialData?.sheets || materialData?.panels || activeResults || [];

                        return (
                            <div key={`mat-${material}-${optimizationId || 0}-${matIdx}`} className="space-y-4">
                                <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                                    <h4 className="font-bold text-gray-700 dark:text-gray-300">{material || 'Inconnu'}</h4>
                                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-500">
                                        {materialPanels?.length || 0} panneau(x)
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 gap-12">
                                    {materialPanels?.map((item: any, index: number) => {
                                        // Normalisation des placements: board.placed_pieces ou sheet.placements
                                        const placements = item?.placed_pieces || item?.placements || [];

                                        return (
                                            <div key={item?.id || index} className="bg-white dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
                                                <PolygonViewer
                                                    boardWidth={item?.width || 0}
                                                    boardHeight={item?.height || 0}
                                                    pieces={placements?.map((p: any, pIdx: number) => {
                                                        const pKey = p?.id || p?.piece_id || pIdx;
                                                        const polygon = (Array.isArray(p?.polygon) && p.polygon.length >= 3)
                                                            ? p.polygon
                                                            : (p?.x !== undefined && p?.width !== undefined && p?.y !== undefined && p?.height !== undefined)
                                                                ? [
                                                                    { x: p.x, y: p.y },
                                                                    { x: p.x + p.width, y: p.y },
                                                                    { x: p.x + p.width, y: p.y + p.height },
                                                                    { x: p.x, y: p.y + p.height }
                                                                ]
                                                                : [];
                                                        return {
                                                            id: pKey,
                                                            name: p?.name || p?.piece_name || `Pièce ${pKey}`,
                                                            polygon,
                                                            rotation: p?.rotation || p?.rotation_degrees || 0,
                                                            grain_direction: p?.grain_direction || 0
                                                        };
                                                    }) || []}
                                                    title={`Panneau ${index + 1} (${material}) — ${item?.width || 0}×${item?.height || 0}mm`}
                                                />
                                                <div className="mt-4 flex justify-between items-center text-xs text-gray-500">
                                                    <span>
                                                        Remplissage: {item?.used_area && item?.width && item?.height
                                                            ? ((item.used_area / (item.width * item.height)) * 100).toFixed(1)
                                                            : 'NC'}%
                                                    </span>
                                                    <span className="font-mono">{placements?.length || 0} pièces</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // ÉCHEC OU NON RECONNU
    if (data?.success === false) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center">
                <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-amber-800 dark:text-amber-200">
                    {data?.status === 'INFEASIBLE' ? "Optimisation impossible" : "Stock insuffisant / Erreur"}
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-2 max-w-lg mx-auto">
                    {data?.status === 'INFEASIBLE'
                        ? "L'optimiseur n'a pas pu trouver de solution viable même après relâchement des contraintes."
                        : data?.error || "Une erreur inattendue est survenue lors de l'optimisation."}
                </p>
            </div>
        );
    }

    return (
        <div className="p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 text-center">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Format de données non pris en charge ou résultats tronqués.</p>
        </div>
    );
});
