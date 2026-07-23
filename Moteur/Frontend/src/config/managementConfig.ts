export type ProjectStatus = 'reflexion' | 'en_cours' | 'fini' | 'valide';
export type CostSource = 'optimization' | 'parts' | 'none';

export interface PlanningStep {
  label: string;
  start: string;   // YYYY-MM-DD
  end: string;     // YYYY-MM-DD
  color: string;   // hex
  heures_prevues?: number;  // Heures de MO prévues pour cette étape
  heures_reelles?: number;  // Heures de MO réelles passées
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
  marge_pct?: number;
  prix_vente_manuel?: number;
  source_cout_matieres?: CostSource;
  // Coûts détaillés chargés à la demande (panel détail)
  cout_detail?: {
    cout_matieres: number;
    source_cout_matieres: CostSource;
    cout_main_oeuvre: number;
    debourse_sec: number;
    frais_generaux: number;
    cout_de_revient: number;
    benefice: number;
    prix_vente: number;
    marge_effective_pct: number;
    taux_horaire_utilise: number;
    marge_appliquee_pct: number;
  };
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
