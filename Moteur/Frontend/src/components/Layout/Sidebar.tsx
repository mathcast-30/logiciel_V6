import { NavLink } from 'react-router-dom';
import {
    Users2,
    FolderKanban,
    Warehouse,
    Scissors,
    Settings,
    Sparkles,
    FileText,
    Sun,
    Moon,
    Monitor,
    Library,
    Wrench,
    FileUp,
    TrendingUp,
    FolderArchive
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const navItems = [
    { path: '/management', icon: TrendingUp, label: 'Gestion' },
    { path: '/projects', icon: FolderKanban, label: 'Projets (Détails)' },
    { path: '/import-step', icon: FileUp, label: 'Import 3D (STEP)' },
    { path: '/quotes', icon: FileText, label: 'Devis' },
    { path: '/clients', icon: Users2, label: 'Clients' },
    { path: '/stock', icon: Warehouse, label: 'Matériaux & Stock' },
    { path: '/hardware', icon: Wrench, label: 'Quincaillerie' },
    { path: '/optimize', icon: Scissors, label: 'Optimisation' },
    { path: '/library', icon: Library, label: 'Bibliothèque' },
    { path: '/file-explorer', icon: FolderArchive, label: 'Fichiers' },
    { path: '/settings', icon: Settings, label: 'Paramètres' },
];

export function Sidebar() {
    const { theme, setTheme } = useTheme();

    return (
        <aside className="w-72 bg-theme-bg-sidebar text-theme-text-main border-r border-theme-border shadow-xl z-20 flex-shrink-0 flex flex-col h-full">
            {/* Logo & Brand */}
            <div className="p-6 border-b border-white/10 flex items-center gap-3">
                <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                        <Scissors className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full flex items-center justify-center animate-pulse-soft">
                        <Sparkles className="w-2.5 h-2.5 text-white" />
                    </div>
                </div>
                <div className="animate-fade-in">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent whitespace-nowrap">
                        OptiCut Pro
                    </h1>
                    <p className="text-xs text-slate-400 whitespace-nowrap">Optimisation de découpe</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-4">
                    Navigation
                </p>
                {navItems.map((item, index) => (
                    <NavLink
                        key={`${item.path}-${index}`}
                        to={item.path}
                        className={({ isActive }) => `
                            group flex items-center gap-3 px-4 py-3 font-medium transition-all duration-300 rounded-xl
                            ${isActive
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }
                        `}
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`
                                    p-2 rounded-lg transition-all duration-300 flex-shrink-0
                                    ${isActive
                                        ? 'bg-white/20'
                                        : 'bg-slate-700/50 group-hover:bg-slate-700'
                                    }
                                `}>
                                    <item.icon className="h-5 w-5" />
                                </div>
                                <span className="whitespace-nowrap animate-fade-in">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse-soft" />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer / User Section */}
            <div className="p-4 border-t border-white/10 space-y-4">
                {/* Theme Toggle */}
                <div className="bg-slate-800/50 rounded-xl p-1 flex items-center justify-between border border-white/5">
                    <button
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        title="Mode Clair"
                    >
                        <Sun className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setTheme('system')}
                        className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        title="Système"
                    >
                        <Monitor className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all ${theme === 'dark' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                        title="Mode Sombre"
                    >
                        <Moon className="h-4 w-4" />
                    </button>
                </div>

                <div className="glass-card bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            MP
                        </div>
                        <div className="flex-1 min-w-0 animate-fade-in">
                            <p className="text-sm font-medium text-white truncate">Mon Atelier</p>
                            <p className="text-xs text-slate-400">Version 4.0</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
