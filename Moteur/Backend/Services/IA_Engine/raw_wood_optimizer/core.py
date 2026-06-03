"""
RawWoodOptimizer - Main Entry Point (Facade).

This is the single entry point for the raw wood optimization extension.
It orchestrates all components: geometry, constraints, NFP, and nesting.

⚠️ RULES:
- NFP uses libnfporb C++ when available, bounding-box fallback otherwise
- All pieces are Polygons (no rectangle-specific logic)
- Grain alignment is 100% enforced
- Species margins are applied
- Offcuts are produced explicitly
- PanelOptimizer remains UNCHANGED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
import os
import sys
import logging

# Shapely DLL fix for Windows in specific environments
if sys.platform == 'win32':
    dll_path = r"C:\Users\Mathe\anaconda3\envs\opticut_pro\Library\bin"
    if os.path.exists(dll_path):
        try:
            os.add_dll_directory(dll_path)
        except Exception as e:
            print(f"Warning: Could not add DLL directory {dll_path}: {e}")

try:
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    HAS_SHAPELY = True
except (ImportError, OSError) as e:
    logging.getLogger(__name__).warning(f"Shapely not found or failed to load: {e}. Using Mock objects.")
    HAS_SHAPELY = False
    
    # Simple Mock for Shapely objects to prevent total crash
    class MockPolygon:
        def __init__(self, *args, **kwargs):
            self.is_empty = True
            self.is_valid = False
            self.area = 0.0
            self.bounds = (0, 0, 0, 0)
        def buffer(self, *args, **kwargs): return self
        def difference(self, *args, **kwargs): return self
        def intersection(self, *args, **kwargs): return self
        def union(self, *args, **kwargs): return self
        
    Polygon = MockPolygon
    def unary_union(geoms): return MockPolygon()

import logging
import time

from .domain import RawBoard, RawPiece, WoodSpecies, GrainVector, SPECIES_MARGINS
from .constraints import GrainConstraint, DefectConstraint, BoundaryConstraint
from .nesting import NestingStrategy, NextFitStrategy, BestFitStrategy, PlacementResult, NestingResult
from .nesting.guillotine_fallback import GuillotineFallbackStrategy
from .nfp import NFPGenerator, NFPCache, NFPError, NFPUnavailableError
from .output import Placement, BoardResult, Offcut, OffcutCollection

logger = logging.getLogger(__name__)


class NestingAlgorithm(str, Enum):
    """Available nesting algorithms."""
    NEXT_FIT = "next_fit"
    BEST_FIT = "best_fit"


class RawWoodOptimizerError(Exception):
    """Base exception for raw wood optimizer."""
    pass


class NFPRequiredError(RawWoodOptimizerError):
    """Raised when NFP is required but unavailable."""
    pass


class GrainAlignmentError(RawWoodOptimizerError):
    """Raised when grain alignment cannot be satisfied."""
    pass


class PlacementError(RawWoodOptimizerError):
    """Raised when a piece cannot be placed."""
    pass


@dataclass
class RawWoodOptimizer:
    """
    Main optimizer for raw wood (bois massif).
    
    Handles:
    - Irregular polygonal pieces and boards
    - Defect avoidance (knots, cracks, sapwood)
    - Grain direction alignment
    - Species-specific margins
    - NFP-based collision detection
    
    Usage:
        optimizer = RawWoodOptimizer()
        result = optimizer.optimize(pieces, boards)
    """
    
    # Algorithm parameters
    algorithm: NestingAlgorithm = NestingAlgorithm.BEST_FIT
    position_resolution: float = 2.0   # mm - résolution fine pour serrer les pièces
    min_offcut_dimension: float = 100.0  # mm
    safety_margin: float = 5.0  # mm - marge sur les bords de planche
    kerf: float = 3.0           # mm - trait de scie entre deux pièces
    ignore_grain_direction: bool = True # Allowed fallback
    allow_transverse_orientation: bool = False  # Si True, pièces placées en largeur aussi
    
    # NFP components (initialized on first use)
    _nfp_generator: Optional[NFPGenerator] = field(default=None, repr=False)
    _nfp_cache: Optional[NFPCache] = field(default=None, repr=False)
    
    def __post_init__(self):
        """Initialize NFP components."""
        self._nfp_generator = NFPGenerator()
        self._nfp_cache = NFPCache(max_size=500)
        
        # Verify NFP availability immediately
        self._verify_nfp_available()
    
    def _verify_nfp_available(self):
        """
        Check NFP computation availability.
        
        If libnfporb is not available, logs a warning but allows
        the optimizer to continue using the bounding-box fallback
        in NFPGenerator.compute_nfp.
        """
        if self._nfp_generator is not None and not self._nfp_generator.is_available():
            logger.warning(
                "libnfporb C++ library is not available. "
                "NFP calculations will use bounding-box fallback. "
                "Results may be less optimal than with exact NFP.\n"
                "To improve: install libnfporb with pybind11 bindings."
            )
    
    def _get_strategy(self) -> NestingStrategy:
        """Get the configured nesting strategy."""
        # Use fallback if NFP is unavailable
        if self._nfp_generator is not None and not self._nfp_generator.is_available():
            logger.warning("Using Guillotine Fallback Strategy since libnfporb is unavailable.")
            return GuillotineFallbackStrategy(
                position_resolution=self.position_resolution,
                ignore_grain_direction=self.ignore_grain_direction,
                kerf=self.kerf
            )

        if self.algorithm == NestingAlgorithm.NEXT_FIT:
            return NextFitStrategy(
                nfp_generator=self._nfp_generator,
                nfp_cache=self._nfp_cache,
                position_resolution=self.position_resolution
            )
        else:
            return BestFitStrategy(
                nfp_generator=self._nfp_generator,
                nfp_cache=self._nfp_cache,
                position_resolution=self.position_resolution,
                min_offcut_dimension=self.min_offcut_dimension,
                safety_margin=self.safety_margin,
                kerf=self.kerf,
                ignore_grain_direction=self.ignore_grain_direction,
                allow_transverse_orientation=self.allow_transverse_orientation
            )
    
    def optimize(
        self,
        pieces: List[RawPiece],
        boards: List[RawBoard]
    ) -> Dict[str, Any]:
        """
        Run optimization.
        
        Args:
            pieces: Pieces to cut (as RawPiece objects)
            boards: Available stock boards (as RawBoard objects)
            
        Returns:
            Dictionary with optimization results (compatible with panel optimizer format)
            
        Raises:
            NFPRequiredError: If NFP not available
            GrainAlignmentError: If grain alignment impossible
            PlacementError: If placement fails
        """
        start_time = time.time()
        
        # Verify NFP and inputs
        self._verify_nfp_available()
        self._validate_inputs(pieces, boards)
        
        # Pre-check grain compatibility
        self._verify_grain_compatibility(pieces, boards)
        
        # DEBUG SIZES - Commented out to avoid slowing down execution in production
        # print("\n--- DEBUG OPTIMISATION MASSIF ---")
        # print(f"PIÈCES ({len(pieces)}):")
        # for p in pieces:
        #     print(f"  - Piece {p.id}: {p.width:.1f}x{p.height:.1f} mm (Area: {p.area:.1f} mm²)")
        # 
        # print(f"PLANCHES ({len(boards)}):")
        # for b in boards:
        #     bounds = b.boundary.bounds
        #     bw = bounds[2] - bounds[0]
        #     bh = bounds[3] - bounds[1]
        #     print(f"  - Board {b.id}: {bw:.1f}x{bh:.1f} mm (Usable Area: {b.usable_area:.1f} mm²)")
        # print("---------------------------------\n")

        # Run nesting
        strategy = self._get_strategy()
        
        # Pass parameters to strategy if not already done via factory
        if hasattr(strategy, 'ignore_grain_direction'):
            strategy.ignore_grain_direction = self.ignore_grain_direction
            
        logger.info(f"Running {strategy.name()} nesting with {len(pieces)} pieces on {len(boards)} boards")
        
        nesting_result = strategy.nest(pieces, boards)
        
        # Validation post-calcul: chevauchements et dépassements
        self._validate_placements(nesting_result, boards)
        
        # Check for unplaced pieces
        if not nesting_result.success:
            unplaced_ids = [p.id for p in nesting_result.unplaced_pieces]
            logger.error(f"Could not place pieces: {unplaced_ids}")
            # Don't raise - return partial result
        
        # Convert to output format
        result = self._build_output(nesting_result, boards, pieces)
        
        # Indicate if fallback was used
        if isinstance(strategy, GuillotineFallbackStrategy):
            result["fallback_used"] = True
            placed_pieces = result.get("pieces_placed", 0)
            logger.info(f"Fallback réussi : {placed_pieces} pièces traitées")
        
        # Add timing
        elapsed_ms = (time.time() - start_time) * 1000
        result["metrics"]["execution_time_ms"] = round(elapsed_ms, 2)
        
        # Log métier explicite
        used_panels_count = result["panels_used"]
        preserved_panels = len(boards) - used_panels_count
        logger.info(
            f"Usage : {used_panels_count} planches consommées, "
            f"{preserved_panels} planches préservées dans le stock."
        )
        
        logger.info(
            f"Optimization complete: {nesting_result.placement_rate:.1%} placed, "
            f"{elapsed_ms:.0f}ms"
        )
        
        return result
    
    def _validate_inputs(self, pieces: List[RawPiece], boards: List[RawBoard]):
        """Validate input data."""
        if not pieces:
            raise RawWoodOptimizerError("No pieces to optimize")
        
        if not boards:
            raise RawWoodOptimizerError("No boards available")
        
        for piece in pieces:
            if piece.polygon.is_empty:
                raise RawWoodOptimizerError(f"Piece {piece.id} has empty polygon")
            if not piece.polygon.is_valid:
                raise RawWoodOptimizerError(f"Piece {piece.id} has invalid polygon")
        
        for board in boards:
            if board.boundary.is_empty:
                raise RawWoodOptimizerError(f"Board {board.id} has empty boundary")

        # 2. Check if pieces *can* fit in at least one board (raw dimensions)
        for piece in pieces:
            fits_somewhere = False
            p_w, p_h = piece.width, piece.height
            p_min = min(p_w, p_h)
            p_max = max(p_w, p_h)

            for board in boards:
                try:
                    # Get working area bounds
                    wa = board.get_working_area()
                    minx, miny, maxx, maxy = wa.bounds
                    wa_w = maxx - minx
                    wa_h = maxy - miny
                    wa_min = min(wa_w, wa_h)
                    wa_max = max(wa_w, wa_h)

                    # Rough estimate: can the piece's smaller dimension fit in the board's smaller dimension,
                    # AND the piece's larger dimension fit in the board's larger dimension?
                    if p_min <= wa_min and p_max <= wa_max:
                        fits_somewhere = True
                        break
                except ValueError:
                    continue
            
            if not fits_somewhere:
                logger.error(
                    f"Could not place piece {piece.id}: Piece {p_w:.0f}x{p_h:.0f} exceeds all board dimensions."
                )

    def _verify_grain_compatibility(self, pieces: List[RawPiece], boards: List[RawBoard]):
        """
        Pre-check that grain alignment is possible.
        
        Raises warning if any piece has no compatible board.
        """
        grain_constraint = GrainConstraint()
        
        for piece in pieces:
            has_compatible = False
            for board in boards:
                valid_rotations = grain_constraint.get_valid_rotations(
                    piece, board, ignore_grain_direction=self.ignore_grain_direction
                )
                if valid_rotations:
                    has_compatible = True
                    break
            
            # Note: GrainConstraint now handles logging of alignment failures once per piece
            # to avoid log spam while providing detailed board contexts.
            pass

    def _validate_placements(self, nesting_result: NestingResult, boards: List[RawBoard]):
        """Verify placements don't overlap and stay within boards. Move invalid ones to unplaced."""
        valid_placements = []
        rejected_placements = []

        for p in nesting_result.placements:
            board = next((b for b in boards if b.id == p.board_id), None)
            if not board:
                logger.warning(f"Piece {p.piece_id}: referenced board {p.board_id} not found. Rejecting.")
                rejected_placements.append(p)
                continue
                
            # Check bounds (working area if possible)
            try:
                wa = board.get_working_area()
            except ValueError:
                wa = board.boundary
                
            if not wa.contains(p.polygon) and not wa.covers(p.polygon):
                # Try intersection area to allow tiny floating point errors (< 1mm²)
                intersection = wa.intersection(p.polygon)
                if p.polygon.area - intersection.area > 1.0:
                    logger.warning(f"Piece {p.piece_id} exceeds board {board.id} bounds. Rejecting.")
                    rejected_placements.append(p)
                    continue
                    
            # Check overlap with already validated pieces on same board
            board_placements = [vp for vp in valid_placements if vp.board_id == board.id]
            is_overlapping = False
            for vp in board_placements:
                try:
                    inter = vp.polygon.intersection(p.polygon)
                    if inter.area > 1.0:  # Allow 1mm² tolerance
                        is_overlapping = True
                        break
                except Exception as e:
                    logger.warning(f"Intersection check failed for piece {p.piece_id}: {e}")
                    
            if is_overlapping:
                logger.warning(f"Piece {p.piece_id} overlaps another piece on board {board.id}. Rejecting.")
                rejected_placements.append(p)
            else:
                valid_placements.append(p)
                
        # Update placements list to only contain validated ones
        nesting_result.placements = valid_placements
        
        # ✅ FIX: `nesting_result.success` est une @property calculée (read-only).
        # On ne peut PAS l'assigner directement → AttributeError: can't set attribute.
        # À la place, on re-synchronise `unplaced_pieces` pour que la property
        # retourne la bonne valeur lors de sa prochaine évaluation.
        rejected_ids_already_unplaced = {up.id for up in nesting_result.unplaced_pieces}
        for rp in rejected_placements:
            if rp.piece_id not in rejected_ids_already_unplaced:
                # Créer un stub RawPiece minimal pour signaler la pièce comme non-placée
                # RawPiece et GrainVector sont déjà importés au niveau module.
                try:
                    from shapely.geometry import box as shapely_box
                    stub_poly = shapely_box(0, 0, 1, 1)  # placeholder polygon
                except Exception:
                    stub_poly = Polygon([(0, 0), (1, 0), (1, 1), (0, 1)])
                stub_piece = RawPiece(
                    id=rp.piece_id,
                    polygon=stub_poly,
                    grain_vector=GrainVector.horizontal(),
                    name=rp.piece_name or f"Piece {rp.piece_id}"
                )
                nesting_result.unplaced_pieces.append(stub_piece)
                rejected_ids_already_unplaced.add(rp.piece_id)
                logger.warning(
                    f"Pièce {rp.piece_id} rejetée lors de la validation des placements "
                    f"et réinjectée dans unplaced_pieces."
                )
        
        # `nesting_result.success` se calcule automatiquement via la @property:
        # return len(self.unplaced_pieces) == 0 — pas besoin d'assignation.
        if rejected_placements:
            logger.info(
                f"Validation: {len(valid_placements)} placements valides, "
                f"{len(rejected_placements)} rejetés."
            )

    def _build_output(
        self,
        nesting_result: NestingResult,
        boards: List[RawBoard],
        pieces: List[RawPiece]
    ) -> Dict[str, Any]:
        """Build the output dictionary in panel optimizer compatible format."""
        
        # Group placements by board
        placements_by_board: Dict[int, List[PlacementResult]] = {}
        for placement in nesting_result.placements:
            if placement.board_id not in placements_by_board:
                placements_by_board[placement.board_id] = []
            placements_by_board[placement.board_id].append(placement)
        
        # Build board results
        panels = []
        all_offcuts = OffcutCollection()
        total_used_area = 0
        total_board_area = 0
        
        for board_id in nesting_result.boards_used:
            board = next((b for b in boards if b.id == board_id), None)
            if not board:
                continue
            
            board_placements = placements_by_board.get(board_id, [])
            
            # Origin of the board to translate placement back to local space
            board_bounds = board.boundary.bounds
            board_origin_x, board_origin_y = board_bounds[0], board_bounds[1]

            # Convert placements
            output_placements = []
            for p in board_placements:
                # Récupération de la marge pour ajuster les coordonnées visuelles de l'image
                margin = getattr(board, 'margin', 0.0)
                
                # TRANSLATION DU POLYGONE EN COORDONNÉES LOCALES
                # Le SVG Frontend attend des coordonnées par rapport au coin de la planche (0,0)
                from shapely.affinity import translate
                local_polygon = translate(p.polygon, xoff=-board_origin_x, yoff=-board_origin_y)
                
                output_placements.append(Placement.from_polygon(
                    piece_id=p.piece_id,
                    piece_name=p.piece_name or f"Piece {p.piece_id}",
                    polygon=local_polygon,
                    margin_offset=0.0, # Margin is inherently in the local coords if fallback did its job
                    rotated=p.rotation != 0,
                    rotation_degrees=p.rotation,
                    project_id=p.project_id,
                    project_name=p.project_name
                ))
            
            # Calculate offcuts
            board_offcuts = self._calculate_offcuts(board, board_placements)
            for offcut in board_offcuts:
                all_offcuts.offcuts.append(offcut)
            
            # Build board result
            bounds = board.boundary.bounds
            
            # Extract boundary and defect coords
            board_poly_coords = list(board.boundary.exterior.coords) if hasattr(board.boundary, 'exterior') else []
            defect_coords_list = [
                list(d.exterior.coords) if hasattr(d, 'exterior') else []
                for d in board.defects
            ]
            
            board_result = BoardResult(
                board_id=board.id,
                width=bounds[2] - bounds[0],
                height=bounds[3] - bounds[1],
                is_offcut=False,
                species=board.species.value,
                placements=output_placements,
                offcuts=[o.to_dict() for o in board_offcuts],
                polygon_coords=board_poly_coords,
                defects=defect_coords_list
            )
            board_result.calculate_metrics()
            
            panels.append(board_result.to_dict())
            total_used_area += board_result.used_area
            total_board_area += board_result.total_area
        
        # Calculate overall metrics
        waste_percentage = (
            (1 - total_used_area / total_board_area) * 100
            if total_board_area > 0 else 0
        )
        
        # Filter out completely empty boards for the output JSON
        filtered_panels = [p for p in panels if p["placements"]]
        panels_used = len(filtered_panels)
        
        # Succès = toutes les pièces ont été placées, même si des planches restent vides
        success = len(nesting_result.unplaced_pieces) == 0

        return {
            "success": success,
            "panels_used": panels_used,
            "total_pieces": len(pieces),
            "pieces_placed": len(nesting_result.placements),
            "pieces_remaining": len(nesting_result.unplaced_pieces),
            "waste_percentage": round(waste_percentage, 2),
            "panels": filtered_panels,
            "remaining_pieces": [
                {"id": p.id, "name": p.name or f"Piece {p.id}"}
                for p in nesting_result.unplaced_pieces
            ],
            "usable_offcuts": all_offcuts.reusable_count,
            "offcut_summary": all_offcuts.to_summary(),
            "metrics": {
                **nesting_result.metrics,
                "total_used_area_mm2": total_used_area,
                "total_board_area_mm2": total_board_area,
            },
            "algorithm": self.algorithm.value,
            "optimizer_type": "raw_wood"
        }
    
    def _calculate_offcuts(
        self,
        board: RawBoard,
        placements: List[PlacementResult]
    ) -> List[Offcut]:
        """
        Calculate offcuts from remaining space.
        
        Offcuts are exact polygons, not rectangles.
        """
        if not placements:
            return []
        
        # Start with working area
        try:
            remaining = board.get_working_area()
        except ValueError:
            return []
        
        # Subtract all placed pieces
        for p in placements:
            remaining = remaining.difference(p.polygon.buffer(0.5))
        
        if remaining.is_empty:
            return []
        
        # Handle MultiPolygon case
        from shapely.geometry import MultiPolygon
        
        offcuts = []
        
        if isinstance(remaining, MultiPolygon):
            polygons = list(remaining.geoms)
        elif isinstance(remaining, Polygon):
            polygons = [remaining]
        else:
            return []
        
        for poly in polygons:
            if poly.is_empty or poly.area < 100:  # Skip tiny fragments
                continue
            
            offcut = Offcut.from_polygon(
                polygon=poly,
                board_id=board.id,
                min_dimension=self.min_offcut_dimension,
                species=board.species.value
            )
            offcuts.append(offcut)
        
        return offcuts
    
    # Factory methods for convenience
    @classmethod
    def from_rectangles(
        cls,
        piece_data: List[Dict[str, Any]],
        board_data: List[Dict[str, Any]],
        algorithm: NestingAlgorithm = NestingAlgorithm.BEST_FIT
    ) -> Tuple["RawWoodOptimizer", List[RawPiece], List[RawBoard]]:
        """
        Factory to create optimizer and convert rectangular data.
        
        Convenience method for typical workshop data where pieces
        and boards are specified as rectangles.
        
        Args:
            piece_data: List of dicts with {id, width, height, grain_direction, ...}
            board_data: List of dicts with {id, width, height, species, grain_direction, defects, ...}
            algorithm: Which algorithm to use
            
        Returns:
            (optimizer, pieces, boards) tuple
        """
        pieces = []
        for p in piece_data:
            grain = GrainVector.horizontal() if p.get("grain_direction", 1) == 1 else GrainVector.vertical()
            piece = RawPiece.from_rectangle(
                id=p["id"],
                width=p["width"],
                height=p["height"],
                grain_vector=grain,
                name=p.get("name"),
                project_id=p.get("project_id"),
                project_name=p.get("project_name")
            )
            pieces.append(piece)
        
        boards = []
        for b in board_data:
            grain = GrainVector.horizontal() if b.get("grain_direction", 1) == 1 else GrainVector.vertical()
            species = WoodSpecies(b.get("species", "chene"))
            
            # Parse defects if any
            defects = []
            for d in b.get("defects", []):
                if "polygon" in d:
                    defects.append(Polygon(d["polygon"]))
                elif "x" in d and "y" in d and "width" in d and "height" in d:
                    defects.append(Polygon([
                        (d["x"], d["y"]),
                        (d["x"] + d["width"], d["y"]),
                        (d["x"] + d["width"], d["y"] + d["height"]),
                        (d["x"], d["y"] + d["height"])
                    ]))
            
            board = RawBoard.from_rectangle(
                id=b["id"],
                width=b["width"],
                height=b["height"],
                grain_vector=grain,
                species=species,
                defects=defects,
                label=b.get("label")
            )
            boards.append(board)
        
        optimizer = cls(algorithm=algorithm)
        return optimizer, pieces, boards
