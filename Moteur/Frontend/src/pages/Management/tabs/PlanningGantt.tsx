import React, { useState } from 'react';
import { ManagedProject, PlanningStep, DEFAULT_STEP_COLORS } from '../../../config/managementConfig';
import { Flag, Save, Plus, Trash2, X, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

interface PlanningGanttProps {
  projects: ManagedProject[];
  updatePlanning: (id: number, data: { start_date?: string, delivery_date?: string, steps?: PlanningStep[] }) => void;
}

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
};

const getCalendarDays = (baseDate: Date, view: 'week' | 'month') => {
  const days: Date[] = [];
  if (view === 'week') {
    const start = getStartOfWeek(baseDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
  } else {
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const startGrid = getStartOfWeek(startOfMonth);
    for (let i = 0; i < 42; i++) {
      const d = new Date(startGrid);
      d.setDate(startGrid.getDate() + i);
      days.push(d);
    }
  }
  return days;
};

const formatDateStr = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const PlanningGantt: React.FC<PlanningGanttProps> = ({ projects, updatePlanning }) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');

  const [editForm, setEditForm] = useState<{ start_date: string, delivery_date: string, steps: PlanningStep[] }>({
    start_date: '', delivery_date: '', steps: []
  });

  const activeProjects = projects.filter(p => p.status !== 'reflexion' && p.start_date && p.delivery_date);
  const reflexionProjects = projects.filter(p => p.status === 'reflexion' || !p.start_date || !p.delivery_date);

  const handleEditClick = (p: ManagedProject) => {
    setEditingId(p.id);
    setEditingProjectName(p.name);
    setEditForm({
      start_date: p.start_date || formatDateStr(new Date()),
      delivery_date: p.delivery_date || formatDateStr(new Date(Date.now() + 14 * 86400000)),
      steps: p.steps || []
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (editingId) {
      updatePlanning(editingId, editForm);
      setIsModalOpen(false);
      setEditingId(null);
    }
  };

  const addStep = () => {
    const newStep: PlanningStep = {
      label: 'Nouvelle étape',
      start: editForm.start_date,
      end: editForm.delivery_date,
      color: '#3B82F6'
    };
    setEditForm({ ...editForm, steps: [...editForm.steps, newStep] });
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = getCalendarDays(currentDate, viewMode);
  const todayStr = formatDateStr(new Date());
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="flex h-full space-x-6 relative">
      {/* Calendar View */}
      <div className="flex-1 flex flex-col bg-theme-bg-card border border-theme-border rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-theme-border flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center space-x-4">
            <h3 className="font-semibold text-theme-text-main text-lg flex items-center">
              <CalendarDays className="w-5 h-5 mr-2 text-theme-primary" />
              {viewMode === 'month' ? `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}` : `Semaine du ${calendarDays[0].getDate()} ${monthNames[calendarDays[0].getMonth()]}`}
            </h3>
            <div className="flex space-x-1">
              <button onClick={handlePrev} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={handleToday} className="px-3 py-1.5 text-sm font-medium rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300">Aujourd'hui</button>
              <button onClick={handleNext} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-theme-border">
            <button 
              onClick={() => setViewMode('week')}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Semaine
            </button>
            <button 
              onClick={() => setViewMode('month')}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              Mois
            </button>
          </div>
        </div>

        {/* Grille */}
        <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/50">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-theme-border bg-white dark:bg-slate-900">
            {dayNames.map(day => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-r border-theme-border last:border-r-0">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Body */}
          <div className="flex-1 overflow-y-auto">
            <div className={`grid grid-cols-7 border-b border-theme-border ${viewMode === 'month' ? 'min-h-[500px]' : 'min-h-[200px]'}`}>
              {calendarDays.map((day, i) => {
                const dateStr = formatDateStr(day);
                const isToday = dateStr === todayStr;
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                
                // Find steps for this date
                const daySteps = activeProjects.flatMap(p => 
                  (p.steps || []).filter(s => dateStr >= s.start && dateStr <= s.end)
                  .map(s => ({ project: p, step: s }))
                );

                return (
                  <div key={i} className={`min-h-[100px] border-r border-b border-theme-border last:border-r-0 p-1 flex flex-col ${!isCurrentMonth && viewMode === 'month' ? 'bg-slate-100/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-900'} hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors`}>
                    <div className="flex justify-between items-center mb-1 px-1">
                      <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700 dark:text-slate-300'} ${!isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}`}>
                        {day.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 space-y-1 overflow-y-auto pr-1">
                      {daySteps.map((ds, idx) => (
                        <div 
                          key={`${ds.project.id}-${idx}`}
                          onClick={() => handleEditClick(ds.project)}
                          className="px-2 py-1 rounded text-[10px] font-bold text-white shadow-sm cursor-pointer hover:opacity-90 truncate transition-opacity flex flex-col"
                          style={{ backgroundColor: ds.step.color || DEFAULT_STEP_COLORS[ds.step.label] || '#378ADD' }}
                          title={`${ds.project.name} - ${ds.step.label}`}
                        >
                          <span className="truncate w-full mix-blend-overlay opacity-90 text-[9px] uppercase tracking-wider">{ds.step.label}</span>
                          <span className="truncate w-full">{ds.project.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Side Panel: À planifier */}
      <div className="w-72 bg-theme-bg-sidebar border border-theme-border rounded-xl shadow-sm flex flex-col">
        <div className="p-4 border-b border-theme-border bg-white dark:bg-slate-900 rounded-t-xl">
          <h3 className="font-semibold text-theme-text-main flex items-center"><Flag className="w-4 h-4 mr-2 text-amber-500" /> À planifier</h3>
          <p className="text-xs text-theme-text-muted mt-1">{reflexionProjects.length} projets en attente</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {reflexionProjects.map(p => (
            <div 
              key={p.id} 
              onClick={() => handleEditClick(p)}
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 shadow-sm transition-all group"
            >
              <h4 className="font-medium text-slate-800 dark:text-slate-200 text-sm truncate">{p.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center">
                <CalendarDays className="w-3 h-3 mr-1" /> Assigner des dates
              </p>
            </div>
          ))}
          {reflexionProjects.length === 0 && (
            <div className="text-center p-6 text-slate-400">
              <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">Tous les projets sont planifiés.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'édition des étapes */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Planification du projet</h2>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{editingProjectName}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Début global</label>
                  <input type="date" value={editForm.start_date} onChange={e => setEditForm({...editForm, start_date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Livraison estimée</label>
                  <input type="date" value={editForm.delivery_date} onChange={e => setEditForm({...editForm, delivery_date: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Étapes de fabrication</h3>
                  <button onClick={addStep} className="text-sm flex items-center bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:text-blue-400 px-3 py-1.5 rounded-lg font-medium transition-colors">
                    <Plus className="w-4 h-4 mr-1" /> Nouvelle étape
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editForm.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500/50 transition-colors">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-500 mb-1">Nom de l'étape (personnalisable)</label>
                        <input type="text" value={step.label} onChange={e => {
                          const newSteps = [...editForm.steps];
                          newSteps[idx].label = e.target.value;
                          setEditForm({...editForm, steps: newSteps});
                        }} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm font-medium focus:outline-none focus:border-blue-500" placeholder="Ex: Découpe" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Du</label>
                        <input type="date" value={step.start} onChange={e => {
                          const newSteps = [...editForm.steps];
                          newSteps[idx].start = e.target.value;
                          setEditForm({...editForm, steps: newSteps});
                        }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Au</label>
                        <input type="date" value={step.end} onChange={e => {
                          const newSteps = [...editForm.steps];
                          newSteps[idx].end = e.target.value;
                          setEditForm({...editForm, steps: newSteps});
                        }} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Couleur</label>
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden border-2 border-slate-200 dark:border-slate-700 cursor-pointer">
                          <input type="color" value={step.color} onChange={e => {
                            const newSteps = [...editForm.steps];
                            newSteps[idx].color = e.target.value;
                            setEditForm({...editForm, steps: newSteps});
                          }} className="absolute -inset-2 w-12 h-12 cursor-pointer border-none p-0" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-500 mb-1">Heures prévues</label>
                        <input type="number" step="0.5" min="0" value={step.heures_prevues || ''} onChange={e => {
                          const newSteps = [...editForm.steps];
                          newSteps[idx].heures_prevues = parseFloat(e.target.value) || undefined;
                          setEditForm({...editForm, steps: newSteps});
                        }} className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs focus:outline-none" placeholder="Ex: 2.5" />
                      </div>
                      
                      <div className="pt-4">
                        <button onClick={() => {
                          const newSteps = [...editForm.steps];
                          newSteps.splice(idx, 1);
                          setEditForm({...editForm, steps: newSteps});
                        }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Supprimer l'étape">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {editForm.steps.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400">Aucune étape de fabrication définie.</p>
                      <button onClick={addStep} className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline">Ajouter la première étape</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all active:scale-95">
                <Save className="w-4 h-4 mr-2" /> Enregistrer au planning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
