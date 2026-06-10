import React, { useState, useEffect } from 'react';
import { Search, FolderArchive, RefreshCcw } from 'lucide-react';
import { FileService, ClientEntry, ProjectEntry, OptimizationPreview } from '../services/fileService';
import { FileTreePanel } from '../components/files/FileTreePanel';
import { OptimizationList } from '../components/files/OptimizationList';
import { CuttingPlanPreview } from '../components/files/CuttingPlanPreview';
import toast from 'react-hot-toast';

export const FileExplorer: React.FC = () => {
    const [clients, setClients] = useState<ClientEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Selection state
    const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
    const [selectedProject, setSelectedProject] = useState<ProjectEntry | null>(null);
    const [selectedOptId, setSelectedOptId] = useState<number | null>(null);
    const [previewData, setPreviewData] = useState<OptimizationPreview | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);

    const loadTree = async () => {
        setIsLoading(true);
        try {
            const data = await FileService.getTree();
            setClients(data.clients);
        } catch (error) {
            toast.error("Erreur lors du chargement de l'arborescence");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTree();
    }, []);

    const handleToggleClient = (clientId: number) => {
        const newSet = new Set(expandedClients);
        if (newSet.has(clientId)) {
            newSet.delete(clientId);
        } else {
            newSet.add(clientId);
        }
        setExpandedClients(newSet);
    };

    const handleSelectProject = (project: ProjectEntry) => {
        setSelectedProject(project);
        setSelectedOptId(null);
        setPreviewData(null);
    };

    const handleSelectOptimization = async (optId: number) => {
        setSelectedOptId(optId);
        setIsPreviewLoading(true);
        try {
            const data = await FileService.getPreview(optId);
            setPreviewData(data);
        } catch (error) {
            toast.error("Impossible de charger l'aperçu");
            setPreviewData(null);
        } finally {
            setIsPreviewLoading(false);
        }
    };

    const handleDownloadAll = async () => {
        if (!selectedProject) return;
        const allFiles: string[] = [];
        selectedProject.optimizations.forEach(opt => {
            opt.files.forEach(f => allFiles.push(f.path));
        });
        selectedProject.orphan_files.forEach(f => allFiles.push(f.path));
        
        if (allFiles.length === 0) {
            toast.error("Aucun fichier à télécharger");
            return;
        }

        const toastId = toast.loading("Préparation du ZIP...");
        try {
            await FileService.downloadAsZip(allFiles);
            toast.success("Téléchargement lancé", { id: toastId });
        } catch (error) {
            toast.error("Erreur lors de la création du ZIP", { id: toastId });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-2rem)]">
            {/* Header Toolbar */}
            <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-t-2xl border-b border-white/5 shadow-sm shrink-0">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <FolderArchive className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Explorateur de Fichiers</h1>
                    <p className="text-sm text-slate-400">Naviguez dans les fichiers générés, plans et exports</p>
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-slate-800 text-white pl-10 pr-4 py-2 rounded-lg border border-slate-700 focus:border-blue-500 focus:outline-none w-64"
                        />
                    </div>
                    <button onClick={loadTree} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 border border-slate-700 transition-colors">
                        <RefreshCcw className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
                    </button>
                    <button 
                        onClick={handleDownloadAll}
                        disabled={!selectedProject}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <FolderArchive className="w-4 h-4" />
                        Tout télécharger (ZIP)
                    </button>
                </div>
            </div>

            {/* 3-Column Layout */}
            <div className="flex-1 flex overflow-hidden bg-slate-900 rounded-b-2xl">
                {/* Left Column: Tree */}
                <div className="w-1/4 min-w-[250px] border-r border-white/5 flex flex-col bg-slate-900/50">
                    <div className="p-3 border-b border-white/5 font-medium text-slate-300 flex items-center gap-2 shrink-0">
                        Arborescence
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <FileTreePanel 
                            clients={clients}
                            selectedProjectId={selectedProject?.id ?? null}
                            onSelectProject={handleSelectProject}
                            searchQuery={searchQuery}
                            expandedClients={expandedClients}
                            onToggleClient={handleToggleClient}
                        />
                    </div>
                </div>

                {/* Center Column: Optimizations List */}
                <div className="w-2/5 min-w-[350px] border-r border-white/5 flex flex-col bg-slate-900">
                    <div className="p-3 border-b border-white/5 font-medium text-slate-300 flex items-center gap-2 shrink-0">
                        {selectedProject ? `Fichiers: ${selectedProject.name}` : 'Optimisations'}
                    </div>
                    <div className="flex-1 overflow-hidden bg-slate-900/30">
                        <OptimizationList 
                            project={selectedProject}
                            selectedOptimizationId={selectedOptId}
                            onSelectOptimization={handleSelectOptimization}
                            onDownloadFile={(p) => FileService.downloadFile(p)}
                            onOpenFolder={(p) => FileService.openFolder(p).catch(() => toast.error("Erreur ouverture dossier"))}
                        />
                    </div>
                </div>

                {/* Right Column: Preview */}
                <div className="w-[35%] flex flex-col bg-slate-900/50">
                    <div className="flex-1 overflow-hidden">
                        <CuttingPlanPreview 
                            previewData={previewData}
                            isLoading={isPreviewLoading}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
