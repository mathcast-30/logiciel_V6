import React, { useState } from 'react';
import { ManagedProject, PlanningStep } from '../../../config/managementConfig';
import { ChevronDown, ChevronUp, Save, Clock } from 'lucide-react';

interface TimeTrackingProps {
  projects: ManagedProject[];
  updatePlanning?: (id: number, data: { steps?: PlanningStep[] }) => void;
}

export const TimeTracking: React.FC<TimeTrackingProps> = ({ projects, updatePlanning }) => {
  const activeProjects = projects.filter(p => p.status !== 'valide' && p.estimated_hours > 0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editSteps, setEditSteps] = useState<PlanningStep[]>([]);

  const toggleExpand = (p: ManagedProject) => {
    if (expandedId === p.id) {
      setExpandedId(null);
    } else {
      setExpandedId(p.id);
      setEditSteps(p.steps || []);
    }
  };

  const handleSave = (id: number) => {
    if (updatePlanning) {
      updatePlanning(id, { steps: editSteps });
    }
    setExpandedId(null);
  };

  const handleStepChange = (idx: number, field: 'heures_prevues' | 'heures_reelles', value: string) => {
    const val = parseFloat(value);
    const newSteps = [...editSteps];
    newSteps[idx] = { ...newSteps[idx], [field]: isNaN(val) ? undefined : val };
    setEditSteps(newSteps);
  };

  return (
    <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-theme-text-main mb-6 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-theme-primary" />
        Suivi du temps (Prévu vs Réel par étape)
      </h3>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {activeProjects.length > 0 ? (
          activeProjects.map(p => {
            const ratio = p.estimated_hours > 0 ? p.actual_hours / p.estimated_hours : 0;
            const pct = Math.min(100, ratio * 100);
            const isOver = p.actual_hours > p.estimated_hours;
            const isExpanded = expandedId === p.id;

            return (
              <div key={p.id} className="bg-theme-bg-sidebar border border-theme-border rounded-lg overflow-hidden transition-colors hover:border-theme-primary/50">
                <div 
                  className="p-4 cursor-pointer flex items-center justify-between"
                  onClick={() => toggleExpand(p)}
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-theme-text-main">{p.name}</span>
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-theme-text-muted'}`}>
                          {p.actual_hours} / {p.estimated_hours} h
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-theme-text-muted" /> : <ChevronDown className="w-4 h-4 text-theme-text-muted" />}
                      </div>
                    </div>
                    <div className="w-full bg-theme-bg-card h-2 rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-theme-primary'}`}
                        style={{ width: `${pct}%` }}
                      />
                      {isOver && (
                        <div className="absolute top-0 bottom-0 w-1 bg-black/20" style={{ left: '100%' }} />
                      )}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 border-t border-theme-border bg-theme-bg-main space-y-4">
                    <div className="space-y-3">
                      {editSteps.length > 0 ? editSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-theme-bg-card p-3 rounded-lg border border-theme-border">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-theme-text-main flex items-center">
                              <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: step.color || '#ccc' }} />
                              {step.label}
                            </div>
                          </div>
                          
                          <div className="w-32">
                            <label className="block text-xs text-theme-text-muted mb-1">Prévu (h)</label>
                            <input 
                              type="number" 
                              step="0.5" 
                              min="0"
                              value={step.heures_prevues || ''}
                              onChange={e => handleStepChange(idx, 'heures_prevues', e.target.value)}
                              className="w-full bg-theme-bg-main border border-theme-border rounded px-2 py-1 text-sm focus:outline-none focus:border-theme-primary text-theme-text-main"
                            />
                          </div>
                          
                          <div className="w-32">
                            <label className="block text-xs text-theme-text-muted mb-1">Réel (h)</label>
                            <input 
                              type="number" 
                              step="0.5" 
                              min="0"
                              value={step.heures_reelles || ''}
                              onChange={e => handleStepChange(idx, 'heures_reelles', e.target.value)}
                              className="w-full bg-theme-bg-main border border-theme-border rounded px-2 py-1 text-sm focus:outline-none focus:border-theme-primary text-theme-text-main font-bold text-blue-600 dark:text-blue-400"
                            />
                          </div>
                        </div>
                      )) : (
                        <div className="text-sm text-theme-text-muted text-center py-4">
                          Aucune étape définie pour ce projet. (Allez dans l'onglet Planning)
                        </div>
                      )}
                    </div>
                    
                    {editSteps.length > 0 && (
                      <div className="flex justify-end pt-2">
                        <button 
                          onClick={() => handleSave(p.id)}
                          className="flex items-center px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-blue-600 text-sm font-medium transition-colors"
                        >
                          <Save className="w-4 h-4 mr-2" /> Enregistrer les temps
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-theme-text-muted">
            <Clock className="w-8 h-8 mb-2 opacity-20" />
            <p>Aucun projet actif avec un temps estimé.</p>
          </div>
        )}
      </div>
    </div>
  );
};
