import { useState, useEffect, type ElementType } from 'react';
import {
    BarChart3,
    TrendingUp,
    Activity,
    Package,
    DollarSign,
    Target,
    PieChart as PieChartIcon,
    Download,
    Layers,
    Clock,
    Scissors
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { toast } from 'sonner';
import api from '../services/api';

// --- Types ---

interface FinancialStats {
    total_revenue: number;
    total_cogs: number;
    margin: number;
    margin_percent: number;
}

interface ProductionStats {
    avg_waste_percent: number;
    total_panels_cut: number;
    optimizations_count: number;
    waste_history: { date: string; waste: number }[];
}

interface InventoryDetailed {
    material_distribution: { name: string; value: number }[];
    total_items: number;
    offcuts_count: number;
}

interface RevenueHistory {
    date: string;
    revenue: number;
    costs: number;
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// --- Sub-Components ---

const EmptyChart = ({ message = "Aucune donnée disponible pour le moment" }) => (
    <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 p-8 text-center">
        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm mb-4">
            <BarChart3 className="h-8 w-8 text-slate-300" />
        </div>
        <p className="text-slate-500 text-sm font-medium max-w-[200px]">{message}</p>
    </div>
);

const StatCard = ({ title, value, unit = "€", icon: Icon, colorClass, trend }: { title: string, value: number | string, unit?: string, icon: ElementType, colorClass: string, trend?: number }) => (
    <div className="card p-6 overflow-hidden relative group">
        <div className="flex justify-between items-start z-10 relative">
            <div>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-slate-800 dark:text-white">
                    {typeof value === 'number' ? value.toLocaleString() : value} {unit}
                </h3>
                {trend !== undefined && (
                    <div className={`mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${trend > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {trend > 0 ? '+' : ''}{trend}% vs mois dernier
                    </div>
                )}
            </div>
            <div className={`p-4 rounded-2xl ${colorClass} transition-transform group-hover:scale-110 duration-300`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
        <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-5 ${colorClass.split(' ')[0]}`} />
    </div>
);

export function Statistics() {
    const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'production' | 'inventory'>('overview');
    const [isLoading, setIsLoading] = useState(true);

    // Data States
    const [financials, setFinancials] = useState<FinancialStats | null>(null);
    const [production, setProduction] = useState<ProductionStats | null>(null);
    const [inventory, setInventory] = useState<InventoryDetailed | null>(null);
    const [history, setHistory] = useState<RevenueHistory[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [finRes, prodRes, invRes, histRes] = await Promise.all([
                api.get<FinancialStats>('/stats/financial-summary'),
                api.get<ProductionStats>('/stats/production'),
                api.get<InventoryDetailed>('/stats/inventory-detailed'),
                api.get<RevenueHistory[]>('/stats/revenue-history')
            ]);
            setFinancials(finRes.data);
            setProduction(prodRes.data);
            setInventory(invRes.data);
            setHistory(histRes.data);
        } catch (error) {
            console.error('Error loading stats:', error);
            toast.error('Erreur lors de la récupération des statistiques');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="spinner !w-12 !h-12 border-4 !border-indigo-500 !border-t-transparent" />
                <p className="text-slate-500 font-medium animate-pulse">Compilation des rapports...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-indigo-500" />
                        Centre de Statistiques
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Analyse approfondie de votre activité menuiserie</p>
                </div>

                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-white/5 shadow-inner">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Général
                    </button>
                    <button
                        onClick={() => setActiveTab('finance')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'finance' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Finances
                    </button>
                    <button
                        onClick={() => setActiveTab('production')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'production' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Atelier
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'inventory' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Stock
                    </button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard
                            title="Chiffre d'Affaires"
                            value={financials?.total_revenue || 0}
                            icon={DollarSign}
                            colorClass="bg-indigo-500/10 text-indigo-600"
                        />
                        <StatCard
                            title="Rentabilité"
                            value={financials?.margin_percent || 0}
                            unit="%"
                            icon={TrendingUp}
                            colorClass="bg-emerald-500/10 text-emerald-600"
                        />
                        <StatCard
                            title="Optimisations"
                            value={production?.optimizations_count || 0}
                            unit=""
                            icon={Target}
                            colorClass="bg-blue-500/10 text-blue-600"
                        />
                        <StatCard
                            title="Taux de Perte Moyen"
                            value={production?.avg_waste_percent || 0}
                            unit="%"
                            icon={Activity}
                            colorClass="bg-amber-500/10 text-amber-600"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 card p-8 min-h-[450px]">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-8 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-indigo-500" />
                                    Évolution Financière (12 mois)
                                </span>
                                <Download className="h-4 w-4 text-slate-300 hover:text-indigo-500 cursor-pointer" />
                            </h3>
                            <div className="h-[300px]">
                                {history.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={history}>
                                            <defs>
                                                <linearGradient id="overRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `${val}€`} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            />
                                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fill="url(#overRev)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart />}
                            </div>
                        </div>

                        <div className="card p-8 min-h-[450px]">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-8">Valeur Stock par Matière</h3>
                            <div className="h-[280px]">
                                {inventory?.material_distribution && inventory.material_distribution.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={inventory.material_distribution}
                                                cx="50%" cy="50%"
                                                innerRadius={60} outerRadius={90}
                                                paddingAngle={5} dataKey="value"
                                            >
                                                {inventory.material_distribution.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <EmptyChart message="Aucun stock enregistré" />}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'finance' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card p-8 border-l-4 border-l-indigo-500">
                            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Facturé</h4>
                            <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                                {financials?.total_revenue?.toLocaleString()} <span className="text-lg opacity-50">€</span>
                            </div>
                            <p className="text-xs text-slate-500">Basé sur les devis acceptés uniquement</p>
                        </div>
                        <div className="card p-8 border-l-4 border-l-rose-500">
                            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Coût Matière</h4>
                            <div className="text-3xl font-black text-slate-800 dark:text-white mb-1">
                                {financials?.total_cogs?.toLocaleString()} <span className="text-lg opacity-50">€</span>
                            </div>
                            <p className="text-xs text-slate-500">Estimation (Matière + Waste 20%)</p>
                        </div>
                        <div className="card p-8 border-l-4 border-l-emerald-500">
                            <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Marge Brute</h4>
                            <div className="text-3xl font-black text-emerald-600 mb-1">
                                {financials?.margin?.toLocaleString()} <span className="text-lg opacity-50">€</span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold">{financials?.margin_percent}% de bénéfice</p>
                        </div>
                    </div>

                    <div className="card p-8">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-emerald-500" />
                            Comparatif Revenus vs Coûts
                        </h3>
                        <div className="h-[400px]">
                            {history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={history} barGap={8}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} />
                                        <Legend />
                                        <Bar dataKey="revenue" name="Ventes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="costs" name="Coûts" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart />}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'production' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="card p-6 bg-slate-900 text-white border-none shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/10 rounded-2xl">
                                    <Scissors className="h-8 w-8 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-slate-400 text-xs font-bold uppercase mb-1">Panneaux Débités</p>
                                    <div className="text-3xl font-black">{production?.total_panels_cut}</div>
                                </div>
                            </div>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-amber-500/10 rounded-2xl">
                                    <Layers className="h-8 w-8 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Optimisations Total</p>
                                    <div className="text-3xl font-black">{production?.optimizations_count}</div>
                                </div>
                            </div>
                        </div>
                        <div className="card p-6">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-indigo-500/10 rounded-2xl">
                                    <Target className="h-8 w-8 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs font-bold uppercase mb-1">Perte Matérielle</p>
                                    <div className="text-3xl font-black text-indigo-600">{production?.avg_waste_percent}%</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card p-8">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            Historique du Taux de Chute
                        </h3>
                        <div className="h-[400px]">
                            {production?.waste_history && production.waste_history.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={production.waste_history}>
                                        <XAxis dataKey="date" />
                                        <YAxis unit="%" />
                                        <Tooltip />
                                        <Area type="step" dataKey="waste" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart message="Aucune donnée d'optimisation validée" />}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'inventory' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-800/50 dark:to-indigo-900/20 border-indigo-100 dark:border-indigo-900/30">
                            <Package className="h-12 w-12 text-indigo-500 mx-auto mb-4" />
                            <h4 className="text-slate-500 text-xs font-black uppercase mb-1">Total Références</h4>
                            <div className="text-4xl font-black text-slate-800 dark:text-white">{inventory?.total_items}</div>
                        </div>
                        <div className="card p-8 text-center bg-gradient-to-br from-slate-50 to-emerald-50 dark:from-slate-800/50 dark:to-emerald-900/20 border-emerald-100 dark:border-emerald-900/30">
                            <Clock className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
                            <h4 className="text-slate-500 text-xs font-black uppercase mb-1">Chutes en Stock</h4>
                            <div className="text-4xl font-black text-slate-800 dark:text-white">{inventory?.offcuts_count}</div>
                        </div>
                    </div>

                    <div className="card p-8 min-h-[500px]">
                        <h4 className="font-bold text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                            <PieChartIcon className="h-5 w-5 text-indigo-500" />
                            Distribution du Stock par Matière (Valeur)
                        </h4>
                        <div className="h-[400px]">
                            {inventory?.material_distribution && inventory.material_distribution.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={inventory.material_distribution} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={150} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" name="Valeur (€)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <EmptyChart />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
