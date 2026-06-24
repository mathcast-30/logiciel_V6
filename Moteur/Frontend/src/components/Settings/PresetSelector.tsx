import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { BUILT_IN_PRESETS } from '../../types/presets';
import { Download, Upload, Save, X } from 'lucide-react';

export function PresetSelector() {
    const { colors, setColors } = useTheme();
    const [showCustomPresets, setShowCustomPresets] = useState(false);
    const [customPresets, setCustomPresets] = useState(() => {
        const stored = localStorage.getItem('opticut-custom-presets');
        return stored ? JSON.parse(stored) : [];
    });

    const handleApplyPreset = (presetColors: typeof colors) => {
        setColors(presetColors);
    };

    const handleSaveAsPreset = () => {
        const presetName = prompt('Nom du preset:');
        if (!presetName) return;

        const newPreset = {
            id: `custom-${Date.now()}`,
            name: presetName,
            colors: colors,
            createdAt: new Date().toISOString(),
        };

        const updated = [...customPresets, newPreset];
        setCustomPresets(updated);
        localStorage.setItem('opticut-custom-presets', JSON.stringify(updated));
        alert(`? Preset "${presetName}" sauvegardé !`);
    };

    const handleDeleteCustomPreset = (id: string) => {
        if (!confirm('Supprimer ce preset ?')) return;
        const updated = customPresets.filter((p: any) => p.id !== id);
        setCustomPresets(updated);
        localStorage.setItem('opticut-custom-presets', JSON.stringify(updated));
    };

    const handleExportPreset = (preset: any) => {
        const json = JSON.stringify(preset, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.name || 'preset'}.json`;
        a.click();
    };

    const handleImportPreset = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const preset = JSON.parse(event.target?.result as string);
                const newPreset = {
                    ...preset,
                    id: `custom-${Date.now()}`,
                    createdAt: new Date().toISOString(),
                };
                const updated = [...customPresets, newPreset];
                setCustomPresets(updated);
                localStorage.setItem('opticut-custom-presets', JSON.stringify(updated));
                alert(`? Preset "${preset.name}" importé !`);
            } catch {
                alert('? Erreur lors de l\'import du preset');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-theme-text-muted mb-2">
                    Présets de Couleurs
                </h3>
                <p className="text-sm text-theme-text-muted">
                    Choisissez parmi nos présets ou créez les vôtres
                </p>
            </div>

            {/* Boutons d'actions */}
            <div className="flex gap-2 flex-wrap">
                <button
                    onClick={handleSaveAsPreset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                >
                    <Save size={18} />
                    Sauvegarder
                </button>

                <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer">
                    <Upload size={18} />
                    Importer
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleImportPreset}
                        className="hidden"
                    />
                </label>

                <button
                    onClick={() => setShowCustomPresets(!showCustomPresets)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                    Mes Presets ({customPresets.length})
                </button>
            </div>

            {/* Présets intégrés */}
            <div className="space-y-3">
                <h4 className="text-sm font-semibold text-theme-text-muted">
                    Présets Intégrés
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {BUILT_IN_PRESETS.map((preset) => (
                        <div
                            key={preset.id}
                            className="p-4 rounded-lg border border-theme-primary/20 bg-theme-bg-card hover:border-theme-primary/40 transition-colors cursor-pointer"
                            onClick={() => handleApplyPreset(preset.light)}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h5 className="font-medium text-theme-text-muted">
                                        {preset.name}
                                    </h5>
                                    <p className="text-xs text-theme-text-muted mt-1">
                                        {preset.description}
                                    </p>
                                </div>
                            </div>

                            {/* Aperçu des couleurs */}
                            <div className="flex gap-1.5 mb-3">
                                {[preset.light.primary, preset.light.secondary, preset.light.accent, preset.light.success, preset.light.error].map((color, idx) => (
                                    <div
                                        key={idx}
                                        className="flex-1 h-6 rounded-md border border-theme-primary/20"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                    />
                                ))}
                            </div>

                            {/* Tags */}
                            {preset.tags && (
                                <div className="flex flex-wrap gap-1">
                                    {preset.tags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="text-xs px-2 py-1 rounded-full bg-theme-bg-card hover:bg-theme-bg-main bg-theme-bg-card text-theme-text-muted"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <button
                                className="w-full mt-3 py-2 rounded-lg bg-blue-500 text-theme-text-main hover:bg-blue-600 transition-colors text-sm font-medium"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleApplyPreset(preset.light);
                                }}
                            >
                                Appliquer
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Mes Presets */}
            {showCustomPresets && (
                <div className="space-y-3 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                    <h4 className="text-sm font-semibold text-theme-text-muted">
                        Mes Presets Personnalisés
                    </h4>
                    {customPresets.length === 0 ? (
                        <p className="text-sm text-theme-text-muted text-center py-8">
                            Aucun preset personnalisé. Créez-en un !
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {customPresets.map((preset: any) => (
                                <div
                                    key={preset.id}
                                    className="p-3 rounded-lg bg-theme-bg-main border border-theme-primary/20"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h5 className="font-medium text-theme-text-muted text-sm">
                                                {preset.name}
                                            </h5>
                                            <p className="text-xs text-theme-text-muted">
                                                {new Date(preset.createdAt).toLocaleDateString('fr-FR')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteCustomPreset(preset.id)}
                                            className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="flex gap-1 mb-2">
                                        {[preset.colors.primary, preset.colors.secondary, preset.colors.accent].map((color, idx) => (
                                            <div
                                                key={idx}
                                                className="flex-1 h-4 rounded border border-theme-primary/20"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex gap-2 text-xs">
                                        <button
                                            onClick={() => handleApplyPreset(preset.colors)}
                                            className="flex-1 py-1 rounded bg-blue-500 text-theme-text-main hover:bg-blue-600 transition-colors"
                                        >
                                            Appliquer
                                        </button>
                                        <button
                                            onClick={() => handleExportPreset(preset)}
                                            className="flex-1 py-1 rounded bg-green-500 text-theme-text-main hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                                        >
                                            <Download size={12} /> Export
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
