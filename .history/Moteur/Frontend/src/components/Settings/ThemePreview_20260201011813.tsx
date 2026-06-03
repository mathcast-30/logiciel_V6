import * as React from 'react';
import { useTheme } from '../../context/ThemeContext';

export function ThemePreview() {
    const { colors } = useTheme();

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
                    Aperçu complet du thème
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                    Voici comment votre interface personnalisée se présente dans différents contextes
                </p>
            </div>

            {/* Palette complète */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Palette de couleurs
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {Object.entries(colors).map(([key, color]) => (
                        <div key={key} className="text-center">
                            <div
                                className="w-full h-24 rounded-lg mb-2 border-2 border-slate-300 dark:border-slate-600 shadow-md hover:shadow-lg transition-shadow"
                                style={{ backgroundColor: color }}
                            />
                            <p className="text-xs font-medium text-slate-900 dark:text-slate-100 capitalize">
                                {key}
                            </p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono mt-1">
                                {color.toUpperCase()}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Composants avec les couleurs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formulaire d'exemple */}
                <div
                    className="p-6 rounded-lg border-2"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4"
                        style={{ color: colors.text }}>
                        Exemple de formulaire
                    </h4>

                    <div className="space-y-4">
                        <div>
                            <label
                                className="text-xs font-medium mb-1 block"
                                style={{ color: colors.text }}
                            >
                                Champ texte
                            </label>
                            <input
                                type="text"
                                placeholder="Entrez quelque chose..."
                                className="w-full px-3 py-2 rounded border text-sm"
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                }}
                            />
                        </div>

                        <div>
                            <label
                                className="text-xs font-medium mb-1 block"
                                style={{ color: colors.text }}
                            >
                                Sélection
                            </label>
                            <select
                                className="w-full px-3 py-2 rounded border text-sm"
                                style={{
                                    borderColor: colors.border,
                                    backgroundColor: colors.background,
                                    color: colors.text,
                                }}
                            >
                                <option>Option 1</option>
                                <option>Option 2</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium block" style={{ color: colors.text }}>
                                Checkbox
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" className="cursor-pointer" />
                                <span className="text-sm" style={{ color: colors.text }}>
                                    J'accepte les conditions
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exemple de contenu */}
                <div
                    className="p-6 rounded-lg border-2"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                    <h4 className="text-sm font-semibold mb-4" style={{ color: colors.text }}>
                        Exemple de contenu
                    </h4>

                    <div className="space-y-3">
                        <div
                            className="p-3 rounded border-l-4"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.success,
                            }}
                        >
                            <p className="text-xs font-medium" style={{ color: colors.success }}>
                                Succès
                            </p>
                            <p className="text-xs mt-1" style={{ color: colors.text }}>
                                L'opération s'est déroulée avec succès
                            </p>
                        </div>

                        <div
                            className="p-3 rounded border-l-4"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.warning,
                            }}
                        >
                            <p className="text-xs font-medium" style={{ color: colors.warning }}>
                                Avertissement
                            </p>
                            <p className="text-xs mt-1" style={{ color: colors.text }}>
                                Vérifiez vos données avant de continuer
                            </p>
                        </div>

                        <div
                            className="p-3 rounded border-l-4"
                            style={{
                                backgroundColor: colors.background,
                                borderColor: colors.error,
                            }}
                        >
                            <p className="text-xs font-medium" style={{ color: colors.error }}>
                                Erreur
                            </p>
                            <p className="text-xs mt-1" style={{ color: colors.text }}>
                                Une erreur est survenue, veuillez réessayer
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Boutons */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    États des boutons
                </h4>
                <div
                    className="p-6 rounded-lg border-2 space-y-3"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.primary }}
                        >
                            Primaire
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.secondary }}
                        >
                            Secondaire
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.accent }}
                        >
                            Accent
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.success }}
                        >
                            Succès
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.warning }}
                        >
                            Avertissement
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium text-white transition-opacity hover:opacity-90 text-sm"
                            style={{ backgroundColor: colors.error }}
                        >
                            Erreur
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium border-2 text-sm transition-colors"
                            style={{
                                borderColor: colors.primary,
                                color: colors.primary,
                            }}
                        >
                            Bordure
                        </button>
                        <button
                            className="px-4 py-2 rounded font-medium text-sm transition-opacity opacity-50 hover:opacity-75"
                            style={{
                                backgroundColor: colors.primary,
                                color: 'white',
                            }}
                        >
                            Désactivé
                        </button>
                    </div>
                </div>
            </div>

            {/* Typographie */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Typographie
                </h4>
                <div
                    className="p-6 rounded-lg border-2 space-y-3"
                    style={{ backgroundColor: colors.surface, borderColor: colors.border }}
                >
                    <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
                        Titre H1
                    </h1>
                    <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
                        Titre H2
                    </h2>
                    <h3 className="text-xl font-semibold" style={{ color: colors.text }}>
                        Titre H3
                    </h3>
                    <p className="text-base" style={{ color: colors.text }}>
                        Paragraphe normal avec du texte régulier
                    </p>
                    <p className="text-sm opacity-75" style={{ color: colors.text }}>
                        Texte petit et secondaire
                    </p>
                    <p className="text-xs opacity-50" style={{ color: colors.text }}>
                        Texte extra petit et tércéaire
                    </p>
                    <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
                        <p style={{ color: colors.primary }} className="text-sm font-medium">
                            Texte en couleur primaire
                        </p>
                        <p style={{ color: colors.accent }} className="text-sm font-medium">
                            Texte en couleur accent
                        </p>
                    </div>
                </div>
            </div>

            {/* Cartes */}
            <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    Cartes et encadrés
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { title: 'Carte normale', desc: 'Avec contour standard' },
                        { title: 'Carte importante', desc: 'Avec accent souligné' },
                        { title: 'Carte sélectionnée', desc: 'Avec ombre et relief' },
                    ].map((card, idx) => (
                        <div
                            key={idx}
                            className={`p-4 rounded-lg border-2 transition-all ${
                                idx === 2 ? 'shadow-lg ring-2 ring-offset-2' : ''
                            }`}
                            style={{
                                backgroundColor: colors.surface,
                                borderColor: idx === 1 ? colors.accent : colors.border,
                                ...(idx === 2 && {
                                    ringColor: colors.primary,
                                    ringOffsetColor: colors.background,
                                }),
                            }}
                        >
                            <h5 className="font-medium text-sm" style={{ color: colors.text }}>
                                {card.title}
                            </h5>
                            <p className="text-xs mt-1 opacity-75" style={{ color: colors.text }}>
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
