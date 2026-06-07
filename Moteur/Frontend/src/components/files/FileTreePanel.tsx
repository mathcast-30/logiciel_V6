import React from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Folder, User, FileText } from 'lucide-react';
import type { ClientEntry, ProjectEntry } from '../../services/fileService';

interface FileTreePanelProps {
    clients: ClientEntry[];
    selectedProjectId: number | null;
    onSelectProject: (project: ProjectEntry, clientName: string) => void;
    searchQuery: string;
    expandedClients: Set<number>;
    onToggleClient: (clientId: number) => void;
}

export const FileTreePanel: React.FC<FileTreePanelProps> = ({
    clients,
    selectedProjectId,
    onSelectProject,
    searchQuery,
    expandedClients,
    onToggleClient,
}) => {
    const filteredClients = clients
        .map((client) => {
            const filteredProjects = client.projects.filter((p) => {
                if (!searchQuery) return true;
                const q = searchQuery.toLowerCase();
                return (
                    p.name.toLowerCase().includes(q) ||
                    client.name.toLowerCase().includes(q)
                );
            });
            return { ...client, projects: filteredProjects };
        })
        .filter((c) => c.projects.length > 0);

    if (filteredClients.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4">
                <Folder className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm text-center">Aucun client ou projet trouvé</p>
            </div>
        );
    }

    return (
        <div className="overflow-y-auto h-full custom-scrollbar">
            {filteredClients.map((client) => {
                const isExpanded = expandedClients.has(client.id);
                const totalFiles = client.projects.reduce((sum, p) => sum + p.total_files, 0);

                return (
                    <div key={client.id} className="mb-1">
                        {/* Client header */}
                        <button
                            onClick={() => onToggleClient(client.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg 
                                     hover:bg-slate-700/50 transition-colors text-left group"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <User className="w-4 h-4 text-blue-400 shrink-0" />
                            <span className="text-sm font-medium text-slate-200 truncate flex-1">
                                {client.name}
                            </span>
                            {totalFiles > 0 && (
                                <span className="text-xs bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full">
                                    {totalFiles}
                                </span>
                            )}
                        </button>

                        {/* Projects */}
                        {isExpanded && (
                            <div className="ml-4 border-l border-slate-700/50">
                                {client.projects.map((project) => {
                                    const isSelected = selectedProjectId === project.id;
                                    const optimCount = project.optimizations.length;

                                    return (
                                        <button
                                            key={project.id}
                                            onClick={() => onSelectProject(project, client.name)}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-r-lg
                                                      transition-colors text-left group ml-1
                                                      ${isSelected
                                                    ? 'bg-blue-500/20 text-blue-300 border-l-2 border-blue-400 -ml-px'
                                                    : 'hover:bg-slate-700/30 text-slate-300'
                                                }`}
                                        >
                                            {isSelected ? (
                                                <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                                            ) : (
                                                <Folder className="w-4 h-4 text-slate-500 shrink-0" />
                                            )}
                                            <span className="text-sm truncate flex-1">{project.name}</span>
                                            <div className="flex items-center gap-1.5">
                                                {optimCount > 0 && (
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full
                                                                    ${isSelected
                                                            ? 'bg-blue-500/30 text-blue-300'
                                                            : 'bg-slate-700/80 text-slate-500'
                                                        }`}>
                                                        {optimCount}
                                                    </span>
                                                )}
                                                {project.orphan_files.length > 0 && (
                                                    <FileText className="w-3 h-3 text-slate-600" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
