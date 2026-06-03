import React from 'react';
import { Loader2 } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Aviation-Grade Error Boundary
 * 
 * Catches rendering errors and automatically recovers by reloading the page after 1 second.
 * Shows a smooth transition UI instead of a crash screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('🔴 ErrorBoundary caught:', error, errorInfo);

        // Aviation Mode: Désactivé temporairement pour débugger le rechargement
        /*
        setTimeout(() => {
            console.log('🔄 Auto-recovery: Reloading page...');
            window.location.reload();
        }, 100);
        */
        console.warn('⚠️ ErrorBoundary a capturé une erreur. Rechargement automatique désactivé pour debug.');
    }

    render() {
        if (this.state.hasError) {
            // Affichage de Transition au lieu de l'Erreur
            return (
                <div className="flex flex-col items-center justify-center min-h-screen p-12 space-y-6 bg-white dark:bg-slate-900">
                    <div className="text-center space-y-4">
                        <div className="flex justify-center">
                            <div className="relative">
                                <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 animate-spin" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="h-4 w-4 bg-white dark:bg-slate-900 rounded-full" />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Synchronisation en cours...</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                                Une erreur de rendu est survenue. L'application essaie de se synchroniser.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl text-left">
                                <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400 mb-2">Détails de l'erreur</p>
                                <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all bg-white/50 dark:bg-black/20 p-2 rounded border border-red-100 dark:border-red-900/10">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                                className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 dark:shadow-none text-sm"
                            >
                                Recharger la page
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    localStorage.clear();
                                    sessionStorage.clear();
                                    window.location.href = '/';
                                }}
                                className="px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-medium hover:bg-slate-200 transition-colors text-xs"
                            >
                                Réinitialiser (Vider le cache)
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
