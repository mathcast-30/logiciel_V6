import * as React from 'react';
import { useTheme } from '../../context/ThemeContext';
import type { Theme } from '../../context/ThemeContext';

// Local icon components with proper TypeScript typing
interface IconProps {
    size?: number;
    className?: string;
}

const Sun: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

const Moon: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

const Monitor: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
);

export function ThemeSelector() {
    const { theme, setTheme } = useTheme();

    const themes: { value: Theme; label: string; icon: React.FC<IconProps> }[] = [
        { value: 'light', label: 'Clair', icon: Sun },
        { value: 'dark', label: 'Sombre', icon: Moon },
        { value: 'system', label: 'Syst�me', icon: Monitor },
    ];

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-lg font-semibold text-theme-text-muted">
                    Th�me
                </h3>
                <p className="text-sm text-theme-text-muted mt-1">
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
                                : 'border-theme-primary/20 bg-theme-bg-card hover:border-theme-primary/40'
                        }`}
                    >
                        <Icon
                            size={24}
                            className={
                                theme === value
                                    ? 'text-blue-600'
                                    : 'text-theme-text-muted'
                            }
                        />
                        <span className="text-sm font-medium text-theme-text-muted">
                            {label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
