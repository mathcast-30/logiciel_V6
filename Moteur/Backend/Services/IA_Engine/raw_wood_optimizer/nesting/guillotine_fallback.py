"""
Fallback nesting strategy using Guillotine algorithm.

Used when NFP (C++) is not available to guarantee no overlaps.

✅ CORRECTIONS (régression post-modification):
- Bug "25 to 6" : suppression du filtre `abs_x < 0 or abs_y < 0` qui abandonnait
  des pièces valides sans logger d'erreur.
- Mapping RawPiece→Piece : le champ s'appelle `name` (pas `piece_name`) dans optimizer_core.Piece.
- `except:` vides remplacés par `except Exception as e: logger.warning(...)`.
- Coordonnées (x, y, rotation) forcées en float pour éviter les erreurs de sérialisation JSON.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from shapely.geometry import Polygon
import logging

from .base import NestingStrategy, NestingResult, PlacementResult
from ..domain.piece import RawPiece
from ..domain.board import RawBoard

# We need to import core types from the main IA_Engine
from ...optimizer_core import Piece, Panel, SplitStrategy
from ...advanced_optimizer import GuillotineStrategy

logger = logging.getLogger(__name__)


@dataclass
class GuillotineFallbackStrategy(NestingStrategy):
    """
    Fallback nesting algorithm using standard Guillotine algorithm.
    Guarantees no overlaps and valid bounding boxes.
    
    Activated automatically when libnfporb C++ is not available.
    """
    
    position_resolution: float = 5.0
    ignore_grain_direction: bool = False
    kerf: float = 3.0
    
    def name(self) -> str:
        return "Guillotine (Fallback)"
        
    def nest(
        self,
        pieces: List[RawPiece],
        boards: List[RawBoard]
    ) -> NestingResult:
        result = NestingResult()
        
        logger.info(
            f"[GuillotineFallback] Démarrage avec {len(pieces)} pièces "
            f"sur {len(boards)} planches."
        )
        
        # ── 1. Convertir RawPiece → Piece (optimizer_core) ──────────────────
        # ⚠️  Le champ dans optimizer_core.Piece s'appelle `name`, pas `piece_name`.
        core_pieces: List[Piece] = []
        for p in pieces:
            try:
                grain_dir = (
                    p.grain_vector.direction
                    if not self.ignore_grain_direction
                    else 0
                )
                core_pieces.append(Piece(
                    id=p.id,
                    name=p.name or f"Piece {p.id}",   # ← champ correct
                    width=float(p.width),
                    height=float(p.height),
                    allow_rotation=True,
                    grain_direction=grain_dir,
                    project_id=p.project_id,
                    project_name=p.project_name
                ))
            except Exception as e:
                logger.warning(
                    f"[GuillotineFallback] Erreur conversion pièce {p.id}: {e}. "
                    f"Pièce ignorée."
                )
                result.unplaced_pieces.append(p)

        # ── 2. Convertir RawBoard → Panel (optimizer_core) ──────────────────
        core_panels: List[Panel] = []
        board_offsets: dict = {}  # board_id -> (minx, miny)

        for b in boards:
            try:
                wa = b.get_working_area()
                minx, miny, maxx, maxy = wa.bounds
                w = float(maxx - minx)
                h = float(maxy - miny)
            except Exception as e:
                logger.warning(
                    f"[GuillotineFallback] get_working_area() failed pour board {b.id}: {e}. "
                    f"Utilisation des bounds bruts."
                )
                bounds = b.boundary.bounds
                minx, miny = float(bounds[0]), float(bounds[1])
                w = float(bounds[2] - bounds[0])
                h = float(bounds[3] - bounds[1])

            board_offsets[b.id] = (float(minx), float(miny))

            grain_dir = (
                b.grain_vector.direction
                if not self.ignore_grain_direction
                else 1
            )
            core_panels.append(Panel(
                id=b.id,
                width=w,
                height=h,
                grain_direction=grain_dir
            ))

        # ── 3. Exécuter l'algorithme Guillotine ──────────────────────────────
        try:
            guillotine = GuillotineStrategy(SplitStrategy.ADAPTIVE)
            used_panels = guillotine.optimize(
                pieces=core_pieces,
                panels=core_panels,
                kerf=self.kerf,
                grain_strict=not self.ignore_grain_direction
            )
        except Exception as e:
            logger.error(
                f"[GuillotineFallback] Erreur fatale dans GuillotineStrategy.optimize: {e}"
            )
            # Toutes les pièces sont non-placées
            result.unplaced_pieces.extend(pieces)
            result.metrics = {
                "algorithm": self.name(),
                "error": str(e),
                "pieces_placed": 0,
                "pieces_unplaced": len(pieces),
            }
            return result
        
        # ── 4. Convertir les placements Guillotine → PlacementResult ─────────
        placed_piece_ids: set = set()
        boards_used: set = set()
        
        for panel in used_panels:
            # Récupérer l'offset de la working area pour ce board
            b_minx, b_miny = board_offsets.get(panel.id, (0.0, 0.0))
                    
            for plc in panel.placements:
                # ── Coordonnées absolues (forced float) ──
                abs_x = float(b_minx) + float(plc.x)
                abs_y = float(b_miny) + float(plc.y)
                plc_w = float(plc.width)
                plc_h = float(plc.height)
                rotation = 90.0 if plc.rotated else 0.0

                # ⚠️  ANCIEN FILTRE RETIRÉ : `if abs_x < 0 or abs_y < 0: continue`
                # Ce filtre abandonnait silencieusement des pièces parfaitement valides
                # lorsque l'offset de la working area n'était pas encore soustrait.
                # On clamp à 0 si nécessaire (floating-point edge case) mais on ne rejette pas.
                if abs_x < -0.01 or abs_y < -0.01:
                    logger.warning(
                        f"[GuillotineFallback] Pièce {plc.piece_id} ({plc.piece_name}) "
                        f"a des coordonnées négatives ({abs_x:.2f}, {abs_y:.2f}). "
                        f"Clamp à 0 appliqué."
                    )
                    abs_x = max(0.0, abs_x)
                    abs_y = max(0.0, abs_y)

                # ── Construction du polygone placé ──
                placed_poly = Polygon([
                    (abs_x,          abs_y),
                    (abs_x + plc_w,  abs_y),
                    (abs_x + plc_w,  abs_y + plc_h),
                    (abs_x,          abs_y + plc_h)
                ])
                
                # ── Récupération du nom de la pièce (optimizer_core.Placement.piece_name) ──
                piece_name = getattr(plc, "piece_name", None) or f"Piece {plc.piece_id}"

                placement = PlacementResult(
                    piece_id=int(plc.piece_id),
                    board_id=int(panel.id),
                    position=(abs_x, abs_y),
                    rotation=rotation,
                    polygon=placed_poly,
                    success=True,
                    piece_name=piece_name,
                    project_id=getattr(plc, "project_id", None),
                    project_name=getattr(plc, "project_name", None)
                )
                result.placements.append(placement)
                placed_piece_ids.add(plc.piece_id)
                boards_used.add(panel.id)
                
        # ── 5. Pièces non-placées ────────────────────────────────────────────
        for p in pieces:
            if p.id not in placed_piece_ids:
                result.unplaced_pieces.append(p)
                logger.warning(
                    f"[GuillotineFallback] Pièce {p.id} ({p.name or 'sans nom'}) "
                    f"non-placée par le fallback Guillotine."
                )
                
        result.boards_used = list(boards_used)
        
        # ── 6. Métriques ─────────────────────────────────────────────────────
        total_piece_area = sum(
            p.area for p in pieces if p.id in placed_piece_ids
        )
        used_board_area = sum(
            b.total_area for b in boards if b.id in boards_used
        )
        efficiency = total_piece_area / used_board_area if used_board_area > 0 else 0.0
        
        result.metrics = {
            "algorithm": self.name(),
            "pieces_placed": len(result.placements),
            "pieces_unplaced": len(result.unplaced_pieces),
            "boards_used": len(result.boards_used),
            "total_piece_area_mm2": float(total_piece_area),
            "used_board_area_mm2": float(used_board_area),
            "efficiency": float(efficiency),
            "engine": "guillotine_fallback"
        }
        
        # ── Log de synthèse ──────────────────────────────────────────────────
        logger.info(
            f"[GuillotineFallback] Résultat : {len(result.placements)}/{len(pieces)} pièces "
            f"placées sur {len(result.boards_used)} planche(s). "
            f"Efficacité : {efficiency:.1%}."
        )
        
        return result
