/**
 * Utilitaires pour vérifier le contraste WCAG
 * https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
 */

export interface ContrastResult {
    ratio: number;
    level: 'AAA' | 'AA' | 'fail';
    message: string;
    isAccessible: boolean;
}

/**
 * Convertir hex en RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}

/**
 * Calculer la luminance relative (formule WCAG)
 */
function getLuminance(r: number, g: number, b: number): number {
    const [rs, gs, bs] = [r, g, b].map((c) => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculer le ratio de contraste entre deux couleurs
 */
export function getContrastRatio(color1: string, color2: string): number {
    const rgb1 = hexToRgb(color1);
    const rgb2 = hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0;

    const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Vérifier si le contraste est acceptable selon WCAG
 */
export function checkContrast(textColor: string, backgroundColor: string): ContrastResult {
    const ratio = getContrastRatio(textColor, backgroundColor);
    const roundedRatio = Math.round(ratio * 100) / 100;

    let level: ContrastResult['level'] = 'fail';
    let message = '';
    let isAccessible = false;

    if (roundedRatio >= 7) {
        level = 'AAA';
        message = `Contraste excellent (${roundedRatio}:1) ? Conforme WCAG AAA`;
        isAccessible = true;
    } else if (roundedRatio >= 4.5) {
        level = 'AA';
        message = `Contraste bon (${roundedRatio}:1) ? Conforme WCAG AA`;
        isAccessible = true;
    } else {
        level = 'fail';
        message = `Contraste insuffisant (${roundedRatio}:1) ? Non conforme WCAG`;
        isAccessible = false;
    }

    return {
        ratio: roundedRatio,
        level,
        message,
        isAccessible,
    };
}

/**
 * Déterminer la meilleure couleur de texte (noir ou blanc) pour un fond
 */
export function getBestTextColor(backgroundColor: string): string {
    const rgb = hexToRgb(backgroundColor);
    if (!rgb) return '#000000';

    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Vérifier la luminance (claire ou sombre)
 */
export function isLightColor(color: string): boolean {
    const rgb = hexToRgb(color);
    if (!rgb) return false;
    const luminance = getLuminance(rgb.r, rgb.g, rgb.b);
    return luminance > 0.5;
}
