import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronRight, AlertTriangle } from 'lucide-react';
import { apiClient } from '../services/apiClient';

export function FirstSetup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    entreprise: '',
    nom: '',
    prenom: '',
    identifiant: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(formData.password);

  const handleNext = () => {
    if (step === 2) {
      if (formData.password !== formData.confirmPassword) {
        setError("Les mots de passe ne correspondent pas");
        return;
      }
      if (strength < 2) {
        setError("Le mot de passe est trop faible");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(formData.identifiant)) {
        setError("L'identifiant ne doit contenir que des lettres, chiffres ou _");
        return;
      }
      submitSetup();
    } else {
      setStep(step + 1);
    }
  };

  const submitSetup = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient('/auth/setup', {
        method: 'POST',
        body: JSON.stringify({
          nom: formData.nom,
          prenom: formData.prenom,
          identifiant: formData.identifiant,
          password: formData.password,
          entreprise: formData.entreprise
        }),
      });

      if (res.ok) {
        setStep(3); // Success step
      } else {
        const errorData = await res.json();
        setError(errorData.detail || "Erreur lors de la configuration");
      }
    } catch (e) {
      setError("Erreur de connexion au serveur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg-main flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-theme-border">
        <div 
          className="h-full bg-theme-primary transition-all duration-500 ease-out"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <div className="w-full max-w-[500px] bg-theme-bg-card border border-theme-border rounded-2xl p-10">
        {step === 1 && (
          <div className="text-center animate-fade-in">
            <div className="w-20 h-20 bg-theme-primary/10 text-theme-primary rounded-2xl flex items-center justify-center mx-auto mb-6 text-3xl font-bold">
              OP
            </div>
            <h1 className="text-2xl font-bold text-theme-text-primary mb-2">
              Bienvenue dans OptiCut Pro V4
            </h1>
            <p className="text-theme-text-muted mb-8">
              Configurons votre espace de travail en quelques secondes.
            </p>
            <button
              onClick={handleNext}
              className="w-full h-12 bg-theme-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <span>Commencer</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold text-theme-text-primary mb-2 text-center">
              Créez votre compte administrateur
            </h2>
            <p className="text-sm text-theme-text-muted text-center mb-6">
              Ce compte aura accès à toutes les fonctionnalités du logiciel.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">
                  Nom de l'entreprise
                </label>
                <input
                  type="text"
                  value={formData.entreprise}
                  onChange={e => setFormData({ ...formData, entreprise: e.target.value })}
                  className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors"
                  required
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text-secondary mb-1">Prénom</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={e => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-theme-text-secondary mb-1">Nom</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={e => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">Identifiant</label>
                <input
                  type="text"
                  value={formData.identifiant}
                  onChange={e => setFormData({ ...formData, identifiant: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                  className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors"
                  placeholder="ex: jean_dupont"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">Mot de passe</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors mb-2"
                  required
                />
                {/* Password strength indicator */}
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full ${
                        !formData.password ? 'bg-theme-border' :
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
                <label className="block text-sm font-medium text-theme-text-secondary mb-1">Confirmation</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-theme-bg-main border border-theme-border rounded-lg px-4 py-2 text-theme-text-primary focus:border-theme-primary transition-colors"
                  required
                />
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  Notez bien vos identifiants. En cas d'oubli, une réinitialisation manuelle sera nécessaire dans la base de données.
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
                  <AlertTriangle className="text-red-400 shrink-0" size={16} />
                  <p className="text-sm text-red-400 leading-snug">{error}</p>
                </div>
              )}

              <button
                onClick={handleNext}
                disabled={isSubmitting || !formData.entreprise || !formData.nom || !formData.prenom || !formData.identifiant || !formData.password || !formData.confirmPassword}
                className="w-full h-11 bg-theme-primary text-white font-medium rounded-lg mt-4 hover:bg-opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>Créer mon compte</span>
                    <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center animate-fade-in">
            <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-theme-text-primary mb-2">
              Votre espace est prêt !
            </h2>
            <p className="text-theme-text-muted mb-8">
              Compte administrateur créé pour {formData.prenom} {formData.nom}.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full h-11 bg-theme-primary text-white font-medium rounded-lg hover:bg-opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>Accéder au logiciel</span>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
