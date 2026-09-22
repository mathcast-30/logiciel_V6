import React, { useState, useEffect } from 'react';
import { Package, Plus, CheckCircle2, Trash2, Calendar, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { OrderService, type Order, type OrderItemCreate, type OrderStatus } from '../services/orderService';
import { useStockData } from '../hooks/useStockData';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';

const STATUS_CONFIG: Record<OrderStatus, { label: string; badgeClass: string }> = {
    draft: { label: 'Brouillon', badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
    ordered: { label: 'Commandée', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
    received: { label: 'Reçue (En Stock)', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
    cancelled: { label: 'Annulée', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800' }
};

export const Orders: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Stock & suppliers data
    const { suppliers, materials } = useStockData();

    // New order form state
    const [selectedSupplierId, setSelectedSupplierId] = useState<number>(0);
    const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<OrderItemCreate[]>([]);

    // Line item under addition
    const [currentItemMaterialId, setCurrentItemMaterialId] = useState<number>(0);
    const [currentItemQty, setCurrentItemQty] = useState<number>(1);
    const [currentItemPrice, setCurrentItemPrice] = useState<number>(0);
    const [currentItemRef, setCurrentItemRef] = useState<string>('');

    // Confirmation dialog
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {}
    });

    const loadOrders = async () => {
        setIsLoading(true);
        try {
            const data = await OrderService.getAll();
            setOrders(data);
        } catch {
            toast.error('Erreur lors du chargement des commandes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    // When material selection changes in modal, auto-fill unit price if available
    const handleMaterialChange = (matId: number) => {
        setCurrentItemMaterialId(matId);
        const mat = materials.find(m => m.id === matId);
        if (mat) {
            setCurrentItemPrice(mat.cost_per_sqm || 0);
            if (mat.supplier_ref) {
                setCurrentItemRef(mat.supplier_ref);
            }
        }
    };

    const handleAddItem = () => {
        if (!currentItemMaterialId || currentItemQty <= 0) {
            toast.error('Veuillez sélectionner un matériau et une quantité valide');
            return;
        }
        setItems(prev => [
            ...prev,
            {
                material_id: currentItemMaterialId,
                quantity: currentItemQty,
                unit_price: currentItemPrice,
                reference: currentItemRef || undefined
            }
        ]);
        // Reset line input
        setCurrentItemMaterialId(0);
        setCurrentItemQty(1);
        setCurrentItemPrice(0);
        setCurrentItemRef('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSupplierId) {
            toast.error('Veuillez sélectionner un fournisseur');
            return;
        }
        if (items.length === 0) {
            toast.error('Ajoutez au moins un article à la commande');
            return;
        }

        setIsSubmitting(true);
        try {
            await OrderService.create({
                supplier_id: selectedSupplierId,
                notes: notes || undefined,
                expected_delivery_date: expectedDeliveryDate ? new Date(expectedDeliveryDate).toISOString() : undefined,
                items
            });
            toast.success('Commande créée avec succès');
            setIsCreateModalOpen(false);
            // Reset form
            setSelectedSupplierId(0);
            setExpectedDeliveryDate('');
            setNotes('');
            setItems([]);
            await loadOrders();
        } catch {
            toast.error('Erreur lors de la création de la commande');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReceiveOrder = (order: Order) => {
        setConfirmDialog({
            isOpen: true,
            title: `Réceptionner la commande #${order.id}`,
            message: `Confirmez-vous la réception de cette commande ? Les panneaux et quantités seront automatiquement intégrés dans le Stock.`,
            type: 'info',
            onConfirm: async () => {
                try {
                    await OrderService.receive(order.id);
                    toast.success(`Commande #${order.id} réceptionnée et intégrée au Stock`);
                    await loadOrders();
                } catch {
                    toast.error('Erreur lors de la réception de la commande');
                }
            }
        });
    };

    const handleDeleteOrder = (order: Order) => {
        setConfirmDialog({
            isOpen: true,
            title: `Supprimer la commande #${order.id}`,
            message: `Êtes-vous certain de vouloir supprimer cette commande ? Cette action est irréversible.`,
            type: 'danger',
            onConfirm: async () => {
                try {
                    await OrderService.delete(order.id);
                    toast.success('Commande supprimée');
                    await loadOrders();
                } catch {
                    toast.error('Erreur lors de la suppression de la commande');
                }
            }
        });
    };

    const handleStatusChange = async (orderId: number, newStatus: OrderStatus) => {
        try {
            await OrderService.updateStatus(orderId, newStatus);
            toast.success('Statut mis à jour');
            await loadOrders();
        } catch {
            toast.error('Erreur lors de la mise à jour du statut');
        }
    };

    const filteredOrders = orders.filter(ord => {
        if (statusFilter === 'all') return true;
        return ord.status === statusFilter;
    });

    const calculateFormTotal = () => {
        return items.reduce((acc, it) => acc + (it.quantity * it.unit_price), 0);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                        <Package className="h-7 w-7 text-blue-600" />
                        Commandes Fournisseurs
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Gestion des approvisionnements, suivi des livraisons et entrée automatique en stock
                    </p>
                </div>

                <button
                    onClick={() => {
                        if (suppliers.length > 0 && selectedSupplierId === 0) {
                            setSelectedSupplierId(suppliers[0].id);
                        }
                        setIsCreateModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                    <Plus className="h-5 w-5" />
                    Nouvelle Commande
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex flex-wrap gap-2 items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl w-fit">
                {['all', 'draft', 'ordered', 'received', 'cancelled'].map(st => (
                    <button
                        key={st}
                        onClick={() => setStatusFilter(st)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                            statusFilter === st
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {st === 'all' ? 'Toutes' : STATUS_CONFIG[st as OrderStatus]?.label || st}
                    </button>
                ))}
            </div>

            {/* Orders list */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
                    <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Aucune commande trouvée</h3>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        Créez votre première commande fournisseur pour approvisionner vos matériaux et alimenter votre stock à réception.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredOrders.map(order => {
                        const statusBadge = STATUS_CONFIG[order.status] || STATUS_CONFIG.draft;
                        return (
                            <div
                                key={order.id}
                                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 shadow-sm hover:border-blue-500/40 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                            >
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className="font-mono text-base font-bold text-slate-900 dark:text-white">
                                            CMD-{order.id.toString().padStart(4, '0')}
                                        </span>
                                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusBadge.badgeClass}`}>
                                            {statusBadge.label}
                                        </span>
                                        {order.quote_id && (
                                            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800 font-medium">
                                                Lien Devis #{order.quote_id}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                                            {order.supplier_name || `Fournisseur #${order.supplier_id}`}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                            Créée le {new Date(order.created_at).toLocaleDateString('fr-FR')}
                                        </span>
                                        {order.expected_delivery_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3.5 w-3.5 text-blue-500" />
                                                Livraison estimée : {new Date(order.expected_delivery_date).toLocaleDateString('fr-FR')}
                                            </span>
                                        )}
                                    </div>

                                    {/* Items summary */}
                                    <div className="text-xs text-slate-600 dark:text-slate-300 pt-1">
                                        <span className="font-semibold">{order.items?.length || 0} article(s) :</span>{' '}
                                        {order.items?.map((it, idx) => (
                                            <span key={it.id || idx} className="inline-block bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded mr-1.5 mt-1">
                                                {it.material_name || `Mat #${it.material_id}`} (x{it.quantity})
                                            </span>
                                        ))}
                                    </div>

                                    {order.notes && (
                                        <p className="text-xs italic text-slate-400">Notes : {order.notes}</p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4 self-stretch md:self-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-700">
                                    <div className="text-right">
                                        <div className="text-xs text-slate-400 uppercase font-semibold">Total HT</div>
                                        <div className="text-xl font-bold text-slate-900 dark:text-white">
                                            {order.total_cost.toFixed(2)} €
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {order.status === 'draft' && (
                                            <button
                                                onClick={() => handleStatusChange(order.id, 'ordered')}
                                                className="px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg hover:bg-blue-100 transition-colors"
                                            >
                                                Marquer commandée
                                            </button>
                                        )}

                                        {order.status !== 'received' && order.status !== 'cancelled' && (
                                            <button
                                                onClick={() => handleReceiveOrder(order)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-sm cursor-pointer"
                                                title="Réceptionner et intégrer les quantités au stock"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Marquer reçue
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDeleteOrder(order)}
                                            className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                                            title="Supprimer la commande"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Order Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <Package className="h-5 w-5 text-blue-600" />
                                Nouvelle Commande Fournisseur
                            </h2>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateOrder} className="space-y-4">
                            {/* Supplier & Delivery */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Fournisseur *
                                    </label>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={e => setSelectedSupplierId(Number(e.target.value))}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        required
                                    >
                                        <option value={0}>Sélectionnez un fournisseur</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Date de livraison prévue
                                    </label>
                                    <input
                                        type="date"
                                        value={expectedDeliveryDate}
                                        onChange={e => setExpectedDeliveryDate(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Notes / Référence de commande
                                </label>
                                <input
                                    type="text"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    placeholder="Ex: Projet X, livraison à l'atelier"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>

                            {/* Add line item section */}
                            <div className="bg-slate-50 dark:bg-slate-750 p-4 rounded-xl space-y-3 border border-slate-200 dark:border-slate-700">
                                <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                    Ajouter un matériau
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] text-slate-500 mb-1">Matériau</label>
                                        <select
                                            value={currentItemMaterialId}
                                            onChange={e => handleMaterialChange(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs outline-none"
                                        >
                                            <option value={0}>Sélectionnez un matériau</option>
                                            {materials.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.thickness}mm)</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1">Quantité</label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={currentItemQty}
                                            onChange={e => setCurrentItemQty(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] text-slate-500 mb-1">Prix unitaire (€)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min={0}
                                            value={currentItemPrice}
                                            onChange={e => setCurrentItemPrice(Number(e.target.value))}
                                            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <input
                                        type="text"
                                        value={currentItemRef}
                                        onChange={e => setCurrentItemRef(e.target.value)}
                                        placeholder="Référence catalogue / optionnel"
                                        className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs outline-none w-1/2"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="px-4 py-1.5 bg-slate-800 dark:bg-slate-600 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
                                    >
                                        + Ajouter à la liste
                                    </button>
                                </div>
                            </div>

                            {/* Added items list */}
                            {items.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">Articles commandés :</h4>
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                        {items.map((item, idx) => {
                                            const mat = materials.find(m => m.id === item.material_id);
                                            return (
                                                <div key={idx} className="flex justify-between items-center p-3 text-xs bg-white dark:bg-slate-800">
                                                    <div>
                                                        <span className="font-semibold">{mat?.name || `Mat #${item.material_id}`}</span>
                                                        <span className="text-slate-500 ml-2">x{item.quantity} à {item.unit_price.toFixed(2)} €</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold">{(item.quantity * item.unit_price).toFixed(2)} €</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(idx)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="text-right text-sm font-bold text-slate-800 dark:text-white pt-2">
                                        Total estimé : {calculateFormTotal().toFixed(2)} € HT
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Création...' : 'Créer la commande'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                onConfirm={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                }}
                onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
            />
        </div>
    );
};

export default Orders;
