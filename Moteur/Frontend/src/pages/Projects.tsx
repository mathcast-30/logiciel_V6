import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Plus, Trash2, ChevronDown, ChevronRight, FolderKanban,
    Package, Edit3, Upload, QrCode, Search, FileText, Tag,
    Wand2, Loader2, Download, FolderOpen
} from 'lucide-react';
import { AIService } from '../services/aiService';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { type Project, type Part, ProjectService } from '../services/projectService';
import { type Material, type EdgeBand, MaterialService } from '../services/materialService';
import { ExportService } from '../services/exportService';
import { ProjectClientLinker } from '../components/Projects/ProjectClientLinker';

export function Projects() {
    const location = useLocation();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [edgeBands, setEdgeBands] = useState<EdgeBand[]>([]);
    const [expandedProject, setExpandedProject] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modals
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [isPartModalOpen, setIsPartModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFormats, setExportFormats] = useState({ pdf: true, excel: true });
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [editingPart, setEditingPart] = useState<Part | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const sketchInputRef = useRef<HTMLInputElement>(null);

    // File input ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Form states
    const [projectForm, setProjectForm] = useState({ name: '', description: '', client_id: undefined as number | undefined });
    const [partForm, setPartForm] = useState({
        name: '', width: 600, height: 400, quantity: 1,
        material_id: undefined as number | undefined, allow_rotation: true, notes: '',
        edge_top_id: null as number | null,
        edge_bottom_id: null as number | null,
        edge_left_id: null as number | null,
        edge_right_id: null as number | null,
        grain_direction: 0
    });

    // Inline Editing State
    const [editingCell, setEditingCell] = useState<{ id: number; field: 'name' | 'width' | 'height' | 'quantity' } | null>(null);
    const [tempValue, setTempValue] = useState<string | number>('');

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    useEffect(() => {
        loadProjects();
        loadMaterials();
        loadEdgeBands();
    }, []);

    useEffect(() => {
        const state = location.state as { clientId?: number, action?: string } | null;
        if (state?.action === 'new' && state?.clientId) {
            setProjectForm(prev => ({ ...prev, client_id: state.clientId }));
            setIsProjectModalOpen(true);
            // Clear state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const loadProjects = async () => {
        try {
            const data = await ProjectService.getAll();
            setProjects(data);
        } catch {
            console.error('Error loading projects');
        } finally {
            setIsLoading(false);
        }
    };

    const loadEdgeBands = async () => {
        try {
            const data = await MaterialService.getEdgeBands();
            setEdgeBands(data);
        } catch {
            console.error('Error loading edge bands');
        }
    };

    const loadMaterials = async () => {
        try {
            const data = await MaterialService.getAll();
            setMaterials(data);
        } catch {
            console.error('Error loading materials');
        }
    };

    const toggleProject = (id: number) => {
        setExpandedProject(expandedProject === id ? null : id);
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ProjectService.create(projectForm);
            setIsProjectModalOpen(false);
            setProjectForm({ name: '', description: '', client_id: undefined });
            loadProjects();
            toast.success('Projet créé avec succès');
        } catch {
            toast.error('Erreur lors de la création du projet');
        }
    };

    const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        const toastId = toast.loading("L'IA analyse votre croquis...");

        try {
            // Convert to base64
            const reader = new FileReader();
            const base64Promise = new Promise<string>((resolve) => {
                reader.onload = () => {
                    const base64 = (reader.result as string).split(',')[1];
                    resolve(base64);
                };
            });
            reader.readAsDataURL(file);
            const base64Image = await base64Promise;

            // Analyze
            const result = await AIService.analyzeSketch(base64Image);

            if (result.error) throw new Error(result.error);
            if (!result.parts || result.parts.length === 0) throw new Error("Aucune pièce détectée");

            // 1. Create Project
            const project = await ProjectService.create({
                name: result.project_name || "Projet Scan IA",
                description: "Généré automatiquement par reconnaissance de croquis."
            });

            // 2. Add Parts
            // We'll use the first material found or a default one if none exists
            const defaultMat = materials.length > 0 ? materials[0].id : 1;

            toast.loading(`Création de ${result.parts.length} pièces...`, { id: toastId });

            for (const part of result.parts) {
                await ProjectService.addPart(project.id, {
                    name: part.name,
                    width: part.width,
                    height: part.height,
                    quantity: part.quantity,
                    material_id: defaultMat, // Matching with project's inventory is complex, we start with default
                    allow_rotation: true,
                    grain_direction: 0
                });
            }

            toast.success("Succès ! Projet et pièces créés.", { id: toastId });
            setIsProjectModalOpen(false);
            loadProjects();
            setExpandedProject(project.id);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "L'IA n'a pas pu traiter l'image";
            console.error(error);
            toast.error(`Erreur d'analyse : ${errorMessage}`, { id: toastId });
        } finally {
            setIsAnalyzing(false);
            if (sketchInputRef.current) sketchInputRef.current.value = '';
        }
    };

    const handleDeleteProject = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer le projet',
            message: 'Voulez-vous vraiment supprimer ce projet et toutes ses pièces ? Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await ProjectService.delete(id);
                    loadProjects();
                    toast.success('Projet supprimé');
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const openPartModal = (projectId: number, part?: Part) => {
        setSelectedProjectId(projectId);
        if (part) {
            setEditingPart(part);
            setPartForm({
                name: part.name,
                width: part.width,
                height: part.height,
                quantity: part.quantity,
                material_id: part.material_id,
                allow_rotation: part.allow_rotation,
                notes: part.notes || '',
                edge_top_id: part.edge_top_id || null,
                edge_bottom_id: part.edge_bottom_id || null,
                edge_left_id: part.edge_left_id || null,
                edge_right_id: part.edge_right_id || null,
                grain_direction: part.grain_direction || 0
            });
        } else {
            setEditingPart(null);
            setPartForm({
                name: '', width: 600, height: 400, quantity: 1,
                material_id: materials.length > 0 ? materials[0].id : undefined,
                allow_rotation: true, notes: '',
                edge_top_id: null,
                edge_bottom_id: null,
                edge_left_id: null,
                edge_right_id: null,
                grain_direction: 0
            });
        }
        setIsPartModalOpen(true);
    };

    const handleSubmitPart = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId || !partForm.material_id) {
            toast.error('Veuillez sélectionner un matériau');
            return;
        }

        try {
            if (editingPart) {
                await ProjectService.updatePart(editingPart.id, {
                    ...partForm,
                    material_id: partForm.material_id
                });
                toast.success('Pièce modifiée');
            } else {
                await ProjectService.addPart(selectedProjectId, {
                    ...partForm,
                    material_id: partForm.material_id
                });
                toast.success('Pièce ajoutée');
            }
            setIsPartModalOpen(false);
            loadProjects();
        } catch {
            toast.error('Erreur lors de l\'enregistrement de la pièce');
        }
    };

    const handleDeletePart = (partId: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer la pièce',
            message: 'Voulez-vous vraiment supprimer cette pièce ?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await ProjectService.deletePart(partId);
                    loadProjects();
                    toast.success('Pièce supprimée');
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const openImportModal = (projectId: number) => {
        setSelectedProjectId(projectId);
        setIsImportModalOpen(true);
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedProjectId || !e.target.files?.[0]) return;
        const file = e.target.files[0];
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

        try {
            if (isExcel) {
                await ExportService.importExcel(selectedProjectId, file);
            } else {
                await ExportService.importCSV(selectedProjectId, file);
            }
            toast.success('Import réussi !');
            setIsImportModalOpen(false);
            loadProjects();
        } catch {
            toast.error('Erreur lors de l\'import');
        }
    };

    const handleGenerateLabels = async (projectId: number) => {
        try {
            const result = await ExportService.generateLabels(projectId);
            toast.success(`${result.total_labels} étiquettes générées !`);
        } catch {
            toast.error('Erreur lors de la génération des étiquettes');
        }
    };

    const openExportModal = (projectId: number) => {
        setSelectedProjectId(projectId);
        setIsExportModalOpen(true);
    };

    const handleExportProject = async () => {
        if (!selectedProjectId) return;

        const formats = [];
        if (exportFormats.pdf) formats.push('pdf');
        if (exportFormats.excel) formats.push('excel');

        if (formats.length === 0) {
            toast.error('Veuillez sélectionner au moins un format.');
            return;
        }

        const toastId = toast.loading('Génération en cours...');
        try {
            const result = await ExportService.exportProject(selectedProjectId, formats);
            if (result.success && result.files) {
                // Trigger downloads
                Object.values(result.files).forEach(filePath => {
                    const dlUrl = ExportService.download(filePath as string);
                    window.open(dlUrl, '_blank');
                });
                toast.success('Génération réussie !', { id: toastId });
                setIsExportModalOpen(false);
            } else {
                toast.error('Erreur lors de la génération.', { id: toastId });
            }
        } catch {
            toast.error('Erreur lors de la génération.', { id: toastId });
        }
    };

    const handleOpenFolder = async (projectId: number) => {
        try {
            await ProjectService.openFolder(projectId);
            toast.success("Ouverture du dossier...");
        } catch {
            toast.error("Impossible d'ouvrir le dossier");
        }
    };

    const getProjectPartCount = (project: Project) => {
        return project.parts?.length || 0;
    };



    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSavePartField = async (part: Part, field: 'name' | 'width' | 'height' | 'quantity') => {
        let value = tempValue;

        if (field === 'name') {
            value = (value as string).trim();
            if (!value || value === part.name) {
                setEditingCell(null);
                return;
            }
        } else {
            const numValue = typeof value === 'string' ? parseInt(value) : value;
            if (isNaN(numValue) || numValue === part[field as 'width' | 'height' | 'quantity']) {
                setEditingCell(null);
                return;
            }
            if (numValue <= 0) {
                toast.error('La valeur doit être supérieure à 0');
                setEditingCell(null);
                return;
            }
            value = numValue;
        }

        try {
            await ProjectService.updatePart(part.id, {
                ...part,
                [field]: value
            });
            toast.success('Mise à jour réussie');
            loadProjects();
        } catch {
            toast.error('Erreur lors de la mise à jour');
        } finally {
            setEditingCell(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <FolderKanban className="h-8 w-8 text-purple-500" />
                        Projets
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        {projects.length} projets • Gérez vos listes de pièces
                    </p>
                </div>
                <button
                    onClick={() => setIsProjectModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Nouveau Projet
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher un projet..."
                    className="input-field pl-12"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Projects List */}
            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2].map(i => (
                        <div key={i} className="card p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-200 rounded-xl" />
                                <div className="flex-1">
                                    <div className="h-5 bg-slate-200 rounded w-1/3 mb-2" />
                                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="card">
                    <div className="empty-state py-16">
                        <FolderKanban className="empty-state-icon" />
                        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">
                            {searchTerm ? 'Aucun résultat' : 'Aucun projet'}
                        </h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            {searchTerm ? 'Essayez avec d\'autres termes' : 'Commencez par créer un projet'}
                        </p>
                        {!searchTerm && (
                            <button onClick={() => setIsProjectModalOpen(true)} className="btn-primary">
                                <Plus className="h-4 w-4 mr-2" />
                                Créer un projet
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            className="card overflow-hidden animate-fade-in-up stagger-item"
                        >
                            {/* Project Header */}
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                                onClick={() => toggleProject(project.id)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`
                                        w-12 h-12 rounded-xl flex items-center justify-center transition-all
                                        ${expandedProject === project.id
                                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/30'
                                            : 'bg-purple-100 text-purple-600'
                                        }
                                    `}>
                                        {expandedProject === project.id
                                            ? <ChevronDown className="h-5 w-5" />
                                            : <ChevronRight className="h-5 w-5" />
                                        }
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{project.name}</h3>
                                            <ProjectClientLinker
                                                project={project}
                                                onClientChanged={() => loadProjects()}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            <span>{getProjectPartCount(project)} pièces</span>
                                            {project.description && <span>• {project.description}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate('/quotes', {
                                                state: {
                                                    projectId: project.id,
                                                    clientId: project.client_id,
                                                    projectName: project.name
                                                }
                                            });
                                        }}
                                        className="btn-primary !py-2 !px-3 bg-violet-600 hover:bg-violet-700"
                                        title="Créer un devis"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openPartModal(project.id); }}
                                        className="btn-primary !py-2 !px-3"
                                        title="Ajouter une pièce"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openImportModal(project.id); }}
                                        className="btn-success !py-2 !px-3"
                                        title="Import CSV/Excel"
                                    >
                                        <Upload className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenFolder(project.id); }}
                                        className="btn-primary !py-2 !px-3 bg-teal-600 hover:bg-teal-700"
                                        title="Ouvrir le dossier du projet"
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); openExportModal(project.id); }}
                                        className="btn-primary !py-2 !px-3 bg-blue-600 hover:bg-blue-700"
                                        title="Exporter Fiche de Débit"
                                    >
                                        <Download className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleGenerateLabels(project.id); }}
                                        className="btn-warning !py-2 !px-3"
                                        title="Générer QR codes"
                                    >
                                        <QrCode className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                        title="Supprimer le projet"
                                        aria-label="Supprimer le projet"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Parts Table */}
                            {expandedProject === project.id && (
                                <div className="border-t dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30 p-5 animate-fade-in-down">
                                    {!project.parts || project.parts.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            <p className="text-slate-500 dark:text-slate-400">Aucune pièce dans ce projet</p>
                                            <button
                                                onClick={() => openPartModal(project.id)}
                                                className="btn-primary mt-3"
                                            >
                                                <Plus className="h-4 w-4 mr-2" />
                                                Ajouter une pièce
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full table-modern">
                                                <thead>
                                                    <tr>
                                                        <th>Nom</th>
                                                        <th>Long (mm)</th>
                                                        <th>Larg (mm)</th>
                                                        <th>T (mm)</th>
                                                        <th>Matériau</th>
                                                        <th>Qté</th>
                                                        <th>Chants</th>
                                                        <th>Rotation</th>
                                                        <th></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {project.parts.map(part => {
                                                        const mat = materials.find(m => m.id === part.material_id);
                                                        return (
                                                            <tr key={part.id}>
                                                                <td className="font-medium dark:text-slate-200">
                                                                    {editingCell?.id === part.id && editingCell?.field === 'name' ? (
                                                                        <input
                                                                            title="Nouveau nom de la pièce"
                                                                            type="text"
                                                                            autoFocus
                                                                            className="input-field !py-1 !px-2 !text-sm w-full min-w-[120px]"
                                                                            value={tempValue}
                                                                            onChange={(e) => setTempValue(e.target.value)}
                                                                            onBlur={() => handleSavePartField(part, 'name')}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSavePartField(part, 'name');
                                                                                if (e.key === 'Escape') setEditingCell(null);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="cursor-pointer hover:text-blue-500 transition-colors flex items-center gap-2 group"
                                                                            onClick={() => {
                                                                                setEditingCell({ id: part.id, field: 'name' });
                                                                                setTempValue(part.name);
                                                                            }}
                                                                        >
                                                                            {part.name}
                                                                            <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="dark:text-slate-300 font-mono">
                                                                    {editingCell?.id === part.id && editingCell?.field === 'height' ? (
                                                                        <input
                                                                            title="Nouvelle longueur"
                                                                            type="number"
                                                                            autoFocus
                                                                            className="input-field !py-1 !px-2 !text-sm w-20"
                                                                            value={tempValue}
                                                                            onChange={(e) => setTempValue(e.target.value)}
                                                                            onBlur={() => handleSavePartField(part, 'height')}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSavePartField(part, 'height');
                                                                                if (e.key === 'Escape') setEditingCell(null);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="cursor-pointer hover:text-blue-500 transition-colors"
                                                                            onClick={() => {
                                                                                setEditingCell({ id: part.id, field: 'height' });
                                                                                setTempValue(part.height);
                                                                            }}
                                                                        >
                                                                            {part.height}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="dark:text-slate-300 font-mono">
                                                                    {editingCell?.id === part.id && editingCell?.field === 'width' ? (
                                                                        <input
                                                                            title="Nouvelle largeur"
                                                                            type="number"
                                                                            autoFocus
                                                                            className="input-field !py-1 !px-2 !text-sm w-20"
                                                                            value={tempValue}
                                                                            onChange={(e) => setTempValue(e.target.value)}
                                                                            onBlur={() => handleSavePartField(part, 'width')}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSavePartField(part, 'width');
                                                                                if (e.key === 'Escape') setEditingCell(null);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="cursor-pointer hover:text-blue-500 transition-colors"
                                                                            onClick={() => {
                                                                                setEditingCell({ id: part.id, field: 'width' });
                                                                                setTempValue(part.width);
                                                                            }}
                                                                        >
                                                                            {part.width}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="dark:text-slate-300 font-mono">{mat?.thickness || '—'}</td>
                                                                <td>
                                                                    <select
                                                                        value={part.material_id || ''}
                                                                        onChange={async (e) => {
                                                                            const newMaterialId = parseInt(e.target.value);
                                                                            try {
                                                                                await ProjectService.updatePart(part.id, {
                                                                                    ...part,
                                                                                    material_id: newMaterialId
                                                                                });
                                                                                toast.success('Matériau mis à jour');
                                                                                loadProjects();
                                                                            } catch {
                                                                                toast.error('Erreur lors de la mise à jour');
                                                                            }
                                                                        }}
                                                                        className="input-field !py-1 !text-sm min-w-[140px]"
                                                                        title="Changer le matériau"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <option value="">-- Aucun --</option>
                                                                        {materials.map(m => (
                                                                            <option key={m.id} value={m.id}>
                                                                                {m.name} ({m.thickness}mm)
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </td>
                                                                <td className="font-semibold dark:text-slate-200">
                                                                    {editingCell?.id === part.id && editingCell?.field === 'quantity' ? (
                                                                        <input
                                                                            title="Nouvelle quantité"
                                                                            type="number"
                                                                            autoFocus
                                                                            className="input-field !py-1 !px-2 !text-sm w-16"
                                                                            value={tempValue}
                                                                            onChange={(e) => setTempValue(e.target.value)}
                                                                            onBlur={() => handleSavePartField(part, 'quantity')}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSavePartField(part, 'quantity');
                                                                                if (e.key === 'Escape') setEditingCell(null);
                                                                            }}
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="cursor-pointer hover:text-blue-500 transition-colors"
                                                                            onClick={() => {
                                                                                setEditingCell({ id: part.id, field: 'quantity' });
                                                                                setTempValue(part.quantity);
                                                                            }}
                                                                        >
                                                                            {part.quantity}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="dark:text-slate-300">
                                                                    <div className="flex gap-1">
                                                                        {part.edge_top_id && <span className="w-2 h-2 rounded-full bg-amber-500" title="Haut" />}
                                                                        {part.edge_bottom_id && <span className="w-2 h-2 rounded-full bg-amber-500" title="Bas" />}
                                                                        {part.edge_left_id && <span className="w-2 h-2 rounded-full bg-amber-500" title="Gauche" />}
                                                                        {part.edge_right_id && <span className="w-2 h-2 rounded-full bg-amber-500" title="Droite" />}
                                                                        {!(part.edge_top_id || part.edge_bottom_id || part.edge_left_id || part.edge_right_id) && '—'}
                                                                    </div>
                                                                </td>
                                                                <td className="dark:text-slate-300">
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{part.allow_rotation ? '✓' : '✗'}</span>
                                                                        {part.grain_direction > 0 && (
                                                                            <Tag className={`h-3 w-3 text-amber-500 ${part.grain_direction === 2 ? 'rotate-90' : ''}`} />
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={() => openPartModal(project.id, part)}
                                                                            className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                                            title="Modifier la pièce"
                                                                            aria-label="Modifier la pièce"
                                                                        >
                                                                            <Edit3 className="h-4 w-4" />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeletePart(part.id)}
                                                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                                            title="Supprimer la pièce"
                                                                            aria-label="Supprimer la pièce"
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
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Project Modal */}
            {
                isProjectModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header flex justify-between items-center">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nouveau Projet</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        title="Scanner un croquis avec l'IA"
                                        type="button"
                                        onClick={() => sketchInputRef.current?.click()}
                                        disabled={isAnalyzing}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-100 dark:border-indigo-800/50 hover:bg-indigo-100 transition-all font-bold text-xs"
                                    >
                                        {isAnalyzing ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Wand2 className="h-3 w-3" />
                                        )}
                                        IA SCAN CROQUIS
                                    </button>
                                    <button
                                        onClick={() => setIsProjectModalOpen(false)}
                                        className="p-1 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                                    >
                                        X
                                    </button>
                                </div>
                                <input
                                    ref={sketchInputRef}
                                    type="file"
                                    accept="image/*"
                                    title="Fichier image du croquis"
                                    className="hidden"
                                    onChange={handleSketchUpload}
                                />
                            </div>
                            <form onSubmit={handleCreateProject}>
                                <div className="modal-body space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nom *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ex: Cuisine Martin"
                                            className="input-field"
                                            value={projectForm.name}
                                            onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                        <textarea
                                            rows={2}
                                            placeholder="Description optionnelle..."
                                            className="input-field resize-none"
                                            value={projectForm.description}
                                            onChange={e => setProjectForm({ ...projectForm, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="modal-footer flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsProjectModalOpen(false)} className="btn-secondary">Annuler</button>
                                    <button type="submit" className="btn-primary">Créer</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Part Modal */}
            {
                isPartModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsPartModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="text-xl font-bold text-slate-800">
                                    {editingPart ? 'Modifier la pièce' : 'Nouvelle Pièce'}
                                </h2>
                            </div>
                            <form onSubmit={handleSubmitPart}>
                                <div className="modal-body space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="ex: Tablette haute"
                                            className="input-field"
                                            value={partForm.name}
                                            onChange={e => setPartForm({ ...partForm, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label htmlFor="part-width" className="block text-sm font-medium text-slate-700 mb-1">Largeur (mm)</label>
                                            <input
                                                id="part-width"
                                                type="number"
                                                required
                                                min="1"
                                                title="Largeur en mm"
                                                placeholder="500"
                                                className="input-field"
                                                value={partForm.width}
                                                onChange={e => setPartForm({ ...partForm, width: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="part-height" className="block text-sm font-medium text-slate-700 mb-1">Hauteur (mm)</label>
                                            <input
                                                id="part-height"
                                                type="number"
                                                required
                                                min="1"
                                                title="Hauteur en mm"
                                                placeholder="300"
                                                className="input-field"
                                                value={partForm.height}
                                                onChange={e => setPartForm({ ...partForm, height: parseInt(e.target.value) })}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="part-quantity" className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                                            <input
                                                id="part-quantity"
                                                type="number"
                                                required
                                                min="1"
                                                title="Quantité"
                                                placeholder="1"
                                                className="input-field"
                                                value={partForm.quantity}
                                                onChange={e => setPartForm({ ...partForm, quantity: parseInt(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="part-material" className="block text-sm font-medium text-slate-700 mb-1">Matériau *</label>
                                        <select
                                            id="part-material"
                                            title="Sélectionner un matériau"
                                            className="input-field"
                                            required
                                            value={partForm.material_id || ''}
                                            onChange={e => setPartForm({ ...partForm, material_id: parseInt(e.target.value) })}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.thickness}mm)</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                id="rotation"
                                                className="h-5 w-5 text-purple-600 rounded border-slate-300"
                                                checked={partForm.allow_rotation}
                                                onChange={e => setPartForm({ ...partForm, allow_rotation: e.target.checked })}
                                            />
                                            <label htmlFor="rotation" className="text-sm text-slate-700">
                                                Autoriser la rotation
                                            </label>
                                        </div>
                                        <div className="flex flex-col">
                                            <label htmlFor="part-grain" className="text-xs font-bold text-slate-500 uppercase">Sens du fil</label>
                                            <select
                                                id="part-grain"
                                                className="input-field !py-1 text-sm mt-1"
                                                value={partForm.grain_direction}
                                                onChange={e => setPartForm({ ...partForm, grain_direction: parseInt(e.target.value) })}
                                            >
                                                <option value={0}>Indifférent</option>
                                                <option value={1}>Horizontal</option>
                                                <option value={2}>Vertical</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Edge Banding Selector */}
                                    {materials.find(m => m.id === partForm.material_id)?.is_panel && (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                                            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-amber-500" />
                                                Placage des chants (Face vue de dessus)
                                            </h3>
                                            <div className="flex flex-col items-center gap-4">
                                                {/* Top Edge */}
                                                <div className="w-full max-w-[200px]">
                                                    <select
                                                        title="Chant Haut"
                                                        className="input-field text-xs py-1"
                                                        value={partForm.edge_top_id || ''}
                                                        onChange={e => setPartForm({ ...partForm, edge_top_id: e.target.value ? parseInt(e.target.value) : null })}
                                                    >
                                                        <option value="">Côté Haut (Libre)</option>
                                                        {edgeBands.map(eb => <option key={eb.id} value={eb.id}>{eb.name} ({eb.thickness}mm)</option>)}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-4 w-full justify-center">
                                                    {/* Left Edge */}
                                                    <div className="w-32">
                                                        <select
                                                            title="Chant Gauche"
                                                            className="input-field text-xs py-1"
                                                            value={partForm.edge_left_id || ''}
                                                            onChange={e => setPartForm({ ...partForm, edge_left_id: e.target.value ? parseInt(e.target.value) : null })}
                                                        >
                                                            <option value="">Gauche</option>
                                                            {edgeBands.map(eb => <option key={eb.id} value={eb.id}>{eb.name}</option>)}
                                                        </select>
                                                    </div>

                                                    {/* Visual Box Representation */}
                                                    <div className="w-24 h-16 border-2 border-slate-300 dark:border-slate-600 rounded flex items-center justify-center bg-white dark:bg-slate-900 relative">
                                                        <div className={`absolute top-0 left-0 right-0 h-1 ${partForm.edge_top_id ? 'bg-amber-500' : 'bg-transparent'}`} />
                                                        <div className={`absolute bottom-0 left-0 right-0 h-1 ${partForm.edge_bottom_id ? 'bg-amber-500' : 'bg-transparent'}`} />
                                                        <div className={`absolute top-0 bottom-0 left-0 w-1 ${partForm.edge_left_id ? 'bg-amber-500' : 'bg-transparent'}`} />
                                                        <div className={`absolute top-0 bottom-0 right-0 w-1 ${partForm.edge_right_id ? 'bg-amber-500' : 'bg-transparent'}`} />
                                                        {partForm.grain_direction > 0 && (
                                                            <div className={`absolute inset-2 border border-dashed border-amber-300 flex items-center justify-center opacity-40`}>
                                                                <div className={`w-full h-px bg-amber-400 ${partForm.grain_direction === 2 ? 'rotate-90' : ''}`} />
                                                            </div>
                                                        )}
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest relative z-10">Pièce</span>
                                                    </div>

                                                    {/* Right Edge */}
                                                    <div className="w-32">
                                                        <select
                                                            title="Chant Droit"
                                                            className="input-field text-xs py-1"
                                                            value={partForm.edge_right_id || ''}
                                                            onChange={e => setPartForm({ ...partForm, edge_right_id: e.target.value ? parseInt(e.target.value) : null })}
                                                        >
                                                            <option value="">Droite</option>
                                                            {edgeBands.map(eb => <option key={eb.id} value={eb.id}>{eb.name}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* Bottom Edge */}
                                                <div className="w-full max-w-[200px]">
                                                    <select
                                                        title="Chant Bas"
                                                        className="input-field text-xs py-1"
                                                        value={partForm.edge_bottom_id || ''}
                                                        onChange={e => setPartForm({ ...partForm, edge_bottom_id: e.target.value ? parseInt(e.target.value) : null })}
                                                    >
                                                        <option value="">Côté Bas (Libre)</option>
                                                        {edgeBands.map(eb => <option key={eb.id} value={eb.id}>{eb.name} ({eb.thickness}mm)</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer flex justify-end gap-3">
                                    <button type="button" onClick={() => setIsPartModalOpen(false)} className="btn-secondary">Annuler</button>
                                    <button type="submit" className="btn-primary">
                                        {editingPart ? 'Enregistrer' : 'Ajouter'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Import Modal */}
            {
                isImportModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsImportModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="text-xl font-bold text-slate-800">Import CSV / Excel</h2>
                            </div>
                            <div className="modal-body">
                                <div
                                    className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-purple-400 hover:bg-purple-50/50 transition-all cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                                    <p className="text-slate-600 font-medium mb-1">
                                        Cliquez pour sélectionner un fichier
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        Formats acceptés : .csv, .xlsx, .xls
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        id="import-file"
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        title="Sélectionner un fichier CSV ou Excel"
                                        className="hidden"
                                        onChange={handleFileImport}
                                    />
                                </div>
                                <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                                    <p className="text-sm text-blue-700">
                                        <strong>Format attendu :</strong> nom, largeur, hauteur, quantité, matériau
                                    </p>
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end">
                                <button onClick={() => setIsImportModalOpen(false)} className="btn-secondary">Fermer</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Export Modal */}
            {
                isExportModalOpen && (
                    <div className="modal-overlay" onClick={() => setIsExportModalOpen(false)}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="text-xl font-bold text-slate-800">Exporter Fiche de Débit</h2>
                            </div>
                            <div className="modal-body space-y-4">
                                <p className="text-slate-600">Choisissez les formats à exporter pour ce projet :</p>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={exportFormats.pdf}
                                            onChange={e => setExportFormats({ ...exportFormats, pdf: e.target.checked })}
                                            className="h-5 w-5 rounded text-purple-600"
                                        />
                                        <div>
                                            <span className="font-semibold text-slate-800 block">Format PDF</span>
                                            <span className="text-xs text-slate-500">Document prêt à imprimer pour l'atelier</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={exportFormats.excel}
                                            onChange={e => setExportFormats({ ...exportFormats, excel: e.target.checked })}
                                            className="h-5 w-5 rounded text-purple-600"
                                        />
                                        <div>
                                            <span className="font-semibold text-slate-800 block">Format Excel</span>
                                            <span className="text-xs text-slate-500">Fichier modifiable avec tableau structuré</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3">
                                <button onClick={() => setIsExportModalOpen(false)} className="btn-secondary">Annuler</button>
                                <button onClick={handleExportProject} className="btn-primary">Générer l'export</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </div>
    );
}
