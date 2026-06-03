"""
Defect exclusion constraint.

Ensures pieces do not overlap with board defects (knots, cracks, sapwood, etc.).

⚠️ Uses exact geometric intersection - no approximations.
"""

from dataclasses import dataclass
from typing import List, Tuple
from shapely.geometry import Polygon

from ..domain.piece import RawPiece
from ..domain.board import RawBoard


@dataclass
class DefectConstraint:
    """
    Validates that piece placement avoids all defects.
    
    Uses exact polygon intersection - no bounding box approximations.
    """
    
    def is_satisfied(
        self, 
        piece_polygon: Polygon, 
        defects: List[Polygon]
    ) -> bool:
        """
        Check if piece polygon avoids all defects.
        
        Args:
            piece_polygon: The piece polygon at its placed position
            defects: List of defect polygons
            
        Returns:
            True if piece does not overlap any defect
        """
        for defect in defects:
            if piece_polygon.intersects(defect):
                # Check if it's just touching (ok) or overlapping (not ok)
                intersection = piece_polygon.intersection(defect)
                if intersection.area > 0:
                    return False
        
        return True
    
    def check_placement(
        self, 
        piece: RawPiece, 
        board: RawBoard,
        position: Tuple[float, float]
    ) -> Tuple[bool, str]:
        """
        Check if placing piece at position avoids defects.
        
        Args:
            piece: The piece to place
            board: The target board
            position: (x, y) placement position
            
        Returns:
            (is_valid, reason_if_invalid)
        """
        # Translate piece to position
        placed_piece = piece.at_origin().translated(position[0], position[1])
        
        for i, defect in enumerate(board.defects):
            if placed_piece.polygon.intersects(defect):
                intersection = placed_piece.polygon.intersection(defect)
                if intersection.area > 0:
                    return False, (
                        f"Piece {piece.id} overlaps defect {i} by {intersection.area:.1f}mm²"
                    )
        
        return True, ""
    
    def get_overlapping_defects(
        self,
        piece_polygon: Polygon,
        defects: List[Polygon]
    ) -> List[int]:
        """
        Get indices of defects that overlap with piece.
        
        Args:
            piece_polygon: The piece polygon
            defects: List of defect polygons
            
        Returns:
            List of defect indices that overlap
        """
        overlapping = []
        
        for i, defect in enumerate(defects):
            if piece_polygon.intersects(defect):
                intersection = piece_polygon.intersection(defect)
                if intersection.area > 0:
                    overlapping.append(i)
        
        return overlapping
    
    def __repr__(self) -> str:
        return "DefectConstraint(exact_intersection)"
