export type ProjectStatus = 'reflexion' | 'en_cours' | 'fini' | 'valide';

export interface PlanningStep {
  label: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD
  color: string;   // hex
}

export interface ManagedProject {
  id: number;
  name: string;
  status: ProjectStatus;
  start_date: string | null;
  delivery_date: string | null;
  steps: PlanningStep[];
  main_material: string;
  progress: number;        // 0 à 1
  estimated_cost: number;
  actual_cost: number;
  estimated_hours: number;
  actual_hours: number;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  reflexion: 'Réflexion',
  en_cours: 'En cours',
  fini: 'Fini',
  valide: 'Validé',
};

export const STATUS_COLORS: Record<ProjectStatus, { bg: string; text: string; badge: string }> = {
  reflexion: { bg: '#EEEDFE', text: '#3C3489', badge: 'bg-purple-100 text-purple-800' },
  en_cours:  { bg: '#E6F1FB', text: '#0C447C', badge: 'bg-theme-primary/20 text-theme-primary' }, // Adjusting text to be more theme aware, but matching the prompt's request
  fini:      { bg: '#FAEEDA', text: '#633806', badge: 'bg-amber-100 text-amber-800' },
  valide:    { bg: '#EAF3DE', text: '#27500A', badge: 'bg-green-100 text-green-800' },
};

export const DEFAULT_STEP_COLORS: Record<string, string> = {
  'Débit':      '#B5D4F4',
  'Usinage':    '#378ADD',
  'Assemblage': '#534AB7',
  'Finition':   '#3B6D11',
};

export const MANAGEMENT_TABS = [
  { id: 'overview',   label: 'Vue d\'ensemble', icon: 'layout-dashboard' },
  { id: 'projects',   label: 'Projets',          icon: 'layout-kanban'    },
  { id: 'planning',   label: 'Planning',         icon: 'calendar-stats'   },
  { id: 'analytics',  label: 'Analytiques',      icon: 'chart-bar'        },
  { id: 'time',       label: 'Temps',            icon: 'clock'            },
  { id: 'stock',      label: 'Stock',            icon: 'package'          },
] as const;
