import React, { useState } from 'react';
import { ManagedProject, ProjectStatus, STATUS_COLORS, STATUS_LABELS } from '../../../config/managementConfig';
import { Plus, AlertCircle, Clock, Calendar, Save, Loader2, TrendingUp, Package, Wrench } from 'lucide-react';
import { ProjectService } from '../../../services/projectService';
import { CostSourceBadge, CostAmount, EstimativeLabel } from '../../../components/CostSourceBadge';

interface KanbanViewProps {
  projects: ManagedProject[];
  updateStatus: (id: number, status: ProjectStatus) => void;
  updatePlanning?: (id: number, data: { start_date?: string, delivery_date?: string }) => void;
  updateTarification?: (id: number, data: { marge_pct?: number, prix_vente_manuel?: number }) => void;
}

const COLUMNS: ProjectStatus[] = ['reflexion', 'en_cours', 'fini', 'valide'];

export const KanbanView: React.FC<KanbanViewProps> = ({ projects, updateStatus, updatePlanning, updateTarification }) => {
  const [selectedProject, setSelectedProject] = useState<ManagedProject | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal edit state
  const [editStatus, setEditStatus] = useState<ProjectStatus>('reflexion');
  const [startDate, setStartDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [margePct, setMargePct] = useState('');
  const [prixManuel, setPrixManuel] = useState('');

  const handleCardClick = async (project: ManagedProject) => {
    setSelectedProject(project);
    setEditStatus(project.status);
    setStartDate(project.start_date || '');
    setDeliveryDate(project.delivery_date || '');
    setMargePct(project.marge_pct?.toString() || '');
    setPrixManuel(project.prix_vente_manuel?.toString() || '');

    // Charger les coûts détaillés
    if (!project.cout_detail) {
      setLoadingDetail(true);
      try {
        const detail = await ProjectService.getCostDetaille(project.id);
        setSelectedProject(prev => prev ? { ...prev, cout_detail: detail } : null);
      } catch {
        // pas bloquant
      } finally {
        setLoadingDetail(false);
      }
    }
  };

  const handleSaveModal = () => {
    if (!selectedProject) return;
    
    if (editStatus !== selectedProject.status) {
      updateStatus(selectedProject.id, editStatus);
    }

    if (updatePlanning && (startDate !== (selectedProject.start_date || '') || deliveryDate !== (selectedProject.delivery_date || ''))) {
      updatePlanning(selectedProject.id, {
        start_date: startDate || undefined,
        delivery_date: deliveryDate || undefined
      });
    }

    if (updateTarification) {
      const newMarge = margePct ? parseFloat(margePct) : undefined;
      const newPrix = prixManuel ? parseFloat(prixManuel) : undefined;
      const margeChanged = newMarge !== selectedProject.marge_pct;
      const prixChanged = newPrix !== selectedProject.prix_vente_manuel;
      if (margeChanged || prixChanged) {
        updateTarification(selectedProject.id, { marge_pct: newMarge, prix_vente_manuel: newPrix });
      }
    }

    setSelectedProject(null);
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4">
      {COLUMNS.map(column => {
        const colProjects = projects.filter(p => p.status === column);
        const colorConfig = STATUS_COLORS[column];
        return (
          <div
            key={column}
            className="flex-1 min-w-[260px] max-w-[320px] flex flex-col bg-theme-bg-sidebar border border-theme-border rounded-xl shadow-sm"
          >
            {/* Header colonne */}
            <div className="p-4 border-b border-theme-border flex items-center justify-between bg-theme-bg-card rounded-t-xl">
              <h3 className="text-sm font-bold text-theme-text-main flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colorConfig.text }} />
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
                const source = project.source_cout_matieres;

                return (
                  <div
                    key={project.id}
                    onClick={() => handleCardClick(project)}
                    className="bg-theme-bg-card border border-theme-border rounded-lg p-4 shadow-sm cursor-pointer hover:border-theme-primary transition-colors"
                  >
                    <h4 className="font-medium text-theme-text-main mb-2 text-sm leading-snug">{project.name}</h4>

                    {/* Matériau */}
                    <div className="flex items-center text-xs text-theme-text-muted mb-3">
                      <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" />
                      {project.main_material}
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.delivery_date && (
                        <div className={`flex items-center text-xs font-medium ${isUrgent ? 'text-red-500' : 'text-theme-text-muted'}`}>
                          {isUrgent ? <AlertCircle className="w-3.5 h-3.5 mr-1" /> : <Clock className="w-3.5 h-3.5 mr-1" />}
                          Liv: {project.delivery_date}
                        </div>
                      )}
                      {project.start_date && (
                        <div className="flex items-center text-xs font-medium text-theme-text-muted">
                          <Calendar className="w-3.5 h-3.5 mr-1" />
                          Déb: {project.start_date}
                        </div>
                      )}
                    </div>

                    {/* Prix de vente estimé */}
                    <div className="flex items-center justify-between text-xs font-medium mb-1">
                      <div className="flex items-center text-theme-text-muted">
                        <TrendingUp className="w-3.5 h-3.5 mr-1 text-theme-primary" />
                        {source === 'none' ? (
                          <span className="text-theme-text-muted italic">Coût matière non disponible</span>
                        ) : (
                          <>
                            <span className="text-theme-text-main font-semibold">
                              {project.prix_vente_manuel
                                ? `${project.prix_vente_manuel.toFixed(2)} €`
                                : project.estimated_cost > 0
                                  ? `~${(project.estimated_cost * (1 + (project.marge_pct ?? 30) / 100)).toFixed(2)} €`
                                  : '—'
                              }
                            </span>
                            <CostSourceBadge source={source} compact />
                          </>
                        )}
                      </div>
                      {project.marge_pct !== undefined && (
                        <div className="text-theme-primary bg-theme-primary/10 px-1.5 py-0.5 rounded">
                          {project.marge_pct}%
                        </div>
                      )}
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full bg-theme-bg-sidebar h-1.5 rounded-full overflow-hidden mt-3">
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

      {/* Panel détail projet */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedProject(null)}>
          <div className="bg-theme-bg-card border border-theme-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            
            {/* Header panel */}
            <div className="p-6 border-b border-theme-border">
              <h2 className="text-xl font-bold text-theme-text-main">{selectedProject.name}</h2>
              <p className="text-sm text-theme-text-muted mt-1">{selectedProject.main_material}</p>
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-6 overflow-y-auto max-h-[70vh]">
              {/* Colonne Statut */}
              <div className="flex-1 space-y-4">
                <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wide">Statut</h3>
                <div className="space-y-2">
                  {COLUMNS.map(col => (
                    <button
                      key={col}
                      onClick={() => setEditStatus(col)}
                      className={`w-full text-left px-4 py-3 rounded-lg border font-medium flex items-center justify-between transition-colors
                        ${editStatus === col
                          ? 'border-theme-primary bg-theme-primary/10 text-theme-primary'
                          : 'border-theme-border text-theme-text-main hover:bg-theme-bg-sidebar'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: STATUS_COLORS[col].text }} />
                        {STATUS_LABELS[col]}
                      </div>
                      {selectedProject.status === col && <span className="text-xs bg-theme-text-muted text-white px-2 py-0.5 rounded">Actuel</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Colonne droite */}
              <div className="flex-1 space-y-5">
                
                {/* Planning */}
                <div>
                  <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wide mb-3">Planning</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">Date de début</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">Livraison prévue</label>
                      <input
                        type="date"
                        value={deliveryDate}
                        onChange={e => setDeliveryDate(e.target.value)}
                        className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-main"
                      />
                    </div>
                  </div>
                </div>

                {/* Tarification */}
                <div>
                  <h3 className="text-sm font-bold text-theme-text-muted uppercase tracking-wide mb-3">Tarification</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">Marge (%)</label>
                      <input
                        type="number"
                        step="1"
                        value={margePct}
                        onChange={e => setMargePct(e.target.value)}
                        placeholder="Défaut global"
                        className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-main"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-theme-text-muted mb-1">Prix forcé (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={prixManuel}
                        onChange={e => setPrixManuel(e.target.value)}
                        placeholder="Calculé auto."
                        className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-3 py-2 text-sm text-theme-text-main"
                      />
                    </div>
                  </div>

                  {/* Détail des coûts */}
                  <div className="bg-theme-bg-sidebar rounded-xl border border-theme-border overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-theme-border flex items-center justify-between">
                      <span className="text-xs font-bold text-theme-text-muted uppercase tracking-wide">Détail des coûts</span>
                      {loadingDetail && <Loader2 className="w-3.5 h-3.5 animate-spin text-theme-text-muted" />}
                    </div>

                    {selectedProject.cout_detail ? (() => {
                      const d = selectedProject.cout_detail!;
                      const src = d.source_cout_matieres;
                      const isEstimatif = src === 'parts' || src === 'none';
                      return (
                        <div className="px-4 py-3 space-y-2.5 text-sm">
                          {/* Source badge */}
                          {src !== 'optimization' && (
                            <div className="flex items-center gap-2">
                              <CostSourceBadge source={src} />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-theme-text-muted">
                              <Package className="w-3.5 h-3.5" /> Coût matières
                            </span>
                            <CostAmount amount={d.cout_matieres} source={src} unavailableLabel="Coût matière non disponible" className="font-medium text-theme-text-main" />
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5 text-theme-text-muted">
                              <Wrench className="w-3.5 h-3.5" /> Main d'œuvre
                            </span>
                            <span className="font-medium text-theme-text-main">{d.cout_main_oeuvre.toFixed(2)} €</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-theme-border pt-2">
                            <span className="text-theme-text-muted">
                              Déboursé sec
                              <EstimativeLabel source={src} />
                            </span>
                            <span className="font-semibold text-theme-text-main">{d.debourse_sec.toFixed(2)} €</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-theme-text-muted">Frais généraux</span>
                            <span className="font-medium text-theme-text-main">{d.frais_generaux.toFixed(2)} €</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-theme-text-muted">
                              Coût de revient
                              <EstimativeLabel source={src} />
                            </span>
                            <span className="font-semibold text-theme-text-main">{d.cout_de_revient.toFixed(2)} €</span>
                          </div>

                          <div className="flex items-center justify-between border-t border-theme-border pt-2">
                            <span className="text-theme-text-muted">
                              Prix de vente
                              {isEstimatif && (
                                <span className="text-[10px] font-semibold tracking-wide uppercase text-amber-500 ml-1">(estimatif)</span>
                              )}
                            </span>
                            {src === 'none' ? (
                              <span className="text-theme-text-muted italic text-xs">non calculable</span>
                            ) : (
                              <span className={`font-bold text-base ${src === 'parts' ? 'text-amber-500' : 'text-green-500'}`}>
                                {d.prix_vente.toFixed(2)} €
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-theme-text-muted">Marge effective</span>
                            <span className="font-medium text-theme-primary">{d.marge_effective_pct.toFixed(1)}%</span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-theme-text-muted">Bénéfice net</span>
                            <span className={`font-semibold ${d.benefice >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {d.benefice >= 0 ? '+' : ''}{d.benefice.toFixed(2)} €
                            </span>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="px-4 py-6 text-center text-xs text-theme-text-muted">
                        {loadingDetail ? 'Chargement…' : 'Ouvrez le projet pour charger les coûts détaillés.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-2 border-t border-theme-border">
                  <button
                    onClick={() => setSelectedProject(null)}
                    className="px-4 py-2 text-sm font-medium text-theme-text-muted hover:text-theme-text-main"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveModal}
                    className="px-4 py-2 text-sm font-medium bg-theme-primary text-white rounded-lg hover:bg-blue-600 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
