import * as React from 'react';
const { useState, useEffect } = React;

// Icon components with proper TypeScript typing
interface IconProps {
    size?: number;
    className?: string;
}

const Settings: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m3.08 3.08l4.24 4.24M1 12h6m6 0h6m-1.78-7.78l-4.24 4.24m-3.08 3.08l-4.24 4.24" />
    </svg>
);

const Save: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const Sliders: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <line x1="4" y1="21" x2="4" y2="14" />
        <line x1="4" y1="10" x2="4" y2="3" />
        <line x1="12" y1="21" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12" y2="3" />
        <line x1="20" y1="21" x2="20" y2="16" />
        <line x1="20" y1="12" x2="20" y2="3" />
        <line x1="1" y1="14" x2="7" y2="14" />
        <line x1="9" y1="8" x2="15" y2="8" />
        <line x1="17" y1="16" x2="23" y2="16" />
    </svg>
);

const Printer: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
    </svg>
);

const FolderOutput: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        <polyline points="12 11 12 17 9 14 15 14" />
    </svg>
);

const Database: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M3 5c0 1.657 4.03 3 9 3s9-1.343 9-3" />
        <path d="M3 5v8c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
        <path d="M3 13c0 1.657 4.03 3 9 3s9-1.343 9-3" />
    </svg>
);

const Check: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const AlertCircle: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
);

const History: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const Download: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const Upload: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const RefreshCcw: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="1 4 1 10 7 10" />
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
);

const Palette: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <circle cx="13.5" cy="6.5" r="1.5" />
        <circle cx="17.5" cy="10.5" r="1.5" />
        <circle cx="17.5" cy="14.5" r="1.5" />
        <circle cx="13.5" cy="18.5" r="1.5" />
        <circle cx="6.5" cy="18.5" r="1.5" />
        <circle cx="6.5" cy="14.5" r="1.5" />
        <circle cx="6.5" cy="10.5" r="1.5" />
        <circle cx="6.5" cy="6.5" r="1.5" />
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="none" />
    </svg>
);

const Users: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const Trash: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

import { BackupService, type BackupInfo } from '../services/backupService';
import { ThemeSelector } from '../components/Settings/ThemeSelector';
import { UserProfiles } from '../components/Settings/UserProfiles';
import { ThemeCustomizationPanel } from '../components/Settings/ThemeCustomizationPanel';

export function SettingsPage() {
    const [settings, setSettings] = useState({
        // Découpe
        defaultKerf: 3.0,
        defaultTrimMargin: 2.0,
        defaultSafetyMargin: 5.0,
        minOffcutSize: 200,
        // Export
        defaultExportPath: './exports',
        exportFormats: ['pdf', 'png'],
        // Labels
        labelWidth: 80,
        labelHeight: 40,
        labelsPerRow: 2,
        labelsPerSheet: 21
    });

    const [saved, setSaved] = useState(false);

    // Backup State
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadBackups();
    }, []);

    const loadBackups = async () => {
        try {
            const data = await BackupService.getAll();
            setBackups(data);
        } catch {
            console.error("Backup loading failed");
        }
    };

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            await BackupService.create();
            await loadBackups();
            alert("✅ Sauvegarde effectuée avec succès !");
        } catch {
            alert("❌ Erreur lors de la sauvegarde");
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm(`Voulez-vous vraiment supprimer la sauvegarde "${filename}" ?\nCette action est irréversible.`)) {
            return;
        }

        setIsDeleting(filename);
        try {
            await BackupService.delete(filename);
            // Suppression optimiste de la liste
            setBackups(prev => prev.filter(b => b.filename !== filename));
            alert("✅ Sauvegarde supprimée.");
        } catch (error) {
            console.error(error);
            alert("❌ Erreur lors de la suppression.");
            await loadBackups(); // Recharger en cas d'erreur
        } finally {
            setIsDeleting(null);
        }
    };

    const handleRestore = async (filename: string) => {
        if (!confirm("⚠️ ATTENTION: La restauration va écraser les données actuelles.\nUne sauvegarde de sécurité sera créée automatiquement.\n\nVoulez-vous continuer ?")) {
            return;
        }

        setIsRestoring(true);
        try {
            await BackupService.restore(filename);
            alert("✅ Système restauré avec succès ! La page va se recharger.");
            window.location.reload();
        } catch {
            alert("❌ Échec de la restauration");
        } finally {
            setIsRestoring(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            await BackupService.upload(file);
            await loadBackups();
            alert("✅ Backup importé avec succès !");
        } catch {
            alert("❌ Erreur lors de l'upload");
        }
    };

    const handleSave = () => {
        // In a real app, this would save to localStorage or API
        localStorage.setItem('opticut_settings', JSON.stringify(settings));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="page-title flex items-center gap-3">
                        <Settings className="h-8 w-8 text-slate-500 dark:text-slate-400" />
                        Paramètres
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Configurez les valeurs par défaut de l'application</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn-primary flex items-center gap-2"
                >
                    {saved ? (
                        <>
                            <Check className="h-5 w-5" />
                            Enregistré !
                        </>
                    ) : (
                        <>
                            <Save className="h-5 w-5" />
                            Enregistrer
                        </>
                    )}
                </button>
            </div>

            {saved && (
                <div className="alert-success flex items-center gap-3 animate-fade-in-down">
                    <Check className="h-5 w-5" />
                    Paramètres sauvegardés avec succès
                </div>
            )}

            {/* Apparence - Thème */}
            <div className="card border-l-4 border-l-blue-500 dark:border-l-blue-500">
                <div className="card-header flex items-center gap-2">
                    <Settings className="h-5 w-5 text-blue-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Apparence</h2>
                </div>
                <div className="card-body">
                    <ThemeSelector />
                </div>
            </div>

            {/* Espace de personnalisation du thème */}
            <div className="card">
                <div className="card-header flex items-center gap-2">
                    <Palette className="h-5 w-5 text-pink-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Personnalisation du Thème</h2>
                </div>
                <div className="card-body">
                    <ThemeCustomizationPanel />
                </div>
            </div>

            {/* Profils Utilisateur */}
            <div className="card border-l-4 border-l-purple-500 dark:border-l-purple-500">
                <div className="card-header flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Profils Utilisateur</h2>
                </div>
                <div className="card-body">
                    <UserProfiles />
                </div>
            </div>

            {isRestoring && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-xl flex flex-col items-center border border-slate-200 dark:border-slate-700">
                        <RefreshCcw className="h-10 w-10 text-blue-500 animate-spin mb-4" />
                        <h3 className="text-xl font-bold dark:text-white">Restauration en cours...</h3>
                        <p className="text-slate-500 dark:text-slate-400">Ne fermez pas cette page.</p>
                    </div>
                </div>
            )}

            {/* Database & Backups */}
            <div className="card border-l-4 border-l-purple-500 dark:border-l-purple-500">
                <div className="card-header flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Database className="h-5 w-5 text-purple-500" />
                        <h2 className="font-semibold text-slate-800 dark:text-white">Sauvegarde & Restauration</h2>
                    </div>
                    <div className="flex gap-2">
                        <label className="btn-secondary cursor-pointer flex items-center gap-2 !py-2 !px-3" title="Importer une sauvegarde" aria-label="Importer une sauvegarde">
                            <Upload className="h-4 w-4" />
                            Importer ZIP / BAK
                            <input type="file" accept=".zip,.bak" className="hidden" onChange={handleFileUpload} />
                        </label>
                        <button
                            onClick={handleCreateBackup}
                            disabled={isCreatingBackup}
                            className="btn-primary flex items-center gap-2 !py-2 !px-3"
                        >
                            {isCreatingBackup ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Sauvegarder Maintenant
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    <div className="alert-info flex items-start gap-3 mb-6">
                        <AlertCircle className="h-5 w-5 mt-0.5" />
                        <div>
                            <p className="font-medium">Gestion "Grade Industriel"</p>
                            <p className="text-sm opacity-80 mt-1">
                                Le système conserve automatiquement les 5 dernières sauvegardes automatiques.
                                Toute restauration crée d'abord un point de sauvegarde de sécurité.
                            </p>
                        </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden dark:border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Taille</th>
                                    <th className="px-4 py-3">Fichier</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">
                                            {new Date(backup.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${backup.type === 'manual'
                                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                }`}>
                                                {backup.type.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                            {formatBytes(backup.size_bytes)}
                                        </td>
                                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500 text-xs font-mono">
                                            {backup.filename}
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <a
                                                href={BackupService.downloadUrl(backup.filename)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                                title="Télécharger la sauvegarde"
                                                aria-label="Télécharger la sauvegarde"
                                            >
                                                <Download className="h-4 w-4" />
                                            </a>
                                            <button
                                                onClick={() => handleRestore(backup.filename)}
                                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded transition-colors"
                                                title="Restaurer cette sauvegarde"
                                                aria-label="Restaurer cette sauvegarde"
                                            >
                                                <History className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                disabled={isDeleting === backup.filename}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                                title="Supprimer définitivement"
                                                aria-label="Supprimer définitivement"
                                            >
                                                {isDeleting === backup.filename ? (
                                                    <RefreshCcw className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash className="h-4 w-4" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {backups.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 italic">
                                            Aucune sauvegarde disponible
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Cutting Settings */}
            <div className="card">
                <div className="card-header flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-blue-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Paramètres de Découpe</h2>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="kerf" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Épaisseur de lame par défaut (mm)
                            </label>
                            <input
                                id="kerf"
                                type="number"
                                min="0"
                                step="0.5"
                                title="Épaisseur de lame en mm"
                                placeholder="3.0"
                                className="input-field"
                                value={settings.defaultKerf}
                                onChange={e => setSettings({ ...settings, defaultKerf: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Kerf - largeur de trait de coupe</p>
                        </div>
                        <div>
                            <label htmlFor="trim-margin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Marge de ponçage par défaut (mm)
                            </label>
                            <input
                                id="trim-margin"
                                type="number"
                                min="0"
                                step="0.5"
                                title="Marge de ponçage en mm"
                                placeholder="0.0"
                                className="input-field"
                                value={settings.defaultTrimMargin}
                                onChange={e => setSettings({ ...settings, defaultTrimMargin: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ajouté à chaque côté de la pièce</p>
                        </div>
                        <div>
                            <label htmlFor="safety-margin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Marge de sécurité bord panneau (mm)
                            </label>
                            <input
                                id="safety-margin"
                                type="number"
                                min="0"
                                step="1"
                                title="Marge de sécurité du panneau en mm"
                                placeholder="10"
                                className="input-field"
                                value={settings.defaultSafetyMargin}
                                onChange={e => setSettings({ ...settings, defaultSafetyMargin: parseFloat(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Distance minimale des bords du panneau</p>
                        </div>
                        <div>
                            <label htmlFor="min-offcut" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Taille minimale des chutes (mm)
                            </label>
                            <input
                                id="min-offcut"
                                type="number"
                                min="50"
                                step="10"
                                title="Taille minimale des chutes en mm"
                                placeholder="100"
                                className="input-field"
                                value={settings.minOffcutSize}
                                onChange={e => setSettings({ ...settings, minOffcutSize: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Les chutes plus petites sont ignorées</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Export Settings */}
            <div className="card">
                <div className="card-header flex items-center gap-2">
                    <FolderOutput className="h-5 w-5 text-emerald-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Exports</h2>
                </div>
                <div className="card-body">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="export-path" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Dossier d'export par défaut
                            </label>
                            <input
                                id="export-path"
                                type="text"
                                title="Chemin d'export des fichiers"
                                placeholder="C:\Users\Documents\OptiCut"
                                className="input-field"
                                value={settings.defaultExportPath}
                                onChange={e => setSettings({ ...settings, defaultExportPath: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                                Formats d'export par défaut
                            </label>
                            <div className="flex flex-wrap gap-3">
                                {['png', 'pdf', 'dxf', 'svg', 'json'].map(format => (
                                    <label key={format} className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer transition-all
                                        ${settings.exportFormats.includes(format)
                                            ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400'
                                            : 'bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                                        }
                                    `}>
                                        <input
                                            type="checkbox"
                                            checked={settings.exportFormats.includes(format)}
                                            onChange={() => {
                                                const formats = settings.exportFormats.includes(format)
                                                    ? settings.exportFormats.filter(f => f !== format)
                                                    : [...settings.exportFormats, format];
                                                setSettings({ ...settings, exportFormats: formats });
                                            }}
                                            className="sr-only"
                                        />
                                        <span className="text-sm font-semibold uppercase">{format}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Label Settings */}
            <div className="card">
                <div className="card-header flex items-center gap-2">
                    <Printer className="h-5 w-5 text-amber-500" />
                    <h2 className="font-semibold text-slate-800 dark:text-white">Étiquettes QR Code</h2>
                </div>
                <div className="card-body">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="label-width" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Largeur étiquette (mm)
                            </label>
                            <input
                                id="label-width"
                                type="number"
                                min="30"
                                step="5"
                                title="Largeur de l'étiquette en mm"
                                placeholder="80"
                                className="input-field"
                                value={settings.labelWidth}
                                onChange={e => setSettings({ ...settings, labelWidth: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label htmlFor="label-height" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Hauteur étiquette (mm)
                            </label>
                            <input
                                id="label-height"
                                type="number"
                                min="20"
                                step="5"
                                title="Hauteur de l'étiquette en mm"
                                placeholder="50"
                                className="input-field"
                                value={settings.labelHeight}
                                onChange={e => setSettings({ ...settings, labelHeight: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label htmlFor="labels-per-row" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Étiquettes par rangée
                            </label>
                            <input
                                id="labels-per-row"
                                type="number"
                                min="1"
                                max="4"
                                title="Nombre d'étiquettes par ligne"
                                placeholder="2"
                                className="input-field"
                                value={settings.labelsPerRow}
                                onChange={e => setSettings({ ...settings, labelsPerRow: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label htmlFor="labels-per-sheet" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                Étiquettes par feuille A4
                            </label>
                            <input
                                id="labels-per-sheet"
                                type="number"
                                min="1"
                                title="Nombre d'étiquettes par feuille A4"
                                placeholder="10"
                                className="input-field"
                                value={settings.labelsPerSheet}
                                onChange={e => setSettings({ ...settings, labelsPerSheet: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
