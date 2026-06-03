import { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light' | 'system';

export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    border: string;
    success: string;
    warning: string;
    error: string;
}

export const DEFAULT_LIGHT_PALETTE: ColorPalette = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#ec4899',
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    border: '#e2e8f0',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
};

export const DEFAULT_DARK_PALETTE: ColorPalette = {
    primary: '#60a5fa',
    secondary: '#a78bfa',
    accent: '#f472b6',
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    border: '#334155',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
};

interface ThemeProviderProps {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
}

interface ThemeProviderState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    colors: ColorPalette;
    setColors: (colors: ColorPalette) => void;
    resetColors: () => void;
}

const initialState: ThemeProviderState = {
    theme: 'system',
    setTheme: () => null,
    colors: DEFAULT_LIGHT_PALETTE,
    setColors: () => null,
    resetColors: () => null,
};

const ThemeContext = createContext<ThemeProviderState>(initialState);

const COLORS_STORAGE_KEY = 'opticut-ui-colors';

const applyColorsToDOM = (colors: ColorPalette) => {
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
        root.style.setProperty(`--color-${key}`, value);
    });
};

export function ThemeProvider({
    children,
    defaultTheme = 'system',
    storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
    const [theme, setThemeState] = useState<Theme>(
        () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
    );
    
    const [colors, setColorsState] = useState<ColorPalette>(() => {
        const stored = localStorage.getItem(COLORS_STORAGE_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return DEFAULT_LIGHT_PALETTE;
            }
        }
        return DEFAULT_LIGHT_PALETTE;
    });

    useEffect(() => {
        applyColorsToDOM(colors);
    }, [colors]);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
                .matches
                ? 'dark'
                : 'light';

            root.classList.add(systemTheme);
            return;
        }

        root.classList.add(theme);
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(storageKey, newTheme);
        setThemeState(newTheme);
    };

    const setColors = (newColors: ColorPalette) => {
        localStorage.setItem(COLORS_STORAGE_KEY, JSON.stringify(newColors));
        setColorsState(newColors);
    };

    const resetColors = () => {
        const currentIsDark = document.documentElement.classList.contains('dark');
        const defaultPalette = currentIsDark ? DEFAULT_DARK_PALETTE : DEFAULT_LIGHT_PALETTE;
        setColors(defaultPalette);
    };

    const value = {
        theme,
        setTheme,
        colors,
        setColors,
        resetColors,
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
    const context = useContext(ThemeContext);

    if (context === undefined)
        throw new Error('useTheme must be used within a ThemeProvider');

    return context;
};
