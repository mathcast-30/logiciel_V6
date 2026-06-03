
import { useTheme } from '../../context/ThemeContext';
import { checkContrast, getBestTextColor } from '../../utils/contrastChecker';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { useMemo, CSSProperties } from 'react';

export function ContrastChecker() {
    const { colors, setColors } = useTheme();

    const handleAutoFixContrast = () => {
        const textColor = getBestTextColor(colors.background);
        const updates = {
            ...colors,
            text: textColor,
        };
        setColors(updates);
        alert(`✅ Couleur de texte optimisée : ${textColor}`);
    };

    const contrastResults = {
        text: checkContrast(colors.text, colors.background),
        primaryBtn: checkContrast('#ffffff', colors.primary),
        successMsg: checkContrast(colors.success, colors.background),
        errorMsg: checkContrast(colors.error, colors.background),
    };

    // Remplace Object.values par une alternative compatible ES6
    const allAccessible = (Object.keys(contrastResults) as Array<keyof typeof contrastResults>)
        .map((k) => contrastResults[k])
        .every((r) => r.isAccessible);

    // Pre-computed style objects to avoid inline style warnings
    const textPreviewStyle: CSSProperties = useMemo(() => ({
        backgroundColor: colors.background,
        color: colors.text,
    }), [colors.background, colors.text]);

    const primaryBtnStyle: CSSProperties = useMemo(() => ({
        backgroundColor: colors.primary,
    }), [colors.primary]);

    const successMsgStyle: CSSProperties = useMemo(() => ({
        backgroundColor: colors.background,
        color: colors.success,
    }), [colors.background, colors.success]);

    const errorMsgStyle: CSSProperties = useMemo(() => ({
        backgroundColor: colors.background,
        color: colors.error,
    }), [colors.background, colors.error]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                        Vérification du Contraste WCAG
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Assurez-vous que votre palette est accessible
                    </p>
                </div>
                {allAccessible && (
                    <div className="px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-2">
                        <CheckCircle size={16} />
                        Conforme
                    </div>
                )}
            </div>

            {!allAccessible && (
                <button
                    onClick={handleAutoFixContrast}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors border border-amber-300 dark:border-amber-700"
                >
                    <Zap size={18} />
                    Corriger automatiquement le contraste
                </button>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Texte sur arrière-plan */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        {contrastResults.text.isAccessible ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <AlertCircle size={20} className="text-red-600" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            Texte sur fond
                        </span>
                    </div>
                    <div
                        className="p-4 rounded-lg mb-3 text-center transition-all"
                        style={textPreviewStyle}
                    >
                        <p className="font-medium">Aperçu du texte</p>
                        <p className="text-sm opacity-75">Ceci est du texte secondaire</p>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {contrastResults.text.message}
                    </p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        Ratio: {contrastResults.text.ratio}:1
                    </p>
                </div>

                {/* Bouton Primaire */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        {contrastResults.primaryBtn.isAccessible ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <AlertCircle size={20} className="text-red-600" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            Bouton primaire
                        </span>
                    </div>
                    <div
                        className="px-4 py-2 rounded-lg mb-3 text-center text-white font-medium"
                        style={primaryBtnStyle}
                    >
                        Cliquez-moi
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {contrastResults.primaryBtn.message}
                    </p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        Ratio: {contrastResults.primaryBtn.ratio}:1
                    </p>
                </div>


                {/* Message Succès */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        {contrastResults.successMsg.isAccessible ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <AlertCircle size={20} className="text-red-600" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            Message de succès
                        </span>
                    </div>
                    <div
                        className="p-4 rounded-lg mb-3 text-center font-medium"
                        style={successMsgStyle}
                    >
                        {'✅'} Opération réussie
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {contrastResults.successMsg.message}
                    </p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        Ratio: {contrastResults.successMsg.ratio}:1
                    </p>
                </div>


                {/* Message Erreur */}
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        {contrastResults.errorMsg.isAccessible ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <AlertCircle size={20} className="text-red-600" />
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                            Message d'erreur
                        </span>
                    </div>
                    <div
                        className="p-4 rounded-lg mb-3 text-center font-medium"
                        style={errorMsgStyle}
                    >
                        {'❌'} Erreur lors de l'opération
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {contrastResults.errorMsg.message}
                    </p>
                    <p className="text-sm font-mono text-slate-700 dark:text-slate-300">
                        Ratio: {contrastResults.errorMsg.ratio}:1
                    </p>
                </div>
            </div>

            {/* Guide WCAG */}
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Niveaux de conformité WCAG
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• <strong>AAA (7:1 minimum)</strong> - Conforme niveau AAA (préféré)</li>
                    <li>• <strong>AA (4.5:1 minimum)</strong> - Conforme niveau AA (recommandé)</li>
                    <li>• <strong>Non-conforme (&lt;4.5:1)</strong> - À améliorer</li>
                </ul>
            </div>
        </div>
    );
}
