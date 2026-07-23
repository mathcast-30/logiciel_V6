import React from 'react';
import { CostSource } from '../config/managementConfig';

interface CostSourceBadgeProps {
  source: CostSource | undefined;
  /** Affiche le badge en mode compact (une lettre) pour les cartes Kanban */
  compact?: boolean;
}

/**
 * Badge visuel indiquant la fiabilité de la donnée de coût matière.
 *
 * - "optimization" → aucune mention (donnée fiable, issue de l'optimiseur)
 * - "parts"        → badge orange "~" + tooltip "Estimation surface nette (hors chutes)"
 * - "none"         → badge rouge "?" indiquant qu'aucun coût n'est calculable
 */
export const CostSourceBadge: React.FC<CostSourceBadgeProps> = ({ source, compact = false }) => {
  if (!source || source === 'optimization') return null;

  if (source === 'parts') {
    return compact ? (
      <span
        title="Coût estimé sur surface nette des pièces (hors chutes réelles)"
        className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-400/30 cursor-help"
      >
        ~
      </span>
    ) : (
      <span
        title="Coût estimé sur surface nette des pièces (hors chutes réelles)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/30 cursor-help"
      >
        <span className="text-sm leading-none">~</span>
        Estimation (surface nette, hors chutes)
      </span>
    );
  }

  // source === 'none'
  return compact ? (
    <span
      title="Aucune donnée de coût disponible pour ce projet"
      className="ml-1 inline-flex items-center px-1 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-500 border border-red-400/30 cursor-help"
    >
      ?
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-400/30">
      <span className="text-sm leading-none">⚠</span>
      Coût matière non disponible
    </span>
  );
};

/**
 * Wrapper pour un montant monétaire avec badge de source.
 * Si source est "none", affiche le texte alternatif au lieu du montant.
 */
interface CostAmountProps {
  amount: number;
  source: CostSource | undefined;
  /** Label alternatif quand source === "none". Défaut : "—" */
  unavailableLabel?: string;
  className?: string;
}

export const CostAmount: React.FC<CostAmountProps> = ({
  amount,
  source,
  unavailableLabel = '—',
  className = '',
}) => {
  if (source === 'none') {
    return (
      <span className={`text-theme-text-muted italic text-xs ${className}`}>
        {unavailableLabel}
      </span>
    );
  }

  return (
    <span className={className}>
      {amount.toFixed(2)} €
      {source === 'parts' && (
        <CostSourceBadge source="parts" compact />
      )}
    </span>
  );
};

/**
 * Affiche un label "Prix estimatif" quand la source du coût n'est pas fiable.
 */
export const EstimativeLabel: React.FC<{ source: CostSource | undefined }> = ({ source }) => {
  if (!source || source === 'optimization') return null;
  return (
    <span className="text-[10px] font-semibold tracking-wide uppercase text-amber-500 ml-1">
      {source === 'none' ? '(non calculable)' : '(estimatif)'}
    </span>
  );
};
