from __future__ import annotations
"""
Best-Fit nesting strategy via Hybrid C++/Python Engine.

Uses C++ Pybind11 extension for spatial sweeping and AABB collision.
Falls back to Python if C++ is unavailable.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Any
from shapely.geometry import Polygon
import logging

from .base import NestingStrategy, NestingResult, PlacementResult
from ..domain.piece import RawPiece
from ..domain.board import RawBoard
from ..constraints import GrainConstraint, DefectConstraint, BoundaryConstraint
from ..bridge_cpp import solve_placement

logger = logging.getLogger(__name__)


@dataclass
class BestFitStrategy(NestingStrategy):
    """
    Best-Fit nesting algorithm using hybrid C++ engine.
    """
    
    # Constraints
    grain_constraint: GrainConstraint = field(default_factory=GrainConstraint)
    defect_constraint: DefectConstraint = field(default_factory=DefectConstraint)
    boundary_constraint: BoundaryConstraint = field(default_factory=BoundaryConstraint)
    
    # NFP components (Kept for backwards compatibility but unused)
    nfp_generator: Any = field(default=None)
    nfp_cache: Any = field(default=None)
    
    # Algorithm parameters
    position_resolution: float = 1.0    # mm (high precision via C++)
    min_offcut_dimension: float = 100.0  # mm
    safety_margin: float = 5.0  # mm
    kerf: float = 3.0           # mm
    ignore_grain_direction: bool = False
    allow_transverse_orientation: bool = False
    
    # Scoring weights (Unused by C++, kept for backwards compat)
    weight_utilization: float = 0.4
    weight_compactness: float = 0.3
    weight_offcut_quality: float = 0.3
    
    def name(self) -> str:
        return "BestFit (Hybrid C++)"
    
    def nest(
        self,
        pieces: List[RawPiece],
        boards: List[RawBoard]
    ) -> NestingResult:
        result = NestingResult()
        
        # 1. Sort pieces: largest surface first, then longest dimension
        sorted_pieces = sorted(pieces.copy(), key=lambda p: (p.area, max(p.width, p.height)), reverse=True)
        
        # 2. Extract piece data
        pieces_data = []
        for p in sorted_pieces:
            pieces_data.append({
                "id": p.id,
                "width": p.width,
                "height": p.height
            })
            
        # 3. Extract board data and defects
        boards_data = []
        for b in boards:
            try:
                wa = b.get_working_area()
                if wa.is_empty:
                    continue
                minx, miny, maxx, maxy = wa.bounds
                
                # defects are mapped as simple rectangles
                defects_data = []
                for d in b.defects:
                    d_minx, d_miny, d_maxx, d_maxy = d.bounds
                    defects_data.append({
                        "x": d_minx,
                        "y": d_miny,
                        "w": d_maxx - d_minx,
                        "h": d_maxy - d_miny
                    })
                    
                boards_data.append({
                    "id": b.id,
                    "minx": minx,
                    "miny": miny,
                    "maxx": maxx,
                    "maxy": maxy,
                    "defects": defects_data
                })
            except ValueError:
                pass
                
        # 4. Call native engine / fallback
        placements_data = solve_placement(
            pieces_data=pieces_data,
            boards_data=boards_data,
            kerf=self.kerf,
            allow_transverse=self.allow_transverse_orientation,
            resolution=self.position_resolution
        )
        
        # 5. Reconstruct PlacementResult objects
        pieces_dict = {p.id: p for p in pieces}
        placed_piece_ids = set()
        boards_used = set()
        
        total_piece_area = 0.0
        
        for r in placements_data:
            piece_id = r["piece_id"]
            piece = pieces_dict[piece_id]
            
            # The piece polygon is reconstructed
            x, y, w, h = r["x"], r["y"], r["w"], r["h"]
            placed_poly = Polygon([
                (x, y),
                (x + w, y),
                (x + w, y + h),
                (x, y + h)
            ])
            
            rot_angle = 90.0 if r["rotated"] else 0.0
            
            placement = PlacementResult(
                piece_id=piece.id,
                board_id=r["board_id"],
                position=(x, y),
                rotation=rot_angle,
                polygon=placed_poly,
                success=True,
                piece_name=piece.name,
                project_id=piece.project_id,
                project_name=piece.project_name
            )
            result.placements.append(placement)
            placed_piece_ids.add(piece.id)
            boards_used.add(r["board_id"])
            total_piece_area += piece.area
            
        result.boards_used = list(boards_used)
        
        # 6. Metrics & Unplaced
        for p in pieces:
            if p.id not in placed_piece_ids:
                result.unplaced_pieces.append(p)
                logger.warning(f"Could not place piece {p.id}")
                
        used_board_area = sum(b.total_area for b in boards if b.id in boards_used)
        efficiency = total_piece_area / used_board_area if used_board_area > 0 else 0
        
        result.metrics = {
            "algorithm": self.name(),
            "pieces_placed": len(result.placements),
            "pieces_unplaced": len(result.unplaced_pieces),
            "boards_used": len(result.boards_used),
            "total_piece_area_mm2": total_piece_area,
            "used_board_area_mm2": used_board_area,
            "efficiency": efficiency,
            "engine": "hybrid_cpp"
        }
        
        return result
