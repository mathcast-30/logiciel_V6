import React, { useState } from 'react';
import { Tag, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { MaterialService, type EdgeBand } from '../../services/materialService';
import { ConfirmDialog } from '../UI/ConfirmDialog';

interface EdgeBandsTabProps {
    edgeBands: EdgeBand[];
    isLoading: boolean;
    onRefresh: () => Promise<void>;
}

export function EdgeBandsTab({ edgeBands, isLoading, onRefresh }: EdgeBandsTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isEdgeBandModalOpen, setIsEdgeBandModalOpen] = useState(false);
    const [edgeBandForm, setEdgeBandForm] = useState({
        name: '', thickness: 0.4, cost_per_m: 0, color: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    const handleCreateEdgeBand = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await MaterialService.createEdgeBand(edgeBandForm);
            toast.success('Chant ajouté avec succès');
            setIsEdgeBandModalOpen(false);
            setEdgeBandForm({ name: '', thickness: 0.4, cost_per_m: 0, color: '' });
            await onRefresh();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(`Erreur lors de l'ajout: ${message}`);
        }
    };

    const handleDeleteEdgeBand = async (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer ce chant ?',
            message: 'Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await MaterialService.deleteEdgeBand(id);
                    toast.success('Chant supprimé');
                    await onRefresh();
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const filteredEdgeBands = edgeBands.filter(eb =>
        eb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eb.color && eb.color.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Tag className="h-8 w-8 text-amber-500" />
                        Catalogue de Chants
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Gérez vos types de placage et chants (PVC, Bois, ABS).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Rechercher un chant..."
                            className="input-field pl-10 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsEdgeBandModalOpen(true)}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap !bg-amber-600 !border-amber-700 hover:!bg-amber-700"
                    >
                        <Plus className="h-5 w-5" />
                        Nouveau Chant
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEdgeBands.map(eb => (
                        <div key={eb.id} className="card p-5 group hover:border-amber-400 transition-all">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100">
                                        <Tag className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800">{eb.name}</h3>
                                        <p className="text-xs text-slate-500 uppercase font-semibold">Épaisseur: {eb.thickness}mm</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteEdgeBand(eb.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Supprimer le chant"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                <span className="text-sm text-slate-500">Coût linéaire</span>
                                <span className="font-bold text-slate-800">{eb.cost_per_m} €/m</span>
                            </div>
                        </div>
                    ))}
                    {edgeBands.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Tag className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">Aucun chant défini dans le catalogue.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Edge Band Modal */}
            <div className="modal-overlay" style={{ display: isEdgeBandModalOpen ? undefined : 'none' }} onClick={() => setIsEdgeBandModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="text-xl font-bold text-slate-800">Nouveau Chant</h2>
                    </div>
                    <form onSubmit={handleCreateEdgeBand}>
                        <div className="modal-body space-y-4">
                            <div>
                                <label htmlFor="eb-name" className="block text-sm font-medium text-slate-700 mb-1">Désignation *</label>
                                <input id="eb-name" type="text" required className="input-field" value={edgeBandForm.name} onChange={e => setEdgeBandForm({ ...edgeBandForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="eb-thickness" className="block text-sm font-medium text-slate-700 mb-1">Épaisseur (mm) *</label>
                                    <input id="eb-thickness" type="number" required step="0.1" className="input-field" value={edgeBandForm.thickness} onChange={e => setEdgeBandForm({ ...edgeBandForm, thickness: parseFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label htmlFor="eb-cost" className="block text-sm font-medium text-slate-700 mb-1">Coût par mètre (€)</label>
                                    <input id="eb-cost" type="number" step="0.01" className="input-field" value={edgeBandForm.cost_per_m} onChange={e => setEdgeBandForm({ ...edgeBandForm, cost_per_m: parseFloat(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer flex justify-end gap-3">
                            <button type="button" onClick={() => setIsEdgeBandModalOpen(false)} className="btn-secondary">Annuler</button>
                            <button type="submit" className="btn-primary !bg-amber-600 border-amber-700 hover:!bg-amber-700">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={confirmDialog.onConfirm}
                onCancel={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
            />
        </div>
    );
}
