import { useState, useEffect } from 'react';
import { Package, Search, AlertCircle, AlertTriangle } from 'lucide-react';
import { stockApi } from '../services/api.ts';
import type { StockItem } from '../services/api.ts';
import { toast } from 'sonner';

export function StockPage() {
    const [stock, setStock] = useState<StockItem[]>([]);
    const [filteredStock, setFilteredStock] = useState<StockItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'low' | 'offcuts'>('all');

    useEffect(() => {
        loadStock();
    }, []);

    useEffect(() => {
        let filtered = stock;

        // Apply search filter
        if (search.trim()) {
            filtered = filtered.filter(s =>
                s.material?.name.toLowerCase().includes(search.toLowerCase()) ||
                s.label?.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Apply category filter
        if (filter === 'low') {
            filtered = filtered.filter(s => s.quantity <= 2);
        } else if (filter === 'offcuts') {
            filtered = filtered.filter(s => s.is_offcut);
        }

        setFilteredStock(filtered);
    }, [search, stock, filter]);

    const loadStock = async () => {
        try {
            const response = await stockApi.getAll();
            setStock(response.data);
            setFilteredStock(response.data);
        } catch {
            toast.error('Erreur de chargement du stock');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div>
            <header className="page-header">
                <h1 className="page-title">
                    <Package />
                    Stock
                </h1>
                <div className="search-bar">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Rechercher un matériau..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Pills */}
                <div className="filter-pills-container">
                    {[
                        { key: 'all', label: 'Tout' },
                        { key: 'low', label: 'Stock faible' },
                        { key: 'offcuts', label: 'Chutes' }
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key as typeof filter)}
                            className={`pill-btn ${filter === key ? 'active' : ''}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </header>

            <div className="card-list">
                {filteredStock.length === 0 ? (
                    <div className="empty-state">
                        <AlertCircle />
                        <p>Aucun stock trouvé</p>
                    </div>
                ) : (
                    filteredStock.map((item) => (
                        <div key={item.id} className="list-item">
                            <div className="list-item-icon">
                                {item.is_offcut ? (
                                    <Package size={24} className="text-warning" />
                                ) : (
                                    <Package size={24} />
                                )}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">
                                    {item.material?.name || 'Matériau inconnu'}
                                </div>
                                <div className="list-item-subtitle">
                                    {item.width} x {item.height} mm
                                    {item.is_offcut && ' • Chute'}
                                </div>
                            </div>
                            <div className={`stock-quantity ${item.quantity <= 2 ? 'low' : ''}`}>
                                {item.quantity <= 2 && (
                                    <AlertTriangle size={14} className="mr-1" />
                                )}
                                {item.quantity}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
