import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { THEME_COLORS, DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT } from '../config/themeConfig';

const LS_MODE_KEY    = 'opticut_theme_mode';
const LS_COLORS_KEY  = 'opticut_theme_colors';

/** A map of CSS variable keys to hex color values. */
export type ColorPalette = Record<string, string>;

/** @deprecated Use ThemeMode. Kept for backward compatibility with existing imports. */
export type Theme = 'dark' | 'light' | 'system';

export type ThemeMode = Theme;

type ColorMap = ColorPalette;

interface ThemeContextType {
  mode: ThemeMode;
  theme: ThemeMode; // Alias pour compatibilité avec l'existant
  setMode: (m: ThemeMode) => void;
  setTheme: (m: ThemeMode) => void; // Alias pour compatibilité
  colors: ColorMap;
  setColor: (key: string, hex: string) => void;
  setColors: (map: ColorMap) => void;
  resetColors: () => void;
  exportTheme: () => string;
  importTheme: (json: string) => boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// ─── Applique un ColorMap comme variables CSS sur :root ───────
function applyColorsToDom(colors: ColorMap) {
  const root = document.documentElement;
  THEME_COLORS.forEach(({ key, cssVar }) => {
    if (colors[key]) root.style.setProperty(cssVar, colors[key]);
  });
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ── 1. Mode (dark / light / system) ──
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem(LS_MODE_KEY) as ThemeMode) ?? 'dark';
  });

  // ── 2. Couleurs personnalisées ──
  const [colors, setColorsState] = useState<ColorMap>(() => {
    try {
      const saved = localStorage.getItem(LS_COLORS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_THEME_DARK;
    } catch { return DEFAULT_THEME_DARK; }
  });

  // ── 3. Calcule si on est effectivement en mode sombre ──
  const isDark = mode === 'dark' || (mode === 'system' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches);

  // ── 4. Applique le mode sombre sur <html> (Tailwind dark:) ──
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    if (!isDark) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [isDark]);

  // ── 5. Applique les variables CSS dès le montage ET à chaque changement ──
  useEffect(() => {
    applyColorsToDom(colors);
  }, [colors]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    localStorage.setItem(LS_MODE_KEY, m);
  }, []);

  const setColor = useCallback((key: string, hex: string) => {
    setColorsState(prev => {
      const next = { ...prev, [key]: hex };
      localStorage.setItem(LS_COLORS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const setColors = useCallback((map: ColorMap) => {
    setColorsState(map);
    localStorage.setItem(LS_COLORS_KEY, JSON.stringify(map));
  }, []);

  const resetColors = useCallback(() => {
    const defaults = isDark ? DEFAULT_THEME_DARK : DEFAULT_THEME_LIGHT;
    setColors(defaults);
  }, [isDark, setColors]);

  const exportTheme = useCallback(() => {
    return JSON.stringify({ mode, colors }, null, 2);
  }, [mode, colors]);

  const importTheme = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.colors) setColors(parsed.colors);
      if (parsed.mode)   setMode(parsed.mode);
      return true;
    } catch { return false; }
  }, [setColors, setMode]);

  return (
    <ThemeContext.Provider value={{ 
        mode, 
        theme: mode, 
        setMode, 
        setTheme: setMode, 
        colors, 
        setColor, 
        setColors, 
        resetColors, 
        exportTheme, 
        importTheme 
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
