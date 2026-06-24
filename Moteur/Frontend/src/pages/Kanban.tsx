import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    Circle,
    Clock,
    MoreVertical,
    Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProjectService } from '../services/projectService';
import type { Project } from '../services/projectService';
import { toast } from 'sonner';

const COLUMNS = [
    { id: 'draft', title: 'Brouillon', icon: Circle, color: 'text-slate-500', bg: 'bg-theme-bg-card' },
    { id: 'validated', title: 'Validé', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-900/20' },
    { id: 'in_progress', title: 'En cours', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/20' },
    { id: 'done', title: 'Terminé', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/20' }
];

export function Kanban() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await ProjectService.getAll();
            setProjects(data);
        } catch (error) {
            toast.error("Erreur lors du chargement des projets");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (e: React.DragEvent, projectId: number) => {
        setDraggingId(projectId);
        e.dataTransfer.effectAllowed = 'move';
        // Transparent drag image or default
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        if (draggingId === null) return;

        const projectToMove = projects.find(p => p.id === draggingId);
        if (!projectToMove || projectToMove.status === status) {
            setDraggingId(null);
            return;
        }

        // Optimistic update
        const previousProjects = [...projects];
        setProjects(prev => prev.map(p =>
            p.id === draggingId ? { ...p, status } : p
        ));

        try {
            await ProjectService.updateStatus(draggingId, status);
            toast.success("Statut mis à jour");
        } catch (error) {
            // Revert on error
            setProjects(previousProjects);
            toast.error("Impossible de mettre à jour le statut");
            console.error(error);
        } finally {
            setDraggingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="page-title">Tableau Kanban</h1>
                <Link to="/projects" state={{ action: 'new' }} className="btn-primary flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nouveau Projet
                </Link>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full gap-4 min-w-[1000px] pb-4">
                    {COLUMNS.map(column => {
                        const columnProjects = projects.filter(p => (p.status || 'draft') === column.id);
                        const ColumnIcon = column.icon;

                        return (
                            <div
                                key={column.id}
                                className={`flex-1 flex flex-col rounded-xl border border-theme-primary/20 ${column.bg}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, column.id)}
                            >
                                {/* Column Header */}
                                <div className="p-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ColumnIcon className={`h-5 w-5 ${column.color}`} />
                                        <h3 className="font-semibold">{column.title}</h3>
                                        <span className="px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-xs font-medium">
                                            {columnProjects.length}
                                        </span>
                                    </div>
                                </div>

                                {/* Column Content */}
                                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                    {columnProjects.map(project => (
                                        <div
                                            key={project.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, project.id)}
                                            className={`
                                                bg-theme-bg-main text-theme-text-main p-4 rounded-lg shadow-sm border border-theme-primary/20
                                                cursor-move hover:shadow-md transition-all
                                                ${draggingId === project.id ? 'opacity-50' : ''}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-medium line-clamp-2">{project.name}</h4>
                                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" title="Actions" aria-label="Actions">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </div>

                                            <p className="text-xs text-theme-text-muted mb-3 line-clamp-2">
                                                {project.description || "Pas de description"}
                                            </p>

                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    {project.created_at ? new Date(project.created_at).toLocaleDateString() : '-'}
                                                </div>
                                                {project.client_id && (
                                                    <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                                        Client #{project.client_id}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {columnProjects.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                                            Déposer ici
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
