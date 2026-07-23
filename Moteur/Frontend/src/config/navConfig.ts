import {
    Users2,
    FolderKanban,
    Warehouse,
    Scissors,
    Settings,
    FileText,
    Library,
    Wrench,
    FileUp,
    TrendingUp,
    FolderArchive
} from 'lucide-react';
import React from 'react';

export type Role = 'operateur' | 'chef' | 'admin';
export type NavCategory = 'Production' | 'Suivi' | 'Données' | 'Administration';

export interface NavItem {
    id: string;
    label: string;
    path: string;
    icon: React.ElementType;
    category: NavCategory;
    required?: boolean;
    defaultVisible: Record<Role, boolean>;
}

export const NAV_ITEMS: NavItem[] = [
    { id: 'optimize', label: 'Optimisation', path: '/optimize', icon: Scissors, category: 'Production', defaultVisible: { operateur: true, chef: true, admin: true } },
    { id: 'projects', label: 'Projets (Détails)', path: '/projects', icon: FolderKanban, category: 'Production', defaultVisible: { operateur: true, chef: true, admin: true } },
    { id: 'import-step', label: 'Import 3D (STEP)', path: '/import-step', icon: FileUp, category: 'Production', defaultVisible: { operateur: true, chef: true, admin: true } },
    
    { id: 'management', label: 'Gestion', path: '/management', icon: TrendingUp, category: 'Suivi', defaultVisible: { operateur: false, chef: true, admin: true } },
    { id: 'quotes', label: 'Devis', path: '/quotes', icon: FileText, category: 'Suivi', defaultVisible: { operateur: false, chef: false, admin: true } },
    
    { id: 'clients', label: 'Clients', path: '/clients', icon: Users2, category: 'Données', defaultVisible: { operateur: false, chef: true, admin: true } },
    { id: 'stock', label: 'Matériaux & Stock', path: '/stock', icon: Warehouse, category: 'Données', defaultVisible: { operateur: false, chef: true, admin: true } },
    { id: 'hardware', label: 'Quincaillerie', path: '/hardware', icon: Wrench, category: 'Données', defaultVisible: { operateur: false, chef: true, admin: true } },
    { id: 'library', label: 'Bibliothèque', path: '/library', icon: Library, category: 'Données', defaultVisible: { operateur: true, chef: true, admin: true } },
    { id: 'file-explorer', label: 'Fichiers', path: '/file-explorer', icon: FolderArchive, category: 'Données', defaultVisible: { operateur: true, chef: true, admin: true } },
    
    { id: 'settings', label: 'Paramètres', path: '/settings', icon: Settings, category: 'Administration', required: true, defaultVisible: { operateur: false, chef: false, admin: true } },
];
