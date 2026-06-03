import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Scissors, ChevronLeft, Calendar, Percent, Package, Eye } from 'lucide-react';
import { optimizationsApi, projectsApi } from '../services/api.ts';
import type { Optimization, Project, Panel, Placement, CuttingPlan } from '../services/api.ts';
import { toast } from 'sonner';

// Helper components for precise dynamic layout without inline styles in JSX
const PanelVisual = ({ panel }: { panel: Panel }) => {
    const ref = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.style.paddingBottom = `${(panel.height / panel.width) * 100}%`;
        }
    }, [panel.height, panel.width]);

    return (
        <div ref={ref} className="panel-visual">
            {panel.placements?.map((p, i) => (
                <PlacementBox key={i} placement={p} panel={panel} />
            ))}
        </div>
    );
};

const PlacementBox = ({ placement, panel }: { placement: Placement; panel: Panel }) => {
    const ref = useRef<HTMLDivElement>(null);
    const scaleX = 100 / panel.width;
    const scaleY = 100 / panel.height;

    useLayoutEffect(() => {
        if (ref.current) {
            ref.current.style.left = `${placement.x * scaleX}%`;
            ref.current.style.top = `${placement.y * scaleY}%`;
            ref.current.style.width = `${placement.width * scaleX}%`;
            ref.current.style.height = `${placement.height * scaleY}%`;
        }
    }, [placement, scaleX, scaleY]);

    return (
        <div ref={ref} className="panel-placement" title={placement.piece_name}>
            <span className="placement-label">{placement.piece_name}</span>
        </div>
    );
};

export function OptimizationsPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [optimizations, setOptimizations] = useState<Optimization[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOpt, setSelectedOpt] = useState<Optimization | null>(null);

    useEffect(() => {
        if (projectId) {
            loadProjectOptimizations(parseInt(projectId));
        } else {
            loadAllOptimizations();
        }
    }, [projectId]);

    const loadProjectOptimizations = async (id: number) => {
        try {
            const [optRes, projRes] = await Promise.all([
                optimizationsApi.getByProject(id),
                projectsApi.getById(id)
            ]);
            setOptimizations(optRes.data);
            setProject(projRes.data);
        } catch {
            toast.error('Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const loadAllOptimizations = async () => {
        try {
            // For now, show a message to select a project
            setLoading(false);
        } catch {
            toast.error('Erreur de chargement');
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const viewCuttingPlan = (opt: Optimization) => {
        setSelectedOpt(opt);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    // Full screen cutting plan viewer
    if (selectedOpt) {
        let planData: CuttingPlan | null = null;
        try {
            planData = JSON.parse(selectedOpt.result_data) as CuttingPlan;
        } catch {
            planData = null;
        }

        return (
            <div className="flex-column-full">
                <header className="page-header header-content">
                    <button
                        onClick={() => setSelectedOpt(null)}
                        className="btn-ghost"
                        aria-label="Retour"
                        title="Retour"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h1 className="header-title-sm">
                        Plan de découpe
                    </h1>
                </header>

                <div className="cutting-plan-viewer">
                    {planData?.panels?.map((panel: Panel, index: number) => (
                        <div key={index} className="card mb-4">
                            <div className="flex-between mb-3">
                                <span className="fw-600">
                                    Panneau {index + 1}
                                </span>
                                <span className="text-muted">
                                    {panel.width} x {panel.height} mm
                                </span>
                            </div>

                            {/* Visual representation of the panel */}
                            <PanelVisual panel={panel} />

                            {/* Pieces list */}
                            <div className="mt-3">
                                <div className="section-label">
                                    Pièces sur ce panneau:
                                </div>
                                {panel.placements?.map((placement: Placement, pIndex: number) => (
                                    <div key={pIndex} className="list-row">
                                        <span>{placement.piece_name}</span>
                                        <span className="text-muted">
                                            {placement.width} x {placement.height}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div>
            <header className="page-header">
                <div className="flex-center-gap">
                    {projectId && (
                        <button
                            onClick={() => navigate('/')}
                            className="btn-ghost"
                            aria-label="Retour aux projets"
                            title="Retour aux projets"
                        >
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <h1 className="page-title">
                        <Scissors />
                        {project ? project.name : 'Optimisations'}
                    </h1>
                </div>
            </header>

            <div className="card-list">
                {!projectId ? (
                    <div className="empty-state">
                        <Scissors />
                        <p>Sélectionnez un projet pour voir ses optimisations</p>
                        <button
                            className="btn btn-primary mt-4"
                            onClick={() => navigate('/')}
                        >
                            Voir les projets
                        </button>
                    </div>
                ) : optimizations.length === 0 ? (
                    <div className="empty-state">
                        <Scissors />
                        <p>Aucune optimisation pour ce projet</p>
                    </div>
                ) : (
                    optimizations.map((opt) => (
                        <div
                            key={opt.id}
                            className="list-item"
                            onClick={() => viewCuttingPlan(opt)}
                        >
                            <div className="list-item-icon">
                                <Scissors size={24} />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">
                                    Optimisation #{opt.id}
                                </div>
                                <div className="list-item-subtitle flex-wrap-gap">
                                    <span className="flex-center-gap-sm">
                                        <Calendar size={14} />
                                        {formatDate(opt.created_at)}
                                    </span>
                                    <span className="flex-center-gap-sm">
                                        <Package size={14} />
                                        {opt.total_panels_used} panneaux
                                    </span>
                                    <span className="flex-center-gap-sm">
                                        <Percent size={14} />
                                        {opt.waste_percentage.toFixed(1)}% chute
                                    </span>
                                </div>
                            </div>
                            <Eye size={20} className="text-muted" />
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
