import * as React from 'react';
const { useState } = React;
import { ColorCustomizer } from './ColorCustomizer';
import { ThemePreview } from './ThemePreview';
import { ThemeSelector } from './ThemeSelector';
import { PresetSelector } from './PresetSelector';
import { ContrastChecker } from './ContrastChecker';
import { UserProfiles } from './UserProfiles';

// Icon components with proper TypeScript typing
interface IconProps {
    size?: number;
    className?: string;
}

const Palette: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="13.5" cy="6.5" r="1.5" />
        <circle cx="17.5" cy="10.5" r="1.5" />
        <circle cx="17.5" cy="14.5" r="1.5" />
        <circle cx="13.5" cy="18.5" r="1.5" />
        <circle cx="6.5" cy="18.5" r="1.5" />
        <circle cx="6.5" cy="14.5" r="1.5" />
        <circle cx="6.5" cy="10.5" r="1.5" />
        <circle cx="6.5" cy="6.5" r="1.5" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" />
    </svg>
);

const Eye: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const Settings: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6m-1.78-7.78l-4.24 4.24m-3.08 3.08l-4.24 4.24" />
    </svg>
);

const Sparkles: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
);

const AlertCircle: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const Users: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

const ChevronRight: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

interface TabItem {
    id: string;
    label: string;
    description: string;
    icon: React.ReactElement;
    content: React.ReactNode;
}

export function ThemeCustomizationPanel() {
    const [activeTab, setActiveTab] = useState('customizer');

    const tabs: TabItem[] = [
        {
            id: 'customizer',
            label: 'Personnaliseur',
            description: 'Modifiez chaque couleur individuellement',
            icon: <Palette size={20} />,
            content: <ColorCustomizer />,
        },
        {
            id: 'preview',
            label: 'Aperçu',
            description: 'Visualisez votre thème en temps réel',
            icon: <Eye size={20} />,
            content: <ThemePreview />,
        },
        {
            id: 'theme',
            label: 'Thème',
            description: 'Gérez le thème clair/sombre',
            icon: <Settings size={20} />,
            content: <ThemeSelector />,
        },
        {
            id: 'presets',
            label: 'Présets',
            description: 'Sauvegardez et gérez vos thèmes',
            icon: <Sparkles size={20} />,
            content: <PresetSelector />,
        },
        {
            id: 'contrast',
            label: 'Accessibilité',
            description: 'Vérifiez la lisibilité des couleurs',
            icon: <AlertCircle size={20} />,
            content: <ContrastChecker />,
        },
        {
            id: 'profiles',
            label: 'Profils',
            description: 'Gérez les profils utilisateur',
            icon: <Users size={20} />,
            content: <UserProfiles />,
        },
    ];

    const activeTabData = tabs.find((t) => t.id === activeTab);

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    Personnalisation du Thème
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Configurez l'apparence de votre interface de menuiserie exactement comme vous la souhaitez
                </p>
            </div>

            {/* Grille d'accès rapide aux onglets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                            activeTab === tab.id
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div
                                className={`${
                                    activeTab === tab.id
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {tab.icon}
                            </div>
                            {activeTab === tab.id && (
                                <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            )}
                        </div>
                        <h3
                            className={`font-semibold text-sm mb-1 ${
                                activeTab === tab.id
                                    ? 'text-slate-900 dark:text-slate-100'
                                    : 'text-slate-800 dark:text-slate-200'
                            }`}
                        >
                            {tab.label}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                            {tab.description}
                        </p>
                    </button>
                ))}
            </div>

            {/* Contenu principal */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-8">
                {activeTabData && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="text-blue-600 dark:text-blue-400">
                                {activeTabData.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                                    {activeTabData.label}
                                </h2>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    {activeTabData.description}
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-950/50 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                            {activeTabData.content}
                        </div>
                    </div>
                )}
            </div>

            {/* Conseil d'utilisation */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-2">
                    💡 Conseil
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                    Explorez les différentes palettes prédéfinies pour trouver l'inspiration, puis affinez les couleurs dans l'onglet Personnaliseur. Utilisez l'onglet Aperçu pour voir vos modifications en temps réel.
                </p>
            </div>
        </div>
    );
}
