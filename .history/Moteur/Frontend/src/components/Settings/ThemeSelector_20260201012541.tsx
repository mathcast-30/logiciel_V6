import * as React from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';
// Local icon stub (no props spread)
const IconStub = (name: string) => () => <span aria-hidden title={name} />;
const Sun = IconStub('Sun');
const Moon = IconStub('Moon');
const Monitor = IconStub('Monitor');

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    const themes: { value: Theme; label: string; icon: React.FC<any> }[] = [
        { value: 'light', label: 'Clair', icon: Sun },
        { value: 'dark', label: 'Sombre', icon: Moon },
        { value: 'system', label: 'Syst�me', icon: Monitor },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Th�me
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    S�lectionnez votre th�me pr�f�r�
                </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {themes.map(({ value, label, icon: Icon }) => (
                    <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                            theme === value
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                    >
                        <Icon
                            size={24}
                            className={
                                theme === value
                                    ? 'text-blue-600'
                                    : 'text-slate-600 dark:text-slate-400'
                            }
                        />
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
