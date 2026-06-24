import { useState, useEffect, useRef } from 'react';
import {
    Scissors,
    Sparkles,
    Loader2,
    Layout,
    Save,
    Trash2,
    RefreshCw,
    Search,
    ChevronDown,
    Plus,
    Box,
    Printer,
    Download,
    Settings,
    Maximize2,
    FileText,
    History,
    Filter,
    ArrowUpRight,
    Info,
    Square,
    BarChart3
} from 'lucide-react';
import {
    ChevronLeft, ChevronRight, AlertTriangle,
    CheckCircle2, Wrench, Rocket, Package
} from '../components/Optimize/Icons';
import { toast } from 'sonner';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { type Project, ProjectService } from '../services/projectService';
import { type OptimizationResponse, type PanelResult, type OptimizationRequest, OptimizeService, type RawWoodParams } from '../services/optimizeService';
import { ExportService } from '../services/exportService';
import { AIService, type GAParameters } from '../services/aiService';
import { HardwareService } from '../services/hardwareService';
import {
    EngineSelector,
    PieceSelector,
    StockSelector,
    RawWoodConfigPanel,
    PolygonViewer,
    EnhancedProjectSelector,
    MaterialBreakdown,
    MaterialSourceSelector,
    ResultVisualizer,
    type EngineType,
    type IdentifiedMaterial
} from '../components/Optimize';

export function Optimize() {
    const { colors } = useTheme();
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [result, setResult] = useState<OptimizationResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
    const [currentMaterial, setCurrentMaterial] = useState<string | null>(null);
    const [aiStrategy, setAiStrategy] = useState<{ strategy_report: string, ga_parameters: GAParameters } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Optimization History
    const [optimizationHistory] = useState<Array<{
        id: number;
        created_at: string;
        total_panels_used: number;
        waste_percentage: number;
    }>>([]);
    const [selectedHistoryId, setSelectedHistoryId] = useState<number | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    interface CalculatedHardware {
        id: number;
        reference: string;
        name: string;
        category: string;
        cost_unit: number;
        quantity: number;
        total_cost: number;
    }

    // Hardware states
    const [hardwareResults, setHardwareResults] = useState<CalculatedHardware[]>([]);
    const [isCalculatingHardware, setIsCalculatingHardware] = useState(false);
    const [showHardware, setShowHardware] = useState(false);

    // Stock confirmation modal
    const [showStockConfirmation, setShowStockConfirmation] = useState(false);
    const [pendingOptimization, setPendingOptimization] = useState(false);
    const [isValidating, setIsValidating] = useState(false);
    const [isValidated, setIsValidated] = useState(false);

    // Settings
    const [settings, setSettings] = useState({
        kerf: 3,
        trim_margin: 2,
        safety_margin: 5,
        validate_and_update_stock: false,
        high_precision: false,
        algorithm: 'guillotine' as 'guillotine' | 'rectpack',
        export_formats: ['png', 'pdf'] as string[],
        material_source: 'stock' as 'stock' | 'supplier'
    });
    const [showSettings, setShowSettings] = useState(false);

    // Dual-Engine States (NEW)
    const [selectedEngine, setSelectedEngine] = useState<EngineType>('auto');
    const [detectedEngine, setDetectedEngine] = useState<'panel' | 'raw_wood' | null>(null);
    const [selectedPieceIds, setSelectedPieceIds] = useState<number[]>([]);

    // Material Management States (NEW)
    const [identifiedMaterials, setIdentifiedMaterials] = useState<IdentifiedMaterial[]>([]);
    const [materialSources, setMaterialSources] = useState<Record<number, 'stock' | 'supplier'>>({});
    const [selectedStockIds, setSelectedStockIds] = useState<Record<number, number[]>>({});
    const [isLoadingMaterials, setIsLoadingMaterials] = useState(false);
    const [rawWoodParams, setRawWoodParams] = useState<RawWoodParams>({
        position_resolution: 10,
        min_offcut_dimension: 100,
        kerf: 3,
        safety_margin: 5,
        allow_transverse_orientation: false,
        scoring_weights: {
            utilization: 0.4,
            compactness: 0.3,
            offcut_quality: 0.3
        }
    });
    const [rawWoodAlgorithm, setRawWoodAlgorithm] = useState<'next_fit' | 'best_fit'>('best_fit');

    // ── Anti Race-Condition : AbortController ────────────────────────────────
    const abortControllerRef = useRef<AbortController | null>(null);

    const isReady = selectedProjectIds.length > 0 && selectedPieceIds.length > 0;

    const loadProjects = async () => {
        try {
            const pData = await ProjectService.getAll();
            setProjects(pData);
            if (pData.length > 0 && selectedProjectIds.length === 0) {
                setSelectedProjectIds([pData[0].id]);
            }
        } catch (err) {
            console.error('Error loading projects:', err);
            setError('Impossible de charger les projets');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProjects();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-detect engine based on selected projects (NEW)
    useEffect(() => {
        if (isOptimizing) return;

        const detectMaterialType = async () => {
            if (selectedProjectIds.length === 0 || selectedEngine !== 'auto') {
                setDetectedEngine(null);
                return;
            }

            try {
                const response = await api.post('/projects/parts/filter', {
                    project_ids: selectedProjectIds
                });
                const firstPiece = response.data[0];
                if (firstPiece) {
                    setDetectedEngine(firstPiece.is_panel === false ? 'raw_wood' : 'panel');
                }
            } catch (error) {
                console.error('Error detecting material type:', error);
            }
        };

        detectMaterialType();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(selectedProjectIds), selectedEngine, isOptimizing]);

    // Load materials when piece selection changes (NEW)
    useEffect(() => {
        if (isOptimizing) return; // Prevent overwriting results or making unnecessary calls during optimization

        if (selectedPieceIds.length === 0) {
            setIdentifiedMaterials([]);
            setMaterialSources({});
            setSelectedStockIds({}); // Clear stock selection
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoadingMaterials(true);
            try {
                const response = await api.post('/materials/identify-from-pieces', {
                    piece_ids: selectedPieceIds,
                    project_ids: selectedProjectIds
                });

                setIdentifiedMaterials(response.data || []);

                // Initialize material sources if not already set (using functional update to avoid dependency)
                setMaterialSources(prev => {
                    const next = { ...prev };
                    (response.data || []).forEach((m: IdentifiedMaterial) => {
                        if (!next[m.id]) {
                            next[m.id] = settings.material_source;
                        }
                    });
                    return next;
                });
            } catch (err) {
                console.error('Error loading materials:', err);
                toast.error('Erreur lors de l\'identification des matériaux');
            } finally {
                setIsLoadingMaterials(false);
            }
        }, 500); // 500ms debounce

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(selectedPieceIds), JSON.stringify(selectedProjectIds), settings.material_source, isOptimizing]);

    const runOptimization = async (forceUpdateStock = false) => {
        if (!isReady) {
            toast.error('Veuillez sélectionner au moins un projet et une pièce à optimiser.');
            return;
        }

        // Show confirmation if stock update is requested
        if (settings.validate_and_update_stock && !forceUpdateStock && !pendingOptimization) {
            setShowStockConfirmation(true);
            setPendingOptimization(true);
            return;
        }

        // ── Abort previous in-flight request if any ──────────────────────
        if (abortControllerRef.current) {
            console.log('[Optimize.tsx] Annulation de la requête précédente');
            abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        // ─────────────────────────────────────────────────────────────────────

        setShowStockConfirmation(false);
        setPendingOptimization(false);
        setIsOptimizing(true);
        setError(null);
        setResult(null);

        try {
            // Determine final engine (resolve 'auto' to actual engine)
            let finalEngine = selectedEngine === 'auto' ? detectedEngine : selectedEngine;

            // Correction: Si des matériaux de type "raw_wood" sont détectés ou raw_wood_params est présent, forcer le engine
            const hasRawWood = identifiedMaterials.some(m => m.is_panel === false);
            if ((hasRawWood || rawWoodParams) && finalEngine !== 'raw_wood') {
                console.warn("[Optimize.tsx] Pièces massives ou paramètres massif détectés, forçage de l'engine sur 'raw_wood'");
                finalEngine = 'raw_wood';
            }

            const finalAlgorithm = finalEngine === 'raw_wood' ? rawWoodAlgorithm : settings.algorithm;

            // NEW - Map material sources and select pieces for optimization
            const allStockIds = Object.values(selectedStockIds).flat().map(id => parseInt(id.toString(), 10));
            const numericPieceIds = selectedPieceIds.map(id => parseInt(id.toString(), 10));

            const payload: OptimizationRequest = {
                project_ids: selectedProjectIds,
                engine: finalEngine || 'panel',
                piece_ids: numericPieceIds,
                stock_ids: allStockIds,
                algorithm: finalAlgorithm,
                raw_wood_params: finalEngine === 'raw_wood' ? rawWoodParams : undefined,
                kerf: settings.kerf,
                trim_margin: settings.trim_margin,
                safety_margin: settings.safety_margin,
                export_formats: settings.export_formats,
                validate_and_update_stock: forceUpdateStock,
                high_precision: settings.high_precision,
                material_source: settings.material_source,
                material_sources: materialSources,
                colors
            };

            console.log('[Optimize.tsx] Émission du payload vers le service:', payload);

            const response = await OptimizeService.run(payload, controller.signal);
            console.log('[Optimize.tsx] Réponse reçue du service:', response);

            // ── Normalisation post-fetch pour le moteur raw_wood ──────────────
            try {
                const isRawWood = response.engine_used === 'raw_wood' ||
                    Object.values(response.result_data || {}).some(
                        (v: any) => v?.optimizer_type === 'raw_wood' || (v?.panels?.[0] && 'species' in v.panels[0])
                    );

                if (isRawWood) {
                    console.log('[Optimize.tsx] Détection moteur Raw Wood, début normalisation...');
                    const allPanels: any[] = [];
                    let totalPlaced = 0;
                    let totalPieces = 0;
                    let totalRemaining = 0;
                    const allRemaining: any[] = [];
                    let anyFallback = false;
                    let allSuccess = true;
                    const mergedMetrics: Record<string, number | string> = {};

                    Object.entries(response.result_data || {}).forEach(([materialName, mat]: [string, any]) => {
                        if (!mat) return;
                        if (Array.isArray(mat.panels)) {
                            mat.panels.forEach((p: any, pIdx: number) => {
                                // Ensure GLOBALLY unique panel_id by prefixing material
                                const rawPanelId = p.panel_id ?? pIdx;
                                const panel = {
                                    ...p,
                                    panel_id: `${materialName}-${rawPanelId}`,
                                    species: p.species || materialName,
                                    placements: (p.placements || []).map((plc: any, plcIdx: number) => {
                                        const rawPieceId = plc.piece_id ?? plcIdx;
                                        return {
                                            ...plc,
                                            piece_id: `${materialName}-${rawPanelId}-${rawPieceId}`
                                        };
                                    })
                                };
                                allPanels.push(panel);
                            });
                        }
                        totalPlaced += mat.pieces_placed || 0;
                        totalPieces += mat.total_pieces || 0;
                        totalRemaining += mat.pieces_remaining || 0;
                        (mat.remaining_pieces || []).forEach((rp: any) => allRemaining.push(rp));
                        if (mat.fallback_used) anyFallback = true;
                        if (mat.success === false) allSuccess = false;
                        Object.assign(mergedMetrics, mat.metrics || {});
                    });

                    // Update response object with processed data
                    (response as any).panels = allPanels;
                    (response as any).success = allSuccess;
                    (response as any).pieces_placed = totalPlaced;
                    (response as any).total_pieces = totalPieces;
                    (response as any).pieces_remaining = totalRemaining;
                    (response as any).remaining_pieces = allRemaining;
                    (response as any).fallback_used = anyFallback;
                    (response as any).optimizer_type = 'raw_wood';
                    (response as any).metrics = mergedMetrics;
                    // Force a unique ID for this optimization run to break component cache
                    (response as any).optimization_id = `opt-${Date.now()}`;
                } else {
                    console.log('[Optimize.tsx] Détection moteur Panel, début normalisation...');
                    // Panel optimizer — ajouter success basé sur le résultat
                    (response as any).success =
                        response.success ||
                        Object.values(response.result_data || {}).some((v: any) => v?.success === true || (v?.panels && v.panels.length > 0));
                    (response as any).results = response.result_data;
                }
            } catch (normError) {
                console.error('[Optimize.tsx] Erreur lors de la normalisation des données:', normError);
                // On continue quand même pour essayer d'afficher ce qu'on peut
            }
            // ─────────────────────────────────────────────────────────────────

            console.log('[Optimize.tsx] Resultat final avant affichage:', response);

            // ── Nettoyage forcé du DOM avant injection ───────────────────────
            // 1. Vider l'ancien résultat pour démonter les SVG
            setResult(null);
            setIsOptimizing(false);
            // 2. Laisser React démonter les anciens composants SVG (1 frame)
            await new Promise(r => setTimeout(r, 50));
            // 3. Si la requête a été annulée pendant l'attente, ne pas injecter
            if (controller.signal.aborted) {
                console.log('[Optimize.tsx] Requête annulée pendant le flush DOM, abandon');
                return;
            }
            // 4. Injecter le nouveau résultat proprement
            setResult(response);
            // ─────────────────────────────────────────────────────────────────
            setIsValidated(false);

            if (response.success) {
                const materials = Object.keys(response.result_data || {});
                if (materials.length > 0) {
                    setCurrentMaterial(materials[0]);
                    setCurrentPanelIndex(0);
                }
                toast.success('Optimisation terminée avec succès');
            } else {
                // Keep the result for ResultVisualizer to show the specific error
                if (response.error_code === 'DIMENSIONS_EXCEEDED') {
                    toast.error(`Dimensions trop grandes pour le stock`);
                } else {
                    toast.error(response.error || 'Échec de l\'optimisation');
                }
            }

            if (forceUpdateStock && response.success) {
                toast.success('Stock mis à jour avec succès !');
            }
            console.log('[Optimize.tsx] Mise à jour du state result terminée');
        } catch (err: any) {
            // ── Ignorer silencieusement les requêtes annulées ────────────────
            if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError' || controller.signal.aborted) {
                console.log('[Optimize.tsx] Requête annulée (AbortController), ignorée.');
                return;
            }
            console.error('[Optimize.tsx] Échec critique de l\'optimisation ou du traitement des données:', err);
            const apiError = err?.response?.data?.detail;
            const errorMessage = typeof apiError === 'string' ? apiError : (err as Error).message || 'Erreur inconnue';
            setError(`Erreur: ${errorMessage}`);
            toast.error(`Une erreur technique est survenue : ${errorMessage.slice(0, 50)}...`);
        } finally {
            console.log('[Optimize.tsx] Fin du processus runOptimization (isOptimizing -> false)');
            setIsOptimizing(false);
        }
    };

    const cancelStockConfirmation = () => {
        setShowStockConfirmation(false);
        setPendingOptimization(false);
        setSettings(prev => ({ ...prev, validate_and_update_stock: false }));
        runOptimization(false);
    };

    const confirmStockUpdate = () => {
        runOptimization(true);
    };

    const handleExport = async (format: string) => {
        if (!result) return;
        try {
            await ExportService.generate(result.optimization_id, [format]);
            toast.success(`Export ${format.toUpperCase()} généré!`);
        } catch {
            toast.error('Erreur lors de l\'export');
        }
    };

    const handleValidate = async () => {
        if (!result?.optimization_id) return;
        setIsValidating(true);
        try {
            await OptimizeService.validate(result.optimization_id);
            setIsValidated(true);
            toast.success("Optimisation lancée en production !");
            // Reload projects to see status update
            loadProjects();
        } catch {
            toast.error("Erreur lors de la validation");
        } finally {
            setIsValidating(false);
        }
    };

    const handlePrintLabels = async () => {
        if (selectedProjectIds.length === 0) return;
        try {
            const response = await api.get<{ url: string }>(`/optimize/${selectedProjectIds[0]}/labels`);
            if (response.data.url) {
                window.open(`http://localhost:8000${response.data.url}`, '_blank');
            }
        } catch {
            toast.error("Impossible de générer les étiquettes");
        }
    };

    // Load projects
    // Kept for potential future history loading
    // const _toggleProject = (_id: number) => { };
    // const loadOptimizationHistory = async (_projectId: number) => { };

    const loadHistoricalResult = async (optimizationId: number) => {
        setIsLoadingHistory(true);
        try {
            const historicalResult = await OptimizeService.getResult(optimizationId);
            setResult(historicalResult);
            setSelectedHistoryId(optimizationId);

            // Set up material and panel display
            const materials = Object.keys(historicalResult.result_data);
            if (materials.length > 0) {
                setCurrentMaterial(materials[0]);
                setCurrentPanelIndex(0);
            }
        } catch {
            toast.error('Erreur lors du chargement de l\'optimisation');
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleAnalyzeStrategy = async () => {
        if (selectedProjectIds.length === 0) return;

        setIsAnalyzing(true);
        try {
            const report = await AIService.analyzeStrategy(selectedProjectIds);
            setAiStrategy(report);

            // Apply GA parameters automatically
            if (report.ga_parameters) {
                setSettings(prev => ({
                    ...prev,
                    high_precision: true // Analysis implies we want high precision
                }));
            }
            toast.success("Analyse stratégique terminée");
        } catch {
            toast.error("Erreur lors de l'analyse");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Unused in new workflow
    // const applyAiSuggestion = (): void => {};

    const calculateHardware = async () => {
        if (selectedProjectIds.length === 0) return;
        setIsCalculatingHardware(true);
        try {
            const results = await Promise.all(
                selectedProjectIds.map(id => HardwareService.calculateForProject(id))
            );

            const merged: Record<number, CalculatedHardware> = {};
            results.flat().forEach(item => {
                if (!merged[item.id]) {
                    merged[item.id] = { ...item };
                } else {
                    merged[item.id].quantity += item.quantity;
                    merged[item.id].total_cost += item.total_cost;
                }
            });
            setHardwareResults(Object.values(merged));
            setShowHardware(true);
            toast.success("Calcul de quincaillerie terminé");
        } catch {
            toast.error("Erreur lors du calcul de quincaillerie");
        } finally {
            setIsCalculatingHardware(false);
        }
    };

    const getCurrentPanels = (): PanelResult[] => {
        if (!result || !currentMaterial) return [];
        return result.result_data[currentMaterial]?.panels || [];
    };

    const navigatePanel = (direction: 'prev' | 'next') => {
        const panels = getCurrentPanels();
        if (direction === 'prev' && currentPanelIndex > 0) {
            setCurrentPanelIndex(currentPanelIndex - 1);
        } else if (direction === 'next' && currentPanelIndex < panels.length - 1) {
            setCurrentPanelIndex(currentPanelIndex + 1);
        }
    };

    const toggleExportFormat = (format: string) => {
        setSettings(prev => ({
            ...prev,
            export_formats: prev.export_formats.includes(format)
                ? prev.export_formats.filter(f => f !== format)
                : [...prev.export_formats, format]
        }));
    };

    return (
        <div className="space-y-6 text-slate-900 border-none dark:text-white">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Scissors className="h-8 w-8 text-blue-500" />
                        Optimisation de Découpe
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Calculez le meilleur plan de découpe</p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-3 rounded-xl transition-all ${showSettings ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    title="Paramètres d'optimisation"
                >
                    <Settings className="h-5 w-5" />
                </button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="card p-6 animate-fade-in-down">
                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-slate-400" />
                        Paramètres de Découpe
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Lame (mm)</label>
                            <input
                                type="number"
                                min="0" step="0.5"
                                className="input-field"
                                title="Épaisseur de la lame en mm"
                                placeholder="3.0"
                                value={settings.kerf}
                                onChange={e => setSettings({ ...settings, kerf: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ponçage (mm)</label>
                            <input
                                type="number"
                                min="0" step="0.5"
                                className="input-field"
                                title="Marge de ponçage en mm"
                                placeholder="2.0"
                                value={settings.trim_margin}
                                onChange={e => setSettings({ ...settings, trim_margin: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Sécurité (mm)</label>
                            <input
                                type="number"
                                min="0" step="1"
                                className="input-field"
                                title="Marge de sécurité en mm"
                                placeholder="5.0"
                                value={settings.safety_margin}
                                onChange={e => setSettings({ ...settings, safety_margin: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Dual-Engine Components (NEW) */}
                    <div className="border-t dark:border-slate-700/50 pt-6 mt-6 space-y-6">
                        {/* Engine Selector */}
                        <EngineSelector
                            value={selectedEngine}
                            onChange={setSelectedEngine}
                            detectedEngine={detectedEngine}
                        />

                        {/* Piece Selector (for multi-project optimization) */}
                        {selectedProjectIds.length > 0 && (
                            <PieceSelector
                                projectIds={selectedProjectIds}
                                selectedPieceIds={selectedPieceIds}
                                onSelectionChange={setSelectedPieceIds}
                                materialTypeFilter={
                                    selectedEngine === 'raw_wood' ? 'raw_wood' :
                                        selectedEngine === 'panel' ? 'panel' : null
                                }
                            />
                        )}

                        {/* Optimization Parameters & Engine (moved below material selection) */}

                        {/* Raw Wood Configuration */}
                        {(selectedEngine === 'raw_wood' || (selectedEngine === 'auto' && detectedEngine === 'raw_wood')) && (
                            <RawWoodConfigPanel
                                params={rawWoodParams}
                                onChange={setRawWoodParams}
                                algorithm={rawWoodAlgorithm}
                                onAlgorithmChange={setRawWoodAlgorithm}
                            />
                        )}
                    </div>

                    <div className="border-t dark:border-slate-700/50 pt-4">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Formats d'export</label>
                        <div className="flex flex-wrap items-center gap-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={settings.high_precision}
                                        onChange={e => setSettings({ ...settings, high_precision: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    Haute Précision (Génétique)
                                    <Sparkles className="h-3 w-3 text-amber-500" />
                                </span>
                            </label>
                            <div className="flex flex-wrap gap-2 items-center">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Formats d'export :</span>
                                {['png', 'pdf', 'dxf', 'svg', 'json'].map(format => (
                                    <button
                                        key={format}
                                        type="button"
                                        onClick={() => toggleExportFormat(format)}
                                        className={`px-3 py-1.5 rounded-xl transition-all uppercase text-[10px] font-bold ${settings.export_formats.includes(format) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                    >
                                        {format}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-2 items-center border-l dark:border-slate-700/50 pl-6 ml-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Algorithme :</span>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, algorithm: 'guillotine' })}
                                    className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold ${settings.algorithm === 'guillotine' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                >
                                    GUILLOTINE (Rapide)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, algorithm: 'rectpack' })}
                                    className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold ${settings.algorithm === 'rectpack' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                >
                                    RECTPACK (Meilleur rendement)
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center border-l dark:border-slate-700/50 pl-6 ml-2">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Source :</span>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, material_source: 'stock' })}
                                    className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold ${settings.material_source === 'stock' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                >
                                    STOCK (Chutes)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSettings({ ...settings, material_source: 'supplier' })}
                                    className={`px-3 py-1.5 rounded-xl transition-all text-[10px] font-bold ${settings.material_source === 'supplier' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}
                                >
                                    FOURNISSEUR (Neuf)
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI Strategy Expert Panel */}
                    <div className="border-t dark:border-slate-700/50 pt-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-amber-500" />
                                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Expertise Stratégique</h3>
                            </div>
                            <button
                                onClick={handleAnalyzeStrategy}
                                type="button"
                                disabled={isAnalyzing || selectedProjectIds.length === 0}
                                className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {isAnalyzing ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Analyse...
                                    </>
                                ) : (
                                    <>
                                        <Wrench className="h-3 w-3" />
                                        Consulter l'IA Expert
                                    </>
                                )}
                            </button>
                        </div>

                        {aiStrategy ? (
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-500">
                                <p className="text-sm text-slate-700 dark:text-slate-300 italic mb-4 leading-relaxed">
                                    "{aiStrategy.strategy_report}"
                                </p>
                                <div className="grid grid-cols-3 gap-4 border-t border-amber-200/50 dark:border-amber-900/30 pt-4">
                                    <div className="text-center">
                                        <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Population</div>
                                        <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">{aiStrategy.ga_parameters.population_size}</div>
                                    </div>
                                    <div className="text-center border-x border-amber-200/50 dark:border-amber-900/30">
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Générations</div>
                                            <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">{aiStrategy.ga_parameters.generations}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-1">Mutation</div>
                                            <div className="text-lg font-mono font-bold text-slate-800 dark:text-slate-200">{(aiStrategy.ga_parameters.mutation_rate * 100).toFixed(0)}%</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-2 justify-center text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase">
                                        <Settings className="h-4 w-4" />
                                        Paramètres appliqués au moteur de calcul
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center">
                                <BarChart3 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Analysez votre batch de projets pour obtenir des recommandations de réglages industriels.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="spinner !w-12 !h-12 border-4 !border-blue-500 !border-t-transparent" />
                    <p className="mt-4 text-slate-500 dark:text-slate-400 font-medium">Chargement des projets...</p>
                </div>
            ) : (
                <>
                    <div className="space-y-6 text-slate-900 border-none dark:text-white">
                        {/* Optimization Workflow - Enhanced */}
                        <div className="card p-6">
                            <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold">1</span>
                                Projets à Optimiser
                            </h3>
                            <EnhancedProjectSelector
                                projects={projects}
                                selectedProjectIds={selectedProjectIds}
                                onSelectionChange={setSelectedProjectIds}
                            />
                        </div>

                        {/* 2. Piece Selection */}
                        {selectedProjectIds.length > 0 && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-xs font-bold">2</span>
                                    Sélection des Pièces
                                </h3>
                                <PieceSelector
                                    projectIds={selectedProjectIds}
                                    selectedPieceIds={selectedPieceIds}
                                    onSelectionChange={setSelectedPieceIds}
                                />
                            </div>
                        )}

                        {/* 3. Material Breakdown */}
                        {selectedPieceIds.length > 0 && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-xs font-bold">3</span>
                                    Analyse des Matériaux
                                </h3>
                                <MaterialBreakdown
                                    materials={identifiedMaterials}
                                    isLoading={isLoadingMaterials}
                                />
                            </div>
                        )}

                        {/* 4. Material Source Selection */}
                        {identifiedMaterials.length > 0 && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold">4</span>
                                    Source des Matériaux (Stock vs Fournisseur)
                                </h3>
                                <MaterialSourceSelector
                                    materials={identifiedMaterials}
                                    materialSources={materialSources}
                                    onSourceChange={(materialId, source) => {
                                        setMaterialSources(prev => ({ ...prev, [materialId]: source }));
                                    }}
                                />
                            </div>
                        )}

                        {/* 5. Stock Selection */}
                        {selectedProjectIds.length > 0 && (
                            <div className="card p-6">
                                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-xs font-bold">5</span>
                                    Sélection du Stock
                                </h3>
                                <div className="space-y-4">
                                    <div className="alert-info text-xs py-2">
                                        Sélectionnez les panneaux spécifiques à utiliser pour chaque matériau.
                                    </div>
                                    {identifiedMaterials
                                        .filter(m => materialSources[m.id] === 'stock')
                                        .map(mat => (
                                            <div key={mat.id} className="card p-4 border-blue-100 dark:border-blue-900/30">
                                                <h4 className="font-bold text-sm mb-3 flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-blue-500" />
                                                    {mat.name} <span className="text-xs font-normal text-slate-400">({mat.thickness}mm)</span>
                                                </h4>
                                                <StockSelector
                                                    materialId={mat.id}
                                                    selectedStockIds={selectedStockIds[mat.id] || []}
                                                    onSelectionChange={(ids) => setSelectedStockIds(prev => ({
                                                        ...prev,
                                                        [mat.id]: ids
                                                    }))}
                                                    materialType={mat.is_panel ? 'panel' : 'raw_wood'}
                                                />
                                            </div>
                                        ))
                                    }
                                    {identifiedMaterials.filter(m => materialSources[m.id] === 'stock').length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-sm italic">
                                            Aucun matériau n'est configuré pour utiliser le stock.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* 6. Optimization Parameters & Engine Selection */}
                        <div className="card p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/20 dark:to-slate-800/20 border-slate-200 dark:border-slate-700/50">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 text-xs font-bold">6</span>
                                        Paramètres
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                                Largeur de kerf (mm): <span className="font-bold text-slate-900 dark:text-white">{settings.kerf}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="5"
                                                step="0.1"
                                                value={settings.kerf}
                                                onChange={e => setSettings({ ...settings, kerf: parseFloat(e.target.value) })}
                                                className="w-full"
                                                title="Largeur de kerf (mm)"
                                                aria-label="Largeur de kerf"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                                Marge de finition (mm): <span className="font-bold text-slate-900 dark:text-white">{settings.trim_margin}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="10"
                                                step="0.1"
                                                value={settings.trim_margin}
                                                onChange={e => setSettings({ ...settings, trim_margin: parseFloat(e.target.value) })}
                                                className="w-full"
                                                title="Marge de finition (mm)"
                                                aria-label="Marge de finition"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">
                                                Marge de sécurité (mm): <span className="font-bold text-slate-900 dark:text-white">{settings.safety_margin}</span>
                                            </label>
                                            <input
                                                type="range"
                                                min="0"
                                                max="20"
                                                step="0.5"
                                                value={settings.safety_margin}
                                                onChange={e => setSettings({ ...settings, safety_margin: parseFloat(e.target.value) })}
                                                className="w-full"
                                                title="Marge de sécurité (mm)"
                                                aria-label="Marge de sécurité"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Moteur d'Optimisation</h3>
                                    <EngineSelector
                                        value={selectedEngine}
                                        onChange={setSelectedEngine}
                                        detectedEngine={detectedEngine}
                                    />
                                    {selectedEngine === 'raw_wood' && (
                                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <RawWoodConfigPanel
                                                params={rawWoodParams}
                                                onChange={setRawWoodParams}
                                                algorithm={rawWoodAlgorithm}
                                                onAlgorithmChange={setRawWoodAlgorithm}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 7. Launch Optimization */}
                        <div className="flex items-center gap-4 card p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                            <div className="flex-1">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.validate_and_update_stock}
                                        onChange={e => setSettings({ ...settings, validate_and_update_stock: e.target.checked })}
                                        className="h-5 w-5 text-blue-600 rounded border-slate-300"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Déduire du stock après optimisation</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handlePrintLabels}
                                    disabled={selectedProjectIds.length === 0}
                                    className="p-3 rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400 hover:bg-purple-200 disabled:opacity-50"
                                    title="Imprimer les étiquettes"
                                >
                                    <Printer className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={calculateHardware}
                                    disabled={selectedProjectIds.length === 0 || isCalculatingHardware}
                                    className="p-3 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 hover:bg-indigo-200 disabled:opacity-50"
                                    title="Calculer la quincaillerie"
                                >
                                    {isCalculatingHardware ? <div className="spinner !w-5 !h-5 border-2" /> : <Wrench className="h-5 w-5" />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => runOptimization()}
                                    disabled={!isReady || isOptimizing}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-blue-200/50 dark:shadow-none"
                                >
                                    {isOptimizing ? (
                                        <><div className="spinner !w-5 !h-5 !border-white/30 !border-t-white" /> Calcul en cours...</>
                                    ) : (
                                        <><Rocket className="h-5 w-5" /> Lancer l'Optimisation</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="alert-error flex flex-col gap-2 animate-fade-in shadow-sm p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                            {error.includes('Échec technique') && (
                                <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-900/30">
                                    <p className="text-[10px] uppercase font-bold text-red-600/60 dark:text-red-400/60 mb-1">Diagnostic Technique</p>
                                    <code className="text-xs break-all opacity-80">
                                        {error.split(': ')[1] || 'Aucun détail supplémentaire'}
                                    </code>
                                </div>
                            )}
                        </div>
                    )}

                    {showHardware && hardwareResults.length > 0 && (
                        <div className="card p-6 bg-indigo-50/30 border-indigo-100 dark:bg-indigo-900/10 dark:border-indigo-900/30 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2">
                                    <Wrench className="h-5 w-5" /> Besoins en Quincaillerie (Auto)
                                </h3>
                                <button type="button" onClick={() => setShowHardware(false)} className="text-xs text-slate-400 hover:text-slate-600">Masquer</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {hardwareResults.map(hw => (
                                    <div key={hw.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shadow-sm">
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-1">{hw.reference}</div>
                                        <div className="font-bold text-sm truncate">{hw.name}</div>
                                        <div className="flex justify-between items-end mt-2">
                                            <div className="text-xl font-black text-indigo-600">x{hw.quantity}</div>
                                            <div className="text-xs font-semibold text-slate-500">{hw.total_cost.toFixed(2)} €</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Optimization History Selector */}
                    {optimizationHistory.length > 0 && (
                        <div className="card p-4 bg-purple-50/30 border-purple-100 dark:bg-purple-900/10 dark:border-purple-900/30 animate-fade-in-up">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Download className="h-5 w-5 text-purple-500" />
                                    <span className="font-bold text-purple-800 dark:text-purple-300 text-sm">Historique des optimisations :</span>
                                </div>
                                <select
                                    value={selectedHistoryId || ''}
                                    onChange={(e) => {
                                        const optId = parseInt(e.target.value);
                                        if (optId) {
                                            loadHistoricalResult(optId);
                                        } else {
                                            setSelectedHistoryId(null);
                                            setResult(null);
                                        }
                                    }}
                                    className="input-field flex-1 max-w-md"
                                    disabled={isLoadingHistory}
                                    title="Sélectionner une optimisation"
                                    aria-label="Sélectionner une optimisation de l'historique"
                                >
                                    <option value="">-- Nouvelle optimisation --</option>
                                    {optimizationHistory.map((opt: { id: number; created_at: string; total_panels_used: number; waste_percentage: number }) => (
                                        <option key={opt.id} value={opt.id}>
                                            {new Date(opt.created_at).toLocaleString('fr-FR')} - {opt.total_panels_used} panneaux ({(100 - opt.waste_percentage).toFixed(1)}% utilisation)
                                        </option>
                                    ))}
                                </select>
                                {isLoadingHistory && <div className="spinner !w-5 !h-5 border-2" />}
                            </div>
                        </div>
                    )}

                    <ResultVisualizer
                        key={result?.optimization_id || `opt-${Date.now()}`}
                        result={result}
                        isOptimizing={isOptimizing}
                        onDownloadPack={(format) => handleExport(format)}
                        optimizationId={result?.optimization_id}
                    />

                    {!result && !isOptimizing && !error && (
                        <div className="py-20 text-center card border-dashed border-2 dark:border-slate-700 shadow-none">
                            <Scissors className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Prêt pour l'optimisation</h3>
                            <p className="text-slate-500 text-sm max-w-xs mx-auto mt-2">Sélectionnez vos projets à gauche ou utilisez les conseils de l'assistant IA.</p>
                        </div>
                    )}

                    {/* Modal Overlay - Stock Confirmation */}
                    {showStockConfirmation && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={cancelStockConfirmation}>
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-up" onClick={e => e.stopPropagation()}>
                                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center mb-6">
                                    <AlertTriangle className="h-8 w-8 text-amber-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-4">Mise à jour du stock</h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">Cette opération va déduire les panneaux du stock et ajouter les chutes réutilisables. Cette action est irréversible.</p>
                                <div className="flex gap-3">
                                    <button type="button" onClick={cancelStockConfirmation} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 font-bold hover:bg-slate-200 transition-all">Simuler</button>
                                    <button type="button" onClick={confirmStockUpdate} className="flex-1 py-3 rounded-2xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-shadow shadow-lg shadow-amber-200 dark:shadow-none">Confirmer</button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function CuttingPlanViewer({ panel }: { panel: PanelResult }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        if (containerRef.current) {
            const containerWidth = containerRef.current.clientWidth;
            const containerHeight = 450;
            const scaleX = (containerWidth - 20) / panel.width;
            const scaleY = (containerHeight - 20) / panel.height;
            setScale(Math.min(scaleX, scaleY, 0.45));
        }
    }, [panel]);

    const COLORS = [
        '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    const uniqueProjectIds = Array.from(new Set(panel.placements.map(p => p.project_id || 0)));
    const projectPalette: Record<number, string> = {};
    uniqueProjectIds.forEach((id, i) => projectPalette[id] = COLORS[i % COLORS.length]);

    return (
        <div ref={containerRef} className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 flex flex-col items-center">
                <svg width={panel.width * scale} height={panel.height * scale} className="drop-shadow-sm overflow-visible">
                    <defs>
                        <pattern id="grain-horizontal" width="40" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
                            <line x1="0" y1="1" x2="40" y2="1" stroke="#000" strokeWidth="0.5" opacity="0.1" />
                            <line x1="0" y1="3" x2="40" y2="3" stroke="#000" strokeWidth="0.5" opacity="0.05" />
                        </pattern>
                        <pattern id="grain-vertical" width="4" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
                            <line x1="1" y1="0" x2="1" y2="40" stroke="#000" strokeWidth="0.5" opacity="0.1" />
                            <line x1="3" y1="0" x2="3" y2="40" stroke="#000" strokeWidth="0.5" opacity="0.05" />
                        </pattern>
                    </defs>

                    {/* Background with Panel Grain */}
                    <rect width={panel.width * scale} height={panel.height * scale} fill="white" stroke="#CBD5E1" strokeWidth={1} rx={4} />
                    <rect
                        width={panel.width * scale}
                        height={panel.height * scale}
                        fill={panel.grain_direction === 1 ? "url(#grain-horizontal)" : panel.grain_direction === 2 ? "url(#grain-vertical)" : "none"}
                        rx={4}
                    />

                    {/* Pieces */}
                    {panel.placements.map((p, i) => (
                        <g key={i}>
                            <rect
                                x={p.x * scale} y={p.y * scale}
                                width={p.width * scale} height={p.height * scale}
                                fill={projectPalette[p.project_id || 0]}
                                stroke="#1E293B" strokeWidth={1} rx={2} opacity={0.85}
                            />
                            <rect
                                x={p.x * scale} y={p.y * scale}
                                width={p.width * scale} height={p.height * scale}
                                fill={p.grain_direction === 1 ? "url(#grain-horizontal)" : p.grain_direction === 2 ? "url(#grain-vertical)" : "none"}
                                rx={2}
                                opacity={0.3}
                            />
                            {p.width * scale > 30 && p.height * scale > 15 && (
                                <text
                                    x={(p.x + p.width / 2) * scale} y={(p.y + p.height / 2) * scale}
                                    textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={10} fontWeight="bold"
                                    className="pointer-events-none drop-shadow-sm"
                                    paintOrder="stroke"
                                    stroke="rgba(0,0,0,0.5)"
                                    strokeWidth="1px"
                                >
                                    #{i + 1}
                                </text>
                            )}
                        </g>
                    ))}

                    {/* Offcuts */}
                    {panel.offcuts.map((o, i) => (
                        <rect
                            key={i} x={o.x * scale} y={o.y * scale}
                            width={o.width * scale} height={o.height * scale}
                            fill="#FEF3C7" stroke="#D97706" strokeWidth={1} strokeDasharray="4" rx={2} opacity={0.6}
                        />
                    ))}
                </svg>

                <div className="mt-8 flex flex-wrap justify-center gap-6">
                    <div className="flex gap-4 border-r dark:border-slate-700 pr-6 mr-2">
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 border border-slate-300 rounded bg-slate-100 overflow-hidden">
                                <rect width="16" height="16" fill="url(#grain-horizontal)" />
                            </svg>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Fil Horiz.</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 border border-slate-300 rounded bg-slate-100 overflow-hidden">
                                <rect width="16" height="16" fill="url(#grain-vertical)" />
                            </svg>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Fil Vert.</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueProjectIds.map(id => {
                            const name = panel.placements.find(p => p.project_id === id)?.project_name || "Commun";
                            return (
                                <div key={id} className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full shadow-sm border dark:border-slate-700">
                                    <svg className="w-3 h-3">
                                        <circle cx="6" cy="6" r="6" fill={projectPalette[id]} />
                                    </svg>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="text-[10px] uppercase text-slate-400 font-bold border-b dark:border-slate-700">
                            <th className="pb-2">#</th>
                            <th className="pb-2">Piece / Projet</th>
                            <th className="pb-2">Dim (mm)</th>
                            <th className="pb-2 text-right">Ori.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-700">
                        {panel.placements.map((p, i) => (
                            <tr key={i} className="text-sm">
                                <td className="py-2.5 font-bold">#{i + 1}</td>
                                <td className="py-2.5">
                                    <div className="font-bold">{p.piece_name}</div>
                                    <div className="text-[10px] text-slate-400 font-medium italic">{p.project_name}</div>
                                </td>
                                <td className="py-2.5 font-mono text-[10px]">
                                    {p.longueur && p.largeur ? (
                                        `${p.longueur} x ${p.largeur}${p.epaisseur ? ` x ${p.epaisseur}` : ''}`
                                    ) : (
                                        `${p.width} x ${p.height}`
                                    )}
                                </td>
                                <td className="py-2.5 text-right text-xs">{p.rotated ? 'Rot' : 'Std'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
