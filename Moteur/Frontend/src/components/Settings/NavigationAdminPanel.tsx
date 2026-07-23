import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import { NAV_ITEMS, Role, NavCategory } from '../../config/navConfig';

export const NavigationAdminPanel: React.FC = () => {
    const [selectedRole, setSelectedRole] = useState<Role>('operateur');
    const [config, setConfig] = useState<Record<Role, Record<string, boolean>>>({
        operateur: {},
        chef: {},
        admin: {}
    });
    const [confirmReset, setConfirmReset] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('opticut_nav_admin_config');
        if (saved) {
            setConfig(JSON.parse(saved));
        } else {
            const initialConfig = { operateur: {}, chef: {}, admin: {} } as Record<Role, Record<string, boolean>>;
            NAV_ITEMS.forEach(item => {
                initialConfig.operateur[item.id] = item.defaultVisible.operateur;
                initialConfig.chef[item.id] = item.defaultVisible.chef;
                initialConfig.admin[item.id] = item.defaultVisible.admin;
            });
            setConfig(initialConfig);
        }
    }, []);

    const handleToggle = (id: string) => {
        const item = NAV_ITEMS.find(i => i.id === id);
        if (item?.required) return;
        
        setConfig(prev => ({
            ...prev,
            [selectedRole]: {
                ...prev[selectedRole],
                [id]: !prev[selectedRole][id]
            }
        }));
    };

    const handleApply = () => {
        localStorage.setItem('opticut_nav_admin_config', JSON.stringify(config));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    };

    const handleReset = () => {
        if (!confirmReset) {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 3000);
            return;
        }
        
        const initialConfig = { operateur: {}, chef: {}, admin: {} } as Record<Role, Record<string, boolean>>;
        NAV_ITEMS.forEach(item => {
            initialConfig.operateur[item.id] = item.defaultVisible.operateur;
            initialConfig.chef[item.id] = item.defaultVisible.chef;
            initialConfig.admin[item.id] = item.defaultVisible.admin;
        });
        setConfig(initialConfig);
        setConfirmReset(false);
    };

    const categories: NavCategory[] = ['Production', 'Suivi', 'Données', 'Administration'];

    return (
        <div className="bg-theme-bg-card rounded-xl border border-theme-border p-6">
            <h3 className="text-lg font-bold text-theme-text-main mb-6">Configuration de la Navigation (Admin)</h3>
            
            {/* Roles Tabs */}
            <div className="flex gap-2 border-b border-theme-border mb-6">
                {(['operateur', 'chef', 'admin'] as Role[]).map(role => (
                    <button
                        key={role}
                        onClick={() => setSelectedRole(role)}
                        className={`px-4 py-2 font-medium capitalize transition-colors ${
                            selectedRole === role 
                            ? 'text-theme-primary border-b-2 border-theme-primary' 
                            : 'text-theme-text-muted hover:text-theme-text-main'
                        }`}
                    >
                        {role === 'chef' ? "Chef d'atelier" : role}
                    </button>
                ))}
            </div>

            {/* List of tabs grouped by category */}
            <div className="space-y-6">
                {categories.map(cat => {
                    const items = NAV_ITEMS.filter(i => i.category === cat);
                    if (items.length === 0) return null;
                    return (
                        <div key={cat} className="space-y-3">
                            <h4 className="text-sm font-semibold text-theme-text-muted uppercase tracking-wider">{cat}</h4>
                            <div className="space-y-2">
                                {items.map(item => {
                                    const isVisible = config[selectedRole]?.[item.id] ?? item.defaultVisible[selectedRole];
                                    const Icon = item.icon;
                                    
                                    return (
                                        <div 
                                            key={item.id} 
                                            className={`flex items-center justify-between p-3 rounded-lg border border-theme-border transition-colors ${
                                                !isVisible ? 'bg-theme-bg-main/50' : 'bg-theme-bg-main'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Icon className={`w-5 h-5 ${!isVisible ? 'text-theme-text-muted' : 'text-theme-text-main'}`} />
                                                <span className={`font-medium ${!isVisible ? 'text-theme-text-muted line-through' : 'text-theme-text-main'}`}>
                                                    {item.label}
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 bg-theme-primary/10 text-theme-primary rounded uppercase">
                                                    {item.category}
                                                </span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                {item.required && (
                                                    <div className="relative group cursor-not-allowed flex items-center">
                                                        <Lock className="w-4 h-4 text-theme-text-muted" />
                                                        <div className="absolute hidden group-hover:block bottom-full right-0 mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded z-10 whitespace-nowrap">
                                                            Cet onglet est obligatoire et ne peut pas être masqué
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <button
                                                    disabled={item.required}
                                                    onClick={() => handleToggle(item.id)}
                                                    className={`w-10 h-5 rounded-full transition-colors relative flex items-center ${
                                                        item.required 
                                                        ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50' 
                                                        : isVisible 
                                                            ? 'bg-theme-primary' 
                                                            : 'bg-gray-400 dark:bg-gray-600'
                                                    }`}
                                                >
                                                    <div className={`absolute left-1 bg-white w-3.5 h-3.5 rounded-full transition-transform ${isVisible ? 'translate-x-4.5' : 'translate-x-0'}`} style={{ transform: isVisible ? 'translateX(18px)' : 'translateX(0)' }} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Actions */}
            <div className="mt-8 flex justify-end items-center gap-4">
                <button
                    onClick={handleReset}
                    className="text-theme-text-muted hover:text-theme-text-main px-4 py-2 font-medium transition-colors"
                >
                    {confirmReset ? "Confirmer la réinitialisation ?" : "Réinitialiser par défaut"}
                </button>
                <div className="relative">
                    <button
                        onClick={handleApply}
                        className="bg-theme-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all shadow-sm"
                    >
                        Appliquer les modifications
                    </button>
                    {showToast && (
                        <div className="absolute bottom-full right-0 mb-2 px-4 py-2 bg-green-500 text-white text-sm rounded-lg shadow-lg whitespace-nowrap animate-fade-in-down">
                            Configuration mise à jour
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
