import React from 'react';
import { OverviewData, AnalyticsData } from '../Management';
import { ManagedProject } from '../../../config/managementConfig';
import { Activity, TrendingUp, AlertTriangle, Package, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';

// Calculé au niveau module = pas de re-render, pas d'impureté
const TODAY_MS = new Date().setHours(0, 0, 0, 0);

interface OverviewProps {
  overview: OverviewData;
  analytics: AnalyticsData;
  projects: ManagedProject[];
  onNavigate: (tabId: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ overview, analytics, projects, onNavigate }) => {
  const kMetricColor = overview.k_metric_avg > 85 ? 'text-green-500' : 'text-red-500';
  const stockColor = overview.stock_critical_count > 0 ? 'text-red-500' : 'text-green-500';
  const marginPct = analytics.profitability.reelle.margin_pct;

  return (
    <div className="space-y-6">
      {/* Bloc 1 — KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-theme-text-muted text-sm font-medium">Projets Actifs</h3>
            <Activity className="w-5 h-5 text-theme-primary" />
          </div>
          <p className="text-2xl font-bold text-theme-text-main">{overview.projects_active}</p>
        </div>

        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-theme-text-muted text-sm font-medium">K-Metric Moyen</h3>
            <TrendingUp className={`w-5 h-5 ${kMetricColor}`} />
          </div>
          <p className={`text-2xl font-bold ${kMetricColor}`}>{overview.k_metric_avg.toFixed(1)}%</p>
        </div>

        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-theme-text-muted text-sm font-medium">Marge Globale</h3>
            <span className="w-5 h-5 text-green-500 font-bold flex justify-center items-center">%</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{marginPct.toFixed(1)}%</p>
        </div>

        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-theme-text-muted text-sm font-medium">Stocks Critiques</h3>
            <AlertTriangle className={`w-5 h-5 ${stockColor}`} />
          </div>
          <p className={`text-2xl font-bold ${stockColor}`}>{overview.stock_critical_count}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bloc 2 — Mini-rentabilité */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm flex flex-col cursor-pointer hover:border-theme-primary/50 transition-colors" onClick={() => onNavigate('analytics')}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-theme-text-main">Rentabilité (Réelle)</h3>
            <ChevronRight className="w-4 h-4 text-theme-text-muted" />
          </div>
          <div className="flex-1 flex items-center justify-center relative">
            <PieChart width={140} height={140}>
              <Pie
                data={[
                  { name: 'Déboursé sec', value: analytics.profitability.reelle.debourse_sec, fill: '#F09595' },
                  { name: 'Frais généraux', value: analytics.profitability.reelle.frais_generaux, fill: '#85B7EB' },
                  { name: 'Bénéfice', value: analytics.profitability.reelle.benefice, fill: '#5DCAA5' },
                ]}
                cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                dataKey="value" stroke="none"
              >
                {[
                  { fill: '#F09595' }, { fill: '#85B7EB' }, { fill: '#5DCAA5' }
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v).toFixed(0)} €`, '']} />
            </PieChart>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-sm font-bold text-theme-text-main">{marginPct.toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Bloc 3 — Mini-planning Gantt */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm lg:col-span-2 flex flex-col cursor-pointer hover:border-theme-primary/50 transition-colors" onClick={() => onNavigate('planning')}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-theme-text-main">Prochaines livraisons</h3>
            <span className="text-sm text-theme-primary flex items-center">Voir tout <ChevronRight className="w-4 h-4 ml-1" /></span>
          </div>
          <div className="space-y-3">
            {(() => {
              const livraisons = projects
                .filter(p => p.delivery_date && p.status === 'en_cours')
                .sort((a, b) => new Date(a.delivery_date!).getTime() - new Date(b.delivery_date!).getTime())
                .slice(0, 5);
              
              if (livraisons.length === 0) {
                return (
                  <p className="text-sm text-theme-text-muted text-center py-4 italic">
                    Aucun projet "En cours" avec une date de livraison définie
                  </p>
                );
              }
              
              return livraisons.map(p => {
                const daysLeft = p.delivery_date
                  ? Math.ceil((new Date(p.delivery_date).getTime() - TODAY_MS) / 86400000)
                  : null;
                const isUrgent = daysLeft !== null && daysLeft <= 7;
                return (
                  <div key={p.id} className="flex items-center text-sm">
                    <div className="w-32 font-medium text-theme-text-main truncate">{p.name}</div>
                    <div className="flex-1 bg-theme-bg-sidebar h-4 rounded-full overflow-hidden mx-4 relative">
                      <div
                        className={`absolute top-0 bottom-0 left-0 ${p.progress >= 1 ? 'bg-green-500' : isUrgent ? 'bg-red-500' : 'bg-theme-primary'}`}
                        style={{ width: `${Math.max(5, p.progress * 100)}%` }}
                      />
                    </div>
                    <div className={`w-24 text-right text-xs font-medium ${isUrgent ? 'text-red-500' : 'text-theme-text-muted'}`}>
                      {daysLeft !== null && daysLeft >= 0 ? `J-${daysLeft}` : p.delivery_date}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Bloc 4 — Mini-stock */}
      <div className="bg-theme-bg-card border border-theme-border rounded-xl p-4 shadow-sm cursor-pointer hover:border-theme-primary/50 transition-colors" onClick={() => onNavigate('stock')}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-theme-text-main flex items-center"><Package className="w-5 h-5 mr-2" /> Alertes Stock</h3>
          <span className="text-sm text-theme-primary flex items-center">Gérer <ChevronRight className="w-4 h-4 ml-1" /></span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Mock data for stock preview, as the full stock is fetched inside StockView */}
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
             <div className="flex justify-between mb-1">
               <span className="font-medium text-theme-text-main text-sm">Chêne 18mm</span>
               <span className="text-red-500 font-bold text-sm">2 pnx</span>
             </div>
             <div className="w-full bg-theme-bg-sidebar h-1.5 rounded-full overflow-hidden">
               <div className="bg-red-500 h-full w-[10%]" />
             </div>
          </div>
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
             <div className="flex justify-between mb-1">
               <span className="font-medium text-theme-text-main text-sm">MDF 19mm</span>
               <span className="text-amber-500 font-bold text-sm">5 pnx</span>
             </div>
             <div className="w-full bg-theme-bg-sidebar h-1.5 rounded-full overflow-hidden">
               <div className="bg-amber-500 h-full w-[30%]" />
             </div>
          </div>
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
             <div className="flex justify-between mb-1">
               <span className="font-medium text-theme-text-main text-sm">CP 15mm</span>
               <span className="text-green-500 font-bold text-sm">15 pnx</span>
             </div>
             <div className="w-full bg-theme-bg-sidebar h-1.5 rounded-full overflow-hidden">
               <div className="bg-green-500 h-full w-[80%]" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
