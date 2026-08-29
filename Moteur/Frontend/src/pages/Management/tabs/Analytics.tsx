import React from 'react';
import { AnalyticsData } from '../Management';
import { PieChart, Pie, Cell, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, BarChart, Bar, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsProps {
  analytics: AnalyticsData;
}

export const Analytics: React.FC<AnalyticsProps> = ({ analytics }) => {
  const marginPrevue = analytics.profitability.prevue.margin_pct;
  const marginReelle = analytics.profitability.reelle.margin_pct;
  const hasEstimatif = analytics.analytics_quality === 'estimative' || analytics.analytics_quality === 'partial';

  return (
    <div className="space-y-6">
      {/* Bandeau estimatif global si données incomplètes */}
      {hasEstimatif && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/10 border border-amber-400/30 rounded-xl text-sm text-amber-600 dark:text-amber-400">
          <span className="mt-0.5 flex-shrink-0">⚠</span>
          <div>
            <strong>Données partiellement estimatives</strong> — Certains projets n'ont pas encore de résultat d'optimisation.
            Les coûts matières de ces projets sont estimés sur la surface nette des pièces (hors chutes réelles),
            ce qui peut sous-estimer le coût réel. Les totaux ci-dessous incluent ces estimations.
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graphique 1 — Donut rentabilité */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-text-main mb-6">Rentabilité (Prévue vs Réelle)</h3>
          <div className="flex flex-col sm:flex-row justify-around items-center h-[300px]">
            {/* Prévue */}
            <div className="relative flex flex-col items-center">
              <PieChart width={200} height={200}>
                <Pie
                  data={[
                    { name: 'Déboursé sec', value: analytics.profitability.prevue.debourse_sec, fill: '#F09595' },
                    { name: 'Frais généraux', value: analytics.profitability.prevue.frais_generaux, fill: '#85B7EB' },
                    { name: 'Bénéfice', value: analytics.profitability.prevue.benefice, fill: '#5DCAA5' },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                  dataKey="value" stroke="none"
                >
                  {[
                    { fill: '#F09595' }, { fill: '#85B7EB' }, { fill: '#5DCAA5' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value?: number) => `${value ?? 0} €`} />
              </PieChart>
              <div className="absolute top-[80px] w-full text-center pointer-events-none">
                <span className="text-xl font-bold text-theme-text-main">{marginPrevue.toFixed(1)}%</span>
              </div>
              <p className="mt-2 text-sm font-medium text-theme-text-muted">Prévue</p>
            </div>

            {/* Réelle */}
            <div className="relative flex flex-col items-center">
              <PieChart width={200} height={200}>
                <Pie
                  data={[
                    { name: 'Déboursé sec', value: analytics.profitability.reelle.debourse_sec, fill: '#F09595' },
                    { name: 'Frais généraux', value: analytics.profitability.reelle.frais_generaux, fill: '#85B7EB' },
                    { name: 'Bénéfice', value: analytics.profitability.reelle.benefice, fill: '#5DCAA5' },
                  ]}
                  cx="50%" cy="50%" innerRadius={60} outerRadius={80}
                  dataKey="value" stroke="none"
                >
                  {[
                    { fill: '#F09595' }, { fill: '#85B7EB' }, { fill: '#5DCAA5' }
                  ].map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value?: number) => `${value ?? 0} €`} />
              </PieChart>
              <div className="absolute top-[80px] w-full text-center pointer-events-none">
                <span className="text-xl font-bold text-theme-text-main">{marginReelle.toFixed(1)}%</span>
              </div>
              <p className="mt-2 text-sm font-medium text-theme-text-muted">Réelle</p>
            </div>
          </div>
          
          {/* Legend Custom */}
          <div className="mt-6 flex justify-center space-x-6 text-sm">
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-[#F09595] mr-2"></span><span className="text-theme-text-muted">Déboursé</span></div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-[#85B7EB] mr-2"></span><span className="text-theme-text-muted">Frais généraux</span></div>
            <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-[#5DCAA5] mr-2"></span><span className="text-theme-text-muted">Bénéfice</span></div>
          </div>
        </div>

        {/* Graphique 2 — Courbe K-Metric par semaine */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-text-main mb-6">Évolution K-Metric (Cible &gt; 85%)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.k_metric_weekly} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ color: '#38bdf8' }}
                  formatter={(val?: number) => [`${val ?? 0}%`, 'K-Metric']}
                />
                <ReferenceLine y={85} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Cible 85%', fill: '#f59e0b', fontSize: 12 }} />
                <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 3 — Comparaison Budget */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-theme-text-main mb-6">Comparaison Budget</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.budget_comparison} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `${v}€`} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc' }}
                  formatter={(val?: number) => [`${val ?? 0} €`]}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="estimated" name="Prévu" fill="#378ADD" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Réel" fill="#85B7EB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graphique 4 — Donut répartition matières */}
        <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-theme-text-main mb-6">Répartition matières (m²)</h3>
          <div className="flex-1 flex items-center justify-center relative min-h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={analytics.material_distribution}
                   cx="50%" cy="50%" outerRadius={100}
                   dataKey="area_m2" stroke="none" labelLine={false}
                 >
                   {analytics.material_distribution.map((_entry, index) => {
                     const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899'];
                     return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                   })}
                 </Pie>
                 <Tooltip formatter={(value?: number) => `${(value ?? 0).toFixed(1)} m²`} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }} />
               </PieChart>
             </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
