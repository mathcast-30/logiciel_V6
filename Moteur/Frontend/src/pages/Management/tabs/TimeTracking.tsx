import React from 'react';
import { ManagedProject } from '../../../config/managementConfig';

interface TimeTrackingProps {
  projects: ManagedProject[];
}

export const TimeTracking: React.FC<TimeTrackingProps> = ({ projects }) => {
  const activeProjects = projects.filter(p => p.status !== 'valide' && p.estimated_hours > 0);

  return (
    <div className="bg-theme-bg-card border border-theme-border rounded-xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-theme-text-main mb-6">Suivi du temps (Prévu vs Réel)</h3>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {activeProjects.length > 0 ? (
          activeProjects.map(p => {
            const ratio = p.estimated_hours > 0 ? p.actual_hours / p.estimated_hours : 0;
            const pct = Math.min(100, ratio * 100);
            const isOver = p.actual_hours > p.estimated_hours;

            return (
              <div key={p.id} className="bg-theme-bg-sidebar border border-theme-border rounded-lg p-4 transition-colors hover:border-theme-primary/50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-theme-text-main">{p.name}</span>
                  <span className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-theme-text-muted'}`}>
                    {p.actual_hours} / {p.estimated_hours} h
                  </span>
                </div>
                <div className="w-full bg-theme-bg-card h-2 rounded-full overflow-hidden relative">
                  <div 
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${isOver ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                  {/* Marker for 100% if we are over */}
                  {isOver && (
                    <div className="absolute top-0 bottom-0 w-1 bg-black/20" style={{ left: '100%' }} />
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-center justify-center h-48 text-theme-text-muted">
            Aucun projet actif avec un temps estimé.
          </div>
        )}
      </div>
    </div>
  );
};
