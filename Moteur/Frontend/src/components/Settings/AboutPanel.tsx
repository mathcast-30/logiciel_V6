import React from 'react';

export const AboutPanel: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-theme-bg-card border border-theme-border rounded-xl p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-theme-primary flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
          OP
        </div>
        <h2 className="text-2xl font-bold text-theme-text-main mb-1">OptiCut Pro V4</h2>
        <p className="text-theme-text-muted mb-6">Version 4.0.0 (Build 2026.06)</p>
        
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-theme-bg-main border border-theme-border rounded-lg text-theme-text-main hover:bg-theme-primary/10 transition-colors text-sm">
            Vérifier les mises à jour
          </button>
          <button className="px-4 py-2 bg-theme-bg-main border border-theme-border rounded-lg text-theme-text-main hover:bg-theme-primary/10 transition-colors text-sm">
            Notes de mise à jour
          </button>
        </div>
      </div>

      <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6">
        <h3 className="font-bold text-theme-text-main mb-4">Informations Système</h3>
        <div className="grid grid-cols-2 gap-y-3 text-sm">
          <div className="text-theme-text-muted">Environnement</div>
          <div className="text-theme-text-main font-mono">Production</div>
          
          <div className="text-theme-text-muted">Architecture</div>
          <div className="text-theme-text-main font-mono">64-bit</div>
          
          <div className="text-theme-text-muted">Licence</div>
          <div className="text-theme-text-main">Professionnelle (Valide)</div>
        </div>
      </div>
    </div>
  );
};
