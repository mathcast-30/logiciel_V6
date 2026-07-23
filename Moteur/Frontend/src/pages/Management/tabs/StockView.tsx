import React, { useState, useEffect } from 'react';
import { Package, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

interface StockItem {
  id: number;
  material_id: number;
  material_name: string;
  thickness: number;
  is_panel: boolean;
  quantity: number;
  width: number;
  height: number;
  label?: string;
  prix_unitaire?: number;
  unite_prix?: string;
}

export const StockView: React.FC = () => {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrix, setEditPrix] = useState<string>('');
  const [editUnite, setEditUnite] = useState<string>('m2');

  const fetchStock = async () => {
    setLoading(true);
    try {
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

  const handleUpdatePrice = async (id: number) => {
    try {
      const prix = parseFloat(editPrix);
      if (isNaN(prix)) {
        toast.error('Prix invalide');
        return;
      }

      const res = await fetch(`http://localhost:8000/api/stock/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prix_unitaire: prix,
          unite_prix: editUnite
        })
      });

      if (res.ok) {
        toast.success('Prix mis à jour');
        setStock(prev => prev.map(item => item.id === id ? { ...item, prix_unitaire: prix, unite_prix: editUnite } : item));
        setEditingId(null);
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const stockList = [...stock].sort((a, b) => a.material_name.localeCompare(b.material_name));

  return (
    <div className="bg-theme-bg-card border border-theme-border rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
      <div className="p-6 border-b border-theme-border flex justify-between items-center">
        <h3 className="text-lg font-semibold text-theme-text-main flex items-center">
          <Package className="w-5 h-5 mr-2 text-theme-primary" />
          État des lots (Stock)
        </h3>
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
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Dimensions</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Quantité</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Prix d'Achat</th>
                <th className="p-4 text-xs font-semibold text-theme-text-muted uppercase tracking-wider border-b border-theme-border">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme-border">
              {stockList.map((item) => (
                <tr key={item.id} className="hover:bg-theme-bg-sidebar/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-theme-text-main">{item.material_name}</div>
                    <div className="text-xs text-theme-text-muted">{item.thickness} mm</div>
                  </td>
                  <td className="p-4 text-theme-text-muted">
                    {item.width} x {item.height} mm
                  </td>
                  <td className="p-4 font-bold text-theme-text-main">{item.quantity}</td>
                  <td className="p-4">
                    {editingId === item.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrix}
                          onChange={(e) => setEditPrix(e.target.value)}
                          className="w-20 p-1 text-sm bg-theme-bg-sidebar border border-theme-border rounded text-theme-text-main"
                          placeholder="0.00"
                        />
                        <select
                          value={editUnite}
                          onChange={(e) => setEditUnite(e.target.value)}
                          className="p-1 text-sm bg-theme-bg-sidebar border border-theme-border rounded text-theme-text-main"
                        >
                          <option value="m2">€/m²</option>
                          <option value="m3">€/m³</option>
                          <option value="unit">€/unité</option>
                        </select>
                      </div>
                    ) : (
                      <div className="text-sm text-theme-text-main">
                        {item.prix_unitaire ? `${item.prix_unitaire.toFixed(2)} € / ${item.unite_prix}` : <span className="text-theme-text-muted italic">Non défini</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {editingId === item.id ? (
                      <button
                        onClick={() => handleUpdatePrice(item.id)}
                        className="text-green-500 hover:text-green-600 transition-colors p-1 bg-green-500/10 rounded"
                        title="Sauvegarder le prix"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditPrix(item.prix_unitaire?.toString() || '');
                          setEditUnite(item.unite_prix || 'm2');
                        }}
                        className="text-theme-primary hover:text-blue-500 transition-colors text-sm"
                      >
                        Modifier le prix
                      </button>
                    )}
                  </td>
                </tr>
              ))}
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
