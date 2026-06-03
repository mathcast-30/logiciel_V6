import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Calendar,
    Users2,
    TrendingUp,
    Package,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    GripVertical,
    Clock
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    Legend,
    type PieLabelRenderProps
} from 'recharts';
import api from '../services/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';



interface Project {
    id: number;
    name: string;
    status: string;
    start_date: string | null;
    delivery_date: string | null;
}

interface StatsData {
    stock_value: number;
    total_projects: number;
    active_projects: number;
    pending_quotes: number;
    total_clients: number;
    total_revenue: number;
    projects_by_status: { name: string; value: number }[];
    stock_by_material: { name: string; value: number }[];
}

const STATUS_CLASSES: Record<string, { bg: string, text: string, bar: string, dot: string }> = {
    'draft': { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500', bar: 'bg-slate-400', dot: 'bg-slate-400' },
    'validated': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', bar: 'bg-blue-500', dot: 'bg-blue-500' },
    'in_progress': { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500', dot: 'bg-amber-500' },
    'done': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-500', dot: 'bg-emerald-500' }
};

export function Management() {
    const [activeTab, setActiveTab] = useState<'stats' | 'planning'>('stats');
    const [stats, setStats] = useState<StatsData | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, projectsRes] = await Promise.all([
                api.get<StatsData>('/stats/dashboard'),
                api.get<Project[]>('/projects/')
            ]);
            setStats(statsRes.data);
            setProjects(projectsRes.data);
        } catch (error) {
            console.error('Error loading management data:', error);
            toast.error('Erreur lors du chargement des données');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Gantt Logic
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <TrendingUp className="h-8 w-8 text-blue-500" />
                        Gestion & Statistiques
                    </h1>
                    <p className="text-slate-500 mt-1">Analysez votre activité et planifiez vos projets.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        Statistiques
                    </button>
                    <button
                        onClick={() => setActiveTab('planning')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === 'planning' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <Calendar className="h-4 w-4" />
                        Planning Gantt
                    </button>
                </div>
            </header>

            {activeTab === 'stats' && stats && (
                <div className="space-y-8">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPIColCard title="Clients Totaux" value={stats.total_clients} icon={Users2} color="blue" />
                        <KPIColCard title="Chiffre d'Affaires" value={`${stats.total_revenue.toLocaleString()} €`} icon={TrendingUp} color="emerald" subtitle="Devis acceptés" />
                        <KPIColCard title="Valeur Stock" value={`${stats.stock_value.toLocaleString()} €`} icon={Package} color="purple" />
                        <KPIColCard title="Projets Actifs" value={stats.active_projects} icon={Clock} color="amber" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Stock Value by Material */}
                        <div className="card p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Package className="h-5 w-5 text-purple-500" />
                                Valeur du Stock par Matière
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.stock_by_material} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} opacity={0.1} />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: 'transparent' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            formatter={(value) => [`${value} €`, 'Valeur']}
                                        />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                                            {stats.stock_by_material.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Project Status Redistribution */}
                        <div className="card p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-blue-500" />
                                État Global des Projets
                            </h3>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.projects_by_status}
                                            innerRadius={80}
                                            outerRadius={120}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={(props: PieLabelRenderProps) => `${props.name || ''} ${(((props.percent || 0) * 100)).toFixed(0)}%`}
                                        >
                                            {stats.projects_by_status.map((entry, index) => {
                                                const status = entry.name as keyof typeof STATUS_CLASSES;
                                                // Convert Hex colors to match the dynamic palette if needed, but here we can just use static ones or direct colors
                                                const colors: Record<string, string> = {
                                                    'draft': '#94a3b8',
                                                    'validated': '#3b82f6',
                                                    'in_progress': '#eab308',
                                                    'done': '#22c55e'
                                                };
                                                return <Cell key={`cell-${index}`} fill={colors[status] || '#cbd5e1'} />;
                                            })}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'planning' && (
                <div className="card overflow-hidden">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-4">
                            <h3 className="font-bold text-lg capitalize">
                                {format(currentDate, 'MMMM yyyy', { locale: fr })}
                            </h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                    title="Mois précédent"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button onClick={() => setCurrentDate(new Date())} className="px-2 text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors" title="Aujourd'hui">
                                    Aujourd'hui
                                </button>
                                <button
                                    onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
                                    title="Mois suivant"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-blue-500 rounded"></div> Validé</div>
                            <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded"></div> En cours</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <div className="min-w-max">
                            {/* Days Header */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                                <div className="w-64 flex-shrink-0 p-4 font-bold border-r border-slate-200 dark:border-slate-800">
                                    Projets
                                </div>
                                {days.map((day: Date) => (
                                    <div
                                        key={day.toString()}
                                        className={`w-10 flex-shrink-0 py-2 text-center border-r border-slate-200/50 dark:border-slate-800/30 ${isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                                    >
                                        <div className="text-[10px] uppercase text-slate-400 font-bold">{format(day, 'eeeee', { locale: fr })}</div>
                                        <div className={`text-sm font-bold ${isSameDay(day, new Date()) ? 'text-blue-600 dark:text-blue-400' : ''}`}>{format(day, 'd')}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Projects Rows */}
                            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {projects.filter(p => p.status !== 'done').map((project) => {
                                    const start = project.start_date ? new Date(project.start_date) : null;
                                    const delivery = project.delivery_date ? new Date(project.delivery_date) : null;
                                    const status = project.status as keyof typeof STATUS_CLASSES;
                                    const classes = STATUS_CLASSES[status] || STATUS_CLASSES.draft;

                                    return (
                                        <div key={project.id} className="flex group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <div className="w-64 flex-shrink-0 p-4 border-r border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <GripVertical className="h-4 w-4 text-slate-300 group-hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0" />
                                                    <span className="font-medium truncate text-sm" title={project.name}>{project.name}</span>
                                                </div>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${classes.bg} ${classes.text}`}>
                                                    {project.status}
                                                </span>
                                            </div>
                                            <div className="flex flex-1 relative h-16">
                                                {days.map((day: Date) => (
                                                    <div key={day.toString()} className={`w-10 flex-shrink-0 border-r border-slate-200/50 dark:border-slate-800/20 h-full ${isSameDay(day, new Date()) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}></div>
                                                ))}

                                                {/* Project Bar */}
                                                {start && delivery && (
                                                    <div
                                                        className={`absolute top-4 h-8 rounded-lg shadow-sm flex items-center px-3 text-white text-[10px] font-bold overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10 ${classes.bar}`}
                                                        ref={el => {
                                                            if (el) {
                                                                const left = Math.max(0, (days.findIndex((d: Date) => isSameDay(d, start))) * 40);
                                                                const width = (days.filter((d: Date) => isWithinInterval(d, { start, end: delivery })).length) * 40;
                                                                el.style.left = `${left}px`;
                                                                el.style.width = `${width}px`;
                                                            }
                                                        }}
                                                    >
                                                        <span className="truncate">{project.name}</span>
                                                    </div>
                                                )}

                                                {!start && (
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/50 dark:bg-slate-900/50 backdrop-blur-[1px]">
                                                        <button
                                                            onClick={() => toast.info('Définissez des dates dans les détails du projet pour le planifier.')}
                                                            className="text-[10px] bg-slate-800 text-white px-2 py-1 rounded-md"
                                                        >
                                                            Non planifié
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {projects.filter(p => p.status !== 'done').length === 0 && (
                                    <div className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-slate-900/30">
                                        <AlertTriangle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                        <p>Aucun projet actif à planifier.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function KPIColCard({ title, value, icon: Icon, color, subtitle }: { title: string, value: string | number, icon: React.ElementType, color: string, subtitle?: string }) {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
    };

    return (
        <div className="card p-6 flex items-start justify-between">
            <div className="space-y-1">
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
                {subtitle && <p className="text-[10px] text-slate-400">{subtitle}</p>}
            </div>
            <div className={`p-3 rounded-xl border ${colors[color]}`}>
                <Icon className="h-6 w-6" />
            </div>
        </div>
    );
}
