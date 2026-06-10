import React, { useState, useEffect, useRef } from 'react';
import { Truck, ExternalLink, RefreshCw, Trash2, Edit, CheckCircle, Database, Search, Upload, Plus, Globe, Download, X, Package, AlertCircle, Filter, Link as LinkIcon, Layers, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SupplierService, type Supplier, type SupplierMaterial, type ScrapedProduct, type ScrapingResult } from '../../services/supplierService';
import { type MaterialWithStock } from '../../services/materialService';
import { ConfirmDialog } from '../UI/ConfirmDialog';
import { ErrorBoundary } from '../UI/ErrorBoundary';

export interface MaterialForm {
    name: string;
    thickness: number;
    cost_per_sqm: number;
    price_type: 'm2' | 'm3' | 'unit';
    supplier_ref: string;
    has_grain: boolean;
    is_panel: boolean;
    initial_width: number;
    initial_height: number;
    initial_quantity: number;
}

interface SuppliersTabProps {
    suppliers: Supplier[];
    materials: MaterialWithStock[];
    isLoading: boolean;
    onRefreshSuppliers: () => Promise<void>;
    onRefreshMaterials: () => Promise<void>;
    onOpenMaterialModal: (initialData?: Partial<MaterialForm>) => void;
}

export function SuppliersTab({
    suppliers,
    materials,
    isLoading,
    onRefreshSuppliers,
    onRefreshMaterials,
    onOpenMaterialModal
}: SuppliersTabProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSupplier, setExpandedSupplier] = useState<number | null>(null);

    // Supplier form state
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);
    const [supplierForm, setSupplierForm] = useState({
        name: '', email: '', phone: '', website: '', comments: ''
    });

    // Catalog state
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierCatalog, setSupplierCatalog] = useState<SupplierMaterial[]>([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogEssenceFilter, setCatalogEssenceFilter] = useState('all');
    const [catalogTypeFilter, setCatalogTypeFilter] = useState('all');
    const [catalogTreatmentFilter, setCatalogTreatmentFilter] = useState('all');
    const [catalogCertificationFilter, setCatalogCertificationFilter] = useState('all');

    // Scraping state
    const [isScrapingModalOpen, setIsScrapingModalOpen] = useState(false);
    const [scrapingUrl, setScrapingUrl] = useState('');
    const [maxPages, setMaxPages] = useState(5);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapingMessage, setScrapingMessage] = useState('');
    const [scrapingResult, setScrapingResult] = useState<ScrapingResult | null>(null);
    
    // Association & Product edit state
    const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false);
    const [isProductEditModalOpen, setIsProductEditModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<SupplierMaterial | ScrapedProduct | null>(null);
    const [targetMaterialId, setTargetMaterialId] = useState<number | null>(null);

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    // Stream Refs
    const progressBarRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplierId) {
                await SupplierService.update(editingSupplierId, supplierForm);
                toast.success('Fournisseur modifié');
            } else {
                await SupplierService.create(supplierForm);
                toast.success('Fournisseur créé');
            }
            setIsSupplierModalOpen(false);
            setEditingSupplierId(null);
            setSupplierForm({ name: '', email: '', phone: '', website: '', comments: '' });
            await onRefreshSuppliers();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Erreur");
        }
    };

    const handleDeleteSupplier = async (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer ce fournisseur ?',
            message: 'Tous les matériaux associés perdront leur lien fournisseur. Continuer ?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await SupplierService.delete(id);
                    await onRefreshSuppliers();
                    toast.success('Fournisseur supprimé');
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const openEditSupplierModal = (s: Supplier) => {
        setEditingSupplierId(s.id);
        setSupplierForm({
            name: s.name,
            email: s.email || '',
            phone: s.phone || '',
            website: s.website || '',
            comments: s.comments || ''
        });
        setIsSupplierModalOpen(true);
    };

    const loadSupplierCatalog = async (supplierId: number) => {
        try {
            const data = await SupplierService.getCatalog(supplierId);
            setSupplierCatalog(data);
        } catch (error) {
            toast.error("Erreur lors du chargement du catalogue");
        }
    };

    const handleOpenCatalog = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setIsCatalogModalOpen(true);
        loadSupplierCatalog(supplier.id);
    };

    const handleRefreshPrice = async (materialId: number) => {
        try {
            const result = await SupplierService.refreshMaterialPrice(materialId);
            toast.success(`Prix mis à jour : ${result.price}€`);
            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
        } catch (error) {
            toast.error("Impossible de rafraîchir le prix");
        }
    };

    const handleRefreshCatalog = async () => {
        if (!selectedSupplier) return;
        try {
            const promise = SupplierService.refreshCatalog(selectedSupplier.id);
            toast.promise(promise, {
                loading: 'Mise à jour des prix en cours...',
                success: 'Catalogue mis à jour !',
                error: 'Erreur lors de la mise à jour'
            });
            await promise;
            loadSupplierCatalog(selectedSupplier.id);
        } catch { }
    };

    const handleExportCSV = async () => {
        if (!selectedSupplier) return;
        try {
            const blob = await SupplierService.exportCatalogCSV(selectedSupplier.id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `catalogue_${selectedSupplier.name}_${new Date().toISOString().slice(0, 10)}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Erreur lors de l'export CSV");
        }
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedSupplier || !event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];

        try {
            const result = await SupplierService.importCatalogCSV(selectedSupplier.id, file);
            toast.success(`${result.imported} produits importés !`);
            loadSupplierCatalog(selectedSupplier.id);
        } catch (error) {
            toast.error("Erreur lors de l'import CSV");
        }
        event.target.value = ''; // Reset
    };

    const handleAnalyzeScraping = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scrapingUrl) return;

        setIsScraping(true);
        setScrapingMessage("Initialisation de l'explorateur IA...");
        setScrapingResult(null);

        if (progressBarRef.current) {
            progressBarRef.current.style.width = '0%';
        }

        try {
            await SupplierService.analyzeUrlStream(
                scrapingUrl,
                maxPages,
                (message, progress) => {
                    if (isMountedRef.current) {
                        setScrapingMessage(message);
                        if (progressBarRef.current && progress !== undefined) {
                            progressBarRef.current.style.width = `${progress}%`;
                        }
                    }
                },
                (result) => {
                    if (isMountedRef.current) {
                        setScrapingResult(result);
                        setIsScraping(false);
                    }
                }
            );
        } catch (error: unknown) {
            if (isMountedRef.current) {
                toast.error(error instanceof Error ? error.message : "Erreur de scraping");
                setIsScraping(false);
            }
        }
    };

    const handleUpdateScrapedProduct = (index: number, updates: Partial<ScrapedProduct>) => {
        if (!scrapingResult) return;
        const newProducts = [...scrapingResult.products];
        newProducts[index] = { ...newProducts[index], ...updates };
        setScrapingResult({ ...scrapingResult, products: newProducts });
    };

    const handleRemoveScrapedProduct = (urlToRemove: string) => {
        if (!scrapingResult) return;
        setScrapingResult(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                products: prev.products.filter(p => p.url !== urlToRemove)
            };
        });
    };

    const handleImportAll = async () => {
        if (!scrapingResult || !selectedSupplier) return;
        try {
            let importedCount = 0;
            for (const prod of scrapingResult.products) {
                if (!prod.price) continue;
                try {
                    await SupplierService.addMaterial(selectedSupplier.id, {
                        name: prod.name,
                        reference: prod.url,
                        group_name: prod.group_name || 'Divers',
                        price: prod.price,
                        width: 0,
                        height: 0,
                        thickness: 0,
                        is_archived: false
                    });
                    importedCount++;
                } catch (e) {
                    console.error("Failed to import product", prod.name, e);
                }
            }
            toast.success(`${importedCount} produits importés`);
            setIsScrapingModalOpen(false);
            loadSupplierCatalog(selectedSupplier.id);
        } catch (error) {
            toast.error("Erreur globale lors de l'import");
        }
    };

    const handleToggleArchive = async (product: SupplierMaterial) => {
        try {
            await SupplierService.updateMaterial(product.id, { is_archived: !product.is_archived });
            toast.success(product.is_archived ? "Produit désarchivé" : "Produit archivé");
            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
        } catch (error) {
            toast.error("Erreur lors du changement d'état");
        }
    };

    const handleOpenAssociation = (product: SupplierMaterial | ScrapedProduct) => {
        setEditingProduct(product);
        setTargetMaterialId('material_id' in product ? product.material_id || null : null);
        setIsAssociationModalOpen(true);
    };

    const filteredSuppliers = suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Truck className="h-8 w-8 text-green-500" />
                        Fournisseurs & Catalogues
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Scrapez et importez les catalogues pour la mise à jour automatique des prix.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-green-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Rechercher un fournisseur..."
                            className="input-field pl-10 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => { setEditingSupplierId(null); setSupplierForm({ name: '', email: '', phone: '', website: '', comments: '' }); setIsSupplierModalOpen(true); }}
                        className="btn-primary flex items-center gap-2 whitespace-nowrap !bg-green-600 !border-green-700 hover:!bg-green-700"
                    >
                        <Plus className="h-5 w-5" />
                        Nouveau Fournisseur
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSuppliers.map(supplier => (
                        <div key={supplier.id} className="card overflow-hidden group hover:border-green-400 transition-all">
                            <div className="p-5 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-sm">
                                            <Truck className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{supplier.name}</h3>
                                            <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5">
                                                Visiter le site <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEditSupplierModal(supplier)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg">
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDeleteSupplier(supplier.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-2 mb-4">
                                    {supplier.email && <div className="text-sm text-slate-600 truncate">📧 {supplier.email}</div>}
                                    {supplier.phone && <div className="text-sm text-slate-600">📞 {supplier.phone}</div>}
                                    {supplier.comments && <div className="text-xs text-slate-400 line-clamp-2 mt-2 italic bg-slate-50 p-2 rounded">{supplier.comments}</div>}
                                </div>
                                <div className="pt-4 border-t border-slate-100 mt-auto grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleOpenCatalog(supplier)}
                                        className="btn-secondary !py-2 !px-3 text-sm flex items-center justify-center gap-2"
                                    >
                                        <Database className="h-4 w-4" />
                                        Catalogue
                                    </button>
                                    <button
                                        onClick={() => { setSelectedSupplier(supplier); setIsScrapingModalOpen(true); setScrapingUrl(supplier.website || ''); }}
                                        className="btn-primary !bg-slate-800 hover:!bg-slate-900 border-none !py-2 !px-3 text-sm flex items-center justify-center gap-2"
                                    >
                                        <Globe className="h-4 w-4" />
                                        Scraper IA
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {suppliers.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500">Aucun fournisseur enregistré.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Supplier Modal */}
            <div className="modal-overlay" style={{ display: isSupplierModalOpen ? undefined : 'none' }} onClick={() => setIsSupplierModalOpen(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="text-xl font-bold text-slate-800">
                            {editingSupplierId ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}
                        </h2>
                    </div>
                    <form onSubmit={handleCreateSupplier}>
                        <div className="modal-body space-y-4">
                            <div>
                                <label htmlFor="supp-name" className="block text-sm font-medium text-slate-700 mb-1">Nom *</label>
                                <input id="supp-name" type="text" required className="input-field" value={supplierForm.name} onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="supp-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                    <input id="supp-email" type="email" className="input-field" value={supplierForm.email} onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })} />
                                </div>
                                <div>
                                    <label htmlFor="supp-phone" className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                                    <input id="supp-phone" type="text" className="input-field" value={supplierForm.phone} onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="supp-website" className="block text-sm font-medium text-slate-700 mb-1">Site Web (URL pour le scraping)</label>
                                <input id="supp-website" type="url" placeholder="https://..." className="input-field" value={supplierForm.website} onChange={e => setSupplierForm({ ...supplierForm, website: e.target.value })} />
                            </div>
                            <div>
                                <label htmlFor="supp-comments" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                <textarea id="supp-comments" rows={2} placeholder="Informations complémentaires..." className="input-field" value={supplierForm.comments} onChange={e => setSupplierForm({ ...supplierForm, comments: e.target.value })} />
                            </div>
                        </div>
                        <div className="modal-footer flex justify-end gap-3">
                            <button type="button" onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }} className="btn-secondary">Annuler</button>
                            <button type="submit" className="btn-primary !bg-green-600 hover:!bg-green-700">{editingSupplierId ? "Enregistrer" : "Créer"}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Scraping Modal */}
            <ErrorBoundary>
                <div className="modal-overlay" style={{ display: isScrapingModalOpen ? undefined : 'none' }} onClick={() => setIsScrapingModalOpen(false)}>
                    <div className="modal-content max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="modal-header border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Globe className="h-6 w-6 text-blue-500" />
                                Exploration IA Fournisseur
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Entrez l'URL d'une catégorie ou d'un site fournisseur pour trouver automatiquement les produits.</p>
                        </div>

                        <div className="p-6 overflow-hidden flex flex-col flex-1">
                            <form onSubmit={handleAnalyzeScraping} className="flex gap-2 mb-6 shrink-0">
                                <div className="flex gap-2 mb-4 w-full">
                                    <div className="flex-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input type="text" className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" placeholder="URL d'une catégorie" value={scrapingUrl} onChange={e => setScrapingUrl(e.target.value)} />
                                    </div>
                                    <div className="w-32 relative" title="Nombre de pages à scanner">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-xs text-slate-400 font-medium">Pages</span>
                                        </div>
                                        <input type="number" min="1" max="2000" aria-label="Nombre de pages à scanner" className="block w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center" value={maxPages} onChange={e => setMaxPages(Math.min(2000, parseInt(e.target.value) || 5))} />
                                    </div>
                                    <button type="submit" disabled={isScraping || !scrapingUrl} className="btn-primary min-w-[200px] flex items-center justify-center gap-2 transition-all">
                                        {isScraping ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span className="truncate max-w-[150px]">{scrapingMessage || 'Analyse...'}</span>
                                            </>
                                        ) : (
                                            <><Search className="h-4 w-4" /> Lancer l'exploration</>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {scrapingResult && (
                                <div className="flex-1 overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-4 shrink-0">
                                        <h3 className="font-semibold text-slate-700 flex flex-col gap-1 w-full">
                                            {isScraping ? (
                                                <div className="w-full">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-blue-600 flex items-center gap-2">
                                                            <RefreshCw className="h-3 w-3 animate-spin" />
                                                            Exploration en cours...
                                                        </span>
                                                        <span className="text-xs text-slate-400">{scrapingResult?.scanned_pages || 0} / {maxPages} pages</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div ref={progressBarRef} className="progress-bar-fill"></div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 truncate italic">{scrapingMessage}</p>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <span>
                                                        <span className="text-green-600 font-bold">{scrapingResult.products.length}</span> produits trouvés
                                                        <span className="text-xs text-slate-400 font-normal ml-2">({scrapingResult.scanned_pages} pages scannées)</span>
                                                    </span>
                                                    <button onClick={handleImportAll} className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-2" disabled={scrapingResult.products.length === 0}>
                                                        <Download className="h-3.5 w-3.5" /> Tout importer
                                                    </button>
                                                </div>
                                            )}
                                        </h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {scrapingResult.products.map((prod, idx) => (
                                            <div key={prod.url || `scraped-${idx}`} className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col gap-2 group relative">
                                                <button onClick={() => handleRemoveScrapedProduct(prod.url)} className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg z-30 transition-all transform hover:scale-110 active:scale-90" title="Supprimer ce produit">
                                                    <X className="h-4 w-4 stroke-[3px]" />
                                                </button>

                                                {prod.image_url ? (
                                                    <div className="h-32 w-full bg-slate-50 rounded flex items-center justify-center mb-2 overflow-hidden relative">
                                                        <img src={prod.image_url} alt={prod.name} className="max-h-full max-w-full object-contain" />
                                                        {prod.category && prod.category !== 'Divers' && (
                                                            <span className="absolute top-2 right-2 bg-slate-800/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">{prod.category}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-32 w-full bg-slate-50 rounded flex items-center justify-center mb-2 text-slate-300 relative">
                                                        <Package className="h-8 w-8" />
                                                        {prod.category && prod.category !== 'Divers' && (
                                                            <span className="absolute top-2 right-2 bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">{prod.category}</span>
                                                        )}
                                                    </div>
                                                )}

                                                <h4 className="font-medium text-slate-800 text-sm line-clamp-2 min-h-[2.5em]" title={prod.name}>{prod.name}</h4>

                                                <div className="mt-auto pt-2 flex justify-between items-end border-t border-slate-50">
                                                    <div>
                                                        {prod.price_changed && (
                                                            <div className="flex items-center gap-1 mb-1">
                                                                <span className="text-[10px] line-through text-slate-400">{prod.old_price?.toFixed(2)} €</span>
                                                                <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">Δ</span>
                                                            </div>
                                                        )}
                                                        {prod.price ? (
                                                            <div className="flex items-center gap-2">
                                                                <input type="number" title="Saisir le prix" className={`w-20 px-1 py-0.5 border rounded font-bold text-sm ${prod.anomaly ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'}`} value={prod.price} onChange={e => handleUpdateScrapedProduct(idx, { price: parseFloat(e.target.value) || 0 })} />
                                                                <span className="text-sm font-bold text-slate-500">€</span>
                                                                {prod.is_new && <span className="text-[9px] bg-blue-500 text-white px-1 rounded font-bold">NOUVEAU</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">Prix sur devis</span>
                                                        )}
                                                        <div className="mt-1">
                                                            <input type="text" title="Dimensions" placeholder="Dimensions (ex: 18x250x2500mm)" className="w-full text-[10px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-none" value={prod.dimensions || ''} onChange={e => handleUpdateScrapedProduct(idx, { dimensions: e.target.value })} />
                                                        </div>
                                                        {prod.anomaly && (
                                                            <div className="text-[9px] text-red-600 font-medium flex items-center gap-1 mt-1 bg-red-50 p-1 rounded">
                                                                <AlertCircle className="h-2 w-2" /> {prod.anomaly_reason}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                const isLinear = prod.category ? ['Tasseau', 'Chevron', 'Bastaing', 'Poutre', 'Liteau', 'Moulure'].some(t => prod.category?.includes(t)) : false;
                                                                const isPanel = prod.category ? ['Panneau', 'Contreplaqué', 'MDF', 'OSB', 'Agglo', 'Mélaminé'].some(t => prod.category?.includes(t)) : true;

                                                                onOpenMaterialModal({
                                                                    name: prod.name,
                                                                    cost_per_sqm: prod.price || 0,
                                                                    supplier_ref: prod.url,
                                                                    is_panel: isPanel && !isLinear,
                                                                    price_type: isLinear ? 'unit' : 'm2',
                                                                    thickness: prod.dimensions?.includes('x') && prod.dimensions.includes('mm')
                                                                        ? parseInt(prod.dimensions.split('x').pop()!.replace('mm', '')) || 18
                                                                        : 18
                                                                });
                                                                setIsScrapingModalOpen(false);
                                                                if (!prod.price) toast("Veuillez saisir le prix manuellement", { icon: "✏️" });
                                                                else toast.success("Produit importé !");
                                                            }}
                                                            className="btn-secondary !py-1 !px-2 !text-xs"
                                                        >
                                                            Importer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer border-t border-slate-100 p-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                            {scrapingResult && scrapingResult.products.length > 0 && (
                                <button onClick={handleImportAll} className="btn-primary !bg-green-600 hover:!bg-green-700 !py-3 !px-8 !text-lg flex items-center gap-3 shadow-lg transform transition-transform active:scale-95">
                                    <Download className="h-6 w-6" /> Tout importer ({scrapingResult.products.length} produits)
                                </button>
                            )}
                            <button onClick={() => setIsScrapingModalOpen(false)} className="btn-secondary ml-auto">Fermer</button>
                        </div>
                    </div>
                </div>
            </ErrorBoundary>

            {/* Catalog Modal */}
            <div className="modal-overlay" style={{ display: (isCatalogModalOpen && selectedSupplier) ? undefined : 'none' }} onClick={() => setIsCatalogModalOpen(false)}>
                {selectedSupplier ? (
                    <div className="modal-content !max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="modal-header flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Catalogue : {selectedSupplier.name}</h2>
                                <p className="text-sm text-slate-500">{supplierCatalog.length} produits référencés</p>
                            </div>
                            <button onClick={() => setIsCatalogModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full" title="Fermer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 items-center">
                            <div className="relative flex-1 min-w-[300px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input type="text" placeholder="Rechercher une référence, un nom, une dimension..." className="input-field !pl-10 !py-2" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <select className="input-field !py-2 !w-auto text-xs" value={catalogEssenceFilter} onChange={e => setCatalogEssenceFilter(e.target.value)} title="Filtrer par essence">
                                    <option value="all">Toutes les essences</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.essence).filter(Boolean))).sort().map(essence => <option key={essence} value={essence}>{essence}</option>)}
                                </select>
                                <select className="input-field !py-2 !w-auto text-xs" value={catalogTypeFilter} onChange={e => setCatalogTypeFilter(e.target.value)} title="Filtrer par type de produit">
                                    <option value="all">Tous les types</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.product_type).filter(Boolean))).sort().map(type => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <select className="input-field !py-2 !w-auto text-xs" value={catalogTreatmentFilter} onChange={e => setCatalogTreatmentFilter(e.target.value)} title="Filtrer par traitement">
                                    <option value="all">Tous les traitements</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.treatment).filter(Boolean))).sort().map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <select className="input-field !py-2 !w-auto text-xs" value={catalogCertificationFilter} onChange={e => setCatalogCertificationFilter(e.target.value)} title="Filtrer par certification">
                                    <option value="all">Toutes les certifs</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.certification).filter(Boolean))).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => handleExportCSV()} className="btn-secondary !py-2 flex items-center gap-2" title="Exporter en CSV"><Download className="h-4 w-4" /> Export CSV</button>
                                <button onClick={() => handleRefreshCatalog()} className="btn-primary !py-2 flex items-center gap-2" title="Rafraîchir tous les prix du catalogue"><RefreshCw className="h-4 w-4" /> Tout rafraîchir</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col p-6">
                            <div className="flex-1 overflow-y-auto">
                                {Object.entries(
                                    supplierCatalog
                                        .filter((item: SupplierMaterial) => {
                                            const searchLower = catalogSearch.toLowerCase();
                                            const matchesSearch = !catalogSearch ||
                                                (item.name?.toLowerCase().includes(searchLower)) ||
                                                (item.reference?.toLowerCase().includes(searchLower)) ||
                                                (item.essence?.toLowerCase().includes(searchLower)) ||
                                                (item.product_type?.toLowerCase().includes(searchLower)) ||
                                                (item.treatment?.toLowerCase().includes(searchLower)) ||
                                                (`${item.thickness}x${item.width}x${item.height}`.includes(searchLower));

                                            const matchesEssence = catalogEssenceFilter === 'all' || item.essence === catalogEssenceFilter;
                                            const matchesType = catalogTypeFilter === 'all' || item.product_type === catalogTypeFilter;
                                            const matchesTreatment = catalogTreatmentFilter === 'all' || item.treatment === catalogTreatmentFilter;
                                            const matchesCert = catalogCertificationFilter === 'all' || item.certification === catalogCertificationFilter;

                                            return matchesSearch && matchesEssence && matchesType && matchesTreatment && matchesCert;
                                        })
                                        .reduce((acc, item) => {
                                            const essence = item.essence || 'Essence inconnue';
                                            const type = item.product_type || 'Type inconnu';
                                            const format = `${item.thickness || 0}x${item.width || 0}x${item.height || 0}mm`;

                                            if (!acc[essence]) acc[essence] = {};
                                            if (!acc[essence][type]) acc[essence][type] = {};
                                            if (!acc[essence][type][format]) acc[essence][type][format] = [];

                                            acc[essence][type][format].push(item);
                                            return acc;
                                        }, {} as Record<string, Record<string, Record<string, SupplierMaterial[]>>>)
                                ).map(([essence, types]) => (
                                    <div key={essence} className="mb-10">
                                        <div className="flex items-center gap-3 mb-6 sticky top-0 bg-white py-3 z-20 border-b-2 border-blue-500">
                                            <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm"><Layers className="h-5 w-5 text-white" /></div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-lg">{essence}</h3>
                                        </div>

                                        {Object.entries(types).map(([type, formats]) => (
                                            <div key={type} className="ml-4 mb-8">
                                                <div className="flex items-center gap-2 mb-4 border-l-4 border-amber-400 pl-3 py-1">
                                                    <h4 className="font-bold text-slate-700 uppercase text-md">{type}</h4>
                                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">{Object.values(formats).flat().length} produits</span>
                                                </div>

                                                {Object.entries(formats).map(([format, products]) => (
                                                    <div key={format} className="ml-6 mb-6">
                                                        <div className="flex items-center gap-2 mb-3">
                                                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                                                            <h5 className="font-bold text-slate-500 text-sm">FORMAT: {format}</h5>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                            {products.map(product => (
                                                                <div key={product.id} className={`glass-card p-4 group transition-all hover:shadow-lg border-l-4 ${product.material_id ? 'border-l-green-400' : 'border-l-slate-200'} ${product.is_archived ? 'opacity-60 saturate-50' : ''}`}>
                                                                    <div className="flex justify-between items-start mb-2">
                                                                        <div className="flex flex-col">
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{product.reference}</span>
                                                                            <div className="flex gap-1 mt-1">
                                                                                {product.treatment && <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold uppercase">{product.treatment}</span>}
                                                                                {product.certification && <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase">{product.certification}</span>}
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleRefreshPrice(product.id); }} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded" title="Rafraîchir le prix"><RefreshCw className="h-4 w-4" /></button>
                                                                            <button onClick={() => handleOpenAssociation(product)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded" title="Associer au stock"><LinkIcon className="h-4 w-4" /></button>
                                                                            <button onClick={() => handleToggleArchive(product)} className="p-1.5 hover:bg-slate-100 text-slate-600 rounded" title={product.is_archived ? "Désarchiver" : "Archiver"}>
                                                                                {product.is_archived ? <RefreshCw className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>

                                                                    <h4 className="font-bold text-slate-800 text-sm mb-2 leading-tight line-clamp-2 min-h-[2.5rem]">{product.name || product.reference || 'Produit sans nom'}</h4>

                                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                                        <div className="flex flex-col">
                                                                            {product.devis_necessaire ? (
                                                                                <span className="text-sm font-bold text-amber-600">Sur Devis</span>
                                                                            ) : (
                                                                                <>
                                                                                    <span className="text-lg font-black text-blue-600">{(product.price || 0).toFixed(2)} €</span>
                                                                                    <span className="text-[10px] text-slate-400 capitalize">{product.price_type === 'unit' ? 'à l\'unité' : `au ${product.price_type}`}</span>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex flex-col items-end">
                                                                            <span className="text-[9px] text-slate-400 mb-1">{product.updated_at ? new Date(product.updated_at).toLocaleDateString() : 'Non daté'}</span>
                                                                            {product.material_id && (
                                                                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded"><Check className="h-3 w-3" /> LIÉ</div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl shrink-0">
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input type="file" accept=".csv" id="csv-import" className="hidden" onChange={handleImportCSV} />
                                    <label htmlFor="csv-import" className="btn-secondary !py-2 flex items-center gap-2 cursor-pointer" title="Importer depuis CSV"><Upload className="h-4 w-4" /> Importer CSV</label>
                                </div>
                                <button onClick={() => { setIsCatalogModalOpen(false); setIsScrapingModalOpen(true); setScrapingUrl(selectedSupplier?.website || ''); }} className="btn-primary !bg-blue-600 hover:!bg-blue-700 flex items-center gap-2"><Globe className="h-4 w-4" /> Mettre à jour via Scraping</button>
                            </div>
                            <button onClick={() => setIsCatalogModalOpen(false)} className="btn-secondary">Fermer</button>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Association Modal */}
            <div className="modal-overlay" style={{ display: (isAssociationModalOpen && editingProduct) ? undefined : 'none' }} onClick={() => setIsAssociationModalOpen(false)}>
                {editingProduct ? (
                    <div className="modal-content !max-w-2xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="text-xl font-bold">Associer au stock interne</h2>
                        </div>
                        <div className="modal-body space-y-4">
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Produit à associer</p>
                                <p className="font-medium text-slate-800">{editingProduct.name}</p>
                                <p className="text-sm text-slate-500">
                                    {'reference' in editingProduct ? editingProduct.reference : 'Nouveau produit'} •
                                    {'dimensions' in editingProduct ? editingProduct.dimensions : (
                                        (editingProduct as SupplierMaterial).width
                                            ? `${(editingProduct as SupplierMaterial).width}x${(editingProduct as SupplierMaterial).height}x${(editingProduct as SupplierMaterial).thickness}`
                                            : 'Dimensions inconnues'
                                    )}
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="label">Sélectionner un matériau en stock</label>
                                <select className="input-field" value={targetMaterialId || ''} onChange={e => setTargetMaterialId(Number(e.target.value))} title="Choisir un matériau">
                                    <option value="">-- Choisir un matériau --</option>
                                    {materials.map(m => <option key={m.id} value={m.id}>{m.name} ({m.thickness}mm)</option>)}
                                </select>
                            </div>

                            <div className="text-center py-2"><span className="text-sm text-slate-400">OU</span></div>

                            <button
                                onClick={() => {
                                    onOpenMaterialModal({
                                        name: editingProduct.name || '',
                                        thickness: 'thickness' in editingProduct ? (editingProduct.thickness as number || 18) : (
                                            (editingProduct as SupplierMaterial).thickness || 18
                                        ),
                                        cost_per_sqm: 'price' in editingProduct ? (editingProduct.price as number || 0) : (editingProduct as SupplierMaterial).price || 0,
                                        price_type: 'price_type' in editingProduct ? (editingProduct.price_type as 'm2' | 'm3' | 'unit') : 'm2',
                                        supplier_ref: 'reference' in editingProduct ? (editingProduct.reference as string) : (editingProduct as ScrapedProduct).url,
                                        has_grain: false,
                                        is_panel: true,
                                        initial_width: 0,
                                        initial_height: 0,
                                        initial_quantity: 0
                                    });
                                    setIsAssociationModalOpen(false);
                                }}
                                className="w-full btn-secondary flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" /> Créer un nouveau matériau à partir de ce produit
                            </button>
                        </div>
                        <div className="modal-footer flex justify-end gap-2">
                            <button onClick={() => setIsAssociationModalOpen(false)} className="btn-secondary">Annuler</button>
                            <button
                                onClick={async () => {
                                    if (!targetMaterialId) return;
                                    try {
                                        if ('id' in editingProduct) {
                                            await SupplierService.updateMaterial((editingProduct as SupplierMaterial).id, { material_id: targetMaterialId });
                                            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
                                        } else {
                                            if (!selectedSupplier) { toast.error("Veuillez d'abord sélectionner un fournisseur"); return; }
                                            await SupplierService.addMaterial(selectedSupplier.id, {
                                                name: (editingProduct as ScrapedProduct).name,
                                                reference: (editingProduct as ScrapedProduct).url,
                                                group_name: (editingProduct as ScrapedProduct).group_name || 'Divers',
                                                price: (editingProduct as ScrapedProduct).price || 0,
                                                width: 0, height: 0, thickness: 0,
                                                material_id: targetMaterialId,
                                                stock_quantity: 0, is_archived: false
                                            });
                                            onRefreshMaterials();
                                        }
                                        setIsAssociationModalOpen(false);
                                        toast.success("Liaison effectuée !");
                                    } catch {
                                        toast.error("Erreur lors de la liaison");
                                    }
                                }}
                                className="btn-primary"
                                disabled={!targetMaterialId}
                            >
                                Valider la liaison
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            <ConfirmDialog isOpen={confirmDialog.isOpen} onClose={() => setConfirmDialog(p => ({ ...p, isOpen: false }))} onConfirm={confirmDialog.onConfirm} title={confirmDialog.title} message={confirmDialog.message} type={confirmDialog.type} />
        </div>
    );
}
