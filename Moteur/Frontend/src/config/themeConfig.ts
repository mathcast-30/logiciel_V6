export interface ThemeColor {
  key: string;          // Identifiant unique
  cssVar: string;       // Nom de la variable CSS (ex: --color-primary)
  label: string;        // Libellé affiché dans les Paramètres
  default: string;      // Valeur hex par défaut (mode sombre)
  defaultLight: string; // Valeur hex par défaut (mode clair)
  category: 'base' | 'interactive' | 'text' | 'status';
}

export const THEME_COLORS: ThemeColor[] = [
  // INTERACTIVE
  { key:'primary',    cssVar:'--color-primary',    label:'Couleur Primaire',   default:'#6C63FF', defaultLight:'#5A52E0', category:'interactive' },
  { key:'secondary',  cssVar:'--color-secondary',  label:'Couleur Secondaire', default:'#22C55E', defaultLight:'#16A34A', category:'interactive' },
  { key:'accent',     cssVar:'--color-accent',     label:'Accent',             default:'#F97316', defaultLight:'#EA6C00', category:'interactive' },
  
  // STATUS
  { key:'danger',     cssVar:'--color-danger',     label:'Danger',             default:'#EF4444', defaultLight:'#DC2626', category:'status'      },
  
  // BASE
  { key:'bg-main',    cssVar:'--color-bg-main',    label:'Fond principal',     default:'#0F0F1A', defaultLight:'#F8F8FC', category:'base'        },
  { key:'bg-card',    cssVar:'--color-bg-card',    label:'Fond carte',         default:'#1A1A2E', defaultLight:'#FFFFFF', category:'base'        },
  { key:'bg-sidebar', cssVar:'--color-bg-sidebar', label:'Fond sidebar',       default:'#12121F', defaultLight:'#EDEDF8', category:'base'        },
  { key:'border',     cssVar:'--color-border',     label:'Bordures',           default:'#2D2D44', defaultLight:'#CCCCDD', category:'base'        },
  
  // TEXT
  { key:'text-main',  cssVar:'--color-text-main',  label:'Texte principal',    default:'#E8E8F0', defaultLight:'#111122', category:'text'        },
  { key:'text-muted', cssVar:'--color-text-muted', label:'Texte secondaire',   default:'#8888AA', defaultLight:'#555577', category:'text'        },
];

// Génère un objet Record<key, hex> depuis le tableau
export const DEFAULT_THEME_DARK = Object.fromEntries(
  THEME_COLORS.map(c => [c.key, c.default])
);
export const DEFAULT_THEME_LIGHT = Object.fromEntries(
  THEME_COLORS.map(c => [c.key, c.defaultLight])
);
