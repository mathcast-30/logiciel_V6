import React, { useState } from 'react';
import { ManagedProject, ProjectStatus, STATUS_COLORS, STATUS_LABELS } from '../../../config/managementConfig';
import { Plus, AlertCircle, Clock } from 'lucide-react';

interface KanbanViewProps {
  projects: ManagedProject[];
  updateStatus: (id: number, status: ProjectStatus) => void;
}

const COLUMNS: ProjectStatus[] = ['reflexion', 'en_cours', 'fini', 'valide'];

export const KanbanView: React.FC<KanbanViewProps> = ({ projects, updateStatus }) => {
  const [selectedProject, setSelectedProject] = useState<ManagedProject | null>(null);

  const handleCardClick = (project: ManagedProject) => {
    setSelectedProject(project);
  };

  const handleChangeStatus = (id: number, newStatus: ProjectStatus) => {
    updateStatus(id, newStatus);
    setSelectedProject(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-1 space-x-4 overflow-x-auto pb-4">
        {COLUMNS.map(column => {
          const colProjects = projects.filter(p => p.status === column);
          const colorConfig = STATUS_COLORS[column];

          return (
            <div key={column} className="flex-shrink-0 w-80 bg-theme-bg-sidebar rounded-xl border border-theme-border flex flex-col max-h-full">
              {/* Header */}
              <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg-card rounded-t-xl">
                <h3 className="font-bold text-theme-text-main flex items-center">
                  <span className={`w-3 h-3 rounded-full mr-2`} style={{ backgroundColor: colorConfig.text }} />
                  {STATUS_LABELS[column]}
                </h3>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${colorConfig.badge}`}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colProjects.map(project => {
                  const isUrgent = project.delivery_date && new Date(project.delivery_date).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
                  
                  return (
                    <div 
                      key={project.id} 
                      onClick={() => handleCardClick(project)}
                      className="bg-theme-bg-card border border-theme-border rounded-lg p-4 shadow-sm cursor-pointer hover:border-theme-primary transition-colors"
                    >
                      <h4 className="font-medium text-theme-text-main mb-2">{project.name}</h4>
                      
                      <div className="flex items-center text-xs text-theme-text-muted mb-3">
                        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                        {project.main_material}
                      </div>

                      {project.delivery_date && (
                        <div className={`flex items-center text-xs mb-3 font-medium ${isUrgent ? 'text-red-500' : 'text-theme-text-muted'}`}>
                          {isUrgent ? <AlertCircle className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                          {project.delivery_date}
                        </div>
                      )}

                      <div className="w-full bg-theme-bg-sidebar h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${isUrgent ? 'bg-red-500' : project.progress === 1 ? 'bg-green-500' : 'bg-theme-primary'}`}
                          style={{ width: `${Math.max(5, project.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Button */}
              {column === 'reflexion' && (
                <div className="p-3 border-t border-theme-border">
                  <button className="w-full flex items-center justify-center py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text-main hover:bg-theme-bg-card rounded-lg transition-colors border border-dashed border-theme-border hover:border-theme-primary">
                    <Plus className="w-4 h-4 mr-1" /> Ajouter un projet
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Inline Editor Panel - Simple Implementation */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-theme-text-main mb-4">Éditer le statut: {selectedProject.name}</h3>
            <div className="space-y-3">
              {COLUMNS.map(col => (
                <button
                  key={col}
                  onClick={() => handleChangeStatus(selectedProject.id, col)}
                  className={`w-full text-left px-4 py-3 rounded-lg border font-medium flex items-center justify-between transition-colors
                    ${selectedProject.status === col 
                      ? 'border-theme-primary bg-theme-primary/10 text-theme-primary' 
                      : 'border-theme-border text-theme-text-main hover:bg-theme-bg-sidebar'
                    }
                  `}
                >
                  <div className="flex items-center">
                    <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: STATUS_COLORS[col].text }} />
                    {STATUS_LABELS[col]}
                  </div>
                  {selectedProject.status === col && <span className="text-sm bg-theme-primary text-white px-2 py-0.5 rounded">Actuel</span>}
                </button>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text-main"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
