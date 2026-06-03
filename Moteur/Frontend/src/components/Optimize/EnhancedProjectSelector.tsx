/**
 * EnhancedProjectSelector Component
 *
 * Allows users to select multiple projects for batch optimization
 * Shows real-time statistics about selected projects
 */
import { useState, useEffect } from 'react';
import { CheckSquare, Square, Users, Package, AlertCircle } from 'lucide-react';
import { type Project } from '../../services/projectService';
import api from '../../services/api';

interface ProjectStats {
    projectId: number;
    pieceCount: number;
    materialCount: number;
    estimatedArea: number;
}

interface EnhancedProjectSelectorProps {
    projects: Project[];
    selectedProjectIds: number[];
    onSelectionChange: (projectIds: number[]) => void;
}

export function EnhancedProjectSelector({
    projects,
    selectedProjectIds,
    onSelectionChange,
}: EnhancedProjectSelectorProps) {
    const [projectStats, setProjectStats] = useState<Map<number, ProjectStats>>(new Map());
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // Load statistics for projects
    useEffect(() => {
        if (projects.length === 0) {
            setProjectStats(new Map());
            return;
        }

        const loadStats = async () => {
            setIsLoadingStats(true);
            try {
                const statsMap = new Map<number, ProjectStats>();

                for (const project of projects) {
                    try {
                        const response = await api.get(`/projects/${project.id}/stats`);
                        statsMap.set(project.id, {
                            projectId: project.id,
                            pieceCount: response.data.piece_count || 0,
                            materialCount: response.data.material_count || 0,
                            estimatedArea: response.data.estimated_area || 0,
                        });
                    } catch (error) {
                        console.error(`Error loading stats for project ${project.id}:`, error);
                        statsMap.set(project.id, {
                            projectId: project.id,
                            pieceCount: 0,
                            materialCount: 0,
                            estimatedArea: 0,
                        });
                    }
                }

                setProjectStats(statsMap);
            } catch (error) {
                console.error('Error loading project statistics:', error);
            } finally {
                setIsLoadingStats(false);
            }
        };

        loadStats();
    }, [projects]);

    const toggleProject = (projectId: number) => {
        if (selectedProjectIds.includes(projectId)) {
            onSelectionChange(selectedProjectIds.filter(id => id !== projectId));
        } else {
            onSelectionChange([...selectedProjectIds, projectId]);
        }
    };

    const toggleAll = () => {
        if (selectedProjectIds.length === projects.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(projects.map(p => p.id));
        }
    };

    // Calculate totals for selected projects
    const totalStats = Array.from(projectStats.values())
        .filter(s => selectedProjectIds.includes(s.projectId))
        .reduce((acc, s) => ({
            pieceCount: acc.pieceCount + s.pieceCount,
            materialCount: Math.max(acc.materialCount, s.materialCount),
            estimatedArea: acc.estimatedArea + s.estimatedArea,
        }), { pieceCount: 0, materialCount: 0, estimatedArea: 0 });

    if (projects.length === 0) {
        return (
            <div className="p-8 text-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <Users className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Aucun projet disponible</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                    Créez d'abord un projet pour commencer l'optimisation
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header with Select All */}
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleAll}
                        className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors"
                        title={selectedProjectIds.length === projects.length ? 'Désélectionner tous' : 'Sélectionner tous'}
                    >
                        {selectedProjectIds.length === projects.length ? (
                            <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        ) : (
                            <Square className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        )}
                    </button>
                    <div>
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                            Sélectionner les projets
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {selectedProjectIds.length}/{projects.length} sélectionné(s)
                        </p>
                    </div>
                </div>

                {isLoadingStats && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <div className="animate-spin">⟳</div>
                        Chargement...
                    </div>
                )}
            </div>

            {/* Projects List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {projects.map((project) => {
                    const isSelected = selectedProjectIds.includes(project.id);
                    const stats = projectStats.get(project.id) || {
                        projectId: project.id,
                        pieceCount: 0,
                        materialCount: 0,
                        estimatedArea: 0,
                    };

                    return (
                        <button
                            key={project.id}
                            onClick={() => toggleProject(project.id)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${isSelected
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    {isSelected ? (
                                        <CheckSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                    ) : (
                                        <Square className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                                    )}
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                                {project.name}
                                            </h4>
                                            {project.client && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                    Client : {project.client.name}
                                                </p>
                                            )}
                                        </div>

                                        {project.status && (
                                            <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${project.status === 'draft'
                                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                : project.status === 'active'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                {project.status.toUpperCase()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    {project.description && (
                                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                            {project.description}
                                        </p>
                                    )}

                                    {/* Statistics Row */}
                                    <div className="flex gap-6 mt-3 text-sm">
                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                            <Package className="h-4 w-4 text-blue-500" />
                                            <span className="font-medium">{stats.pieceCount}</span>
                                            <span className="text-slate-600 dark:text-slate-400">pièces</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                            <AlertCircle className="h-4 w-4 text-orange-500" />
                                            <span className="font-medium">{stats.materialCount}</span>
                                            <span className="text-slate-600 dark:text-slate-400">matériaux</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                            <span className="font-medium">{stats.estimatedArea.toFixed(2)}</span>
                                            <span className="text-slate-600 dark:text-slate-400">m²</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Summary Card */}
            {selectedProjectIds.length > 0 && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-3">
                        Résumé de sélection
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm mt-3">
                        <div>
                            <p className="text-blue-700 dark:text-blue-300 font-medium">{selectedProjectIds.length}</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs">Projets sélectionnés</p>
                        </div>
                        <div>
                            <p className="text-blue-700 dark:text-blue-300 font-medium">{totalStats.pieceCount}</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs">Pièces au total</p>
                        </div>
                        <div>
                            <p className="text-blue-700 dark:text-blue-300 font-medium">{totalStats.estimatedArea.toFixed(2)} m²</p>
                            <p className="text-blue-600 dark:text-blue-400 text-xs">Surface estimée</p>
                        </div>
                    </div>
                    {/* Client display in summary */}
                    {selectedProjectIds.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-blue-200/50 dark:border-blue-900/50">
                            <p className="text-blue-800 dark:text-blue-200 text-xs font-semibold mb-1">Clients associés :</p>
                            <div className="flex flex-wrap gap-2">
                                {Array.from(new Set(
                                    projects
                                        .filter(p => selectedProjectIds.includes(p.id) && p.client)
                                        .map(p => p.client?.name)
                                )).map(clientName => (
                                    <span key={clientName} className="px-2 py-1 bg-white/60 dark:bg-blue-900/40 rounded text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        {clientName}
                                    </span>
                                ))}
                                {projects.filter(p => selectedProjectIds.includes(p.id) && !p.client).length > 0 && (
                                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-500 border border-slate-200 dark:border-slate-700 italic">
                                        Projet(s) sans client
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
