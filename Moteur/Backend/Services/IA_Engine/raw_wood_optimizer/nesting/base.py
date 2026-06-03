"""
Base classes for nesting strategies.

Defines the abstract interface that all nesting algorithms must implement.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Tuple, Dict, Any
from shapely.geometry import Polygon

from ..domain.piece import RawPiece
from ..domain.board import RawBoard


@dataclass
class PlacementResult:
    """
    Result of placing a single piece.
    
    Attributes:
        piece_id: ID of the placed piece
        board_id: ID of the board where piece was placed
        position: (x, y) placement position
        rotation: Applied rotation in degrees
        polygon: Final polygon at placed position
        success: Whether placement succeeded
        reason: Reason for failure if not successful
    """
    
    piece_id: int
    board_id: int
    position: Tuple[float, float]
    rotation: float
    polygon: Polygon
    success: bool
    reason: str = ""
    
    # Additional metadata
    piece_name: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None


@dataclass
class NestingResult:
    """
    Complete result of a nesting operation.
    
    Attributes:
        placements: List of successful placements
        unplaced_pieces: Pieces that could not be placed
        boards_used: List of board IDs used
        metrics: Performance and quality metrics
    """
    
    placements: List[PlacementResult] = field(default_factory=list)
    unplaced_pieces: List[RawPiece] = field(default_factory=list)
    boards_used: List[int] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def success(self) -> bool:
        """True if all pieces were placed."""
        return len(self.unplaced_pieces) == 0
    
    @property
    def placement_rate(self) -> float:
        """Fraction of pieces successfully placed."""
        total = len(self.placements) + len(self.unplaced_pieces)
        if total == 0:
            return 0.0
        return len(self.placements) / total


class NestingStrategy(ABC):
    """
    Abstract base class for nesting algorithms.
    
    All nesting strategies must implement the nest() method.
    Strategies are deterministic and reproducible.
    """
    
    ignore_grain_direction: bool = False

    @abstractmethod
    def nest(
        self,
        pieces: List[RawPiece],
        boards: List[RawBoard]
    ) -> NestingResult:
        """
        Place pieces on boards.
        
        Args:
            pieces: List of pieces to place (order may matter)
            boards: Available boards (in priority order)
            
        Returns:
            NestingResult with placements and unplaced pieces
        """
        pass
    
    @abstractmethod
    def name(self) -> str:
        """Return the strategy name for logging."""
        pass
    
    def sort_pieces(self, pieces: List[RawPiece]) -> List[RawPiece]:
        """
        Sort pieces for optimal packing.
        
        Default: largest area first (decreasing area heuristic).
        Subclasses may override with different strategies.
        
        Args:
            pieces: Pieces to sort
            
        Returns:
            Sorted pieces list
        """
        return sorted(pieces, key=lambda p: p.area, reverse=True)
    
    def sort_boards(self, boards: List[RawBoard]) -> List[RawBoard]:
        """
        Sort boards for optimal usage.
        
        Default: by usable area (smallest usable first to minimize waste).
        
        Args:
            boards: Boards to sort
            
        Returns:
            Sorted boards list
        """
        return sorted(boards, key=lambda b: b.usable_area)
