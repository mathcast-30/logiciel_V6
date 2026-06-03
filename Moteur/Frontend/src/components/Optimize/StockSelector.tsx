/**
 * StockSelector Component
 * 
 * Allows selection of specific stock boards for optimization
 * Supports filtering by dimensions, species, grain, and defects
 */

import { useState, useEffect } from 'react';
import { CheckSquare, Square, Search, Package, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

interface StockItem {
    id: number;
    material_id: number;
    material_name: string;
    material_species: string | null;
    is_panel: boolean;
    width: number;
    height: number;
    quantity: number;
    is_offcut: boolean;
    grain_direction: number;
    has_defects: boolean;
    label: string | null;
    quality_score: number;
}

interface StockSelectorProps {
    materialId: number | null;
    selectedStockIds: number[];
    onSelectionChange: (stockIds: number[]) => void;
    materialType?: 'panel' | 'raw_wood' | null;
}

export function StockSelector({
    materialId,
    selectedStockIds,
    onSelectionChange,
    materialType = null
}: StockSelectorProps) {
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOffcuts, setShowOffcuts] = useState(true);

    useEffect(() => {
        if (materialId) {
            loadStock();
        } else {
            setStockItems([]);
        }
    }, [materialId, materialType, showOffcuts]);

    const loadStock = async () => {
        setIsLoading(true);
        try {
            const response = await api.post('stock/filter', {
                material_id: materialId,
                material_type: materialType,
                include_offcuts: showOffcuts
            });
            setStockItems(response.data);
            // Auto-select all available stock
            onSelectionChange(response.data.map((s: StockItem) => s.id));
        } catch (error) {
            console.error('Error loading stock:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleStock = (stockId: number) => {
        if (selectedStockIds.includes(stockId)) {
            onSelectionChange(selectedStockIds.filter(id => id !== stockId));
        } else {
            onSelectionChange([...selectedStockIds, stockId]);
        }
    };

    const toggleAll = () => {
        if (selectedStockIds.length === filteredStock.length) {
            onSelectionChange([]);
        } else {
            onSelectionChange(filteredStock.map(s => s.id));
        }
    };

    const filteredStock = stockItems.filter(stock => {
        const matchesSearch = stock.label?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stock.material_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesOffcut = showOffcuts || !stock.is_offcut;
        return matchesSearch && matchesOffcut;
    });

    // Group by type (new boards vs offcuts)
    const newBoards = filteredStock.filter(s => !s.is_offcut);
    const offcuts = filteredStock.filter(s => s.is_offcut);

    if (!materialId) {
        return (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Sélectionnez un matériau pour voir le stock disponible
                </p>
            </div>
        );
    }

    const renderStockItem = (stock: StockItem) => {
        const isSelected = selectedStockIds.includes(stock.id);
        const Icon = isSelected ? CheckSquare : Square;

        return (
            <button
                key={stock.id}
                onClick={() => toggleStock(stock.id)}
                className={`
          w-full flex items-center gap-3 p-3 rounded-lg border transition-all
          ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
        `}
            >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />

                <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {stock.label || `Stock #${stock.id}`}
                        </span>
                        <span className="text-xs text-gray-500">
                            ×{stock.quantity}
                        </span>
                        {stock.is_offcut && (
                            <span className="text-xs px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded">
                                Chute
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {stock.width} × {stock.height} mm
                        {stock.material_species && (
                            <span className="ml-2 px-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                                {stock.material_species}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {stock.grain_direction > 0 && (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            {stock.grain_direction === 1 ? '↔' : '↕'}
                        </span>
                    )}
                    {stock.has_defects && (
                        <span className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Défauts
                        </span>
                    )}
                    {stock.quality_score < 0.8 && (
                        <span className="text-xs text-gray-500">
                            Q: {Math.round(stock.quality_score * 100)}%
                        </span>
                    )}
                </div>
            </button>
        );
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stock Disponible ({selectedStockIds.length}/{filteredStock.length})
                </h3>
                <button
                    onClick={toggleAll}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                    {selectedStockIds.length === filteredStock.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </button>
            </div>

            {/* Search & Filters */}
            <div className="space-y-2">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher un stock..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input
                        type="checkbox"
                        checked={showOffcuts}
                        onChange={(e) => {
                            setShowOffcuts(e.target.checked);
                        }}
                        className="rounded border-gray-300"
                    />
                    Inclure les chutes
                </label>
            </div>

            {/* Stock List */}
            <div className="max-h-96 overflow-y-auto space-y-3 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Chargement...</div>
                ) : filteredStock.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">Aucun stock disponible</div>
                ) : (
                    <>
                        {/* New Boards Section */}
                        {newBoards.length > 0 && (
                            <div className="space-y-2">
                                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Planches ({newBoards.length})
                                </div>
                                {newBoards.map(renderStockItem)}
                            </div>
                        )}

                        {/* Offcuts Section */}
                        {offcuts.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">
                                    Chutes ({offcuts.length})
                                </div>
                                {offcuts.map(renderStockItem)}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Summary */}
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div className="flex justify-between">
                    <span>Total planches sélectionnées:</span>
                    <span className="font-medium">{selectedStockIds.filter(id => {
                        const stock = stockItems.find(s => s.id === id);
                        return stock && !stock.is_offcut;
                    }).length}</span>
                </div>
                {showOffcuts && (
                    <div className="flex justify-between mt-1">
                        <span>Total chutes sélectionnées:</span>
                        <span className="font-medium">{selectedStockIds.filter(id => {
                            const stock = stockItems.find(s => s.id === id);
                            return stock && stock.is_offcut;
                        }).length}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
