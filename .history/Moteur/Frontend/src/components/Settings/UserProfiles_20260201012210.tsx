import * as React from 'react';
const { useState, useEffect } = React;
import { useTheme } from '../../context/ThemeContext';
// Local icon stub (no props spread)
const IconStub = (name: string) => () => <span aria-hidden title={name} />;
const User = IconStub('User');
const Plus = IconStub('Plus');
const Trash2 = IconStub('Trash2');
const Save = IconStub('Save');
const Edit2 = IconStub('Edit2');
const Check = IconStub('Check');
const X = IconStub('X');

export interface UserProfile {
    id: string;
    name: string;
    theme: 'dark' | 'light' | 'system';
    colors: any;
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
            theme: theme as any,
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
                    theme: theme as any,
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Profils Utilisateur
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Cr�ez plusieurs profils avec leurs propres param�tres
                </p>
            </div>

            {/* Cr�er nouveau profil */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-3">
                    Nouveau Profil
                </h4>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Nom du profil (ex: Bureau, Mobile, Pr�sentation)"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateProfile()}
                    />
                    <button
                        onClick={handleCreateProfile}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                    >
                        <Plus size={18} />
                        Cr�er
                    </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                    Le profil sera cr�� avec vos param�tres actuels
                </p>
            </div>

            {/* Profil actif */}
            {currentUser && (
                <div className="p-4 rounded-lg border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
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
                            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors text-sm"
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
                    <h4 className="font-medium text-slate-700 dark:text-slate-300">
                        Tous les Profils ({profiles.length})
                    </h4>
                    <div className="space-y-2">
                        {profiles.map((profile) => (
                            <div
                                key={profile.id}
                                className={`p-4 rounded-lg border-2 transition-colors ${
                                    profile.isActive
                                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
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
                                                    className="flex-1 px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm"
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
                                                    <p className="font-medium text-slate-900 dark:text-slate-100">
                                                        {profile.name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">
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
                                                className="px-3 py-1 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors text-sm"
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
                                                className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded"
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
                <div className="p-8 text-center rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700">
                    <User size={32} className="mx-auto text-slate-400 mb-3" />
                    <p className="text-slate-600 dark:text-slate-400">
                        Aucun profil cr��. Cr�ez votre premier profil !
                    </p>
                </div>
            )}
        </div>
    );
}
