import React, { useState } from 'react';
import { Eye, EyeOff, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { changePassword } = useAuth();
  const navigate = useNavigate();

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (strength < 2) {
      setError("Le nouveau mot de passe est trop faible");
      return;
    }

    setIsSubmitting(true);
    const success = await changePassword(currentPassword, newPassword);
    setIsSubmitting(false);

    if (success) {
      navigate('/');
    } else {
      setError("Mot de passe actuel incorrect ou erreur serveur");
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg-main flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px] bg-theme-bg-card border border-theme-border rounded-2xl p-10">
        <h2 className="text-xl font-bold text-theme-text-primary mb-2 text-center">
          Nouveau mot de passe
        </h2>
        <p className="text-sm text-theme-text-muted text-center mb-6">
          Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Mot de passe actuel
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-4 pr-10 py-2 text-theme-text-primary focus:outline-none focus:border-theme-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Nouveau mot de passe
            </label>
            <div className="relative mb-2">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-theme-bg-main border border-theme-border rounded-lg pl-4 pr-10 py-2 text-theme-text-primary focus:outline-none focus:border-theme-primary transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-text-muted hover:text-theme-text-primary"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            
            {/* Password strength indicator */}
            <div className="flex gap-1 h-1 mt-2">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`flex-1 rounded-full ${
                    !newPassword ? 'bg-theme-border' :
                    strength >= level ? (
                      strength <= 2 ? 'bg-red-500' :
                      strength === 3 ? 'bg-orange-500' : 'bg-green-500'
                    ) : 'bg-theme-border'
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text-secondary mb-1">
              Confirmation
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:outline-none focus:border-theme-primary transition-colors"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !currentPassword || !newPassword || !confirmPassword}
            className="w-full h-11 bg-theme-primary text-white font-medium rounded-lg mt-6 hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Enregistrer et accéder</span>
              </>
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
    </div>
  );
}
