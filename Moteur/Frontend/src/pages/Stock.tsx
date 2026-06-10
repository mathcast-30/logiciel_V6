import { useState, useEffect, useRef } from 'react';
import {
    Plus, Trash2, ChevronDown, ChevronRight, Warehouse, Package,
    Ruler, Tag, Search, Edit2, Globe, Phone, Mail, Calendar, Building2, AlertCircle,
    X, Check, Filter, Layers, Link as LinkIcon, Download, Upload, RefreshCw, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '../components/UI/ConfirmDialog';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { type MaterialWithStock, type Stock, type EdgeBand, MaterialService } from '../services/materialService';
import { type Supplier, SupplierService, type ScrapedProduct, type ScrapeStats, type SupplierMaterial } from '../services/supplierService';

export function StockPage() {
    const [materials, setMaterials] = useState<MaterialWithStock[]>([]);
    const [expandedMaterial, setExpandedMaterial] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'materials' | 'edge-bands' | 'suppliers'>('materials');
    const [edgeBands, setEdgeBands] = useState<EdgeBand[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [supplierStats, setSupplierStats] = useState({ suppliers: 0, products: 0, orders: 0 });

    // Modals
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isEdgeBandModalOpen, setIsEdgeBandModalOpen] = useState(false);
    const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
    const [isScrapingModalOpen, setIsScrapingModalOpen] = useState(false);
    const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
    const [isProductEditModalOpen, setIsProductEditModalOpen] = useState(false);
    const [isAssociationModalOpen, setIsAssociationModalOpen] = useState(false);

    const [scrapingUrl, setScrapingUrl] = useState('');
    const [maxPages, setMaxPages] = useState(1000);
    const [scrapingResult, setScrapingResult] = useState<{ products: ScrapedProduct[]; scanned_pages: number; status: string } | null>(null);
    const [isScraping, setIsScraping] = useState(false);
    const [scrapingMessage, setScrapingMessage] = useState('');

    // Catalog State
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [supplierCatalog, setSupplierCatalog] = useState<SupplierMaterial[]>([]);
    const [catalogSearch, setCatalogSearch] = useState('');
    const [catalogEssenceFilter, setCatalogEssenceFilter] = useState('all');
    const [catalogTypeFilter, setCatalogTypeFilter] = useState('all');
    const [catalogTreatmentFilter, setCatalogTreatmentFilter] = useState('all');
    const [catalogCertificationFilter, setCatalogCertificationFilter] = useState('all');

    // Product Editing / Association State
    const [editingProduct, setEditingProduct] = useState<ScrapedProduct | SupplierMaterial | null>(null);
    const [targetMaterialId, setTargetMaterialId] = useState<number | null>(null);

    const [selectedMaterialId, setSelectedMaterialId] = useState<number | null>(null);
    const [editingStockId, setEditingStockId] = useState<number | null>(null);
    const [editingSupplierId, setEditingSupplierId] = useState<number | null>(null);

    // Forms
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
    const [edgeBandForm, setEdgeBandForm] = useState({
        name: '', thickness: 0.4, cost_per_m: 0, color: ''
    });
    const [stockForm, setStockForm] = useState({
        width: 2800, height: 2070, quantity: 1, is_offcut: false, label: '', grain_direction: 1
    });
    const [supplierForm, setSupplierForm] = useState({
        name: '',
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        website: '',
        delivery_delay_days: 7,
        comments: ''
    });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'warning' as 'warning' | 'danger' | 'info'
    });

    useEffect(() => {
        loadMaterials();
        loadEdgeBands();
        loadSuppliers();
    }, []);

    const progressBarRef = useRef<HTMLDivElement>(null);
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);
    useEffect(() => {
        if (!isMountedRef.current) return;
        try {
            if (progressBarRef.current) {
                const pct = scrapingResult ? Math.min(100, ((scrapingResult.scanned_pages || 0) / maxPages) * 100) : 0;
                progressBarRef.current.style.setProperty('--progress-width', `${pct}%`);
            }
        } catch (e) {
            console.warn('Progress bar DOM update skipped:', e);
        }
    }, [scrapingResult, maxPages]);

    const loadEdgeBands = async () => {
        try {
            const data = await MaterialService.getEdgeBands();
            setEdgeBands(data);
        } catch {
            console.error('Error loading edge bands');
        }
    };

    const loadMaterials = async () => {
        try {
            const data = await MaterialService.getAll();
            setMaterials(data);
        } catch {
            console.error('Error loading materials');
        } finally {
            setIsLoading(false);
        }
    };

    const loadSuppliers = async () => {
        try {
            const [data, stats] = await Promise.all([
                SupplierService.getAll(),
                SupplierService.getStats()
            ]);
            setSuppliers(data);
            setSupplierStats(stats);
        } catch {
            console.error('Error loading suppliers');
        }
    };

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
            setSupplierForm({
                name: '', contact_name: '', contact_phone: '', contact_email: '',
                website: '', delivery_delay_days: 7, comments: ''
            });
            loadSuppliers();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erreur";
            toast.error(message);
        }
    };

    const handleExploreSupplier = (supplier: Supplier) => {
        setScrapingUrl(supplier.website || '');
        setIsScrapingModalOpen(true);
        setScrapingResult(null);
    };

    const handleAnalyzeScraping = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scrapingUrl) return;

        setIsScraping(true);
        // Initialize empty result to show grid immediately
        setScrapingResult({ products: [], scanned_pages: 0, status: 'running' });
        setScrapingMessage("Connexion au site...");

        await SupplierService.analyzeUrlStream(
            scrapingUrl,
            maxPages,
            (msg: string) => setScrapingMessage(msg),
            (newProducts) => {
                setScrapingResult(prev => {
                    const currentProducts = prev?.products || [];
                    const existingMap = new Map(currentProducts.map(item => [item.url, item]));
                    newProducts.forEach(item => existingMap.set(item.url, item));

                    return {
                        products: Array.from(existingMap.values()),
                        scanned_pages: prev?.scanned_pages || 0,
                        status: 'running'
                    };
                });
            },
            (stats: ScrapeStats) => {
                setScrapingResult(prev => {
                    const finalProducts = stats.analyzed_products || prev?.products || [];
                    return prev ? { ...prev, products: finalProducts, scanned_pages: stats.total_pages, status: 'success' } : null;
                });
                setIsScraping(false);
                setScrapingMessage("");
                toast.success(`Exploration terminée ! ${stats.total_products} produits trouvés.`);
            },
            (err: string) => {
                toast.error("Erreur: " + err);
                setIsScraping(false);
                setScrapingMessage("");
            }
        );
    };

    const loadSupplierCatalog = async (supplierId: number) => {
        try {
            const data = await SupplierService.getCatalog(supplierId);
            setSupplierCatalog(data);
        } catch {
            toast.error("Impossible de charger le catalogue");
        }
    };

    const handleOpenCatalog = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        loadSupplierCatalog(supplier.id);
        setIsCatalogModalOpen(true);
    };

    const handleUpdateScrapedProduct = (idx: number, updates: Partial<ScrapedProduct>) => {
        setScrapingResult(prev => {
            if (!prev) return null;
            const newProducts = [...prev.products];
            newProducts[idx] = { ...newProducts[idx], ...updates };
            return { ...prev, products: newProducts };
        });
    };

    const handleRemoveScrapedProduct = (url: string) => {
        setScrapingResult(prev => {
            if (!prev) return null;
            return {
                ...prev,
                products: prev.products.filter(p => p.url !== url)
            };
        });
        toast.info("Produit retiré de la file d'import");
    };

    const handleRefreshPrice = async (offerId: number) => {
        try {
            toast.loading("Mise à jour du prix...", { id: 'refresh-price' });
            const { price } = await SupplierService.refreshPrice(offerId);
            toast.success(`Prix mis à jour : ${price} €`, { id: 'refresh-price' });
            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
        } catch {
            toast.error("Erreur de mise à jour", { id: 'refresh-price' });
        }
    };


    const handleImportAll = async () => {
        if (!scrapingResult || !selectedSupplier) return;

        try {
            toast.loading("Importation groupée...", { id: 'batch-import' });

            const materialsToImport = scrapingResult.products.map(prod => {
                let thickness = 18;
                let width = 0;
                let height = 0;

                if (prod.dimensions) {
                    const parts = prod.dimensions.toLowerCase().split('x').map(s => parseFloat(s.replace(/[^0-9.]/g, '')));
                    if (parts.length >= 1) thickness = parts[parts.length - 1] || 18;
                    if (parts.length >= 2) width = parts[0] || 0;
                    if (parts.length >= 3) height = parts[1] || 0;
                }

                const isLinear = prod.category ? ['Tasseau', 'Chevron', 'Bastaing', 'Poutre', 'Liteau', 'Moulure'].some(t => prod.category?.includes(t)) : false;

                return {
                    supplier_id: selectedSupplier.id,
                    name: prod.name,
                    price: prod.price || 0,
                    reference: prod.url,
                    essence: prod.essence,
                    product_type: prod.product_type,
                    treatment: prod.treatment,
                    certification: prod.certification,
                    devis_necessaire: prod.devis_necessaire,
                    group_name: prod.essence || "Divers",
                    price_type: isLinear ? 'unit' : 'm2',
                    thickness,
                    width,
                    height,
                    stock_quantity: 0,
                    is_archived: false
                };
            });

            const { created, updated } = await SupplierService.batchImport(selectedSupplier.id, materialsToImport as Partial<SupplierMaterial>[]);
            toast.success(`${created} nouveaux imports, ${updated} mis à jour !`, { id: 'batch-import' });
            setIsScrapingModalOpen(false);
            handleOpenCatalog(selectedSupplier);
        } catch {
            toast.error("Erreur lors de l'importation groupée", { id: 'batch-import' });
        }
    };

    const handleRefreshCatalog = async () => {
        if (!selectedSupplier) return;
        try {
            toast.loading("Mise à jour du catalogue complet...", { id: 'refresh-catalog' });
            const { updated_count, total } = await SupplierService.refreshCatalog(selectedSupplier.id);
            toast.success(`${updated_count}/${total} prix mis à jour !`, { id: 'refresh-catalog' });
            loadSupplierCatalog(selectedSupplier.id);
        } catch {
            toast.error("Erreur de mise à jour globale", { id: 'refresh-catalog' });
        }
    };

    const handleToggleArchive = async (offer: SupplierMaterial) => {
        try {
            await SupplierService.updateMaterial(offer.id, { is_archived: !offer.is_archived });
            toast.success(offer.is_archived ? "Produit restauré" : "Produit archivé");
            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
        } catch {
            toast.error("Erreur lors de l'archivage");
        }
    };

    const handleOpenAssociation = (product: ScrapedProduct | SupplierMaterial) => {
        setEditingProduct(product);
        setTargetMaterialId(null);
        setIsAssociationModalOpen(true);
    };

    const handleDeleteSupplier = (id: number) => {
        setConfirmDialog({
            isOpen: true,
            title: 'Supprimer le fournisseur',
            message: 'Voulez-vous vraiment supprimer ce fournisseur et tout son catalogue ?',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await SupplierService.delete(id);
                    toast.success('Fournisseur supprimé');
                    loadSuppliers();
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur lors de la suppression');
                }
            }
        });
    };

    const handleExportCSV = () => {
        if (!supplierCatalog.length || !selectedSupplier) return;

        const headers = ["ID", "Nom", "Reference", "Essence", "Type", "Traitement", "Certification", "Prix", "Unite", "Epaisseur", "Largeur", "Hauteur", "Lien Stock"];
        const rows = supplierCatalog.map(item => [
            item.id,
            item.name || '',
            item.reference || '',
            item.essence || '',
            item.product_type || '',
            item.treatment || '',
            item.certification || '',
            item.price,
            item.price_type,
            item.thickness || '',
            item.width || '',
            item.height || '',
            item.material_id ? 'LIE' : 'NON LIE'
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `catalogue_${selectedSupplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Catalogue exporté !");
    };

    const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !selectedSupplier) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            const lines = text.split('\n');
            const dataLines = lines.slice(1).filter(l => l.trim().length > 0);

            let successCount = 0;
            let failCount = 0;

            toast.loading(`Importation de ${dataLines.length} produits...`);

            for (const line of dataLines) {
                const parts = line.split(';');
                if (parts.length >= 8) {
                    try {
                        const [, name, ref, essence, type, treatment, certification, price, price_type] = parts;
                        await SupplierService.addMaterial(selectedSupplier.id, {
                            name: name || '',
                            reference: ref || undefined,
                            essence: essence || undefined,
                            product_type: type || undefined,
                            treatment: treatment || undefined,
                            certification: certification || undefined,
                            price: parseFloat(price.replace(',', '.')) || 0,
                            price_type: (price_type as 'unit' | 'm2' | 'm3') || 'unit',
                            stock_quantity: 0,
                            is_archived: false,
                            devis_necessaire: false
                        });
                        successCount++;
                    } catch (err) {
                        console.error("Fail import line", line, err);
                        failCount++;
                    }
                }
            }

            toast.dismiss();
            toast.success(`Import terminé : ${successCount} succès, ${failCount} échecs`);
            loadSupplierCatalog(selectedSupplier.id);
        };
        reader.readAsText(file);
    };

    const openEditSupplierModal = (supplier: Supplier) => {
        setEditingSupplierId(supplier.id);
        setSupplierForm({
            name: supplier.name,
            contact_name: supplier.contact_name || '',
            contact_phone: supplier.contact_phone || '',
            contact_email: supplier.contact_email || '',
            website: supplier.website || '',
            delivery_delay_days: supplier.delivery_delay_days || 7,
            comments: supplier.comments || ''
        });
        setIsSupplierModalOpen(true);
    };

    const loadMaterialDetails = async (id: number) => {
        try {
            const data = await MaterialService.getById(id);
            setMaterials(prev => prev.map(m => m.id === id ? data : m));
        } catch {
            console.error('Error loading material details');
        }
    };

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
            loadMaterials();
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
            loadMaterialDetails(selectedMaterialId);
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
                    setMaterials(prev => prev.filter(m => m.id !== id));
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
                    loadMaterialDetails(materialId);
                    toast.success('Panneau supprimé');
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur');
                }
            }
        });
    };

    const handleCreateEdgeBand = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await MaterialService.createEdgeBand(edgeBandForm);
            toast.success('Chant ajouté avec succès');
            setIsEdgeBandModalOpen(false);
            setEdgeBandForm({ name: '', thickness: 0.4, cost_per_m: 0, color: '' });
            loadEdgeBands();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(`Erreur lors de l'ajout du stock: ${message}`);
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
                    loadEdgeBands();
                    setConfirmDialog(p => ({ ...p, isOpen: false }));
                } catch {
                    toast.error('Erreur lors de la suppression');
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

    const filteredEdgeBands = edgeBands.filter(eb =>
        eb.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (eb.color && eb.color.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            {/* Tab Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit mb-6">
                <button
                    onClick={() => setActiveTab('materials')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'materials' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Warehouse className="h-4 w-4" />
                    Stock & Panneaux
                </button>
                <button
                    onClick={() => setActiveTab('edge-bands')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'edge-bands' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag className="h-4 w-4" />
                    Catalogue de Chants
                </button>
                <button
                    onClick={() => setActiveTab('suppliers')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'suppliers' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package className="h-4 w-4" />
                    Catalogue Fournisseurs
                </button>
            </div>

            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        {activeTab === 'materials' ? (
                            <>
                                <Warehouse className="h-8 w-8 text-blue-500" />
                                Gestion du Stock
                            </>
                        ) : activeTab === 'edge-bands' ? (
                            <>
                                <Tag className="h-8 w-8 text-amber-500" />
                                Catalogue de Chants
                            </>
                        ) : (
                            <>
                                <Package className="h-8 w-8 text-green-500" />
                                Catalogue Fournisseurs
                            </>
                        )}
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {activeTab === 'materials'
                            ? "Gérez vos panneaux et bois massif."
                            : activeTab === 'edge-bands'
                                ? "Gérez vos types de placage et chants (PVC, Bois, ABS)."
                                : "Gérez vos fournisseurs et leurs catalogues de produits."
                        }
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder={activeTab === 'materials' ? "Rechercher un panneau..." : "Rechercher un chant..."}
                            className="input-field pl-10 w-full md:w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {activeTab === 'materials' ? (
                        <button
                            onClick={() => setIsMaterialModalOpen(true)}
                            className="btn-primary flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="h-5 w-5" />
                            Nouveau Matériau
                        </button>
                    ) : activeTab === 'edge-bands' ? (
                        <button
                            onClick={() => setIsEdgeBandModalOpen(true)}
                            className="btn-primary flex items-center gap-2 whitespace-nowrap !bg-amber-600 !border-amber-700 hover:!bg-amber-700"
                        >
                            <Plus className="h-5 w-5" />
                            Nouveau Chant
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsScrapingModalOpen(true)}
                                className="btn-secondary flex items-center gap-2 whitespace-nowrap"
                            >
                                <Globe className="h-5 w-5" />
                                <span className="hidden md:inline">Scraping IA</span>
                            </button>
                            <button
                                onClick={() => setIsSupplierModalOpen(true)}
                                className="btn-primary flex items-center gap-2 whitespace-nowrap !bg-green-600 !border-green-700 hover:!bg-green-700"
                            >
                                <Plus className="h-5 w-5" />
                                Nouveau Fournisseur
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* List Loading */}
            {isLoading && (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            )}

            {/* Content Logic */}
            {!isLoading && activeTab === 'materials' ? (
                /* Materials List */
                <div className="space-y-4">
                    {filteredMaterials.length === 0 ? (
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
                                            loadMaterialDetails(material.id);
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
                                                className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold"
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
                </div>
            ) : !isLoading && (
                /* Edge Bands List */
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

            {/* Suppliers Tab Content */}
            {!isLoading && activeTab === 'suppliers' && (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="card p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-green-600">{supplierStats.suppliers}</div>
                                <div className="text-sm text-slate-500">Fournisseurs</div>
                            </div>
                        </div>
                        <div className="card p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <Package className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-blue-600">{supplierStats.products}</div>
                                <div className="text-sm text-slate-500">Produits catalogués</div>
                            </div>
                        </div>
                        <div className="card p-4 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                <Calendar className="h-6 w-6 text-amber-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-amber-600">{supplierStats.orders}</div>
                                <div className="text-sm text-slate-500">Commandes en cours</div>
                            </div>
                        </div>
                    </div>

                    {/* Suppliers List */}
                    {suppliers.length === 0 ? (
                        <div className="card p-8 text-center">
                            <Building2 className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                Aucun fournisseur
                            </h3>
                            <p className="text-slate-500 mb-6">
                                Ajoutez vos fournisseurs pour gérer leurs catalogues de produits et tarifs.
                            </p>
                            <button
                                onClick={() => setIsSupplierModalOpen(true)}
                                className="btn-primary !bg-green-600 hover:!bg-green-700"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Ajouter un Fournisseur
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {suppliers.filter(s =>
                                s.name.toLowerCase().includes(searchTerm.toLowerCase())
                            ).map(supplier => (
                                <div key={supplier.id} className="card p-5 group hover:border-green-400 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100">
                                                <Building2 className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800 dark:text-white">{supplier.name}</h3>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Délai: {supplier.delivery_delay_days}j
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => openEditSupplierModal(supplier)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                                                title="Modifier"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteSupplier(supplier.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        {supplier.contact_name && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400">👤</span>
                                                {supplier.contact_name}
                                            </div>
                                        )}
                                        {supplier.contact_phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                {supplier.contact_phone}
                                            </div>
                                        )}
                                        {supplier.contact_email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-3 w-3 text-slate-400" />
                                                {supplier.contact_email}
                                            </div>
                                        )}
                                        {supplier.website && (
                                            <div className="flex items-center gap-2">
                                                <Globe className="h-3 w-3 text-slate-400" />
                                                <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline truncate">
                                                    {supplier.website.replace(/https?:\/\//, '')}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {supplier.comments && (
                                        <div className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/50 p-2 rounded mb-4">
                                            "{supplier.comments}"
                                        </div>
                                    )}

                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <span className="text-xs text-slate-500">
                                            {supplier.materials?.length || 0} produit(s)
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => handleExploreSupplier(supplier)}
                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                                title="Lancer l'exploration IA"
                                            >
                                                <Search className="h-3 w-3" />
                                                Scanner
                                            </button>
                                            <button
                                                onClick={() => handleOpenCatalog(supplier)}
                                                className="text-xs text-green-600 hover:text-green-700 font-medium"
                                            >
                                                Gérer le catalogue →
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Material Modal */}
            <div className="modal-overlay" style={{ display: isMaterialModalOpen ? undefined : 'none' }} onClick={() => setIsMaterialModalOpen(false)}>
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
            <div className="modal-overlay" style={{ display: isStockModalOpen ? undefined : 'none' }} onClick={() => setIsStockModalOpen(false)}>
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

            {/* Supplier Modal */}
            <div className="modal-overlay" style={{ display: isSupplierModalOpen ? undefined : 'none' }} onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }}>
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
                                    <input
                                        id="supp-name"
                                        type="text"
                                        required
                                        placeholder="Ex: Ratheau Bois"
                                        className="input-field"
                                        value={supplierForm.name}
                                        onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="supp-contact" className="block text-sm font-medium text-slate-700 mb-1">Contact</label>
                                        <input
                                            id="supp-contact"
                                            type="text"
                                            placeholder="Nom du contact"
                                            className="input-field"
                                            value={supplierForm.contact_name}
                                            onChange={e => setSupplierForm({ ...supplierForm, contact_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="supp-phone" className="block text-sm font-medium text-slate-700 mb-1">Téléphone</label>
                                        <input
                                            id="supp-phone"
                                            type="tel"
                                            placeholder="06 12 34 56 78"
                                            className="input-field"
                                            value={supplierForm.contact_phone}
                                            onChange={e => setSupplierForm({ ...supplierForm, contact_phone: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="supp-email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                        <input
                                            id="supp-email"
                                            type="email"
                                            placeholder="contact@fournisseur.fr"
                                            className="input-field"
                                            value={supplierForm.contact_email}
                                            onChange={e => setSupplierForm({ ...supplierForm, contact_email: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="supp-delay" className="block text-sm font-medium text-slate-700 mb-1">Délai livraison (jours)</label>
                                        <input
                                            id="supp-delay"
                                            type="number"
                                            min="1"
                                            className="input-field"
                                            value={supplierForm.delivery_delay_days}
                                            onChange={e => setSupplierForm({ ...supplierForm, delivery_delay_days: parseInt(e.target.value) || 7 })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="supp-website" className="block text-sm font-medium text-slate-700 mb-1">Site Web</label>
                                    <input
                                        id="supp-website"
                                        type="url"
                                        placeholder="https://www.fournisseur.fr"
                                        className="input-field"
                                        value={supplierForm.website}
                                        onChange={e => setSupplierForm({ ...supplierForm, website: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="supp-comments" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                                    <textarea
                                        id="supp-comments"
                                        rows={2}
                                        placeholder="Informations complémentaires..."
                                        className="input-field"
                                        value={supplierForm.comments}
                                        onChange={e => setSupplierForm({ ...supplierForm, comments: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer flex justify-end gap-3">
                                <button type="button" onClick={() => { setIsSupplierModalOpen(false); setEditingSupplierId(null); }} className="btn-secondary">Annuler</button>
                                <button type="submit" className="btn-primary !bg-green-600 hover:!bg-green-700">
                                    {editingSupplierId ? "Enregistrer" : "Créer"}
                                </button>
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
                                <div className="flex gap-2 mb-4">
                                    <div className="flex-1 relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            placeholder="URL d'une catégorie (ex: https://www.groupe-ratheau.com/panneaux)"
                                            value={scrapingUrl}
                                            onChange={e => setScrapingUrl(e.target.value)}
                                        />
                                    </div>
                                    <div className="w-32 relative" title="Nombre de pages à scanner">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-xs text-slate-400 font-medium">Pages</span>
                                        </div>
                                        <input
                                            type="number"
                                            min="1"
                                            max="2000"
                                            aria-label="Nombre de pages à scanner"
                                            className="block w-full pl-14 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-center"
                                            value={maxPages}
                                            onChange={e => setMaxPages(Math.min(2000, parseInt(e.target.value) || 5))}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isScraping || !scrapingUrl}
                                        className="btn-primary min-w-[200px] flex items-center justify-center gap-2 transition-all"
                                    >
                                        {isScraping ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                <span className="truncate max-w-[150px]">{scrapingMessage || 'Analyse...'}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Search className="h-4 w-4" />
                                                Lancer l'exploration
                                            </>
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
                                                        <div
                                                            ref={progressBarRef}
                                                            className="progress-bar-fill"
                                                        ></div>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1 truncate italic">{scrapingMessage}</p>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-center w-full">
                                                    <span>
                                                        <span className="text-green-600 font-bold">{scrapingResult.products.length}</span> produits trouvés
                                                        <span className="text-xs text-slate-400 font-normal ml-2">({scrapingResult.scanned_pages} pages scannées)</span>
                                                    </span>
                                                    <button
                                                        onClick={handleImportAll}
                                                        className="btn-primary !py-1.5 !px-3 !text-xs flex items-center gap-2"
                                                        disabled={scrapingResult.products.length === 0}
                                                    >
                                                        <Download className="h-3.5 w-3.5" /> Tout importer
                                                    </button>
                                                </div>
                                            )}
                                        </h3>
                                    </div>

                                    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {scrapingResult.products.map((prod, idx) => (
                                            <div key={prod.url || `scraped-${idx}`} className="border border-slate-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-md transition bg-white flex flex-col gap-2 group relative">
                                                {/* Prominent Removal Button (Grosse croix rouge) */}
                                                <button
                                                    onClick={() => handleRemoveScrapedProduct(prod.url)}
                                                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg z-30 transition-all transform hover:scale-110 active:scale-90"
                                                    title="Supprimer ce produit"
                                                >
                                                    <X className="h-4 w-4 stroke-[3px]" />
                                                </button>

                                                {prod.image_url ? (
                                                    <div className="h-32 w-full bg-slate-50 rounded flex items-center justify-center mb-2 overflow-hidden relative">
                                                        <img src={prod.image_url} alt={prod.name} className="max-h-full max-w-full object-contain" />
                                                        {prod.category && prod.category !== 'Divers' && (
                                                            <span className="absolute top-2 right-2 bg-slate-800/80 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
                                                                {prod.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="h-32 w-full bg-slate-50 rounded flex items-center justify-center mb-2 text-slate-300 relative">
                                                        <Package className="h-8 w-8" />
                                                        {prod.category && prod.category !== 'Divers' && (
                                                            <span className="absolute top-2 right-2 bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-medium">
                                                                {prod.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                <h4 className="font-medium text-slate-800 text-sm line-clamp-2 min-h-[2.5em]" title={prod.name}>
                                                    {prod.name}
                                                </h4>

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
                                                                <input
                                                                    type="number"
                                                                    title="Saisir le prix"
                                                                    className={`w-20 px-1 py-0.5 border rounded font-bold text-sm ${prod.anomaly ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'}`}
                                                                    value={prod.price}
                                                                    onChange={e => handleUpdateScrapedProduct(idx, { price: parseFloat(e.target.value) || 0 })}
                                                                />
                                                                <span className="text-sm font-bold text-slate-500">€</span>
                                                                {prod.is_new && <span className="text-[9px] bg-blue-500 text-white px-1 rounded font-bold">NOUVEAU</span>}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                                                Prix sur devis
                                                            </span>
                                                        )}
                                                        <div className="mt-1">
                                                            <input
                                                                type="text"
                                                                title="Dimensions"
                                                                placeholder="Dimensions (ex: 18x250x2500mm)"
                                                                className="w-full text-[10px] text-slate-500 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-blue-400 outline-none"
                                                                value={prod.dimensions || ''}
                                                                onChange={e => handleUpdateScrapedProduct(idx, { dimensions: e.target.value })}
                                                            />
                                                        </div>
                                                        {prod.anomaly && (
                                                            <div className="text-[9px] text-red-600 font-medium flex items-center gap-1 mt-1 bg-red-50 p-1 rounded">
                                                                <AlertCircle className="h-2 w-2" />
                                                                {prod.anomaly_reason}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => {
                                                                const isLinear = prod.category ? ['Tasseau', 'Chevron', 'Bastaing', 'Poutre', 'Liteau', 'Moulure'].some(t => prod.category?.includes(t)) : false;
                                                                const isPanel = prod.category ? ['Panneau', 'Contreplaqué', 'MDF', 'OSB', 'Agglo', 'Mélaminé'].some(t => prod.category?.includes(t)) : true;

                                                                setMaterialForm(prev => ({
                                                                    ...prev,
                                                                    name: prod.name,
                                                                    cost_per_sqm: prod.price || 0,
                                                                    supplier_ref: prod.url,
                                                                    is_panel: isPanel && !isLinear,
                                                                    price_type: isLinear ? 'unit' : 'm2',
                                                                    thickness: prod.dimensions?.includes('x') && prod.dimensions.includes('mm')
                                                                        ? parseInt(prod.dimensions.split('x').pop()!.replace('mm', '')) || 18
                                                                        : 18
                                                                }));
                                                                setIsScrapingModalOpen(false);
                                                                setIsMaterialModalOpen(true);
                                                                if (!prod.price) {
                                                                    toast("Veuillez saisir le prix manuellement", { icon: "✏️" });
                                                                } else {
                                                                    toast.success("Produit importé !");
                                                                }
                                                            }}
                                                            className="btn-secondary !py-1 !px-2 !text-xs"
                                                        >
                                                            Importer
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {!isScraping && scrapingResult.products.length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400">
                                                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                                <p>Aucun produit détecté sur ces pages.</p>
                                                <p className="text-sm mt-1">Essayez une autre URL (page catégorie plutôt que page d'accueil).</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer border-t border-slate-100 p-4 bg-slate-50 flex justify-between items-center rounded-b-xl">
                            {scrapingResult && scrapingResult.products.length > 0 && (
                                <button
                                    onClick={handleImportAll}
                                    className="btn-primary !bg-green-600 hover:!bg-green-700 !py-3 !px-8 !text-lg flex items-center gap-3 shadow-lg transform transition-transform active:scale-95"
                                >
                                    <Download className="h-6 w-6" /> Tout importer ({scrapingResult.products.length} produits)
                                </button>
                            )}
                            <button onClick={() => setIsScrapingModalOpen(false)} className="btn-secondary ml-auto">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
                </ErrorBoundary>

            {/* Catalog Modal */}
            <div className="modal-overlay" style={{ display: (isCatalogModalOpen && selectedSupplier) ? undefined : 'none' }} onClick={() => setIsCatalogModalOpen(false)}>
                {selectedSupplier ? (
                    <div className="modal-content !max-w-5xl h-[90vh]" onClick={e => e.stopPropagation()}>
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
                                <input
                                    type="text"
                                    placeholder="Rechercher une référence, un nom, une dimension..."
                                    className="input-field !pl-10 !py-2"
                                    value={catalogSearch}
                                    onChange={e => setCatalogSearch(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="h-4 w-4 text-slate-500" />
                                <select
                                    className="input-field !py-2 !w-auto text-xs"
                                    value={catalogEssenceFilter}
                                    onChange={e => setCatalogEssenceFilter(e.target.value)}
                                    title="Filtrer par essence"
                                >
                                    <option value="all">Toutes les essences</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.essence).filter(Boolean))).sort().map(essence => (
                                        <option key={essence} value={essence}>{essence}</option>
                                    ))}
                                </select>

                                <select
                                    className="input-field !py-2 !w-auto text-xs"
                                    value={catalogTypeFilter}
                                    onChange={e => setCatalogTypeFilter(e.target.value)}
                                    title="Filtrer par type de produit"
                                >
                                    <option value="all">Tous les types</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.product_type).filter(Boolean))).sort().map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>

                                <select
                                    className="input-field !py-2 !w-auto text-xs"
                                    value={catalogTreatmentFilter}
                                    onChange={e => setCatalogTreatmentFilter(e.target.value)}
                                    title="Filtrer par traitement"
                                >
                                    <option value="all">Tous les traitements</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.treatment).filter(Boolean))).sort().map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>

                                <select
                                    className="input-field !py-2 !w-auto text-xs"
                                    value={catalogCertificationFilter}
                                    onChange={e => setCatalogCertificationFilter(e.target.value)}
                                    title="Filtrer par certification"
                                >
                                    <option value="all">Toutes les certifs</option>
                                    {Array.from(new Set(supplierCatalog.map(m => m.certification).filter(Boolean))).sort().map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleExportCSV()}
                                    className="btn-secondary !py-2 flex items-center gap-2"
                                    title="Exporter en CSV"
                                >
                                    <Download className="h-4 w-4" /> Export CSV
                                </button>
                                <button
                                    onClick={() => handleRefreshCatalog()}
                                    className="btn-primary !py-2 flex items-center gap-2"
                                    title="Rafraîchir tous les prix du catalogue"
                                >
                                    <RefreshCw className="h-4 w-4" /> Tout rafraîchir
                                </button>
                            </div>
                        </div>

                        <div className="modal-body !p-0 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto p-6">
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
                                            <div className="bg-blue-500 p-1.5 rounded-lg shadow-sm">
                                                <Layers className="h-5 w-5 text-white" />
                                            </div>
                                            <h3 className="font-black text-slate-800 uppercase tracking-widest text-lg">{essence}</h3>
                                        </div>

                                        {Object.entries(types).map(([type, formats]) => (
                                            <div key={type} className="ml-4 mb-8">
                                                <div className="flex items-center gap-2 mb-4 border-l-4 border-amber-400 pl-3 py-1">
                                                    <h4 className="font-bold text-slate-700 uppercase text-md">{type}</h4>
                                                    <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold">
                                                        {Object.values(formats).flat().length} produits
                                                    </span>
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
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleRefreshPrice(product.id); }}
                                                                                className="p-1.5 hover:bg-blue-50 text-blue-600 rounded"
                                                                                title="Rafraîchir le prix"
                                                                            >
                                                                                <RefreshCw className="h-4 w-4" />
                                                                            </button>
                                                                            <button onClick={() => handleOpenAssociation(product)} className="p-1.5 hover:bg-blue-50 text-blue-600 rounded" title="Associer au stock">
                                                                                <LinkIcon className="h-4 w-4" />
                                                                            </button>
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
                                                                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold bg-green-50 px-2 py-1 rounded">
                                                                                    <Check className="h-3 w-3" /> LIÉ
                                                                                </div>
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

                        <div className="modal-footer flex justify-between items-center p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                            <div className="flex gap-2">
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        id="csv-import"
                                        className="hidden"
                                        onChange={handleImportCSV}
                                    />
                                    <label
                                        htmlFor="csv-import"
                                        className="btn-secondary !py-2 flex items-center gap-2 cursor-pointer"
                                        title="Importer depuis CSV"
                                    >
                                        <Upload className="h-4 w-4" /> Importer CSV
                                    </label>
                                </div>
                                <button
                                    onClick={() => {
                                        setIsCatalogModalOpen(false);
                                        setIsScrapingModalOpen(true);
                                        setScrapingUrl(selectedSupplier?.website || '');
                                    }}
                                    className="btn-primary !bg-blue-600 hover:!bg-blue-700 flex items-center gap-2"
                                >
                                    <Globe className="h-4 w-4" /> Mettre à jour via Scraping
                                </button>
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
                                <select
                                    className="input-field"
                                    value={targetMaterialId || ''}
                                    onChange={e => setTargetMaterialId(Number(e.target.value))}
                                    title="Choisir un matériau"
                                >
                                    <option value="">-- Choisir un matériau --</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.name} ({m.thickness}mm)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="text-center py-2">
                                <span className="text-sm text-slate-400">OU</span>
                            </div>

                            <button
                                onClick={() => {
                                    setMaterialForm({
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
                                    setIsMaterialModalOpen(true);
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
                                            // Existing supplier material
                                            await SupplierService.updateMaterial((editingProduct as SupplierMaterial).id, { material_id: targetMaterialId });
                                            if (selectedSupplier) loadSupplierCatalog(selectedSupplier.id);
                                        } else {
                                            // Scraped product (new)
                                            if (!selectedSupplier) {
                                                toast.error("Veuillez d'abord sélectionner un fournisseur");
                                                return;
                                            }
                                            await SupplierService.addMaterial(selectedSupplier.id, {
                                                name: (editingProduct as ScrapedProduct).name,
                                                reference: (editingProduct as ScrapedProduct).url,
                                                group_name: (editingProduct as ScrapedProduct).group_name || 'Divers',
                                                price: (editingProduct as ScrapedProduct).price || 0,
                                                width: 0,
                                                height: 0,
                                                thickness: 0,
                                                material_id: targetMaterialId,
                                                stock_quantity: 0,
                                                is_archived: false
                                            });
                                            loadMaterials();
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

            {/* Product Edit Modal */}
            <div className="modal-overlay" style={{ display: (isProductEditModalOpen && editingProduct) ? undefined : 'none' }} onClick={() => setIsProductEditModalOpen(false)}>
                {editingProduct ? (
                    <div className="modal-content !max-w-xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="text-xl font-bold">Modifier le produit</h2>
                        </div>
                        <div className="modal-body space-y-4">
                            <p className="text-slate-500 text-sm italic">Édition manuelle bientôt disponible. Utilisez l'import direct pour l'instant.</p>
                        </div>
                        <div className="modal-footer flex justify-end gap-2">
                            <button onClick={() => setIsProductEditModalOpen(false)} className="btn-secondary">Fermer</button>
                        </div>
                    </div>
                ) : null}
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
