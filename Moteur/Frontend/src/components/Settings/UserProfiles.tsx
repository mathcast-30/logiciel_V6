import * as React from 'react';
const { useState, useEffect } = React;
import { useTheme } from '../../context/ThemeContext';
import type { ColorPalette, Theme } from '../../context/ThemeContext';
// Local icon components with proper TypeScript typing
interface IconProps {
    size?: number;
    className?: string;
}

const User: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);

const Plus: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const Trash2: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
);

const Save: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
    </svg>
);

const Edit2: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
);

const Check: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const X: React.FC<IconProps> = ({ size = 24, className = '' }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export interface UserProfile {
    id: string;
    name: string;
    theme: Theme;
    colors: ColorPalette;
    createdAt: string;
    isActive: boolean;
}

export function UserProfiles() {
    const { theme, setTheme, colors, setColors } = useTheme();
    const [profiles, setProfiles] = useState<UserProfile[]>(() => {
        const stored = localStorage.getItem('opticut-user-profiles');
        return stored ? JSON.parse(stored) : [];
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [newProfileName, setNewProfileName] = useState('');

    useEffect(() => {
        localStorage.setItem('opticut-user-profiles', JSON.stringify(profiles));
    }, [profiles]);

    const currentUser = profiles.find((p) => p.isActive);

    const handleCreateProfile = () => {
        if (!newProfileName.trim()) {
            alert('Veuillez entrer un nom de profil');
            return;
        }

        // D�sactiver le profil actif pr�c�dent
        const updated = profiles.map((p) => ({ ...p, isActive: false }));

        const newProfile: UserProfile = {
            id: `profile-${Date.now()}`,
            name: newProfileName.trim(),
            theme: theme,
            colors: colors,
            createdAt: new Date().toISOString(),
            isActive: true,
        };

        updated.push(newProfile);
        setProfiles(updated);
        setNewProfileName('');
        alert(`? Profil "${newProfileName}" cr�� et activ� !`);
    };

    const handleSwitchProfile = (profileId: string) => {
        const profile = profiles.find((p) => p.id === profileId);
        if (!profile) return;

        setTheme(profile.theme);
        setColors(profile.colors);

        const updated = profiles.map((p) => ({
            ...p,
            isActive: p.id === profileId,
        }));
        setProfiles(updated);
    };

    const handleUpdateProfileName = (profileId: string, newName: string) => {
        if (!newName.trim()) return;

        const updated = profiles.map((p) =>
            p.id === profileId ? { ...p, name: newName.trim() } : p
        );
        setProfiles(updated);
        setEditingId(null);
    };

    const handleDeleteProfile = (profileId: string) => {
        if (!confirm('�tes-vous s�r de vouloir supprimer ce profil ?')) return;

        const updated = profiles.filter((p) => p.id !== profileId);

        // Si le profil supprim� �tait actif, activer le premier disponible
        if (profiles.find((p) => p.id === profileId && p.isActive) && updated.length > 0) {
            updated[0].isActive = true;
            handleSwitchProfile(updated[0].id);
        }

        setProfiles(updated);
    };

    const handleUpdateCurrentProfile = () => {
        const updated = profiles.map((p) =>
            p.isActive
                ? {
                    ...p,
                    theme: theme,
                    colors: colors,
                }
                : p
        );
        setProfiles(updated);
        alert('? Profil actif mis � jour');
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-theme-text-muted">
                    Profils Utilisateur
                </h3>
                <p className="text-sm text-theme-text-muted mt-1">
                    Cr�ez plusieurs profils avec leurs propres param�tres
                </p>
            </div>

            {/* Cr�er nouveau profil */}
            <div className="p-4 rounded-lg border border-theme-primary/20 bg-theme-bg-card">
                <h4 className="font-medium text-theme-text-muted mb-3">
                    Nouveau Profil
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nom du profil (ex: Bureau, Mobile, Pr�sentation)"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-theme-primary/20 bg-theme-bg-main text-theme-text-muted"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                    />
                    <button
                        onClick={handleCreateProfile}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-theme-text-main hover:bg-blue-600 transition-colors"
                    >
                        <Plus size={18} />
                        Cr�er
                    </button>
                </div>
                <p className="text-xs text-theme-text-muted mt-2">
                    Le profil sera cr�� avec vos param�tres actuels
                </p>
            </div>

            {/* Profil actif */}
            {currentUser && (
                <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-theme-text-main">
                                <User size={16} />
                            </div>
                            <div>
                                <p className="font-medium text-green-900 dark:text-green-100">
                                    {currentUser.name}
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-300">
                                    Profil actif
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleUpdateCurrentProfile}
                            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-600 text-theme-text-main hover:bg-green-700 transition-colors text-sm"
                        >
                            <Save size={14} />
                            Enregistrer
                        </button>
                    </div>
                    <p className="text-xs text-green-600 dark:text-green-400">
                        Cr�� le {new Date(currentUser.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                </div>
            )}

            {/* Liste des profils */}
            {profiles.length > 0 ? (
                <div className="space-y-3">
                    <h4 className="font-medium text-theme-text-muted">
                        Tous les Profils ({profiles.length})
                    </h4>
                    <div className="space-y-2">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                className={`p-4 rounded-lg border-2 transition-colors ${
                                    profile.isActive
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-theme-primary/20 bg-theme-bg-card hover:border-theme-primary/40'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        {editingId === profile.id ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editingName}
                                                    onChange={(e) => setEditingName(e.target.value)}
                                                    className="flex-1 px-2 py-1 rounded border border-theme-primary/20 bg-theme-bg-main text-theme-text-muted text-sm"
                                                    autoFocus
                                                />
                                                <button
                                                    onClick={() =>
                                                        handleUpdateProfileName(profile.id, editingName)
                                                    }
                                                    className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-6 h-6 rounded-full"
                                                    style={{ backgroundColor: profile.colors.primary }}
                                                />
                                                <div>
                                                    <p className="font-medium text-theme-text-muted">
                                                        {profile.name}
                                                    </p>
                                                    <p className="text-xs text-theme-text-muted">
                                                        {profile.theme === 'system'
                                                            ? 'Syst�me'
                                                            : profile.theme === 'dark'
                                                            ? 'Sombre'
                                                            : 'Clair'}{' '}
                                                        � Cr�� le{' '}
                                                        {new Date(profile.createdAt).toLocaleDateString(
                                                            'fr-FR'
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        {!profile.isActive && (
                                            <button
                                                onClick={() => handleSwitchProfile(profile.id)}
                                                className="px-3 py-1 rounded-lg bg-blue-500 text-theme-text-main hover:bg-blue-600 transition-colors text-sm"
                                            >
                                                Activer
                                            </button>
                                        )}
                                        {!profile.isActive && (
                                            <button
                                                onClick={() => {
                                                    setEditingId(profile.id);
                                                    setEditingName(profile.name);
                                                }}
                                                className="p-1 text-theme-text-muted hover:bg-theme-bg-card rounded"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        {!profile.isActive && (
                                            <button
                                                onClick={() => handleDeleteProfile(profile.id)}
                                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center rounded-lg border-2 border-dashed border-theme-primary/20">
                    <User size={32} className="mx-auto text-theme-text-muted mb-3" />
                    <p className="text-theme-text-muted">
                        Aucun profil cr��. Cr�ez votre premier profil !
                    </p>
                </div>
            )}
        </div>
    );
}
