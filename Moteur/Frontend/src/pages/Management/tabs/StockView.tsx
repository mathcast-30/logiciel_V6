import React, { useState, useEffect } from 'react';
import { Package, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  id: number;
  material_id: number;
  material: { name: string, thickness: number, is_panel: boolean };
  quantity: number;
  // Fallback if there is no official alert threshold in DB, we mock it locally
}

export const StockView: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    setLoading(true);
    try {
      // Endpoint /api/stock exists (used in Stock.tsx)
      const res = await fetch('http://localhost:8000/api/stock');
      if (res.ok) {
        setStock(await res.json());
      }
    } catch (e) {
      toast.error('Erreur lors du chargement des stocks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
  }, []);

  // On aggrège par matériau pour l'affichage (simplifié)
  const aggregatedStock = stock.reduce((acc, item) => {
    const key = item.material?.name || 'Inconnu';
    if (!acc[key]) {
      acc[key] = {
        name: key,
        thickness: item.material?.thickness || 0,
        quantity: 0,
        threshold: 5 // mock threshold
      };
    }
    acc[key].quantity += item.quantity;
    return acc;
  }, {} as Record<string, {name: string, thickness: number, quantity: number, threshold: number}>);

  const stockList = Object.values(aggregatedStock).sort((a,b) => a.quantity - b.quantity);

  return (
    <div className="bg-theme-bg-card border border-theme-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-theme-border flex justify-between items-center">
        <h3 className="text-lg font-semibold text-theme-text-main flex items-center">
          <Package className="w-5 h-5 mr-2 text-theme-primary" />
          État des stocks
        </h3>
        {/* Placeholder pour ajouter */}
        <button className="flex items-center text-sm bg-theme-primary text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition-colors">
          <Plus className="w-4 h-4 mr-1" /> Entrée stock
        </button>
      </div>
      
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-theme-bg-sidebar sticky top-0 z-10">
              <tr>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Matériau</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Épaisseur</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Quantité</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Niveau</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {stockList.map((item, idx) => {
                const ratio = item.quantity / item.threshold;
                let colorClass = "bg-green-500";
                let textClass = "text-green-500";
                let statusText = "OK";

                if (item.quantity <= item.threshold) {
                  colorClass = "bg-red-500";
                  textClass = "text-red-500";
                  statusText = "Critique";
                } else if (item.quantity <= item.threshold * 1.5) {
                  colorClass = "bg-amber-500";
                  textClass = "text-amber-500";
                  statusText = "Bas";
                }

                return (
                  <tr key={idx} className="hover:bg-theme-bg-sidebar/50 transition-colors">
                    <td className="p-4 font-medium text-theme-text-main">{item.name}</td>
                    <td className="p-4 text-theme-text-muted">{item.thickness} mm</td>
                    <td className="p-4 font-bold text-theme-text-main">{item.quantity}</td>
                    <td className="p-4">
                      <div className="w-32 bg-theme-bg-sidebar h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${colorClass}`} style={{ width: `${Math.min(100, (item.quantity / (item.threshold * 3)) * 100)}%` }} />
                      </div>
                    </td>
                    <td className={`p-4 font-medium text-sm ${textClass}`}>{statusText}</td>
                  </tr>
                )
              })}
              {stockList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-theme-text-muted">Aucun stock disponible</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
