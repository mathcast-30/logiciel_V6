import { useState, useEffect } from 'react';
import { Library, Check, Play, Layout, Plus, Info, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { LibraryService, type Template, type ResolvedPart, type TemplateParameter } from '../services/libraryService';
import { ProjectService, type Project } from '../services/projectService';
import { AIExpertChat } from '../components/AI/AIExpertChat';

interface TemplatePartDef {
    name: string;
    width: string | number;
    height: string | number;
    quantity: string | number;
}

interface TemplateDef {
    parameters: TemplateParameter[];
    parts: TemplatePartDef[];
}

export function LibraryPage() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [parameters, setParameters] = useState<Record<string, number>>({});
    const [resolvedParts, setResolvedParts] = useState<ResolvedPart[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResolving, setIsResolving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [tData, pData] = await Promise.all([
                LibraryService.getAll(),
                ProjectService.getAll()
            ]);
            setTemplates(tData);
            setProjects(pData);
            if (pData.length > 0) setSelectedProjectId(pData[0].id);
        } catch {
            toast.error('Erreur lors du chargement de la bibliothèque');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectTemplate = (template: Template) => {
        setSelectedTemplate(template);
        const def = JSON.parse(template.definition) as TemplateDef;
        const initialParams: Record<string, number> = {};
        def.parameters.forEach((p) => {
            initialParams[p.name] = p.default;
        });
        setParameters(initialParams);
        resolveParts(template.id, initialParams);
    };

    const resolveParts = async (id: number, params: Record<string, number>) => {
        setIsResolving(true);
        try {
            const resolved = await LibraryService.resolve(id, params);
            setResolvedParts(resolved);
        } catch {
            toast.error('Erreur de calcul des pièces');
        } finally {
            setIsResolving(false);
        }
    };

    const handleParamChange = (name: string, value: number) => {
        const newParams = { ...parameters, [name]: value };
        setParameters(newParams);
        if (selectedTemplate) {
            resolveParts(selectedTemplate.id, newParams);
        }
    };

    const handleAddToProject = async () => {
        if (!selectedProjectId || resolvedParts.length === 0) {
            toast.error('Sélectionnez un projet et un modèle');
            return;
        }

        try {
            // Add each part to the project
            // Note: In a real app, we might want a batch add endpoint
            // For now, we'll assume we need to add them one by one or the project service handles it.
            // Let's check part creation in ProjectService.

            for (const part of resolvedParts) {
                await ProjectService.addPart(selectedProjectId, {
                    name: part.name,
                    width: part.width,
                    height: part.height,
                    quantity: part.quantity,
                    material_id: projects.find(p => p.id === selectedProjectId)?.parts[0]?.material_id || 1, // Default or first part material
                    allow_rotation: true,
                    grain_direction: 0
                });
            }
            toast.success(`${resolvedParts.length} pièces ajoutées au projet !`);
        } catch {
            toast.error("Erreur lors de l'ajout des pièces au projet");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Library className="h-8 w-8 text-indigo-500" />
                        Bibliothèque de Modèles
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Générez vos listes de débit paramétriques</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Templates List */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-2">Modèles Disponibles</h3>
                    <div className="space-y-3">
                        {templates.map(t => (
                            <button
                                key={t.id}
                                onClick={() => handleSelectTemplate(t)}
                                className={`w-full text-left card p-4 hover:shadow-md transition-all border-l-4 ${selectedTemplate?.id === t.id ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/10' : 'border-transparent'}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase mb-1">{t.category}</div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{t.name}</h4>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{t.description}</p>
                                    </div>
                                    <ChevronRight className={`h-5 w-5 text-slate-300 transition-transform ${selectedTemplate?.id === t.id ? 'rotate-90 text-indigo-500' : ''}`} />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Configuration & Preview */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedTemplate ? (
                        <>
                            <div className="card p-6">
                                <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                    <Layout className="h-5 w-5 text-indigo-500" />
                                    Configuration : {selectedTemplate.name}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {(JSON.parse(selectedTemplate.definition) as TemplateDef).parameters.map((p) => (
                                        <div key={p.name}>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                                {p.label}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    title={p.label}
                                                    className="input-field pr-12"
                                                    value={parameters[p.name] || ''}
                                                    onChange={(e) => handleParamChange(p.name, parseFloat(e.target.value))}
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">mm</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="card overflow-hidden">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                        <Play className="h-4 w-4 text-emerald-500" />
                                        Pièces générées
                                    </h3>
                                    {isResolving && <div className="spinner !w-4 !h-4 !border-2" />}
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 dark:bg-slate-900/30">
                                            <tr>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Désignation</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Largeur</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Hauteur</th>
                                                <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Qté</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {resolvedParts.map((p, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">{p.name}</td>
                                                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{p.width} mm</td>
                                                    <td className="px-6 py-4 text-center text-slate-600 dark:text-slate-400">{p.height} mm</td>
                                                    <td className="px-6 py-4 text-center font-bold text-slate-800 dark:text-white">x{p.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="card p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    Ajouter au projet
                                </h3>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <select
                                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-white/50 flex-1"
                                        title="Projet cible"
                                        value={selectedProjectId || ''}
                                        onChange={(e) => setSelectedProjectId(parseInt(e.target.value))}
                                    >
                                        <option value="" className="text-slate-900">Sélectionner un projet...</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAddToProject}
                                        className="bg-white text-indigo-600 font-bold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                                    >
                                        Ajouter les {resolvedParts.reduce((acc, p) => acc + p.quantity, 0)} pièces
                                        <Check className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="card h-full flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                                <Info className="h-10 w-10 text-slate-400" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300">Aucun modèle sélectionné</h3>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xs">Choisissez un modèle dans la liste à gauche pour commencer la configuration.</p>
                        </div>
                    )}
                </div>
            </div>
            {/* AI Technical Expert Chat Bubble */}
            <AIExpertChat />
        </div>
    );
}
