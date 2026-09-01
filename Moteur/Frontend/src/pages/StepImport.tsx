import React, { useState, useEffect, useCallback } from 'react';
import { 
    Upload, FileUp, Loader2, CheckCircle2, Package, Layers, RefreshCw, 
    Trash2, Save, AlertTriangle, ShieldCheck, ShieldAlert, 
    Eye, Shapes, Drill, X, Info 
} from 'lucide-react';
import { toast } from 'sonner';
import { StepService, type StepImportResponse, type ExtractedPart, type MachiningFeature } from '../services/stepService';
import { type Project, ProjectService } from '../services/projectService';
import api from '../services/api';

interface Material {
    id: number;
    name: string;
    thickness: number;
}

// ---------------------------------------------------------------------------
// Composant Miniature Contour 2D SVG
// ---------------------------------------------------------------------------
function ContourPreviewSvg({ 
    points, 
    features, 
    width = 120, 
    height = 70, 
    className = "" 
}: { 
    points?: [number, number][] | null; 
    features?: MachiningFeature[]; 
    width?: number; 
    height?: number; 
    className?: string; 
}) {
    if (!points || points.length < 3) {
        return (
            <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 text-[10px] rounded border border-slate-200 dark:border-slate-700 ${className}`} style={{ width, height }}>
                <span>Rect standard</span>
            </div>
        );
    }

    const xs = points.map(p => p[0]);
    const ys = points.map(p => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const pad = Math.max(w, h) * 0.08;

    const viewBox = `${minX - pad} ${minY - pad} ${w + 2 * pad} ${h + 2 * pad}`;
    const pointsStr = points.map(p => `${p[0]},${p[1]}`).join(' ');

    return (
        <svg 
            viewBox={viewBox} 
            className={`rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 shadow-sm ${className}`}
            style={{ width, height }}
        >
            {/* Contour brut de la pièce */}
            <polygon 
                points={pointsStr} 
                className="fill-indigo-50 dark:fill-indigo-950/40 stroke-indigo-600 dark:stroke-indigo-400" 
                strokeWidth={Math.max(w, h) / 70}
                strokeLinejoin="round"
            />
            {/* Usinages internes détectés */}
            {features?.map((f, i) => {
                const cx = f.position_center[0];
                const cy = f.position_center[1];
                if (f.type === 'percage') {
                    const r = Math.max(f.bbox_width, f.bbox_height) / 2 || (Math.max(w, h) / 40);
                    return (
                        <circle 
                            key={i} 
                            cx={cx} 
                            cy={cy} 
                            r={r} 
                            className="fill-rose-500/80 stroke-rose-700 dark:stroke-rose-300" 
                            strokeWidth={Math.max(w, h) / 120} 
                        />
                    );
                } else {
                    const fw = Math.max(f.bbox_width, 1);
                    const fh = Math.max(f.bbox_height, 1);
                    return (
                        <rect 
                            key={i} 
                            x={cx - fw / 2} 
                            y={cy - fh / 2} 
                            width={fw} 
                            height={fh} 
                            rx={Math.max(w, h) / 200}
                            className="fill-amber-400/80 stroke-amber-600 dark:stroke-amber-300" 
                            strokeWidth={Math.max(w, h) / 120} 
                        />
                    );
                }
            })}
        </svg>
    );
}

// ---------------------------------------------------------------------------
// Modal d'Inspection Géométrique Détaillée
// ---------------------------------------------------------------------------
function GeometryDetailModal({ 
    part, 
    onClose 
}: { 
    part: ExtractedPart; 
    onClose: () => void; 
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500 text-white rounded-lg">
                            <Shapes className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-lg">
                                {part.name}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Nom d'origine : {part.original_name}
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Visualisation Grand Format */}
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                        <ContourPreviewSvg 
                            points={part.contour_2d} 
                            features={part.machining_features} 
                            width={540} 
                            height={280} 
                        />
                        <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-indigo-100 dark:bg-indigo-900 border border-indigo-500 inline-block"></span>
                                <span>Contour brut ({part.contour_2d?.length || 4} sommets)</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                                <span>Perçages</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded bg-amber-400 inline-block"></span>
                                <span>Rainures / Mortaises</span>
                            </div>
                        </div>
                    </div>

                    {/* Données Métriques */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[11px] font-semibold uppercase text-slate-400">Longueur OBB</span>
                            <div className="text-lg font-bold text-slate-800 dark:text-white">{part.length} mm</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[11px] font-semibold uppercase text-slate-400">Largeur OBB</span>
                            <div className="text-lg font-bold text-slate-800 dark:text-white">{part.width} mm</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[11px] font-semibold uppercase text-slate-400">Épaisseur</span>
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{part.thickness} mm</div>
                        </div>
                        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                            <span className="text-[11px] font-semibold uppercase text-slate-400">Confiance Épaisseur</span>
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {part.thickness_confidence != null ? `${Math.round(part.thickness_confidence * 100)}%` : 'OBB'}
                            </div>
                        </div>
                    </div>

                    {/* Usinages détectés */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2.5 flex items-center gap-2">
                            <Drill className="h-4 w-4 text-amber-500" />
                            Usinages Détectés ({part.machining_features?.length || 0})
                        </h4>
                        {part.machining_features && part.machining_features.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto">
                                {part.machining_features.map((f, i) => (
                                    <div key={i} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                f.type === 'percage' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                            }`}>
                                                {f.type}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                {f.bbox_width} × {f.bbox_height} mm
                                            </span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            ({f.position_center[0]}, {f.position_center[1]})
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400 italic">Aucun usinage intérieur détecté sur cette face.</p>
                        )}
                    </div>
                </div>

                <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
                    <button onClick={onClose} className="btn-secondary text-sm">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page Principale StepImport
// ---------------------------------------------------------------------------
export function StepImport() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [importResult, setImportResult] = useState<StepImportResponse | null>(null);
    const [editableParts, setEditableParts] = useState<ExtractedPart[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [inspectingPart, setInspectingPart] = useState<ExtractedPart | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [projectsData, materialsData] = await Promise.all([
                ProjectService.getAll(),
                api.get<Material[]>('/materials/')
            ]);
            setProjects(projectsData);
            setMaterials(materialsData.data);
            if (projectsData.length > 0 && !selectedProjectId) {
                setSelectedProjectId(projectsData[0].id);
            }
        } catch {
            toast.error('Erreur lors du chargement des données');
        }
    }, [selectedProjectId]);

    useEffect(() => {
        void loadData();
    }, [loadData]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedProjectId) return;

        if (!file.name.toLowerCase().endsWith('.stp') && !file.name.toLowerCase().endsWith('.step')) {
            toast.error('Le fichier doit être un fichier STEP (.stp ou .step)');
            return;
        }

        setIsUploading(true);
        setImportResult(null);
        setEditableParts([]);

        try {
            const result = await StepService.importStepFile(selectedProjectId, file);
            setImportResult(result);
            setEditableParts(result.parts);
            toast.success(`✅ ${result.parts.length} types de pièces extraits avec analyse géométrique avancée.`);
        } catch (err: unknown) {
            console.error('STEP Import Error:', err);
            const error = err as { response?: { data?: { detail?: string | { message?: string } } } };
            const detail = error.response?.data?.detail;
            const errorMsg = typeof detail === 'string' ? detail : detail?.message || 'Erreur lors de l\'import STEP';
            toast.error(errorMsg);
        } finally {
            setIsUploading(false);
        }
    };

    const handlePartChange = (index: number, field: keyof ExtractedPart, value: string | number) => {
        setEditableParts(prev => prev.map((part, i) => {
            if (i === index) {
                return { ...part, [field]: value, is_modified: true };
            }
            return part;
        }));
    };

    const handleSwapDimensions = (index: number) => {
        setEditableParts(prev => prev.map((part, i) => {
            if (i === index) {
                return {
                    ...part,
                    thickness: part.length,
                    width: part.thickness,
                    length: part.width,
                    is_modified: true
                };
            }
            return part;
        }));
    };

    const handleDeletePart = (index: number) => {
        setEditableParts(prev => prev.filter((_, i) => i !== index));
    };

    const handleConfirmImport = async () => {
        if (!importResult || !selectedProjectId) return;

        setIsConfirming(true);
        try {
            await StepService.confirmImport(importResult.step_model_id, editableParts);
            toast.success('Importation confirmée et pièces créées avec succès !');
            setImportResult(null);
            setEditableParts([]);
            void loadData();
        } catch (err: unknown) {
            console.error('Confirm Import Error:', err);
            toast.error('Erreur lors de la confirmation de l\'import');
        } finally {
            setIsConfirming(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <FileUp className="h-8 w-8 text-blue-500" />
                        Import Intelligent STEP
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Analyse géométrique avancée (OBB, échantillonnage statistique d'épaisseur et extraction des usinages)
                    </p>
                </div>
            </div>

            <div className="card p-6">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Package className="h-5 w-5 text-indigo-500" />
                    Sélection du Projet
                </h3>
                <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                    className="input-field w-full md:w-1/2"
                >
                    <option value="">-- Sélectionnez un projet --</option>
                    {projects.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} ({p.parts?.length || 0} pièces)
                        </option>
                    ))}
                </select>
            </div>

            <div className="card p-8 border-2 border-dashed border-slate-200 dark:border-slate-700">
                <div className="text-center">
                    <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                        Importer un nouveau fichier STEP
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Analyse géométrique automatique et échantillonnage statistique
                    </p>

                    <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Analyse géométrique en cours...
                            </>
                        ) : (
                            <>
                                <FileUp className="h-5 w-5" />
                                Sélectionner un fichier STEP
                            </>
                        )}
                        <input
                            type="file"
                            accept=".stp,.step"
                            onChange={handleFileUpload}
                            disabled={!selectedProjectId || isUploading}
                            className="hidden"
                        />
                    </label>
                </div>
            </div>

            {importResult && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Bannière Récapitulative Haute */}
                    <div className="card p-6 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900/40">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-md shadow-blue-500/20">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        {importResult.filename}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Analyse terminée • Vérifiez l'indice de confiance et les contours avant validation
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center px-4 border-r border-slate-200 dark:border-slate-700">
                                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{importResult.metadata.total_parts}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Composants</div>
                                </div>
                                <div className="text-center px-4">
                                    <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {importResult.metadata.total_volume_mm3 ? (importResult.metadata.total_volume_mm3 / 1000000).toFixed(2) : '0.00'}
                                    </div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Volume (L)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Alertes globales si pièces à vérifier */}
                    {(importResult.has_low_confidence_pieces || importResult.has_non_convex_pieces) && (
                        <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50 flex items-start gap-3 text-amber-800 dark:text-amber-200 text-sm">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <p className="font-bold">Points d'attention détectés sur la géométrie :</p>
                                <ul className="list-disc list-inside text-xs space-y-0.5 text-amber-700 dark:text-amber-300">
                                    {importResult.has_low_confidence_pieces && (
                                        <li>Certaines pièces présentent une confiance d'épaisseur &lt; 60% (usinages profonds ou géométrie inhabituelle). Vérifiez l'épaisseur manuellement.</li>
                                    )}
                                    {importResult.has_non_convex_pieces && (
                                        <li>Des formes non rectangulaires (en L / équerre) ont été détectées. Le contour réel a été extrait pour l'optimisation.</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Tableau Récapitulatif avec Badges et Aperçus */}
                    <div className="card overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Layers className="h-5 w-5 text-indigo-500" />
                                Liste des Pièces Analysées ({editableParts.length})
                            </h3>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isConfirming || editableParts.length === 0}
                                className="btn-primary flex items-center gap-2"
                            >
                                {isConfirming ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4" />
                                )}
                                Confirmer l'Importation
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-500">
                                        <th className="px-5 py-3.5">Aperçu</th>
                                        <th className="px-5 py-3.5">Désignation</th>
                                        <th className="px-3 py-3.5 text-center">Épaisseur</th>
                                        <th className="px-3 py-3.5 text-center">Fiabilité</th>
                                        <th className="px-3 py-3.5 text-center">Largeur</th>
                                        <th className="px-3 py-3.5 text-center">Longueur</th>
                                        <th className="px-3 py-3.5 text-center">Rot.</th>
                                        <th className="px-3 py-3.5 text-center">Qté</th>
                                        <th className="px-4 py-3.5">Usinages</th>
                                        <th className="px-4 py-3.5">Matériau</th>
                                        <th className="px-4 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {editableParts.map((part, index) => {
                                        const conf = part.thickness_confidence;
                                        const isLowConf = conf != null && conf < 0.6;
                                        const isMedConf = conf != null && conf >= 0.6 && conf <= 0.85;
                                        const isHighConf = conf != null && conf > 0.85;

                                        return (
                                            <tr key={`${index}-${part.original_name}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                {/* Aperçu Contour 2D */}
                                                <td className="px-5 py-3">
                                                    <button 
                                                        onClick={() => setInspectingPart(part)}
                                                        className="group relative cursor-pointer block rounded transition-transform hover:scale-105"
                                                        title="Cliquer pour inspecter la géométrie"
                                                    >
                                                        <ContourPreviewSvg 
                                                            points={part.contour_2d} 
                                                            features={part.machining_features} 
                                                            width={90} 
                                                            height={50} 
                                                        />
                                                        <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 rounded flex items-center justify-center transition-opacity">
                                                            <Eye className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                                                        </div>
                                                    </button>
                                                </td>

                                                {/* Désignation & Shape Type */}
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={part.name}
                                                            onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                                                            className="bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 w-full font-medium text-slate-800 dark:text-slate-100 text-sm"
                                                            title="Nom de la pièce"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <span className="text-[10px] text-slate-400 px-1 truncate max-w-[130px]">
                                                            {part.original_name}
                                                        </span>
                                                        {part.shape_type === 'forme_structurelle_non_convexe' && (
                                                            <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                                                                Non-convexe
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Épaisseur */}
                                                <td className="px-3 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={part.thickness}
                                                        onChange={(e) => handlePartChange(index, 'thickness', Number(e.target.value))}
                                                        className="w-16 bg-blue-50 dark:bg-blue-900/20 border-none text-center font-bold text-blue-700 dark:text-blue-400 rounded py-1 text-sm"
                                                    />
                                                </td>

                                                {/* Badge de Fiabilité / Confiance */}
                                                <td className="px-3 py-3 text-center">
                                                    {isHighConf && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800" title={`Échantillonnage statistique : ${Math.round(conf * 100)}% de concordance`}>
                                                            <ShieldCheck className="h-3 w-3" />
                                                            {Math.round(conf * 100)}%
                                                        </span>
                                                    )}
                                                    {isMedConf && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800" title={`Confiance moyenne : ${Math.round(conf * 100)}%. À vérifier.`}>
                                                            <Info className="h-3 w-3" />
                                                            {Math.round(conf * 100)}%
                                                        </span>
                                                    )}
                                                    {(isLowConf || conf == null) && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800" title="Confiance faible ou repli OBB. Vérifiez manuellement l'épaisseur.">
                                                            <ShieldAlert className="h-3 w-3" />
                                                            {conf != null ? `${Math.round(conf * 100)}%` : 'OBB'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Largeur */}
                                                <td className="px-3 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={part.width}
                                                        onChange={(e) => handlePartChange(index, 'width', Number(e.target.value))}
                                                        className="w-20 bg-transparent border-none text-center font-medium rounded py-1 text-sm"
                                                    />
                                                </td>

                                                {/* Longueur */}
                                                <td className="px-3 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={part.length}
                                                        onChange={(e) => handlePartChange(index, 'length', Number(e.target.value))}
                                                        className="w-20 bg-transparent border-none text-center font-medium rounded py-1 text-sm"
                                                    />
                                                </td>

                                                {/* Rotation dimensions */}
                                                <td className="px-3 py-3 text-center">
                                                    <button
                                                        onClick={() => handleSwapDimensions(index)}
                                                        className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-500 rounded-lg transition-transform hover:rotate-90"
                                                        title="Permuter les dimensions (L -> W -> T)"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>

                                                {/* Quantité */}
                                                <td className="px-3 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={part.quantity}
                                                        onChange={(e) => handlePartChange(index, 'quantity', Number(e.target.value))}
                                                        className="w-12 bg-transparent border-none text-center font-medium rounded py-1 text-sm"
                                                    />
                                                </td>

                                                {/* Usinages Résumé */}
                                                <td className="px-4 py-3">
                                                    {part.machining_features && part.machining_features.length > 0 ? (
                                                        <button 
                                                            onClick={() => setInspectingPart(part)}
                                                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                                                        >
                                                            <Drill className="h-3.5 w-3.5" />
                                                            <span>{part.machining_features.length} usinage{part.machining_features.length > 1 ? 's' : ''}</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Aucun</span>
                                                    )}
                                                </td>

                                                {/* Matériau */}
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={part.material_id || ''}
                                                        onChange={(e) => handlePartChange(index, 'material_id', Number(e.target.value))}
                                                        className="text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-[140px]"
                                                    >
                                                        <option value="">-- Matériau --</option>
                                                        {materials.map(m => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.name} ({m.thickness}mm)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={() => setInspectingPart(part)}
                                                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                                                            title="Inspecter la géométrie"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePart(index)}
                                                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
                                                            title="Supprimer cette pièce"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal d'Inspection Géométrique */}
            {inspectingPart && (
                <GeometryDetailModal 
                    part={inspectingPart} 
                    onClose={() => setInspectingPart(null)} 
                />
            )}
        </div>
    );
}
