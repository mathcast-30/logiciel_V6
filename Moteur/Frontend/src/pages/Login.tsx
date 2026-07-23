import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    const result = await login(identifiant, password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.mustChangePwd) {
        navigate('/change-password');
      } else {
        navigate('/');
      }
    } else {
      switch (result.error) {
        case 'identifiants_incorrects':
          setError("Identifiant ou mot de passe incorrect");
          break;
        case 'compte_desactive':
          setError("Ce compte a été désactivé. Contactez votre administrateur.");
          break;
        case 'erreur_reseau':
          setError("Impossible de contacter le serveur. Vérifiez que le logiciel est bien lancé.");
          break;
        default:
          setError("Une erreur est survenue");
      }
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg-main flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-theme-primary rounded-xl flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
          OP
        </div>
        <h1 className="text-2xl font-bold text-theme-text-primary">OptiCut Pro</h1>
        <p className="text-theme-text-muted mt-1">Logiciel de découpe optimisée</p>
      </div>

      <div className="w-full max-w-[400px] bg-theme-bg-card border border-theme-border rounded-2xl p-10">
        <h2 className="text-xl font-bold text-theme-text-primary mb-6 text-center">Connexion</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Identifiant
            </label>
            <input
              type="text"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:outline-none focus:border-theme-primary transition-colors"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-4 pr-10 py-2 text-theme-text-primary focus:outline-none focus:border-theme-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !identifiant || !password}
            className="w-full h-11 bg-theme-primary text-white font-medium rounded-lg mt-6 hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Se connecter"
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-400 leading-snug">{error}</p>
            </div>
          )}
        </form>
      </div>

      <p className="mt-8 text-xs text-theme-text-muted">Version 4.1 — OptiCut Pro</p>
    </div>
  );
}
