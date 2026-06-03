import React, { useState, useEffect, useCallback } from 'react';
import { Upload, FileUp, Loader2, CheckCircle2, Package, Layers, RefreshCw, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { StepService, type StepImportResponse, type ExtractedPart } from '../services/stepService';
import { type Project, ProjectService } from '../services/projectService';
import api from '../services/api';

interface Material {
    id: number;
    name: string;
    thickness: number;
}

export function StepImport() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [importResult, setImportResult] = useState<StepImportResponse | null>(null);
    const [editableParts, setEditableParts] = useState<ExtractedPart[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);

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
            toast.success(`✅ ${result.parts.length} types de pièces extraits. Veuillez vérifier les dimensions.`);
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
                // Circular rotation: T -> W -> L -> T
                // In our state: thickness, width, length
                // New Thickness = Old Length
                // New Width = Old Thickness
                // New Length = Old Width
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
            toast.success('Importation confirmée et pièces créées !');
            setImportResult(null);
            setEditableParts([]);
            // Reload projects to update part counts
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
                        Analysez vos fichiers 3D et validez les dimensions avant l'importation
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
                        Importer un nouveau fichier
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                        Analyse géométrique automatique des composants
                    </p>

                    <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                        {isUploading ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                Analyse en cours...
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
                    <div className="card p-6 bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500 rounded-xl text-white">
                                    <CheckCircle2 className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                        Analyse Terminée : {importResult.filename}
                                    </h3>
                                    <p className="text-sm text-slate-500">
                                        Vérifiez et ajustez les dimensions avant de valider.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-center px-4 border-r border-slate-200 dark:border-slate-700">
                                    <div className="text-xl font-bold text-blue-600">{importResult.metadata.total_parts}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Composants</div>
                                </div>
                                <div className="text-center px-4">
                                    <div className="text-xl font-bold text-blue-600">{(importResult.metadata.total_volume_mm3 / 1000000).toFixed(2)}</div>
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Volume (L)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card overflow-hidden">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Layers className="h-5 w-5 text-indigo-500" />
                                Liste des Pièces Extractibles
                            </h3>
                            <button
                                onClick={handleConfirmImport}
                                disabled={isConfirming || editableParts.length === 0}
                                className="btn-primary"
                            >
                                {isConfirming ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Confirmer l'Importation
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/50 text-[11px] uppercase font-bold text-slate-500">
                                        <th className="px-6 py-4">Désignation</th>
                                        <th className="px-4 py-4 text-center">Épaisseur</th>
                                        <th className="px-4 py-4 text-center">Largeur</th>
                                        <th className="px-4 py-4 text-center">Longueur</th>
                                        <th className="px-4 py-4 text-center">Rotation</th>
                                        <th className="px-4 py-4 text-center">Qté</th>
                                        <th className="px-6 py-4">Matériau</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {editableParts.map((part, index) => (
                                        <tr key={`${index}-${part.original_name}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={part.name}
                                                        onChange={(e) => handlePartChange(index, 'name', e.target.value)}
                                                        className="bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 w-full font-medium"
                                                        title="Nom de la pièce"
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 px-1 truncate max-w-[150px]">
                                                    {part.original_name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    value={part.thickness}
                                                    onChange={(e) => handlePartChange(index, 'thickness', Number(e.target.value))}
                                                    className="w-16 bg-blue-50 dark:bg-blue-900/20 border-none text-center font-bold text-blue-700 dark:text-blue-400 rounded py-1"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    value={part.width}
                                                    onChange={(e) => handlePartChange(index, 'width', Number(e.target.value))}
                                                    className="w-20 bg-transparent border-none text-center font-medium rounded py-1"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    value={part.length}
                                                    onChange={(e) => handlePartChange(index, 'length', Number(e.target.value))}
                                                    className="w-20 bg-transparent border-none text-center font-medium rounded py-1"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => handleSwapDimensions(index)}
                                                    className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-500 rounded-lg transition-transform hover:rotate-90"
                                                    title="Permuter les dimensions (L -> W -> T)"
                                                >
                                                    <RefreshCw className="h-4 w-4" />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <input
                                                    type="number"
                                                    value={part.quantity}
                                                    onChange={(e) => handlePartChange(index, 'quantity', Number(e.target.value))}
                                                    className="w-12 bg-transparent border-none text-center font-medium rounded py-1"
                                                />
                                            </td>
                                            <td className="px-6 py-3">
                                                <select
                                                    value={part.material_id || ''}
                                                    onChange={(e) => handlePartChange(index, 'material_id', Number(e.target.value))}
                                                    className="text-xs bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-[150px]"
                                                >
                                                    <option value="">-- Matériau --</option>
                                                    {materials.map(m => (
                                                        <option key={m.id} value={m.id}>
                                                            {m.name} ({m.thickness}mm)
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <button
                                                    onClick={() => handleDeletePart(index)}
                                                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors"
                                                    title="Supprimer cette pièce"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
