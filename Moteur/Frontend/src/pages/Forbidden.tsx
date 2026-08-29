
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-theme-bg-main flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-theme-bg-card border border-theme-border rounded-2xl p-8 text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-theme-text-primary mb-2">Accès non autorisé</h1>
        <p className="text-theme-text-muted mb-8">
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="w-full h-11 bg-theme-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-opacity"
        >
          Retour
        </button>
      </div>
    </div>
  );
}
