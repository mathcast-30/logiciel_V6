import React, { useState } from 'react';
import { Package, Ruler, Tag, Search, Edit2, Trash2, ChevronDown, ChevronRight, AlertTriangle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { type MaterialWithStock, type Stock, MaterialService } from '../../services/materialService';

interface MaterialsTabProps {
    materials: MaterialWithStock[];
    isLoading: boolean;
    searchTerm: string;
    onRefresh: () => Promise<void>;
    onLoadDetails: (id: number) => Promise<void>;
}

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
    materials,
    isLoading,
    searchTerm,
    onRefresh,
    onLoadDetails
}) => {
    const [expandedMaterial, setExpandedMaterial] = useState<number | null>(null);
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    
    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
    const [editingStockId, setEditingStockId] = useState<number | null>(null);

    const [materialForm, setMaterialForm] = useState({
        name: '',
        thickness: 18,
        cost_per_sqm: 0,
        price_type: 'm2' as 'm2' | 'm3' | 'unit',
        supplier_ref: '',
        has_grain: false,
        is_panel: true,
        initial_width: 2800,
        initial_height: 2070,
        initial_quantity: 1
    });

    const [stockForm, setStockForm] = useState({
        width: 2800, height: 2070, quantity: 1, is_offcut: false, label: '', grain_direction: 1
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    const parseSafeFloat = (val: string) => {
        if (!val) return 0;
        const normalized = val.replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    };

    const handleCreateMaterial = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newMaterial = await MaterialService.create({
                name: materialForm.name,
                thickness: materialForm.thickness,
                cost_per_sqm: materialForm.cost_per_sqm,
                price_type: materialForm.price_type,
                supplier_ref: materialForm.supplier_ref,
                has_grain: materialForm.has_grain,
                is_panel: materialForm.is_panel,
            });

            if (materialForm.initial_width > 0 && materialForm.initial_height > 0 && materialForm.initial_quantity > 0) {
                await MaterialService.addStock(newMaterial.id, {
                    width: materialForm.initial_width,
                    height: materialForm.initial_height,
                    quantity: materialForm.initial_quantity,
                    is_offcut: false,
                    grain_direction: 1 // Default to Horizontal for new material stock
                });
            }

            setIsMaterialModalOpen(false);
            setMaterialForm({
                name: '',
                thickness: 18,
                cost_per_sqm: 0,
                price_type: 'm2',
                supplier_ref: '',
                has_grain: false,
                is_panel: true,
                initial_width: 2800,
                initial_height: 2070,
                initial_quantity: 1
            });
            await onRefresh();
            toast.success('Matériau et stock initial créés');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur lors de la création';
            toast.error(message);
        }
    };

    const handleAddStock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMaterialId) return;
        try {
            if (editingStockId) {
                await MaterialService.updateStock(editingStockId, stockForm);
                toast.success('Stock modifié avec succès');
            } else {
                await MaterialService.addStock(selectedMaterialId, stockForm);
                toast.success('Stock ajouté avec succès');
            }
            setIsStockModalOpen(false);
            setEditingStockId(null);
            setStockForm({ width: 2800, height: 2070, quantity: 1, is_offcut: false, label: '', grain_direction: 1 });
            await onLoadDetails(selectedMaterialId);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erreur lors de l'opération sur le stock";
            toast.error(message);
        }
    };

    const handleDeleteMaterial = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer le matériau',
            message: 'Voulez-vous vraiment supprimer ce matériau et tout son stock ? Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await MaterialService.delete(id);
                    await onRefresh();
                    toast.success('Matériau supprimé');
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const handleDeleteStock = async (stockId: number, materialId: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer ce panneau ?',
            message: 'Voulez-vous supprimer ce format du stock ?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await MaterialService.deleteStock(stockId);
                    await onLoadDetails(materialId);
                    toast.success('Panneau supprimé');
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur');
                }
            }
        });
    };

    const openStockModal = (materialId: number) => {
        setSelectedMaterialId(materialId);
        setEditingStockId(null);
        setStockForm({ width: 2800, height: 2070, quantity: 1, is_offcut: false, label: '', grain_direction: 1 });
        setIsStockModalOpen(true);
    };

    const openEditStockModal = (materialId: number, stock: Stock) => {
        setSelectedMaterialId(materialId);
        setEditingStockId(stock.id);
        setStockForm({
            width: stock.width,
            height: stock.height,
            quantity: stock.quantity,
            is_offcut: stock.is_offcut,
            label: stock.label || '',
            grain_direction: stock.grain_direction || 1
        });
        setIsStockModalOpen(true);
    };

    const getTotalStock = (material: MaterialWithStock) => {
        return material.stock_items?.reduce((sum: number, s: Stock) => sum + s.quantity, 0) || 0;
    };

    const getStockArea = (material: MaterialWithStock) => {
        const area = material.stock_items?.reduce((sum: number, s: Stock) => sum + (s.width * s.height * s.quantity) / 1000000, 0) || 0;
        return area.toFixed(2);
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            {/* Header actions (moved from Stock.tsx) */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsMaterialModalOpen(true)}
                    className="btn-primary flex items-center gap-2 whitespace-nowrap"
                >
                    <Plus className="h-5 w-5" />
                    Nouveau Matériau
                </button>
            </div>

            {filteredMaterials.length === 0 && !isLoading ? (
                <div className="card">
                    <div className="empty-state py-16">
                        <Search className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">Aucun matériau trouvé pour "{searchTerm}"</p>
                    </div>
                </div>
            ) : (
                filteredMaterials.map((material) => (
                    <div key={material.id} className="card overflow-hidden group">
                        <div
                            className={`p-5 flex items-center justify-between cursor-pointer transition-colors ${expandedMaterial === material.id ? 'bg-slate-50 dark:bg-slate-800/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'}`}
                            onClick={() => {
                                if (expandedMaterial === material.id) {
                                    setExpandedMaterial(null);
                                } else {
                                    setExpandedMaterial(material.id);
                                    onLoadDetails(material.id);
                                }
                            }}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-blue-500 shadow-sm">
                                    <Package className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-800 dark:text-white text-lg">{material.name}</h3>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${material.is_panel
                                            ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                            : 'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                            {material.is_panel ? 'Panneau' : 'Bois Massif'}
                                        </span>
                                        {material.has_grain && (
                                            <span className="badge badge-amber">Fil du bois</span>
                                        )}
                                        {getTotalStock(material) < 2 && (
                                            <span className="flex items-center gap-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                                                <AlertTriangle className="h-3 w-3" /> STOCK BAS
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Ruler className="h-3 w-3" />
                                            {material.thickness} mm
                                        </span>
                                        {material.supplier_ref && (
                                            <span className="text-xs bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-300">
                                                Ref: {material.supplier_ref}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{getTotalStock(material)}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{getStockArea(material)} m²</div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); openStockModal(material.id); }}
                                    className="btn-success !py-2 !px-3"
                                    title="Ajouter du stock"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(material.id); }}
                                    className="bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 rounded-lg transition-colors !py-2 !px-3 flex items-center justify-center"
                                    title="Supprimer le matériau"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                                <div className="p-1 text-slate-400 group-hover:text-slate-600 transition-colors">
                                    {expandedMaterial === material.id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                                </div>
                            </div>
                        </div>

                        {expandedMaterial === material.id && (
                            <div className="border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 animate-fade-in">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Ruler className="h-4 w-4" />
                                        Inventaire des formats
                                    </h4>
                                    <button
                                        onClick={() => handleDeleteMaterial(material.id)}
                                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                        Supprimer le matériau
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {material.stock_items?.map((stock) => (
                                        <div key={stock.id} className="relative p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 text-slate-800 transition-all bg-white dark:bg-slate-800/50 group/stock">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm ${stock.is_offcut ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {stock.is_offcut ? 'Chute' : 'Panneau'}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => openEditStockModal(material.id, stock)}
                                                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                        title="Modifier"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStock(stock.id, material.id)}
                                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Supprimer"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 text-sm font-semibold">Dimensions</span>
                                                    <span className="font-bold text-slate-800">
                                                        {stock.width} × {stock.height} mm
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 text-sm font-semibold">Quantité</span>
                                                    <span className="font-bold text-lg text-amber-600">
                                                        {stock.quantity}
                                                    </span>
                                                </div>
                                                {stock.label && (
                                                    <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                                                        <Tag className="h-3 w-3" />
                                                        {stock.label}
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                                                    <Ruler className={`h-3 w-3 ${stock.grain_direction === 2 ? 'rotate-90' : ''}`} />
                                                    Fil: {stock.grain_direction === 1 ? 'Horizontal' : 'Vertical'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {(!material.stock_items || material.stock_items.length === 0) && (
                                        <div className="col-span-full py-8 text-center text-slate-400 italic">
                                            Aucun panneau en stock pour ce matériau.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}

            {/* Material Modal */}
            <div className="modal-overlay" style={{ display: isMaterialModalOpen ? 'flex' : 'none' }} onClick={() => setIsMaterialModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="text-xl font-bold text-slate-800">Nouveau Matériau</h2>
                    </div>
                    <form onSubmit={handleCreateMaterial}>
                        <div className="modal-body space-y-4">
                            <div>
                                <label htmlFor="material-name" className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                                <input
                                    id="material-name"
                                    type="text"
                                    required
                                    placeholder="ex: Mélaminé Blanc"
                                    className="input-field"
                                    value={materialForm.name}
                                    onChange={e => setMaterialForm({ ...materialForm, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="material-thickness" className="block text-sm font-medium text-slate-700 mb-1">Épaisseur (mm)</label>
                                    <input
                                        id="material-thickness"
                                        type="number"
                                        required
                                        min="1"
                                        className="input-field"
                                        value={materialForm.thickness}
                                        onChange={e => setMaterialForm({ ...materialForm, thickness: parseSafeFloat(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="material-price-type" className="block text-sm font-medium text-slate-700 mb-1">
                                        Coût ({materialForm.price_type === 'unit' ? '€/pièce' : `€/${materialForm.price_type}`})
                                    </label>
                                    <div className="flex gap-2">
                                        <div className="w-28">
                                            <select
                                                id="material-price-type"
                                                className="input-field"
                                                value={materialForm.price_type}
                                                onChange={e => setMaterialForm({ ...materialForm, price_type: e.target.value as 'm2' | 'm3' | 'unit' })}
                                                title="Type de prix"
                                            >
                                                <option value="m2">au m²</option>
                                                <option value="m3">au m³</option>
                                                <option value="unit">à la pièce</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <input
                                                id="material-cost"
                                                title="Prix"
                                                placeholder="0.00"
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="input-field"
                                                value={materialForm.cost_per_sqm}
                                                onChange={e => setMaterialForm({ ...materialForm, cost_per_sqm: parseSafeFloat(e.target.value) })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="is-panel"
                                        title="Est un panneau (autorise les chants)"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                                        checked={materialForm.is_panel}
                                        onChange={e => setMaterialForm({ ...materialForm, is_panel: e.target.checked })}
                                    />
                                    <label htmlFor="is-panel" className="text-sm font-medium text-slate-700 cursor-pointer">
                                        C'est un Panneau
                                    </label>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="has-grain"
                                        checked={materialForm.has_grain}
                                        onChange={e => setMaterialForm({ ...materialForm, has_grain: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="has-grain" className="text-sm font-medium text-slate-700 cursor-pointer">
                                        Fil du bois
                                    </label>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Package className="h-4 w-4 text-amber-500" />
                                    Stock Initial (Le panneau standard)
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="init-width" className="block text-sm font-medium text-slate-600 mb-1">Largeur (mm)</label>
                                        <input id="init-width" type="number" className="input-field bg-white" value={materialForm.initial_width} onChange={e => setMaterialForm({ ...materialForm, initial_width: parseSafeFloat(e.target.value) })} />
                                    </div>
                                    <div>
                                        <label htmlFor="init-height" className="block text-sm font-medium text-slate-600 mb-1">Hauteur (mm)</label>
                                        <input id="init-height" type="number" className="input-field bg-white" value={materialForm.initial_height} onChange={e => setMaterialForm({ ...materialForm, initial_height: parseSafeFloat(e.target.value) })} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="init-qty" className="block text-sm font-medium text-slate-600 mb-1">Quantité en stock</label>
                                    <input id="init-qty" type="number" min="0" className="input-field bg-white" value={materialForm.initial_quantity} onChange={e => setMaterialForm({ ...materialForm, initial_quantity: parseInt(e.target.value) })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer flex justify-end gap-3">
                            <button type="button" onClick={() => setIsMaterialModalOpen(false)} className="btn-secondary">Annuler</button>
                            <button type="submit" className="btn-primary">Créer</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Stock Modal */}
            <div className="modal-overlay" style={{ display: isStockModalOpen ? 'flex' : 'none' }} onClick={() => setIsStockModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="text-xl font-bold text-slate-800">
                            {editingStockId ? "Modifier le Panneau" : "Ajouter du Stock"}
                        </h2>
                    </div>
                    <form onSubmit={handleAddStock}>
                        <div className="modal-body space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="stock-width" className="block text-sm font-medium text-slate-700 mb-1">Largeur (mm)</label>
                                    <input id="stock-width" type="number" required min="1" className="input-field" value={stockForm.width} onChange={e => setStockForm({ ...stockForm, width: parseSafeFloat(e.target.value) })} />
                                </div>
                                <div>
                                    <label htmlFor="stock-height" className="block text-sm font-medium text-slate-700 mb-1">Hauteur (mm)</label>
                                    <input id="stock-height" type="number" required min="1" className="input-field" value={stockForm.height} onChange={e => setStockForm({ ...stockForm, height: parseSafeFloat(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div className="flex items-center gap-3">
                                    <input type="checkbox" id="offcut" className="h-5 w-5 text-amber-600 rounded border-slate-300" checked={stockForm.is_offcut} onChange={e => setStockForm({ ...stockForm, is_offcut: e.target.checked })} />
                                    <label htmlFor="offcut" className="text-sm text-slate-700">C'est une chute</label>
                                </div>
                                <div className="flex flex-col">
                                    <label htmlFor="grain-direction" className="text-xs font-bold text-slate-500 uppercase">Sens du fil</label>
                                    <select
                                        id="grain-direction"
                                        className="input-field !py-1 text-sm mt-1"
                                        value={stockForm.grain_direction}
                                        onChange={e => setStockForm({ ...stockForm, grain_direction: parseInt(e.target.value) })}
                                        title="Sens du fil"
                                    >
                                        <option value={1}>Horizontal (Largeur)</option>
                                        <option value={2}>Vertical (Hauteur)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="stock-quantity" className="block text-sm font-medium text-slate-700 mb-1">Quantité</label>
                                <input id="stock-quantity" type="number" required min="1" className="input-field" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: parseInt(e.target.value) })} />
                            </div>
                            <div>
                                <label htmlFor="stock-label" className="block text-sm font-medium text-slate-700 mb-1">Étiquette (optionnel)</label>
                                <input id="stock-label" type="text" className="input-field" placeholder="Ex: Chute gauche" value={stockForm.label} onChange={e => setStockForm({ ...stockForm, label: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer flex justify-end gap-3">
                            <button type="button" onClick={() => { setIsStockModalOpen(false); setEditingStockId(null); }} className="btn-secondary">Annuler</button>
                            <button type="submit" className="btn-primary">Enregistrer</button>
                        </div>
                    </form>
                </div>
            </div>

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </div>
    );
};
