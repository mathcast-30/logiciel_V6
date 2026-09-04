/**
 * frontend_step_import_integration.tsx
 * =======================================
 *
 * Patchs frontend à intégrer dans vos fichiers existants. Comme pour le
 * fichier backend, ce n'est pas un composant complet à déposer tel quel :
 * c'est un recueil de blocs à copier, chacun annoté avec sa destination.
 *
 * Fichiers concernés :
 *   1. services/stepService.ts   (interfaces TypeScript)
 *   2. pages/StepImport.tsx      (badges, popover contour, modal, bannière)
 *
 * NOTE : non compilé/testé (pas de build TypeScript disponible dans
 * l'environnement de rédaction). Adaptez les noms d'imports et de props
 * à votre structure de composants UI existante (Button.tsx, Modal.tsx...).
 */

// =============================================================================
// BLOC 1 — services/stepService.ts
// =============================================================================

export const STEP_SERVICE_PATCH = `
export interface MachiningFeature {
  type: 'percage' | 'rainure' | 'mortaise_ou_poche';
  bbox_width: number;
  bbox_height: number;
  position_center: [number, number];
}

export interface ExtractedPart {
  temp_id: string;
  component_name: string;
  names_source: 'fusion_xcaf' | 'generic_fallback';
  width: number;
  height: number;
  thickness: number;
  thickness_confidence: number | null;
  thickness_method: string;
  shape_type: 'panneau_rectangulaire_avec_usinages_mineurs' | 'forme_structurelle_non_convexe' | string;
  contour_2d: number[][] | null;
  machining_features: MachiningFeature[];
  warnings: string[];
}

export interface StepImportResponse {
  solids_count: number;
  pieces: ExtractedPart[];
  names_source: string;
  has_low_confidence_pieces: boolean;
  has_non_convex_pieces: boolean;
  global_warnings: string[];
}
`;

// =============================================================================
// BLOC 2 — pages/StepImport.tsx : composants d'affichage
// =============================================================================

import React, { useState } from 'react';
import type { ExtractedPart, MachiningFeature } from '../services/stepService';

// --- Badge de confiance d'épaisseur --------------------------------------

interface ConfidenceBadgeProps {
  confidence: number | null;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  if (confidence === null) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        ⚪ Non mesuré
      </span>
    );
  }

  if (confidence > 0.85) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
        🟢 Fiable ({Math.round(confidence * 100)}%)
      </span>
    );
  }

  if (confidence >= 0.6) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
        🟡 À vérifier ({Math.round(confidence * 100)}%)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
      🔴 Incertain ({Math.round(confidence * 100)}%)
    </span>
  );
}

// --- Badge forme non convexe -----------------------------------------------

export function NonConvexBadge({ shapeType }: { shapeType: string }) {
  if (shapeType !== 'forme_structurelle_non_convexe') return null;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700"
      title="Pièce non rectangulaire (ex: équerre, forme en L). Vérifiez le contour avant optimisation."
    >
      ⬡ Forme complexe
    </span>
  );
}

// --- Miniature SVG du contour + usinages ------------------------------------

interface ContourThumbnailProps {
  contour: number[][] | null;
  machiningFeatures: MachiningFeature[];
  size?: number;
}

export function ContourThumbnail({ contour, machiningFeatures, size = 80 }: ContourThumbnailProps) {
  if (!contour || contour.length < 3) {
    return (
      <div
        className="flex items-center justify-center bg-gray-50 rounded text-gray-400 text-xs"
        style={{ width: size, height: size }}
      >
        Pas d'aperçu
      </div>
    );
  }

  // Normalisation du contour dans un viewBox 0-100 pour un affichage cohérent
  const xs = contour.map((p) => p[0]);
  const ys = contour.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = 90 / Math.max(width, height);

  const toSvg = (p: number[]) => [
    5 + (p[0] - minX) * scale,
    5 + (p[1] - minY) * scale,
  ];

  const pathPoints = contour.map(toSvg).map((p) => p.join(',')).join(' ');

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="bg-gray-50 rounded"
    >
      <polygon
        points={pathPoints}
        fill="#6C63FF22"
        stroke="#6C63FF"
        strokeWidth={1.5}
      />
      {machiningFeatures.map((feature, idx) => {
        const [cx, cy] = toSvg(feature.position_center);
        const color = feature.type === 'percage' ? '#EF4444' : feature.type === 'rainure' ? '#F59E0B' : '#3B82F6';
        return <circle key={idx} cx={cx} cy={cy} r={2} fill={color} />;
      })}
    </svg>
  );
}

// --- Liste dépliable des usinages -------------------------------------------

const FEATURE_LABELS: Record<string, string> = {
  percage: 'Perçage',
  rainure: 'Rainure',
  mortaise_ou_poche: 'Mortaise / poche',
};

export function MachiningFeaturesList({ features }: { features: MachiningFeature[] }) {
  const [expanded, setExpanded] = useState(false);

  if (features.length === 0) return null;

  const summary = Object.entries(
    features.reduce<Record<string, number>>((acc, f) => {
      acc[f.type] = (acc[f.type] || 0) + 1;
      return acc;
    }, {})
  )
    .map(([type, count]) => `${count} ${FEATURE_LABELS[type] ?? type}${count > 1 ? 's' : ''}`)
    .join(', ');

  return (
    <div className="text-xs text-gray-600">
      <button
        onClick={() => setExpanded(!expanded)}
        className="underline hover:text-gray-900"
      >
        {features.length} usinage{features.length > 1 ? 's' : ''} détecté{features.length > 1 ? 's' : ''} ({summary}) {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <ul className="mt-1 space-y-0.5 pl-3">
          {features.map((f, idx) => (
            <li key={idx}>
              {FEATURE_LABELS[f.type] ?? f.type} — {f.bbox_width}×{f.bbox_height}mm
              {' '}à ({f.position_center[0]}, {f.position_center[1]})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Bannière d'alerte globale -----------------------------------------------

interface GlobalWarningBannerProps {
  hasLowConfidence: boolean;
  hasNonConvex: boolean;
  namesSource: string;
  globalWarnings: string[];
}

export function GlobalWarningBanner({
  hasLowConfidence,
  hasNonConvex,
  namesSource,
  globalWarnings,
}: GlobalWarningBannerProps) {
  const messages: string[] = [...globalWarnings];

  if (hasLowConfidence) {
    messages.push(
      "Certaines pièces ont une épaisseur mesurée avec une confiance faible : vérifiez-les avant de lancer une optimisation."
    );
  }
  if (hasNonConvex) {
    messages.push(
      "Certaines pièces ont une forme non rectangulaire (ex: équerre) : vérifiez leur contour."
    );
  }
  if (namesSource === 'generic_fallback') {
    messages.push(
      "Les noms de composants Fusion 360 n'ont pas pu être récupérés pour ce fichier : des noms génériques ont été attribués."
    );
  }

  if (messages.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <div className="font-medium text-amber-800 text-sm mb-1">
        ⚠ Points à vérifier avant de continuer
      </div>
      <ul className="text-sm text-amber-700 list-disc pl-5 space-y-0.5">
        {messages.map((m, idx) => (
          <li key={idx}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

// --- Exemple d'assemblage dans le tableau récapitulatif d'import -----------

export function ExtractedPartRow({ part }: { part: ExtractedPart }) {
  return (
    <tr className="border-b">
      <td className="py-2 px-3">
        <ContourThumbnail contour={part.contour_2d} machiningFeatures={part.machining_features} size={60} />
      </td>
      <td className="py-2 px-3">
        <div className="font-medium">{part.component_name}</div>
        {part.names_source === 'generic_fallback' && (
          <div className="text-xs text-gray-400">nom générique — à renommer</div>
        )}
      </td>
      <td className="py-2 px-3 text-sm">
        {part.width} × {part.height} × {part.thickness} mm
      </td>
      <td className="py-2 px-3">
        <div className="flex flex-col gap-1">
          <ConfidenceBadge confidence={part.thickness_confidence} />
          <NonConvexBadge shapeType={part.shape_type} />
        </div>
      </td>
      <td className="py-2 px-3">
        <MachiningFeaturesList features={part.machining_features} />
      </td>
    </tr>
  );
}

/**
 * Utilisation dans votre écran de confirmation d'import (StepImport.tsx) :
 *
 *   <GlobalWarningBanner
 *     hasLowConfidence={importResult.has_low_confidence_pieces}
 *     hasNonConvex={importResult.has_non_convex_pieces}
 *     namesSource={importResult.names_source}
 *     globalWarnings={importResult.global_warnings}
 *   />
 *   <table>
 *     <thead>...</thead>
 *     <tbody>
 *       {importResult.pieces.map((part) => (
 *         <ExtractedPartRow key={part.temp_id} part={part} />
 *       ))}
 *     </tbody>
 *   </table>
 *
 * Pour une modal d'inspection grand format au clic sur une ligne, réutilisez
 * ContourThumbnail avec un size plus grand (ex: 400) dans votre composant
 * Modal.tsx existant, en y ajoutant les métriques OBB et la liste complète
 * des usinages (déjà couverte par MachiningFeaturesList en mode "expanded"
 * forcé).
 */
