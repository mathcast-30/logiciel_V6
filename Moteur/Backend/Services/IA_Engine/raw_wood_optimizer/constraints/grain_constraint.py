"""
Grain direction constraint.

Ensures piece grain aligns with board grain.
Rotation is ONLY allowed if it maintains grain alignment.

⚠️ No compromises on grain alignment.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Set, ClassVar

from ..domain.piece import RawPiece
from ..domain.board import RawBoard
from ..domain.grain import GrainVector


@dataclass
class GrainConstraint:
    """
    Validates grain alignment between piece and board.
    
    Rules:
    - Piece grain must align with board grain
    - Only 0° and 180° rotations preserve horizontal/vertical grain
    - Tolerance allows for minor manufacturing imprecision
    """
    
    tolerance_degrees: float = 2.0  # Allow 2° deviation for real-world tolerance
    _logged_pieces: ClassVar[Set[int]] = set()
    
    @classmethod
    def clear_logged_pieces(cls):
        """Clear the set of logged pieces."""
        cls._logged_pieces.clear()
    
    def is_satisfied(self, piece: RawPiece, board: RawBoard) -> bool:
        """
        Check if piece grain aligns with board grain.
        
        Args:
            piece: The piece to check
            board: The target board
            
        Returns:
            True if grain alignment is valid
        """
        return piece.grain_vector.is_aligned_with(
            board.grain_vector, 
            self.tolerance_degrees
        )
    
    def get_valid_rotations(
        self, 
        piece: RawPiece, 
        board: RawBoard,
        ignore_grain_direction: bool = False
    ) -> List[float]:
        """
        Get list of rotations that maintain grain alignment.
        
        Args:
            piece: The piece to rotate
            board: The target board
            
        Returns:
            List of valid rotation angles in degrees
        """
        valid = []
        
        for rotation in piece.allowed_rotations:
            # Calculate what grain vector would be after rotation
            rotated_grain = piece.grain_vector.rotated(rotation)
            
            if rotated_grain.is_aligned_with(board.grain_vector, self.tolerance_degrees):
                valid.append(rotation)
        
        if not valid:
            if not ignore_grain_direction:
                import logging
                if piece.id not in self._logged_pieces:
                    logging.getLogger(__name__).warning(
                        f"Piece {piece.id}: strict grain alignment failed on board {board.id}. "
                        "Maintaining original grain constraints."
                    )
                    self._logged_pieces.add(piece.id)
                return valid # Return empty or strict matches only if grain is NOT ignored
            
            # If grain IS ignored, we want to try orientations that might fit
            # Ensure at least 0 and 90 degrees are tested if the piece allows it
            # or force them if the piece geometry permits.
            fallback = list(set(piece.allowed_rotations))
            if 90.0 not in fallback:
                fallback.append(90.0)
            if 0.0 not in fallback:
                fallback.append(0.0)
                
            return sorted(fallback)
            
        return valid
    
    def check_with_rotation(
        self, 
        piece: RawPiece, 
        board: RawBoard, 
        rotation: float
    ) -> Tuple[bool, str]:
        """
        Check if a specific rotation maintains grain alignment.
        
        Args:
            piece: The piece
            board: The target board
            rotation: Proposed rotation in degrees
            
        Returns:
            (is_valid, reason_if_invalid)
        """
        if rotation not in piece.allowed_rotations:
            return False, f"Rotation {rotation}° not in allowed rotations {piece.allowed_rotations}"
        
        rotated_grain = piece.grain_vector.rotated(rotation)
        
        if not rotated_grain.is_aligned_with(board.grain_vector, self.tolerance_degrees):
            return False, (
                f"Grain misalignment: piece grain {rotated_grain.angle_degrees():.1f}° "
                f"does not align with board grain {board.grain_vector.angle_degrees():.1f}°"
            )
        
        return True, ""
    
    def __repr__(self) -> str:
        return f"GrainConstraint(tolerance={self.tolerance_degrees}°)"
