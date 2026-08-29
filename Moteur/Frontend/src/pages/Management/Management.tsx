import React, { useState, useEffect } from 'react';
import { LayoutDashboard, KanbanSquare, CalendarDays, BarChart3, Clock, Package } from 'lucide-react';
import { MANAGEMENT_TABS, ManagedProject, ProjectStatus, PlanningStep } from '../../config/managementConfig';
import { toast } from 'sonner';
import api from '../../services/api';

import { Overview } from './tabs/Overview';
import { KanbanView } from './tabs/KanbanView';
import { PlanningGantt } from './tabs/PlanningGantt';
import { Analytics } from './tabs/Analytics';
import { TimeTracking } from './tabs/TimeTracking';
import { StockView } from './tabs/StockView';

export interface OverviewData {
  projects_active: number;
  projects_by_status: Record<string, number>;
  k_metric_avg: number;
  k_metric_trend: number;
  stock_critical_count: number;
  next_delivery: {
    project_name: string;
    delivery_date: string;
    days_remaining: number;
  } | null;
}

export interface AnalyticsData {
  k_metric_weekly: Array<{week: string, value: number}>;
  budget_comparison: Array<{category: string, estimated: number, actual: number}>;
  material_distribution: Array<{material: string, area_m2: number, percentage: number}>;
  profitability: {
    prevue: {debourse_sec: number, frais_generaux: number, benefice: number, margin_pct: number};
    reelle: {debourse_sec: number, frais_generaux: number, benefice: number, margin_pct: number};
  };
  /** Qualité des données : 'real' = tout vient de l'optimiseur, 'estimative' = tout estimé, 'partial' = mixte */
  analytics_quality?: 'real' | 'estimative' | 'partial';
}

export const Management: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [projects, setProjects] = useState<ManagedProject[]>([]);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        api.get('management/overview'),
        api.get('management/planning'),
        api.get('management/analytics')
      ]);

      if (results[0].status === 'fulfilled') {
        setOverview(results[0].value.data);
      }
      
      if (results[1].status === 'fulfilled') {
        const plData = results[1].value.data;
        setProjects(plData.projects || []);
      }
      
      if (results[2].status === 'fulfilled') {
        setAnalytics(results[2].value.data);
      }

    } catch (error) {
      console.error("Error fetching management data:", error);
      toast.error("Erreur lors du chargement des données de gestion");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateStatus = async (id: number, status: ProjectStatus) => {
    // Optimistic update
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    
    try {
      await api.patch(`projects/${id}/status`, { status });
      toast.success('Statut mis à jour');
    } catch (e) {
      toast.error('Erreur lors de la mise à jour du statut');
      fetchData(); // revert
    }
  };

  const updatePlanning = async (id: number, data: { start_date?: string, delivery_date?: string, steps?: PlanningStep[] }) => {
    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...(data.start_date !== undefined && { start_date: data.start_date }),
          ...(data.delivery_date !== undefined && { delivery_date: data.delivery_date }),
          ...(data.steps !== undefined && { steps: data.steps }),
        };
      }
      return p;
    }));

    try {
      await api.patch(`projects/${id}/planning`, data);
      toast.success('Planning mis à jour');
    } catch (e) {
      toast.error('Erreur lors de la mise à jour du planning');
      fetchData(); // revert
    }
  };

  const updateTarification = async (id: number, data: { marge_pct?: number, prix_vente_manuel?: number }) => {
    // Optimistic update
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return {
          ...p,
          ...(data.marge_pct !== undefined && { marge_pct: data.marge_pct }),
          ...(data.prix_vente_manuel !== undefined && { prix_vente_manuel: data.prix_vente_manuel }),
        };
      }
      return p;
    }));

    try {
      await api.patch(`projects/${id}/tarification`, data);
      toast.success('Tarification mise à jour');
    } catch (e) {
      toast.error('Erreur lors de la mise à jour de la tarification');
      fetchData(); // revert
    }
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'overview': return <LayoutDashboard className="w-4 h-4 mr-2" />;
      case 'projects': return <KanbanSquare className="w-4 h-4 mr-2" />;
      case 'planning': return <CalendarDays className="w-4 h-4 mr-2" />;
      case 'analytics': return <BarChart3 className="w-4 h-4 mr-2" />;
      case 'time': return <Clock className="w-4 h-4 mr-2" />;
      case 'stock': return <Package className="w-4 h-4 mr-2" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-theme-bg-main text-theme-text-main overflow-hidden">
      {/* Header Tabs */}
      <div className="flex-shrink-0 bg-theme-bg-sidebar border-b border-theme-border p-4 shadow-sm z-10">
        <h1 className="text-2xl font-bold mb-4 text-theme-text-main">Hub Gestion</h1>
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide">
          {MANAGEMENT_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors font-medium text-sm whitespace-nowrap
                ${activeTab === tab.id 
                  ? 'bg-theme-primary text-white shadow-md' 
                  : 'bg-theme-bg-card text-theme-text-muted hover:text-theme-text-main border border-theme-border hover:border-theme-primary/50'
                }
              `}
            >
              {getIcon(tab.id)}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-6 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-theme-bg-main/50 backdrop-blur-sm z-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-theme-primary"></div>
          </div>
        ) : null}

        {activeTab === 'overview' && overview && analytics && (
          <Overview 
            overview={overview} 
            analytics={analytics} 
            projects={projects} 
            onNavigate={setActiveTab} 
          />
        )}
        
        {activeTab === 'projects' && (
          <KanbanView 
            projects={projects} 
            updateStatus={updateStatus} 
            updatePlanning={updatePlanning}
            updateTarification={updateTarification}
          />
        )}
        
        {activeTab === 'planning' && (
          <PlanningGantt 
            projects={projects} 
            updatePlanning={updatePlanning} 
          />
        )}
        
        {activeTab === 'analytics' && analytics && (
          <Analytics analytics={analytics} />
        )}
        
        {activeTab === 'time' && (
          <TimeTracking projects={projects} updatePlanning={updatePlanning} />
        )}
        
        {activeTab === 'stock' && (
          <StockView />
        )}
      </div>
    </div>
  );
};
