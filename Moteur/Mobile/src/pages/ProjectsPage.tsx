import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Search, AlertCircle } from 'lucide-react';
import { projectsApi } from '../services/api.ts';
import type { Project } from '../services/api.ts';
import { toast } from 'sonner';

export function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (search.trim()) {
            const filtered = projects.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.client?.name.toLowerCase().includes(search.toLowerCase())
            );
            setFilteredProjects(filtered);
        } else {
            setFilteredProjects(projects);
        }
    }, [search, projects]);

    const loadProjects = async () => {
        try {
            const response = await projectsApi.getAll();
            setProjects(response.data);
            setFilteredProjects(response.data);
        } catch {
            toast.error('Erreur de chargement des projets');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const labels: Record<string, string> = {
            'draft': 'Brouillon',
            'validated': 'Validé',
            'in_progress': 'En cours',
            'done': 'Terminé'
        };
        return labels[status] || status;
    };

    const handleProjectClick = (project: Project) => {
        navigate(`/optimizations/${project.id}`);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">
                    <FolderOpen />
                    Projets
                </h1>
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher un projet ou client..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="card-list">
                {filteredProjects.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle />
                        <p>Aucun projet trouvé</p>
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="list-item"
                            onClick={() => handleProjectClick(project)}
                        >
                            <div className="list-item-icon">
                                <FolderOpen size={24} />
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">{project.name}</div>
                                <div className="list-item-subtitle">
                                    {project.client?.name || 'Sans client'}
                                </div>
                            </div>
                            <span className={`list-item-badge badge-${project.status}`}>
                                {getStatusBadge(project.status)}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
