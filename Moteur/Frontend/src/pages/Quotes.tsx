import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Plus, Download, Trash2, Search, User, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { QuoteService, type Quote, type QuoteItem } from '../services/quoteService';
import { ClientService, type Client } from '../services/clientService';
import { ProjectService, type Project } from '../services/projectService';
import { OptimizeService, type MaterialResult } from '../services/optimizeService';

const Quotes: React.FC = () => {
    const location = useLocation();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({
        client_id: 0,
        project_id: undefined as number | undefined,
        description: '',
        notes: '',
        status: 'draft',
        validity_days: 30,
        items: [] as QuoteItem[]
    });

    const [newItem, setNewItem] = useState<QuoteItem>({
        description: '',
        quantity: 1,
        unit: 'u',
        unit_price: 0,
        vat_rate: 20
    });

    // Confirm Dialog State
    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (location.state && clients.length > 0) {
            const { projectId, clientId, projectName } = location.state as { projectId: number; clientId: number; projectName: string };
            setForm(prev => ({
                ...prev,
                project_id: projectId,
                client_id: clientId || (clients.length > 0 ? clients[0].id : 0),
                description: `Devis pour le projet : ${projectName}`,
                items: []
            }));
            setIsModalOpen(true);
            // Clear location state to avoid reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state, clients]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [quotesData, clientsData, projectsData] = await Promise.all([
                QuoteService.getAll(),
                ClientService.getAll(),
                ProjectService.getAll()
            ]);
            setQuotes(quotesData);
            setClients(clientsData);
            setProjects(projectsData);
        } catch {
            toast.error('Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = () => {
        if (!newItem.description) return;
        setForm({ ...form, items: [...form.items, newItem] });
        setNewItem({ description: '', quantity: 1, unit: 'u', unit_price: 0, vat_rate: 20 });
    };

    const handleRemoveItem = (index: number) => {
        setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
    };

    const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
        const newItems = [...form.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setForm({ ...form, items: newItems });
    };

    const calculateTotalHT = () => {
        return form.items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await QuoteService.create(form);
            setIsModalOpen(false);
            setForm({
                client_id: 0, project_id: undefined, description: '', notes: '',
                status: 'draft', validity_days: 30, items: []
            });
            loadData();
            toast.success('Devis créé avec succès');
        } catch {
            toast.error('Erreur lors de la création du devis');
        }
    };

    const handleDownload = async (quote: Quote) => {
        try {
            await QuoteService.download(quote.id, quote.number);
            toast.success('Téléchargement lancé');
        } catch {
            toast.error('Erreur lors du téléchargement');
        }
    };

    const handleImportFromProject = async () => {
        if (!form.project_id) {
            toast.error('Veuillez sélectionner un projet d\'abord');
            return;
        }

        try {
            const result = await OptimizeService.getLatest(form.project_id);
            const newItems: QuoteItem[] = [];

            // Add material and edge costs
            Object.entries(result.result_data).forEach(([materialName, res]) => {
                const materialRes = res as MaterialResult;
                const panelsCount = materialRes.panels_used;
                if (panelsCount > 0) {
                    newItems.push({
                        description: `Panneaux : ${materialName} (${panelsCount} unités)`,
                        quantity: panelsCount,
                        unit: 'u',
                        unit_price: 0,
                        vat_rate: 20
                    });

                    // Add edge banding if available
                    if (materialRes.edge_banding_summary) {
                        Object.values(materialRes.edge_banding_summary).forEach(eb => {
                            newItems.push({
                                description: `Chant : ${eb.name} (${eb.thickness}mm)`,
                                quantity: Number(eb.length.toFixed(2)),
                                unit: 'ml',
                                unit_price: 0,
                                vat_rate: 20
                            });
                        });
                    }
                }
            });

            if (newItems.length === 0) {
                toast.info('Aucune donnée d\'optimisation trouvée pour ce projet');
            } else {
                setForm(prev => ({ ...prev, items: [...prev.items, ...newItems] }));
                toast.success('Données du projet importées (vérifiez les prix)');
            }
        } catch {
            toast.error('Pas d\'optimisation trouvée pour ce projet');
        }
    };

    const handleDeleteQuote = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer le devis',
            message: 'Voulez-vous vraiment supprimer ce devis ? Cette action est irréversible.',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await QuoteService.delete(id);
                    loadData();
                    toast.success('Devis supprimé');
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const getClientName = (id: number) => clients.find(c => c.id === id)?.name || 'Client inconnu';
    const getProjectName = (id?: number) => id ? projects.find(p => p.id === id)?.name : undefined;

    const filteredQuotes = quotes.filter(q => {
        const clientName = getClientName(q.client_id).toLowerCase();
        return q.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            clientName.includes(searchTerm.toLowerCase());
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        Devis
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez vos devis et facturations</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="h-5 w-5" />
                    Créer un Devis
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Rechercher un devis (numéro, client)..."
                    className="input-field pl-12"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* List */}
            {isLoading ? (
                <div className="text-center py-10">
                    <div className="spinner mx-auto mb-4"></div>
                    <p className="text-slate-500 dark:text-slate-400">Chargement des devis...</p>
                </div>
            ) : filteredQuotes.length === 0 ? (
                <div className="card text-center py-16">
                    <FileText className="h-16 w-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Aucun devis trouvé</h3>
                    <p className="text-slate-500 dark:text-slate-400">Créez votre premier devis pour commencer</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map((quote) => {
                        const clientName = getClientName(quote.client_id);
                        const projectName = getProjectName(quote.project_id);

                        return (
                            <div key={quote.id} className="card p-6 flex flex-col justify-between animate-fade-in-up stagger-item">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">#{quote.number}</span>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mt-1">{quote.description}</h3>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <select
                                                title="Changer le statut du devis"
                                                value={quote.status}
                                                onChange={(e) => {
                                                    const newStatus = e.target.value;
                                                    QuoteService.updateStatus(quote.id, newStatus)
                                                        .then(() => {
                                                            toast.success(`Statut mis à jour : ${newStatus}`);
                                                            loadData();
                                                        })
                                                        .catch(() => toast.error("Erreur lors de la mise à jour"));
                                                }}
                                                className={`text-[10px] font-bold px-2 py-1 rounded-lg border-none cursor-pointer outline-none transition-colors
                                                    ${quote.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                        quote.status === 'sent' ? 'bg-blue-100 text-blue-600' :
                                                            quote.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' :
                                                                quote.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                                                                    'bg-purple-100 text-purple-600'}`}
                                            >
                                                <option value="draft">BROUILLON</option>
                                                <option value="sent">ENVOYÉ</option>
                                                <option value="accepted">ACCEPTÉ</option>
                                                <option value="rejected">REFUSÉ</option>
                                                <option value="invoiced">FACTURE</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                            <User className="h-4 w-4 text-slate-400" />
                                            {clientName}
                                        </div>
                                        {projectName && (
                                            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                                                <Briefcase className="h-4 w-4 text-slate-400" />
                                                {projectName}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                    <div>
                                        <p className="text-xs text-slate-400">Total TTC</p>
                                        <p className="font-bold text-lg text-slate-800 dark:text-emerald-400">{quote.total_ttc.toFixed(2)} €</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownload(quote)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Télécharger PDF"
                                            aria-label="Télécharger PDF"
                                        >
                                            <Download className="h-5 w-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteQuote(quote.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Supprimer le devis"
                                            aria-label="Supprimer le devis"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-content !max-w-4xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nouveau Devis</h2>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="quote-client" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Client</label>
                                        <select
                                            id="quote-client"
                                            title="Sélectionner un client"
                                            className="input-field"
                                            value={form.client_id}
                                            onChange={e => setForm({ ...form, client_id: Number(e.target.value) })}
                                            required
                                        >
                                            <option value={0}>Sélectionner un client...</option>
                                            {clients.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="quote-project" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Projet (Optionnel)</label>
                                        <select
                                            id="quote-project"
                                            title="Sélectionner un projet"
                                            className="input-field"
                                            value={form.project_id || ''}
                                            onChange={e => setForm({ ...form, project_id: e.target.value ? Number(e.target.value) : undefined })}
                                        >
                                            <option value="">Aucun</option>
                                            {projects.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {form.project_id && (
                                    <div className="flex justify-start">
                                        <button
                                            type="button"
                                            onClick={handleImportFromProject}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1.5"
                                        >
                                            <Download className="h-4 w-4" />
                                            Importer les matériaux et chants du projet
                                        </button>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description du devis</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        required
                                        placeholder="Ex: Agencement cuisine M. Martin"
                                    />
                                </div>

                                {/* Items Section */}
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Lignes du devis</h3>

                                    {/* Items List */}
                                    <div className="space-y-3 mb-4">
                                        {form.items.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 items-start bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                                <div className="flex-1 grid grid-cols-12 gap-3">
                                                    <div className="col-span-6">
                                                        <input
                                                            type="text"
                                                            className="input-field !py-1.5 !text-sm"
                                                            value={item.description}
                                                            onChange={e => updateItem(idx, 'description', e.target.value)}
                                                            placeholder="Description"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            className="input-field !py-1.5 !text-sm"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(idx, 'quantity', Number(e.target.value))}
                                                            placeholder="Qté"
                                                        />
                                                    </div>
                                                    <div className="col-span-2">
                                                        <input
                                                            type="number"
                                                            className="input-field !py-1.5 !text-sm"
                                                            value={item.unit_price}
                                                            onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))}
                                                            placeholder="Prix"
                                                        />
                                                    </div>
                                                    <div className="col-span-2 text-right font-medium text-slate-700 dark:text-slate-300 flex items-center justify-end">
                                                        {(item.quantity * item.unit_price).toFixed(2)} €
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500" title="Supprimer l'article" aria-label="Supprimer l'article">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Item Form */}
                                    <div className="flex gap-3 pb-4 border-b border-slate-200 dark:border-slate-700">
                                        <input
                                            type="text"
                                            placeholder="Description..."
                                            className="input-field flex-[3]"
                                            value={newItem.description}
                                            onChange={e => setNewItem({ ...newItem, description: e.target.value })}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Qté"
                                            className="input-field flex-1"
                                            value={newItem.quantity}
                                            onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                        />
                                        <input
                                            type="number"
                                            placeholder="Prix U."
                                            className="input-field flex-1"
                                            value={newItem.unit_price}
                                            onChange={e => setNewItem({ ...newItem, unit_price: Number(e.target.value) })}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddItem}
                                            className="btn-secondary whitespace-nowrap"
                                            title="Ajouter l'article"
                                            aria-label="Ajouter l'article"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <div className="text-right">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Total HT</p>
                                            <p className="text-xl font-bold text-slate-800 dark:text-white">{calculateTotalHT().toFixed(2)} €</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Annuler</button>
                                <button type="submit" className="btn-primary">Créer le devis</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
            />
        </div>
    );
};

export default Quotes;
