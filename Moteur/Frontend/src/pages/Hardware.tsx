import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Edit2, Search, Wrench,
    Package, Filter, PenTool, Calculator, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { HardwareService, type Hardware, type HardwareAssembly } from '../services/hardwareService';

export function HardwarePage() {
    const [items, setItems] = useState<Hardware[]>([]);
    const [assemblies, setAssemblies] = useState<HardwareAssembly[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'inventory' | 'rules'>('inventory');

    // Modal States (Inventory)
    const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
    const [editingHardwareId, setEditingHardwareId] = useState<number | null>(null);
    const [hardwareForm, setHardwareForm] = useState<Partial<Hardware>>({
        reference: '', name: '', category: 'other', cost_unit: 0, stock_quantity: 0, min_stock: 5, supplier: ''
    });

    // Modal States (Rules)
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [ruleForm, setRuleForm] = useState<Partial<HardwareAssembly>>({
        name: '', description: '', conditions: '{}', items: '[]'
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: '', message: '', onConfirm: () => { }, type: 'danger' as 'danger' | 'warning'
    });

    const categories = [
        { id: 'all', label: 'Tout', icon: Filter },
        { id: 'hinge', label: 'Charnières', icon: PenTool },
        { id: 'slide', label: 'Coulisses', icon: Package },
        { id: 'handle', label: 'Poignées', icon: Wrench },
        { id: 'screw', label: 'Visserie', icon: Wrench },
        { id: 'feet', label: 'Pieds', icon: Package },
        { id: 'other', label: 'Divers', icon: Package },
    ];

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            if (activeTab === 'inventory') {
                const data = await HardwareService.getAll(selectedCategory);
                setItems(data);
            } else {
                const data = await HardwareService.getAllAssemblies();
                setAssemblies(data);
            }
        } catch {
            toast.error("Erreur de chargement");
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, selectedCategory]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleHardwareSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingHardwareId) {
                await HardwareService.update(editingHardwareId, hardwareForm);
                toast.success("Article modifié");
            } else {
                await HardwareService.create(hardwareForm);
                toast.success("Article créé");
            }
            setIsHardwareModalOpen(false);
            loadData();
        } catch {
            toast.error("Erreur lors de l'enregistrement");
        }
    };

    const handleRuleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validate JSON
            try { JSON.parse(ruleForm.conditions || '{}'); } catch { return toast.error("Format Conditions (JSON) invalide"); }
            try { JSON.parse(ruleForm.items || '[]'); } catch { return toast.error("Format Articles (JSON) invalide"); }

            await HardwareService.createAssembly(ruleForm);
            toast.success("Règle enregistrée");
            setIsRuleModalOpen(false);
            loadData();
        } catch {
            toast.error("Erreur lors de l'enregistrement de la règle");
        }
    };

    const openHardwareEdit = (item: Hardware) => {
        setEditingHardwareId(item.id);
        setHardwareForm({ ...item });
        setIsHardwareModalOpen(true);
    };

    const filteredItems = items.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.reference.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Wrench className="h-8 w-8 text-indigo-500" />
                        Quincaillerie
                    </h1>
                    <p className="text-slate-500 mt-1">Gérez vos accessoires, visserie et règles de pose.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Rechercher..."
                            aria-label="Rechercher"
                            className="input-field pl-10 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab === 'inventory' ? (
                        <button onClick={() => { setEditingHardwareId(null); setHardwareForm({ reference: '', name: '', category: 'other', cost_unit: 0, stock_quantity: 0, min_stock: 5 }); setIsHardwareModalOpen(true); }} className="btn-primary flex items-center gap-2">
                            <Plus className="h-5 w-5" /> Nouvel Article
                        </button>
                    ) : (
                        <button onClick={() => { setRuleForm({ name: '', description: '', conditions: '{\n  "keywords": ["porte"],\n  "max_height": 1000\n}', items: '[\n  {\n    "reference": "REF_CH_1",\n    "quantity": 2,\n    "formula": "ceil(height / 500)"\n  }\n]' }); setIsRuleModalOpen(true); }} className="btn-primary flex items-center gap-2 !bg-indigo-600">
                            <Calculator className="h-5 w-5" /> Nouvelle Règle
                        </button>
                    )}
                </div>
            </header>

            {/* Tab Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit border border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Package className="h-4 w-4" /> Inventaire
                </button>
                <button onClick={() => setActiveTab('rules')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'rules' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                    <Calculator className="h-4 w-4" /> Règles de calcul
                </button>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="spinner !w-12 !h-12 border-4 !border-indigo-500 !border-t-transparent mx-auto" />
                    <p className="mt-4 text-slate-500 font-medium">Chargement...</p>
                </div>
            ) : activeTab === 'inventory' ? (
                <>
                    <div className="flex overflow-x-auto pb-2 gap-2">
                        {categories.map(cat => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${selectedCategory === cat.id ? 'bg-indigo-100 text-indigo-700 font-bold border border-indigo-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`} title={cat.label}>
                                <cat.icon className="h-4 w-4" /> {cat.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="card p-5 group hover:border-indigo-400 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div><span className="text-xs font-bold text-slate-400 block">Ref: {item.reference}</span><h3 className="font-bold text-lg">{item.name}</h3></div>
                                    <div className={`px-2 py-1 rounded-md text-xs font-bold ${item.stock_quantity <= item.min_stock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.stock_quantity} en stock</div>
                                </div>
                                <div className="flex justify-between text-sm mb-4"><span className="text-slate-500">Prix unitaire</span><span className="font-semibold">{item.cost_unit.toFixed(2)} €</span></div>
                                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    {item.product_url && (
                                        <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg" title="Voir le produit">
                                            <Search className="h-4 w-4" />
                                        </a>
                                    )}
                                    <button onClick={() => openHardwareEdit(item)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg" title="Modifier"><Edit2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {assemblies.map(rule => (
                        <div key={rule.id} className="card p-5 border-l-4 border-l-indigo-500">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-indigo-400" /> {rule.name}</h3>
                                    <p className="text-slate-500 text-sm">{rule.description || 'Applique des articles selon les dimensions de la pièce.'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="btn-secondary !p-2" title="Modifier"><Edit2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-8 text-xs font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div><p className="text-indigo-600 font-bold mb-1 uppercase tracking-tighter">Conditions</p>{rule.conditions}</div>
                                <div><p className="text-emerald-600 font-bold mb-1 uppercase tracking-tighter">Action / Articles</p>{rule.items}</div>
                            </div>
                        </div>
                    ))}
                    {assemblies.length === 0 && (
                        <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">Aucune règle définie. Automatisez votre calcul de charnières et coulisses ici !</p>
                        </div>
                    )}
                </div>
            )}

            {/* Hardware Modal */}
            {isHardwareModalOpen && (
                <div className="modal-overlay" onClick={() => setIsHardwareModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2 className="text-xl font-bold">{editingHardwareId ? 'Modifier' : 'Nouvel Article'}</h2></div>
                        <form onSubmit={handleHardwareSubmit}>
                            <div className="modal-body space-y-4">
                                <input required placeholder="Référence *" title="Référence" type="text" className="input-field" value={hardwareForm.reference} onChange={e => setHardwareForm({ ...hardwareForm, reference: e.target.value })} />
                                <input required placeholder="Nom *" title="Nom" type="text" className="input-field" value={hardwareForm.name} onChange={e => setHardwareForm({ ...hardwareForm, name: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <select title="Catégorie" className="input-field" value={hardwareForm.category} onChange={e => setHardwareForm({ ...hardwareForm, category: e.target.value as Hardware['category'] })} >
                                        {categories.filter(c => c.id !== 'all').map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}
                                    </select>
                                    <input placeholder="Prix (€)" title="Prix" type="number" step="0.01" className="input-field" value={hardwareForm.cost_unit} onChange={e => setHardwareForm({ ...hardwareForm, cost_unit: parseFloat(e.target.value) })} />
                                </div>
                                <input placeholder="Lien Produit (URL)" title="Lien Produit" type="url" className="input-field" value={hardwareForm.product_url || ''} onChange={e => setHardwareForm({ ...hardwareForm, product_url: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input placeholder="Stock Actuel" title="Stock" type="number" className="input-field" value={hardwareForm.stock_quantity} onChange={e => setHardwareForm({ ...hardwareForm, stock_quantity: parseInt(e.target.value) })} />
                                    <input placeholder="Stock Min" title="Min Stock" type="number" className="input-field" value={hardwareForm.min_stock} onChange={e => setHardwareForm({ ...hardwareForm, min_stock: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3"><button type="submit" className="btn-primary">Enregistrer</button></div>
                        </form>
                    </div>
                </div>
            )}

            {/* Rule Modal */}
            {isRuleModalOpen && (
                <div className="modal-overlay" onClick={() => setIsRuleModalOpen(false)}>
                    <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header"><h2 className="text-xl font-bold">Configuration de Règle de Pose</h2></div>
                        <form onSubmit={handleRuleSubmit}>
                            <div className="modal-body space-y-4">
                                <input required placeholder="Nom de la règle (ex: Porte Standard)" title="Nom" type="text" className="input-field" value={ruleForm.name} onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })} />
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Si la pièce correspond (JSON) :</label>
                                        <textarea title="Conditions" rows={4} className="input-field font-mono text-sm" value={ruleForm.conditions} onChange={e => setRuleForm({ ...ruleForm, conditions: e.target.value })} />
                                        <p className="text-xs text-slate-400 mt-1">Ex: &#123; "keywords": ["porte"], "min_height": 900 &#125;</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-widest">Alors ajouter ces articles (JSON) :</label>
                                        <textarea title="Articles" rows={6} className="input-field font-mono text-sm" value={ruleForm.items} onChange={e => setRuleForm({ ...ruleForm, items: e.target.value })} />
                                        <p className="text-xs text-slate-400 mt-1">Ex: [&#123; "reference": "charniere_blum", "quantity": 2 &#125;]</p>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3"><button type="submit" className="btn-primary">Enregistrer la Règle</button></div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type} />
        </div>
    );
}
