import * as React from 'react';
const { useState } = React;
import { useTheme, ColorPalette } from '../../context/ThemeContext';
import { COLOR_PALETTES, getPaletteForTheme } from '../../utils/ColorPalettes';
// Local icon stubs for TS compatibility if lucide-react is missing
const IconStub = (name: string) => (props: any) => (
    <span {...props} aria-hidden title={name} />
);
const RotateCcw = IconStub('RotateCcw');
const Copy = IconStub('Copy');
const Check = IconStub('Check');
const Palette = IconStub('Palette');
const Save = IconStub('Save');
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
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Personnalisation des couleurs
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Configurez les couleurs de votre interface
                    </p>
                </div>
                <button
                    onClick={resetColors}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                    <RotateCcw size={18} />
                    R�initialiser
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {colorKeys.map(({ key, label, description }) => (
                    <div
                        key={key}
                        className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
                                    {label}
                                </label>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                    {description}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 flex-1">
                                <input
                                    type="color"
                                    value={colors[key]}
                                    onChange={(e) => handleColorChange(key, e.target.value)}
                                    className="w-12 h-12 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-600"
                                />
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={colors[key]}
                                        onChange={(e) => handleColorChange(key, e.target.value)}
                                        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-mono"
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => handleCopyColor(colors[key])}
                                className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                                title="Copier la couleur"
                            >
                                {copied === colors[key] ? (
                                    <Check size={18} className="text-green-600" />
                                ) : (
                                    <Copy size={18} className="text-slate-600 dark:text-slate-400" />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Aper�u */}
            <div className="p-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Aper�u des couleurs
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {colorKeys.map(({ key, label }) => (
                        <div key={key} className="text-center">
                            <div
                                className="w-full h-16 rounded-lg mb-2 border border-slate-300 dark:border-slate-600 shadow-sm"
                                style={{ backgroundColor: colors[key] }}
                            />
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {label}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
