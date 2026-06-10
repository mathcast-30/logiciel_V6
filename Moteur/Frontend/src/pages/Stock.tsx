import React, { useState } from 'react';
import { Warehouse, Tag, Truck } from 'lucide-react';

import { useStockData } from '../hooks/useStockData';
import { MaterialsTab, type MaterialForm } from '../components/stock/MaterialsTab';
import { EdgeBandsTab } from '../components/stock/EdgeBandsTab';
import { SuppliersTab } from '../components/stock/SuppliersTab';

export default function Stock() {
    const [activeTab, setActiveTab] = useState<'materials' | 'edgebands' | 'suppliers'>('materials');

    const {
        materials,
        edgeBands,
        suppliers,
        isLoadingMaterials,
        isLoadingEdgeBands,
        isLoadingSuppliers,
        refreshMaterials,
        refreshEdgeBands,
        refreshSuppliers,
        loadMaterialDetails
    } = useStockData();

    // Lifted cross-modal state
    const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
    const [materialForm, setMaterialForm] = useState<MaterialForm>({
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

    const handleOpenMaterialModal = (initialData?: Partial<MaterialForm>) => {
        if (initialData) {
            setMaterialForm(prev => ({ ...prev, ...initialData }));
        } else {
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
        }
        setIsMaterialModalOpen(true);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Tabs Navigation */}
            <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
                <button
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'materials'
                        ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                    onClick={() => setActiveTab('materials')}
                >
                    <Warehouse className="h-4 w-4" />
                    Panneaux & Bois
                </button>
                <button
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'edgebands'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                    onClick={() => setActiveTab('edgebands')}
                >
                    <Tag className="h-4 w-4" />
                    Chants
                </button>
                <button
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'suppliers'
                        ? 'bg-white dark:bg-slate-700 text-green-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                        }`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    <Truck className="h-4 w-4" />
                    Fournisseurs & Scraping
                </button>
            </div>

            {/* Tab Contents - Using display none/block to preserve state & DOM (important for scraping progress bar and search bars) */}
            <div style={{ display: activeTab === 'materials' ? 'block' : 'none' }}>
                <MaterialsTab
                    materials={materials}
                    isLoading={isLoadingMaterials}
                    onRefresh={refreshMaterials}
                    onLoadDetails={loadMaterialDetails}
                    isMaterialModalOpen={isMaterialModalOpen}
                    setIsMaterialModalOpen={setIsMaterialModalOpen}
                    materialForm={materialForm}
                    setMaterialForm={setMaterialForm}
                    onOpenMaterialModal={handleOpenMaterialModal}
                />
            </div>

            <div style={{ display: activeTab === 'edgebands' ? 'block' : 'none' }}>
                <EdgeBandsTab
                    edgeBands={edgeBands}
                    isLoading={isLoadingEdgeBands}
                    onRefresh={refreshEdgeBands}
                />
            </div>

            <div style={{ display: activeTab === 'suppliers' ? 'block' : 'none' }}>
                <SuppliersTab
                    suppliers={suppliers}
                    materials={materials}
                    isLoading={isLoadingSuppliers}
                    onRefreshSuppliers={refreshSuppliers}
                    onRefreshMaterials={refreshMaterials}
                    onOpenMaterialModal={handleOpenMaterialModal}
                />
            </div>
        </div>
    );
}
