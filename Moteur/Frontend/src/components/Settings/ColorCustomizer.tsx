import * as React from 'react';
const { useState } = React;
import { useTheme } from '../../context/ThemeContext';
import { THEME_COLORS } from '../../config/themeConfig';
import { THEME_PRESETS } from '../../config/themePresets';

// Local icon stubs with proper TypeScript typing
interface IconProps {
    size?: number;
    className?: string;
}

const RotateCcw: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
    </svg>
);

const Copy: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
);

const Check: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

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

const Download: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const Upload: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

export function ColorCustomizer() {
    const { colors, setColor, setColors, resetColors, theme, exportTheme, importTheme } = useTheme();
    const [copied, setCopied] = useState<string | null>(null);
    const [showPresets, setShowPresets] = useState(true);
    const [importError, setImportError] = useState<string | null>(null);

    const handleCopyColor = (value: string) => {
        if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(value).then(() => {
                setCopied(value);
                setTimeout(() => setCopied(null), 2000);
            });
        } else {
            setCopied(value);
            setTimeout(() => setCopied(null), 2000);
        }
    };

    const handleExportColors = () => {
        const json = exportTheme();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `opticut-colors-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportColors = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const success = importTheme(e.target?.result as string);
            if (!success) {
                setImportError('Format invalide ou erreur de lecture');
            } else {
                setImportError(null);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-theme-text-muted flex items-center gap-2">
                        <Palette size={20} />
                        Personnalisation des couleurs
                    </h3>
                    <p className="text-sm text-theme-text-muted mt-1">
                        Configurez les couleurs de votre interface ou choisissez parmi nos palettes
                    </p>
                </div>
                <button
                    onClick={resetColors}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-bg-card hover:bg-theme-bg-main bg-theme-bg-card text-theme-text-muted hover:bg-theme-bg-card transition-colors"
                >
                    <RotateCcw size={18} />
                    Réinitialiser
                </button>
            </div>

            {/* Palettes prédéfinies */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-theme-text-muted">
                        Palettes prédéfinies
                    </h4>
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="text-xs text-theme-text-muted hover:text-theme-text-main dark:hover:text-slate-100"
                    >
                        {showPresets ? 'Masquer' : 'Afficher'}
                    </button>
                </div>
                {showPresets && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(THEME_PRESETS).map(([name, presetColors]) => (
                            <button
                                key={name}
                                onClick={() => setColors(presetColors)}
                                className="p-3 rounded-lg border-2 border-theme-primary/20 hover:border-theme-primary/40 transition-all hover:shadow-md text-left"
                            >
                                <div className="flex gap-1 mb-2">
                                    {['primary', 'secondary', 'accent'].map((key) => (
                                        <div
                                            key={key}
                                            className="flex-1 h-6 rounded"
                                            style={{
                                                backgroundColor: presetColors[key] || '#000',
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm font-medium text-theme-text-muted">
                                    {name}
                                </p>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Personnalisation personnalisée */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Éditeur de couleurs */}
                <div>
                    <h4 className="text-sm font-semibold text-theme-text-muted mb-3">
                        Éditeur personnalisé
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {THEME_COLORS.map(({ key, label }) => (
                            <div
                                key={key}
                                className="p-4 rounded-lg border border-theme-primary/20 bg-theme-bg-card hover:border-theme-primary/40 transition-colors"
                            >
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-theme-text-muted">
                                        {label}
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={colors[key] ?? '#000000'}
                                        onChange={(e) => setColor(key, e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border border-theme-primary/20"
                                    />
                                    <input
                                        type="text"
                                        value={colors[key] ?? ''}
                                        onChange={(e) => {
                                            if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value))
                                              setColor(key, e.target.value);
                                        }}
                                        className="flex-1 px-2 py-1 text-xs rounded border border-theme-primary/20 bg-theme-bg-main text-theme-text-muted font-mono"
                                        placeholder="#000000"
                                    />
                                    <button
                                        onClick={() => handleCopyColor(colors[key] ?? '#000000')}
                                        className="p-2 rounded bg-theme-bg-card hover:bg-theme-bg-main bg-theme-bg-card hover:bg-theme-bg-card transition-colors"
                                        title="Copier"
                                    >
                                        {copied === (colors[key] ?? '#000000') ? (
                                            <Check size={16} className="text-green-600" />
                                        ) : (
                                            <Copy size={16} className="text-theme-text-muted" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aperçu en temps réel directement branché sur `colors` */}
                <div>
                    <h4 className="text-sm font-semibold text-theme-text-muted mb-3">
                        Aperçu en temps réel
                    </h4>
                    <div className="p-6 rounded-lg border border-theme-primary/20" style={{ backgroundColor: colors['bg-card'] ?? '#fff', borderColor: colors.border ?? '#ccc' }}>
                        <div className="space-y-3">
                            {/* Boutons */}
                            <div>
                                <button
                                    className="w-full py-2 rounded font-medium text-theme-text-main transition-opacity hover:opacity-90 mb-2"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    Bouton Primaire
                                </button>
                                <button
                                    className="w-full py-2 rounded font-medium text-theme-text-main transition-opacity hover:opacity-90 mb-2"
                                    style={{ backgroundColor: colors.secondary }}
                                >
                                    Bouton Secondaire
                                </button>
                                <button
                                    className="w-full py-2 rounded font-medium text-theme-text-main transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.danger }}
                                >
                                    Danger
                                </button>
                            </div>

                            {/* Texte */}
                            <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                                <p style={{ color: colors['text-main'] }} className="text-sm font-medium">
                                    Texte normal
                                </p>
                                <p style={{ color: colors['text-muted'] }} className="text-xs opacity-70 mt-1">
                                    Texte secondaire
                                </p>
                            </div>

                            {/* Palette de couleurs miniature */}
                            <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                                <p className="text-xs font-medium text-theme-text-muted mb-2">
                                    Palette complète
                                </p>
                                <div className="grid grid-cols-5 gap-2">
                                    {THEME_COLORS.map(({ key }) => (
                                        <div
                                            key={key}
                                            className="h-8 rounded border border-theme-primary/20"
                                            style={{ backgroundColor: colors[key] }}
                                            title={key}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Import/Export */}
            <div className="space-y-4">
                <div className="p-4 rounded-lg bg-theme-bg-card dark:bg-slate-900 border border-theme-primary/20">
                    <h4 className="text-sm font-semibold text-theme-text-muted mb-3">
                        Import / Export
                    </h4>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportColors}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-bg-card hover:bg-theme-bg-main bg-theme-bg-card text-theme-text-muted hover:bg-theme-bg-card transition-colors text-sm"
                        >
                            <Download size={16} />
                            Exporter
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-theme-bg-card hover:bg-theme-bg-main bg-theme-bg-card text-theme-text-muted hover:bg-theme-bg-card transition-colors text-sm cursor-pointer">
                            <Upload size={16} />
                            Importer
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImportColors}
                                className="hidden"
                            />
                        </label>
                    </div>
                    {importError && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">{importError}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
