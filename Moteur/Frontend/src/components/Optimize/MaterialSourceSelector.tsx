/**
 * MaterialSourceSelector Component
 *
 * Allows users to select where each material comes from:
 * - Stock (existing boards in inventory)
 * - Supplier Catalog (order new material)
 */
import { useState, useEffect } from 'react';
import { AlertCircle, ShoppingCart, Package } from 'lucide-react';
import api from '../../services/api';
import type { IdentifiedMaterial } from './MaterialBreakdown';

interface StockAvailability {
    materialId: number;
    stockCount: number;
    availableArea: number;
    estimatedCost: number;
}

interface MaterialSourceSelectorProps {
    materials: IdentifiedMaterial[];
    materialSources: { [materialId: number]: 'stock' | 'supplier' };
    onSourceChange: (materialId: number, source: 'stock' | 'supplier') => void;
}

export function MaterialSourceSelector({
    materials,
    materialSources,
    onSourceChange,
}: MaterialSourceSelectorProps) {
    const [stockAvailability, setStockAvailability] = useState<Map<number, StockAvailability>>(new Map());
    const [isLoadingStock, setIsLoadingStock] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Load stock availability for each material
    useEffect(() => {
        if (materials.length === 0) {
            setStockAvailability(new Map());
            return;
        }

        const loadStockAvailability = async () => {
            setIsLoadingStock(true);
            setError(null);
            try {
                const materialIds = materials.map(m => m.id);
                const response = await api.post('stock/availability', {
                    material_ids: materialIds,
                });

                const availabilityMap = new Map<number, StockAvailability>();
                for (const item of response.data.availability || []) {
                    availabilityMap.set(item.material_id, {
                        materialId: item.material_id,
                        stockCount: item.stock_count || 0,
                        availableArea: item.available_area || 0,
                        estimatedCost: item.estimated_cost || 0,
                    });
                }

                setStockAvailability(availabilityMap);
            } catch (err) {
                console.error('Error loading stock availability:', err);
                setError('Erreur lors du chargement de la disponibilité du stock');
            } finally {
                setIsLoadingStock(false);
            }
        };

        loadStockAvailability();
    }, [materials]);

    if (materials.length === 0) {
        return (
            <div className="p-6 text-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                <AlertCircle className="h-12 w-12 mx-auto text-slate-400 dark:text-slate-600 mb-3" />
                <p className="text-slate-600 dark:text-slate-400 font-medium">Aucun matériau sélectionné</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Instructions */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                    💡 Choisissez la source de matériau
                </h3>
                <p className="text-sm text-blue-700 dark:text-blue-200 mt-2">
                    Pour chaque matériau, indiquez si vous voulez utiliser le stock existant ou commander auprès d'un fournisseur
                </p>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                    <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                </div>
            )}

            {/* Materials Source Selection */}
            <div className="space-y-3">
                {materials.map((material) => {
                    const source = materialSources[material.id] || 'stock';
                    const availability = stockAvailability.get(material.id);
                    const hasStock = availability && availability.stockCount > 0;

                    return (
                        <div
                            key={material.id}
                            className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                        >
                            {/* Material Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                                        {material.name}
                                    </h4>
                                    {material.species && (
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            {material.species}
                                        </p>
                                    )}
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${material.is_panel
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    }`}>
                                    {material.is_panel ? 'Panneau' : 'Bois brut'}
                                </span>
                            </div>

                            {/* Material Requirements */}
                            <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Pièces</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{material.piece_count}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Quantité</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{material.total_quantity}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">Surface</p>
                                    <p className="font-semibold text-slate-900 dark:text-slate-100">{material.estimated_area?.toFixed(2) ?? "0.00"} m²</p>
                                </div>
                            </div>

                            {/* Source Selection - Radio Buttons */}
                            <div className="space-y-2">
                                {/* Stock Option */}
                                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${source === 'stock'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name={`source-${material.id}`}
                                        value="stock"
                                        checked={source === 'stock'}
                                        onChange={() => onSourceChange(material.id, 'stock')}
                                        className="mt-1 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                                            <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                                                Utiliser le stock
                                            </h5>
                                        </div>
                                        {isLoadingStock ? (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Chargement de la disponibilité...
                                            </p>
                                        ) : availability ? (
                                            <div className="text-sm mt-2 space-y-1">
                                                <p className={`${hasStock
                                                    ? 'text-green-700 dark:text-green-300'
                                                    : 'text-red-700 dark:text-red-300'
                                                    }`}>
                                                    {availability.stockCount} planche{availability.stockCount > 1 ? 's' : ''} disponible{availability.stockCount > 1 ? 's' : ''} - {(availability.availableArea ?? 0).toFixed(2)} m² total
                                                </p>
                                                {!hasStock && (
                                                    <p className="text-red-600 dark:text-red-400 text-xs font-medium">
                                                        ⚠️ Stock insuffisant
                                                    </p>
                                                )}
                                                <p className="text-slate-600 dark:text-slate-400 text-xs">
                                                    Coût estimé: {(availability.estimatedCost ?? 0).toFixed(2)} €
                                                </p>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                                Erreur de chargement
                                            </p>
                                        )}
                                    </div>
                                </label>

                                {/* Supplier Option */}
                                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${source === 'supplier'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}>
                                    <input
                                        type="radio"
                                        name={`source-${material.id}`}
                                        value="supplier"
                                        checked={source === 'supplier'}
                                        onChange={() => onSourceChange(material.id, 'supplier')}
                                        className="mt-1 cursor-pointer"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            <h5 className="font-semibold text-slate-900 dark:text-slate-100">
                                                Commander au fournisseur
                                            </h5>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                                            📦 Chercher les meilleures offres parmi les fournisseurs configurés
                                        </p>
                                        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                            Coût estimé: {material.estimated_total_cost?.toFixed(2) ?? "0.00"} €
                                        </p>
                                    </div>
                                </label>
                            </div>

                            {/* Stock Warning */}
                            {source === 'stock' && availability && !hasStock && (
                                <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30">
                                    <div className="flex gap-2">
                                        <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-yellow-700 dark:text-yellow-200">
                                            ⚠️ Stock insuffisant: Basculez sur "Fournisseur" pour cette sélection
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-2">Résumé des sources</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Via stock</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {Object.values(materialSources).filter(s => s === 'stock').length} matériau(x)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Via fournisseur</p>
                            <p className="font-semibold text-slate-900 dark:text-slate-100">
                                {Object.values(materialSources).filter(s => s === 'supplier').length} matériau(x)
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
