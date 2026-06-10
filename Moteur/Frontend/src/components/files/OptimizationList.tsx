import React from 'react';
import { Download, ExternalLink, Calendar, PieChart, FileText, FileJson, CheckCircle2 } from 'lucide-react';
import type { ProjectEntry } from '../../services/fileService';

interface OptimizationListProps {
    project: ProjectEntry | null;
    selectedOptimizationId: number | null;
    onSelectOptimization: (id: number) => void;
    onDownloadFile: (path: string) => void;
    onOpenFolder: (path: string) => void;
}

export const OptimizationList: React.FC<OptimizationListProps> = ({
    project,
    selectedOptimizationId,
    onSelectOptimization,
    onDownloadFile,
    onOpenFolder,
}) => {
    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>Sélectionnez un projet pour voir ses optimisations.</p>
            </div>
        );
    }

    if (project.optimizations.length === 0 && project.orphan_files.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <p>Aucun fichier trouvé pour ce projet.</p>
            </div>
        );
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'Inconnue';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case 'json': return <FileJson className="w-4 h-4 text-yellow-500" />;
            case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
            default: return <FileText className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <div className="overflow-y-auto h-full p-4 space-y-6 custom-scrollbar">
            {project.optimizations.map((opt) => (
                <div 
                    key={`opt-${opt.id}`}
                    onClick={() => onSelectOptimization(opt.id)}
                    className={`bg-slate-800 rounded-xl p-4 border transition-colors cursor-pointer
                        ${selectedOptimizationId === opt.id ? 'border-blue-500' : 'border-slate-700 hover:border-slate-600'}`}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-white text-lg">Optimisation #{opt.id}</h3>
                                {opt.is_validated && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(opt.date)}</span>
                                <span className="flex items-center gap-1"><PieChart className="w-4 h-4" /> Eff: {opt.efficiency ?? '?'}%</span>
                                <span>Panneaux: {opt.total_panels}</span>
                            </div>
                        </div>
                    </div>

                    {opt.files.length > 0 && (
                        <div className="space-y-2 mt-4">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fichiers</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {opt.files.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-700 transition-colors">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {getFileIcon(file.type)}
                                            <span className="text-sm truncate text-slate-300" title={file.name}>{file.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 ml-2">
                                            <button onClick={(e) => { e.stopPropagation(); onDownloadFile(file.path); }} className="p-1.5 hover:bg-slate-600 rounded-md text-slate-400 hover:text-white" title="Télécharger">
                                                <Download className="w-4 h-4" />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); onOpenFolder(file.path); }} className="p-1.5 hover:bg-slate-600 rounded-md text-slate-400 hover:text-white" title="Ouvrir le dossier">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}

            {project.orphan_files.length > 0 && (
                <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                    <h3 className="font-semibold text-white mb-4">Autres Fichiers</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {project.orphan_files.map((file, idx) => (
                            <div key={`orphan-${idx}`} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/50 hover:bg-slate-700 transition-colors">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {getFileIcon(file.type)}
                                    <span className="text-sm truncate text-slate-300" title={file.name}>{file.name}</span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 ml-2">
                                    <button onClick={() => onDownloadFile(file.path)} className="p-1.5 hover:bg-slate-600 rounded-md text-slate-400 hover:text-white" title="Télécharger">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => onOpenFolder(file.path)} className="p-1.5 hover:bg-slate-600 rounded-md text-slate-400 hover:text-white" title="Ouvrir le dossier">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
