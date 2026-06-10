import React, { useState } from 'react';
import { ManagedProject, PlanningStep, DEFAULT_STEP_COLORS } from '../../../config/managementConfig';
import { Flag, Save, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface PlanningGanttProps {
  projects: ManagedProject[];
  updatePlanning: (id: number, data: { start_date?: string, delivery_date?: string, steps?: PlanningStep[] }) => void;
}

export const PlanningGantt: React.FC<PlanningGanttProps> = ({ projects, updatePlanning }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [editForm, setEditForm] = useState<{ start_date: string, delivery_date: string, steps: PlanningStep[] }>({
    start_date: '', delivery_date: '', steps: []
  });

  const activeProjects = projects.filter(p => p.status !== 'reflexion' && p.start_date && p.delivery_date);
  const reflexionProjects = projects.filter(p => p.status === 'reflexion' || !p.start_date || !p.delivery_date);

  const handleEditClick = (p: ManagedProject) => {
    setEditingId(p.id);
    setEditForm({
      start_date: p.start_date || new Date().toISOString().split('T')[0],
      delivery_date: p.delivery_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      steps: p.steps || []
    });
  };

  const handleSave = () => {
    if (editingId) {
      updatePlanning(editingId, editForm);
      setEditingId(null);
    }
  };

  const calculatePosition = (start: string, end: string, pStart: string, pEnd: string) => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const ps = new Date(pStart).getTime();
    const pe = new Date(pEnd).getTime();
    const total = pe - ps;
    if (total <= 0) return { left: '0%', width: '100%' };

    const left = Math.max(0, ((s - ps) / total) * 100);
    const width = Math.min(100 - left, ((e - s) / total) * 100);
    return { left: `${left}%`, width: `${width}%` };
  };

  const addStep = () => {
    const newStep: PlanningStep = {
      label: 'Nouvelle étape',
      start: editForm.start_date,
      end: editForm.delivery_date,
      color: '#B5D4F4'
    };
    setEditForm({ ...editForm, steps: [...editForm.steps, newStep] });
  };

  return (
    <div className="flex h-full space-x-6">
      {/* Gantt View */}
      <div className="flex-1 flex flex-col bg-theme-bg-card border border-theme-border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex justify-between items-center">
          <h3 className="font-semibold text-theme-text-main">Planning des étapes</h3>
          <div className="flex space-x-2 bg-theme-bg-sidebar p-1 rounded-lg border border-theme-border">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${viewMode === 'week' ? 'bg-theme-primary text-white' : 'text-theme-text-muted hover:text-theme-text-main'}`}
            >
              Semaines
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 text-sm rounded font-medium transition-colors ${viewMode === 'month' ? 'bg-theme-primary text-white' : 'text-theme-text-muted hover:text-theme-text-main'}`}
            >
              Mois
            </button>
          </div>
        </div>

        {/* Grille */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeProjects.map(p => {
            const isUrgent = new Date(p.delivery_date!).getTime() - Date.now() < 7 * 86400000;

            return (
              <div key={p.id}>
                <div className="flex items-center group cursor-pointer" onClick={() => handleEditClick(p)}>
                  <div className="w-24 flex-shrink-0 text-sm font-medium text-theme-text-main truncate pr-2" title={p.name}>
                    {p.name}
                  </div>
                  
                  <div className="flex-1 bg-theme-bg-sidebar rounded relative h-8 flex items-center group-hover:bg-theme-border/50 transition-colors">
                    {/* Background bar to signify total duration */}
                    <div className="absolute inset-x-0 mx-2 h-4 bg-black/5 dark:bg-white/5 rounded-full" />
                    
                    {/* Steps */}
                    <div className="absolute inset-x-2 h-4">
                      {p.steps?.map((s, idx) => {
                        const { left, width } = calculatePosition(s.start, s.end, p.start_date!, p.delivery_date!);
                        return (
                          <div 
                            key={idx}
                            className="absolute top-0 bottom-0 rounded-full flex items-center justify-center overflow-hidden group/step"
                            style={{ left, width, backgroundColor: s.color || DEFAULT_STEP_COLORS[s.label] || '#378ADD' }}
                            title={`${s.label}: ${s.start} - ${s.end}`}
                          >
                            <span className="text-[10px] text-white font-bold opacity-0 group-hover/step:opacity-100 px-1 truncate">{s.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Delivery Flag */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 transform translate-x-1">
                      <Flag className={`w-5 h-5 ${isUrgent ? 'text-red-500' : 'text-amber-500'}`} />
                    </div>
                  </div>
                </div>

                {/* Inline Editor */}
                {editingId === p.id && (
                  <div className="ml-24 mt-2 p-4 border border-theme-primary/30 bg-theme-primary/5 rounded-xl">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-theme-primary">Éditer Planning</h4>
                      <button onClick={() => setEditingId(null)} className="text-theme-text-muted hover:text-theme-text-main"><X className="w-5 h-5" /></button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <label className="block text-xs text-theme-text-muted mb-1">Date de début</label>
                        <input type="date" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} className="w-full bg-theme-bg-card border border-theme-border rounded px-3 py-2 text-sm text-theme-text-main focus:outline-none focus:border-theme-primary" />
                      </div>
                      <div>
                        <label className="block text-xs text-theme-text-muted mb-1">Date de livraison</label>
                        <input type="date" value={editForm.delivery_date} onChange={e => setEditForm({...editForm, delivery_date: e.target.value})} className="w-full bg-theme-bg-card border border-theme-border rounded px-3 py-2 text-sm text-theme-text-main focus:outline-none focus:border-theme-primary" />
                      </div>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <label className="block text-xs font-semibold text-theme-text-muted uppercase">Étapes de découpe</label>
                        <button onClick={addStep} className="text-xs flex items-center text-theme-primary hover:text-blue-400 font-medium"><Plus className="w-3 h-3 mr-1" /> Ajouter</button>
                      </div>
                      
                      {editForm.steps.map((step, idx) => (
                        <div key={idx} className="flex space-x-2 items-center bg-theme-bg-sidebar p-2 rounded border border-theme-border">
                          <input type="text" value={step.label} onChange={e => {
                            const newSteps = [...editForm.steps];
                            newSteps[idx].label = e.target.value;
                            setEditForm({...editForm, steps: newSteps});
                          }} className="flex-1 bg-transparent border-none text-sm text-theme-text-main focus:outline-none" placeholder="Nom de l'étape" />
                          
                          <input type="date" value={step.start} onChange={e => {
                            const newSteps = [...editForm.steps];
                            newSteps[idx].start = e.target.value;
                            setEditForm({...editForm, steps: newSteps});
                          }} className="bg-theme-bg-card border border-theme-border rounded px-2 py-1 text-xs text-theme-text-main focus:outline-none" />
                          
                          <input type="date" value={step.end} onChange={e => {
                            const newSteps = [...editForm.steps];
                            newSteps[idx].end = e.target.value;
                            setEditForm({...editForm, steps: newSteps});
                          }} className="bg-theme-bg-card border border-theme-border rounded px-2 py-1 text-xs text-theme-text-main focus:outline-none" />
                          
                          <input type="color" value={step.color} onChange={e => {
                            const newSteps = [...editForm.steps];
                            newSteps[idx].color = e.target.value;
                            setEditForm({...editForm, steps: newSteps});
                          }} className="w-8 h-8 rounded cursor-pointer border-none p-0" />
                          
                          <button onClick={() => {
                            const newSteps = [...editForm.steps];
                            newSteps.splice(idx, 1);
                            setEditForm({...editForm, steps: newSteps});
                          }} className="p-1 text-red-500 hover:bg-red-500/10 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                      {editForm.steps.length === 0 && <p className="text-xs text-theme-text-muted italic">Aucune étape définie.</p>}
                    </div>

                    <div className="flex justify-end mt-4">
                      <button onClick={handleSave} className="bg-theme-primary text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-600 transition-colors">
                        <Save className="w-4 h-4 mr-2" /> Sauvegarder
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Panel: À planifier */}
      <div className="w-64 bg-theme-bg-sidebar border border-theme-border rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-theme-border">
          <h3 className="font-semibold text-theme-text-main">À planifier</h3>
          <p className="text-xs text-theme-text-muted mt-1">{reflexionProjects.length} projets en attente</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {reflexionProjects.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleEditClick(p)}
              className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg cursor-pointer hover:bg-purple-500/20 transition-colors group"
            >
              <h4 className="font-medium text-purple-700 dark:text-purple-300 text-sm truncate">{p.name}</h4>
              <p className="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CalendarDays className="w-3 h-3 mr-1" /> Définir les dates
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
