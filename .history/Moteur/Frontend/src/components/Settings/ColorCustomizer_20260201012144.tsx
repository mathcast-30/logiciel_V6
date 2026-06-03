import * as React from 'react';
const { useState } = React;
import { useTheme } from '../../context/ThemeContext';
import { COLOR_PALETTES, getPaletteForTheme } from '../../utils/ColorPalettes';

// Local icon stub (no props spread to satisfy lint)
const IconStub = (name: string) => () => <span aria-hidden title={name} />;
const RotateCcw = IconStub('RotateCcw');
const Copy = IconStub('Copy');
const Check = IconStub('Check');
const Palette = IconStub('Palette');
const Download = IconStub('Download');
const Upload = IconStub('Upload');

export function ColorCustomizer() {
    const { colors, setColors, resetColors, theme } = useTheme();
    const [copied, setCopied] = useState<string | null>(null);
    const [showPresets, setShowPresets] = useState(true);
    const [importError, setImportError] = useState<string | null>(null);

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const handleColorChange = (key: keyof typeof colors, value: string) => {
        setColors({
            ...colors,
            [key]: value,
        });
    };

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

    const handlePresetSelect = (paletteId: string) => {
        const palette = getPaletteForTheme(paletteId, isDark);
        if (palette) {
            setColors(palette);
        }
    };

    const handleExportColors = () => {
        const data = {
            timestamp: new Date().toISOString(),
            theme,
            colors,
        };
        const json = JSON.stringify(data, null, 2);
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
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.colors && typeof data.colors === 'object') {
                    setColors(data.colors);
                    setImportError(null);
                } else {
                    setImportError('Format invalide');
                }
            } catch (err) {
                setImportError('Erreur de lecture du fichier');
            }
        };
        reader.readAsText(file);
    };

    const colorKeys: { key: keyof typeof colors, label: string, description: string }[] = [
        { key: 'primary', label: 'Primaire', description: 'Couleur principale' },
        { key: 'secondary', label: 'Secondaire', description: 'Couleur secondaire' },
        { key: 'accent', label: 'Accent', description: 'Couleur d\'accent' },
        { key: 'background', label: 'Arrière-plan', description: 'Couleur de fond' },
        { key: 'surface', label: 'Surface', description: 'Couleur des surfaces' },
        { key: 'text', label: 'Texte', description: 'Couleur du texte' },
        { key: 'border', label: 'Bordure', description: 'Couleur des bordures' },
        { key: 'success', label: 'Succès', description: 'Couleur de succès' },
        { key: 'warning', label: 'Avertissement', description: 'Couleur d\'avertissement' },
        { key: 'error', label: 'Erreur', description: 'Couleur d\'erreur' },
    ];

    return (
        <div className="space-y-6">
            {/* En-tête */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Palette size={20} />
                        Personnalisation des couleurs
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Configurez les couleurs de votre interface ou choisissez parmi nos palettes
                    </p>
                </div>
                <button
                    onClick={resetColors}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                    <RotateCcw size={18} />
                    Réinitialiser
                </button>
            </div>

            {/* Palettes prédéfinies */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Palettes prédéfinies
                    </h4>
                    <button
                        onClick={() => setShowPresets(!showPresets)}
                        className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                        {showPresets ? 'Masquer' : 'Afficher'}
                    </button>
                </div>
                {showPresets && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {Object.entries(COLOR_PALETTES).map(([paletteId, palette]) => (
                            <button
                                key={paletteId}
                                onClick={() => handlePresetSelect(paletteId)}
                                className="p-3 rounded-lg border-2 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 transition-all hover:shadow-md text-left"
                            >
                                <div className="flex gap-1 mb-2">
                                    {['primary', 'secondary', 'accent'].map((colorKey) => (
                                        <div
                                            key={colorKey}
                                            className="flex-1 h-6 rounded"
                                            style={{
                                                backgroundColor: (isDark ? palette.dark : palette.light)[colorKey as keyof typeof palette.light],
                                            }}
                                        />
                                    ))}
                                </div>
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {palette.name}
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    {palette.description}
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
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Éditeur personnalisé
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {colorKeys.map(({ key, label, description }) => (
                            <div
                                key={key}
                                className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition-colors"
                            >
                                <div className="mb-3">
                                    <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {label}
                                    </label>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                        {description}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={colors[key]}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600"
                                    />
                                    <input
                                        type="text"
                                        value={colors[key]}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className="flex-1 px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                                        placeholder="#000000"
                                    />
                                    <button
                                        onClick={() => handleCopyColor(colors[key])}
                                        className="p-2 rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                        title="Copier"
                                    >
                                        {copied === colors[key] ? (
                                            <Check size={16} className="text-green-600" />
                                        ) : (
                                            <Copy size={16} className="text-slate-600 dark:text-slate-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Aperçu */}
                <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Aperçu en temps réel
                    </h4>
                    <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700" style={{ backgroundColor: colors.surface, borderColor: colors.border }}>
                        <div className="space-y-3">
                            {/* Boutons */}
                            <div>
                                <button
                                    className="w-full py-2 rounded font-medium text-white transition-opacity hover:opacity-90 mb-2"
                                    style={{ backgroundColor: colors.primary }}
                                >
                                    Bouton Primaire
                                </button>
                                <button
                                    className="w-full py-2 rounded font-medium text-white transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.secondary }}
                                >
                                    Bouton Secondaire
                                </button>
                            </div>

                            {/* État des boutons */}
                            <div className="grid grid-cols-3 gap-2 pt-3 border-t" style={{ borderColor: colors.border }}>
                                <button
                                    className="py-2 rounded font-medium text-white text-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.success }}
                                >
                                    Succès
                                </button>
                                <button
                                    className="py-2 rounded font-medium text-white text-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.warning }}
                                >
                                    Avertissement
                                </button>
                                <button
                                    className="py-2 rounded font-medium text-white text-sm transition-opacity hover:opacity-90"
                                    style={{ backgroundColor: colors.error }}
                                >
                                    Erreur
                                </button>
                            </div>

                            {/* Texte */}
                            <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                                <p style={{ color: colors.text }} className="text-sm font-medium">
                                    Texte normal
                                </p>
                                <p style={{ color: colors.text }} className="text-xs opacity-70 mt-1">
                                    Texte secondaire
                                </p>
                            </div>

                            {/* Palette de couleurs miniature */}
                            <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                                <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                                    Palette complète
                                </p>
                                <div className="grid grid-cols-5 gap-2">
                                    {colorKeys.map(({ key }) => (
                                        <div
                                            key={key}
                                            className="h-8 rounded border border-slate-300 dark:border-slate-600"
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

            {/* Import/Export et JSON */}
            <div className="space-y-4">
                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                        Import / Export
                    </h4>
                    <div className="flex gap-3">
                        <button
                            onClick={handleExportColors}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm"
                        >
                            <Download size={16} />
                            Exporter
                        </button>
                        <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm cursor-pointer">
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

                <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        JSON de configuration
                    </h4>
                    <div className="relative">
                        <textarea
                            readOnly
                            value={JSON.stringify(colors, null, 2)}
                            className="w-full h-40 p-3 rounded font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-600 resize-none overflow-auto"
                        />
                        <button
                            onClick={() => handleCopyColor(JSON.stringify(colors, null, 2))}
                            className="absolute top-2 right-2 p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Copier le JSON"
                        >
                            {copied === JSON.stringify(colors, null, 2) ? (
                                <Check size={16} className="text-green-600" />
                            ) : (
                                <Copy size={16} />
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
