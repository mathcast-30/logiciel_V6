"""
Boundary containment constraint.

Ensures pieces are fully contained within the board working area.

⚠️ Uses exact polygon containment - no bounding box approximations.
"""

from dataclasses import dataclass
from typing import Tuple
from shapely.geometry import Polygon

from ..domain.piece import RawPiece
from ..domain.board import RawBoard


@dataclass
class BoundaryConstraint:
    """
    Validates that pieces are fully within board boundary.
    
    The check is against the working area (boundary - defects - margins).
    """
    
    def is_satisfied(
        self, 
        piece_polygon: Polygon, 
        working_area: Polygon
    ) -> bool:
        """
        Check if piece is fully within working area.
        
        Args:
            piece_polygon: The piece polygon at its placed position
            working_area: The board's working area (from board.get_working_area())
            
        Returns:
            True if piece is fully contained
        """
        return working_area.contains(piece_polygon)
    
    def check_placement(
        self, 
        piece: RawPiece, 
        board: RawBoard,
        position: Tuple[float, float]
    ) -> Tuple[bool, str]:
        """
        Check if placing piece at position is within boundary.
        
        Args:
            piece: The piece to place
            board: The target board  
            position: (x, y) placement position
            
        Returns:
            (is_valid, reason_if_invalid)
        """
        # Get working area
        try:
            working_area = board.get_working_area()
        except ValueError as e:
            return False, f"Board {board.id} has no usable working area: {e}"
        
        # Translate piece to position
        placed_piece = piece.at_origin().translated(position[0], position[1])
        
        if not working_area.contains(placed_piece.polygon):
            # Calculate how much is outside
            outside = placed_piece.polygon.difference(working_area)
            if outside.area > 0:
                return False, (
                    f"Piece {piece.id} extends outside working area by {outside.area:.1f}mm²"
                )
            else:
                # Touching boundary is ok, just not fully contained
                # This shouldn't happen if contains() returned False, but be safe
                return False, f"Piece {piece.id} not fully within working area"
        
        return True, ""
    
    def get_containment_ratio(
        self,
        piece_polygon: Polygon,
        working_area: Polygon
    ) -> float:
        """
        Calculate what fraction of piece is within working area.
        
        Useful for debugging near-miss placements.
        
        Args:
            piece_polygon: The piece polygon
            working_area: The working area polygon
            
        Returns:
            Ratio (0-1) of piece area that is within working area
        """
        if piece_polygon.area == 0:
            return 0.0
        
        intersection = piece_polygon.intersection(working_area)
        return intersection.area / piece_polygon.area
    
    def __repr__(self) -> str:
        return "BoundaryConstraint(exact_containment)"
