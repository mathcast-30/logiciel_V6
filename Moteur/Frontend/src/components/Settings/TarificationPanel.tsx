import React, { useState, useEffect } from 'react';
import { Save, Euro, Percent, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../services/api';

interface TarificationData {
  taux_horaire: number;
  marge_defaut_pct: number;
  frais_generaux_pct: number;
}

export const TarificationPanel: React.FC = () => {
  const [data, setData] = useState<TarificationData>({
    taux_horaire: 35.0,
    marge_defaut_pct: 30.0,
    frais_generaux_pct: 10.0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTarification = async () => {
      try {
        const res = await api.get('settings/tarification');
        const json = res.data;
        setData({
          taux_horaire: json.taux_horaire ?? 35.0,
          marge_defaut_pct: json.marge_defaut_pct ?? 30.0,
          frais_generaux_pct: json.frais_generaux_pct ?? 10.0
        });
      } catch {
        toast.error('Erreur lors du chargement de la tarification');
      } finally {
        setLoading(false);
      }
    };
    fetchTarification();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('settings/tarification', {
        taux_horaire: parseFloat(data.taux_horaire.toString()),
        marge_defaut_pct: parseFloat(data.marge_defaut_pct.toString()),
        frais_generaux_pct: parseFloat(data.frais_generaux_pct.toString())
      });
      toast.success('Paramètres tarifaires sauvegardés avec succès');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-theme-bg-card border border-theme-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-theme-border flex justify-between items-center bg-theme-bg-sidebar/30">
          <div>
            <h3 className="text-lg font-semibold text-theme-text-main flex items-center">
              <Euro className="w-5 h-5 mr-2 text-theme-primary" />
              Tarification & Marges Globales
            </h3>
            <p className="text-sm text-theme-text-muted mt-1">
              Ces paramètres servent de base par défaut pour le calcul du prix de vente des projets.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center text-sm bg-theme-primary text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Sauvegarder
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text-main flex items-center">
              <Briefcase className="w-4 h-4 mr-2 text-theme-accent" />
              Taux Horaire (Main d'œuvre)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                value={data.taux_horaire}
                onChange={(e) => setData({ ...data, taux_horaire: parseFloat(e.target.value) || 0 })}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-3 pr-8 py-2 text-theme-text-main focus:outline-none focus:border-theme-primary transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted">€/h</span>
            </div>
            <p className="text-xs text-theme-text-muted">Prix facturé par heure de travail.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text-main flex items-center">
              <Percent className="w-4 h-4 mr-2 text-theme-accent" />
              Marge par Défaut
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={data.marge_defaut_pct}
                onChange={(e) => setData({ ...data, marge_defaut_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-3 pr-8 py-2 text-theme-text-main focus:outline-none focus:border-theme-primary transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted">%</span>
            </div>
            <p className="text-xs text-theme-text-muted">Bénéfice visé sur le coût total du projet.</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-theme-text-main flex items-center">
              <Percent className="w-4 h-4 mr-2 text-theme-accent" />
              Frais Généraux
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                value={data.frais_generaux_pct}
                onChange={(e) => setData({ ...data, frais_generaux_pct: parseFloat(e.target.value) || 0 })}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-3 pr-8 py-2 text-theme-text-main focus:outline-none focus:border-theme-primary transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted">%</span>
            </div>
            <p className="text-xs text-theme-text-muted">Part des coûts fixes (atelier, électricité...).</p>
          </div>
        </div>
      </div>
    </div>
  );
};
