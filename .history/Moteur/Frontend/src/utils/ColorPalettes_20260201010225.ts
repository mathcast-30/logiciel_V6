import { ColorPalette } from '../../context/ThemeContext';

export interface PalettePreset {
    id: string;
    name: string;
    description: string;
    light: ColorPalette;
    dark: ColorPalette;
    icon?: string;
}

export const COLOR_PALETTES: Record<string, PalettePreset> = {
    professional: {
        id: 'professional',
        name: 'Professionnel',
        description: 'Design professionnel et sobre',
        light: {
            primary: '#1e40af',
            secondary: '#7c3aed',
            accent: '#dc2626',
            background: '#f9fafb',
            surface: '#ffffff',
            text: '#111827',
            border: '#e5e7eb',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
        },
        dark: {
            primary: '#3b82f6',
            secondary: '#a78bfa',
            accent: '#f87171',
            background: '#111827',
            surface: '#1f2937',
            text: '#f3f4f6',
            border: '#4b5563',
            success: '#10b981',
            warning: '#fbbf24',
            error: '#f87171',
        },
    },
    vibrant: {
        id: 'vibrant',
        name: 'Vibrant',
        description: 'Design coloré et dynamique',
        light: {
            primary: '#ff6b35',
            secondary: '#f7931e',
            accent: '#c1121f',
            background: '#fffbf7',
            surface: '#ffffff',
            text: '#2d1b1b',
            border: '#f0e6e6',
            success: '#00b894',
            warning: '#fdcb6e',
            error: '#d63031',
        },
        dark: {
            primary: '#ff8c42',
            secondary: '#ffa500',
            accent: '#ff6b6b',
            background: '#1a1a1a',
            surface: '#2d2d2d',
            text: '#fffbf7',
            border: '#4a4a4a',
            success: '#00d4aa',
            warning: '#ffd93d',
            error: '#ff6b6b',
        },
    },
    ocean: {
        id: 'ocean',
        name: 'Océan',
        description: 'Inspiré par l\'océan, calme et serein',
        light: {
            primary: '#0369a1',
            secondary: '#0ea5e9',
            accent: '#06b6d4',
            background: '#f0f9ff',
            surface: '#ffffff',
            text: '#0c2340',
            border: '#e0f2fe',
            success: '#0891b2',
            warning: '#0284c7',
            error: '#e11d48',
        },
        dark: {
            primary: '#0ea5e9',
            secondary: '#06b6d4',
            accent: '#22d3ee',
            background: '#0c1929',
            surface: '#162e4d',
            text: '#cffafe',
            border: '#0f766e',
            success: '#06b6d4',
            warning: '#0284c7',
            error: '#f43f5e',
        },
    },
    forest: {
        id: 'forest',
        name: 'Forêt',
        description: 'Teintes naturelles et apaisantes',
        light: {
            primary: '#15803d',
            secondary: '#22c55e',
            accent: '#84cc16',
            background: '#f0fdf4',
            surface: '#ffffff',
            text: '#14532d',
            border: '#dcfce7',
            success: '#16a34a',
            warning: '#ca8a04',
            error: '#dc2626',
        },
        dark: {
            primary: '#22c55e',
            secondary: '#4ade80',
            accent: '#bef264',
            background: '#14280d',
            surface: '#1f3a1d',
            text: '#f0fdf4',
            border: '#22c55e',
            success: '#86efac',
            warning: '#eab308',
            error: '#fca5a5',
        },
    },
    sunset: {
        id: 'sunset',
        name: 'Coucher de soleil',
        description: 'Couleurs chaudes et accueillantes',
        light: {
            primary: '#ea580c',
            secondary: '#f97316',
            accent: '#fbbf24',
            background: '#fffaf0',
            surface: '#ffffff',
            text: '#5e1a09',
            border: '#fed7aa',
            success: '#b45309',
            warning: '#d97706',
            error: '#ea580c',
        },
        dark: {
            primary: '#f97316',
            secondary: '#fb923c',
            accent: '#fcd34d',
            background: '#1a0f0a',
            surface: '#2d1f1a',
            text: '#fffaf0',
            border: '#ea580c',
            success: '#ca8a04',
            warning: '#f59e0b',
            error: '#ff7875',
        },
    },
    midnight: {
        id: 'midnight',
        name: 'Minuit',
        description: 'Sombre et élégant',
        light: {
            primary: '#3730a3',
            secondary: '#6366f1',
            accent: '#ec4899',
            background: '#fafafa',
            surface: '#ffffff',
            text: '#1f2937',
            border: '#e5e7eb',
            success: '#059669',
            warning: '#d97706',
            error: '#dc2626',
        },
        dark: {
            primary: '#818cf8',
            secondary: '#a5b4fc',
            accent: '#f472b6',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f1f5f9',
            border: '#334155',
            success: '#10b981',
            warning: '#fbbf24',
            error: '#f87171',
        },
    },
    cyber: {
        id: 'cyber',
        name: 'Cyber',
        description: 'Futuriste et technologique',
        light: {
            primary: '#00d9ff',
            secondary: '#ff006e',
            accent: '#ffbe0b',
            background: '#f0f0ff',
            surface: '#ffffff',
            text: '#0a0e27',
            border: '#e8e8ff',
            success: '#00ff41',
            warning: '#ffa500',
            error: '#ff0040',
        },
        dark: {
            primary: '#00d9ff',
            secondary: '#ff006e',
            accent: '#ffbe0b',
            background: '#0a0e27',
            surface: '#16213e',
            text: '#e0e0ff',
            border: '#00d9ff',
            success: '#00ff41',
            warning: '#ff6b00',
            error: '#ff0040',
        },
    },
};

export const DEFAULT_PALETTE = COLOR_PALETTES.professional;

export function getPaletteForTheme(paletteId: string, isDark: boolean): ColorPalette | null {
    const palette = COLOR_PALETTES[paletteId];
    if (!palette) return null;
    return isDark ? palette.dark : palette.light;
}

export function getAllPalettes(): PalettePreset[] {
    return Object.values(COLOR_PALETTES);
}
