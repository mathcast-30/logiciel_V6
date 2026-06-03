from __future__ import annotations
"""
Next-Fit nesting strategy.

Simple, fast, deterministic algorithm:
1. Sort pieces by area (largest first)
2. For each piece, try to place in current board
3. If fails, move to next board
4. Continue until all pieces placed or all boards exhausted

Uses NFP for collision detection between placed pieces.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union
import logging

from .base import NestingStrategy, NestingResult, PlacementResult
from ..domain.piece import RawPiece
from ..domain.board import RawBoard
from ..constraints import GrainConstraint, DefectConstraint, BoundaryConstraint
from ..nfp import NFPGenerator, NFPCache, NFPError

logger = logging.getLogger(__name__)


@dataclass
class NextFitStrategy(NestingStrategy):
    """
    Next-Fit nesting algorithm.
    
    Properties:
    - Deterministic
    - Fast (O(n*m) where n=pieces, m=boards)
    - Simple to understand and debug
    - Uses NFP for piece-piece collision
    """
    
    # Constraints
    grain_constraint: GrainConstraint = field(default_factory=GrainConstraint)
    defect_constraint: DefectConstraint = field(default_factory=DefectConstraint)
    boundary_constraint: BoundaryConstraint = field(default_factory=BoundaryConstraint)
    
    # NFP components
    nfp_generator: NFPGenerator = field(default_factory=NFPGenerator)
    nfp_cache: NFPCache = field(default_factory=NFPCache)
    
    # Algorithm parameters
    position_resolution: float = 5.0  # mm - grid resolution for position search
    ignore_grain_direction: bool = False
    
    def name(self) -> str:
        return "NextFit"
    
    def nest(
        self,
        pieces: List[RawPiece],
        boards: List[RawBoard]
    ) -> NestingResult:
        """
        Execute Next-Fit nesting.
        
        Args:
            pieces: Pieces to place
            boards: Available boards
            
        Returns:
            NestingResult
        """
        # Ensure NFP is available
        self.nfp_generator.ensure_available()
        
        result = NestingResult()
        sorted_pieces = self.sort_pieces(pieces.copy())
        sorted_boards = self.sort_boards(boards.copy())
        
        # Track placed pieces per board
        placed_per_board: dict[int, List[Polygon]] = {}
        
        for piece in sorted_pieces:
            placed = False
            
            for board in sorted_boards:
                placement = self._try_place_on_board(
                    piece, 
                    board, 
                    placed_per_board.get(board.id, [])
                )
                
                if placement is not None:
                    result.placements.append(placement)
                    
                    # Track placed polygon for NFP calculations
                    if board.id not in placed_per_board:
                        placed_per_board[board.id] = []
                    placed_per_board[board.id].append(placement.polygon)
                    
                    # Track board usage
                    if board.id not in result.boards_used:
                        result.boards_used.append(board.id)
                    
                    placed = True
                    break
            
            if not placed:
                result.unplaced_pieces.append(piece)
                
                # Identify why it failed
                reason = "No valid position found"
                # Quick check if it's grain vs size
                any_working = False
                for board in sorted_boards:
                    try:
                        wa = board.get_working_area()
                        if not wa.is_empty:
                            any_working = True
                            if not self.grain_constraint.get_valid_rotations(piece, board, self.ignore_grain_direction):
                                reason = "Grain alignment impossible on all boards"
                                break
                    except: continue
                
                if not any_working:
                    reason = "No working area left on any board"

                logger.warning(f"Could not place piece {piece.id}: {reason}")
        
        # Calculate metrics
        result.metrics = self._calculate_metrics(result, boards)
        
        return result
    
    def _try_place_on_board(
        self,
        piece: RawPiece,
        board: RawBoard,
        placed_polygons: List[Polygon]
    ) -> Optional[PlacementResult]:
        """
        Try to place piece on board.
        
        Args:
            piece: Piece to place
            board: Target board
            placed_polygons: Already placed pieces on this board
            
        Returns:
            PlacementResult if successful, None otherwise
        """
        # Get valid rotations for grain alignment
        valid_rotations = self.grain_constraint.get_valid_rotations(
            piece, board, self.ignore_grain_direction
        )
        
        if not valid_rotations:
            logger.debug(
                f"Piece {piece.id} has no valid rotations for board {board.id} grain"
            )
            return None
        
        # Get working area
        try:
            working_area = board.get_working_area()
        except ValueError as e:
            logger.debug(f"Board {board.id} has no working area: {e}")
            return None
        
        # Try each rotation
        for rotation in valid_rotations:
            rotated_piece = piece.rotated(rotation, force=self.ignore_grain_direction) if rotation != 0 else piece
            normalized = rotated_piece.at_origin()
            
            # Compute forbidden zone from placed pieces using NFP
            forbidden_zone = self._compute_forbidden_zone(
                normalized.polygon,
                placed_polygons
            )
            
            # Find valid positions
            valid_region = working_area
            if forbidden_zone is not None and not forbidden_zone.is_empty:
                valid_region = working_area.difference(forbidden_zone)
            
            if valid_region.is_empty:
                continue
            
            # Find a position in valid region
            position = self._find_position(normalized.polygon, valid_region, board.defects)
            
            if position is not None:
                # Create placed polygon
                placed_polygon = normalized.translated(position[0], position[1]).polygon
                
                return PlacementResult(
                    piece_id=piece.id,
                    board_id=board.id,
                    position=position,
                    rotation=rotation,
                    polygon=placed_polygon,
                    success=True,
                    piece_name=piece.name,
                    project_id=piece.project_id,
                    project_name=piece.project_name
                )
        
        return None
    
    def _compute_forbidden_zone(
        self,
        piece_polygon: Polygon,
        placed_polygons: List[Polygon]
    ) -> Optional[Polygon]:
        """
        Compute the forbidden zone using NFP.
        
        The forbidden zone is the union of all NFPs of placed pieces
        with respect to the piece being placed.
        
        Args:
            piece_polygon: Polygon of piece to place (at origin)
            placed_polygons: Already placed pieces
            
        Returns:
            Union of NFPs, or None if no placed pieces
        """
        if not placed_polygons:
            return None
        
        nfps = []
        
        for placed in placed_polygons:
            # Check cache first
            cached = self.nfp_cache.get(placed, piece_polygon)
            if cached is not None:
                nfps.append(cached)
                continue
            
            # Compute NFP
            try:
                nfp = self.nfp_generator.compute_nfp(placed, piece_polygon)
                self.nfp_cache.put(placed, piece_polygon, nfp)
                nfps.append(nfp)
            except NFPError as e:
                logger.error(f"NFP computation failed: {e}")
                raise  # No fallback - fail explicitly
        
        if not nfps:
            return None
        
        return unary_union(nfps)
    
    def _find_position(
        self,
        piece_polygon: Polygon,
        valid_region: Polygon,
        defects: List[Polygon]
    ) -> Optional[Tuple[float, float]]:
        """
        Find a valid position for piece in valid_region.
        
        Uses bottom-left heuristic: prefers positions with smaller x, then y.
        
        Args:
            piece_polygon: Piece at origin
            valid_region: Where piece reference point can go
            defects: Board defects to avoid
            
        Returns:
            (x, y) position or None if no valid position
        """
        if valid_region.is_empty:
            return None
        
        # Get bounds of valid region
        minx, miny, maxx, maxy = valid_region.bounds
        
        # Grid search with bottom-left bias
        best_position = None
        best_score = float('inf')
        
        x = minx
        while x <= maxx:
            y = miny
            while y <= maxy:
                if valid_region.contains(Point(x, y)):
                    # Check if placed piece avoids defects
                    placed = Polygon([
                        (x + px, y + py) 
                        for px, py in piece_polygon.exterior.coords
                    ])
                    
                    if self.defect_constraint.is_satisfied(placed, defects):
                        # Score: prefer bottom-left (smaller x, then y)
                        score = x + y * 0.001  # Strong preference for left
                        if score < best_score:
                            best_score = score
                            best_position = (x, y)
                
                y += self.position_resolution
            x += self.position_resolution
        
        return best_position
    
    def _calculate_metrics(
        self,
        result: NestingResult,
        boards: List[RawBoard]
    ) -> dict:
        """Calculate optimization metrics."""
        total_piece_area = sum(p.polygon.area for p in result.placements)
        
        used_board_area = 0
        for board_id in result.boards_used:
            board = next((b for b in boards if b.id == board_id), None)
            if board:
                used_board_area += board.total_area
        
        efficiency = total_piece_area / used_board_area if used_board_area > 0 else 0
        
        return {
            "algorithm": self.name(),
            "pieces_placed": len(result.placements),
            "pieces_unplaced": len(result.unplaced_pieces),
            "boards_used": len(result.boards_used),
            "total_piece_area_mm2": total_piece_area,
            "used_board_area_mm2": used_board_area,
            "efficiency": efficiency,
            "nfp_cache_stats": self.nfp_cache.stats()
        }
