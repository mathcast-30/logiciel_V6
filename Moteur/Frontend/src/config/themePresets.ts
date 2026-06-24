import { DEFAULT_THEME_DARK, DEFAULT_THEME_LIGHT } from './themeConfig';

export const THEME_PRESETS: Record<string, Record<string, string>> = {
  'Professionnel': DEFAULT_THEME_DARK,
  'Vibrant': {
    ...DEFAULT_THEME_DARK,
    'primary':   '#FF6B6B',
    'secondary': '#4ECDC4',
    'accent':    '#FFE66D',
  },
  'Nature': {
    ...DEFAULT_THEME_DARK,
    'primary':   '#2D6A4F',
    'secondary': '#74C69D',
    'bg-main':   '#081C15',
    'bg-card':   '#1B4332',
    'bg-sidebar':'#06130E',
  },
  'Minéral': {
    ...DEFAULT_THEME_DARK,
    'primary':   '#4361EE',
    'secondary': '#3ABEFF',
    'bg-main':   '#03045E',
    'bg-card':   '#0077B6',
    'bg-sidebar':'#020340',
  },
  'Clair': DEFAULT_THEME_LIGHT,
};
