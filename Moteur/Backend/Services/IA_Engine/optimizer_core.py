"""
Core data structures and interfaces for OptiCut Pro Optimization Engine.
Extracted to resolve circular dependencies.
"""
from __future__ import annotations
import enum
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

# =============================================================================
# ENUMS & CONSTANTS
# =============================================================================

class GrainDirection(int, enum.Enum):
    """Direction du fil du bois."""
    NONE = 0
    HORIZONTAL = 1
    VERTICAL = 2


class SplitStrategy(str, enum.Enum):
    """Strategy for guillotine split after placement."""
    SHORTER_AXIS = "sas"      # Shorter Axis Split - minimize fragmentation
    LONGER_AXIS = "las"       # Longer Axis Split - for long pieces
    SHORTER_LEFTOVER = "sls"  # Shorter Leftover Split
    LONGER_LEFTOVER = "lls"   # Longer Leftover Split
    ADAPTIVE = "adaptive"     # Choose based on piece/rect ratio


class PlacementHeuristic(str, enum.Enum):
    """Heuristic for free rect selection."""
    BEST_AREA_FIT = "baf"     # Minimize leftover area
    BEST_SHORT_SIDE = "bssf"  # Minimize short side delta
    BEST_LONG_SIDE = "blsf"   # Minimize long side delta
    BOTTOM_LEFT = "bl"        # Bottom-left corner first
    CONTACT_POINT = "cp"      # Maximize contact with placed pieces


class AlgorithmType(str, enum.Enum):
    """Available optimization algorithms."""
    GUILLOTINE = "guillotine"
    SKYLINE = "skyline"
    MAXRECTS = "maxrects"
    HYBRID = "hybrid"
    CPSAT = "cpsat"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class Piece:
    """A piece to be cut with all constraints."""
    id: int
    name: str
    width: float
    height: float
    thickness: float = 0.0
    quantity: int = 1
    allow_rotation: bool = True
    material_id: int = 0
    edge_top_thickness: float = 0.0
    edge_bottom_thickness: float = 0.0
    edge_left_thickness: float = 0.0
    edge_right_thickness: float = 0.0
    grain_direction: int = 0
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    priority: int = 0  # Higher = place first
    # 3D Dimensions for reporting
    longueur: float = 0.0
    largeur: float = 0.0
    epaisseur: float = 0.0
    
    def area(self) -> float:
        return self.width * self.height
    
    def perimeter(self) -> float:
        return 2 * (self.width + self.height)
    
    def aspect_ratio(self) -> float:
        return max(self.width, self.height) / min(self.width, self.height) if min(self.width, self.height) > 0 else float('inf')
    
    def rotated(self) -> 'Piece':
        """Return a rotated copy with correct edge band rotation."""
        return Piece(
            id=self.id,
            name=self.name,
            width=self.height,
            height=self.width,
            thickness=self.thickness,
            quantity=self.quantity,
            allow_rotation=self.allow_rotation,
            material_id=self.material_id,
            edge_top_thickness=self.edge_right_thickness,
            edge_bottom_thickness=self.edge_left_thickness,
            edge_left_thickness=self.edge_top_thickness,
            edge_right_thickness=self.edge_bottom_thickness,
            grain_direction=2 if self.grain_direction == 1 else 1 if self.grain_direction == 2 else 0,
            project_id=self.project_id,
            project_name=self.project_name,
            priority=self.priority,
            longueur=self.largeur,
            largeur=self.longueur,
            epaisseur=self.epaisseur
        )
    
    def __hash__(self):
        return hash((self.id, self.name, self.width, self.height))


@dataclass
class Placement:
    """A placed piece on a panel."""
    piece_id: int
    piece_name: str
    x: float
    y: float
    width: float
    height: float
    rotated: bool = False
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    # 3D Dimensions for reporting
    longueur: float = 0.0
    largeur: float = 0.0
    epaisseur: float = 0.0
    
    def right(self) -> float:
        return self.x + self.width
    
    def top(self) -> float:
        return self.y + self.height
    
    def overlaps(self, other: 'Placement') -> bool:
        """Check if this placement overlaps with another."""
        return not (self.right() <= other.x or other.right() <= self.x or
                    self.top() <= other.y or other.top() <= self.y)


@dataclass
class FreeRect:
    """A free rectangular area available for placement."""
    x: float
    y: float
    width: float
    height: float
    
    def area(self) -> float:
        return self.width * self.height
    
    def fits(self, w: float, h: float) -> bool:
        return self.width >= w and self.height >= h
    
    def fits_rotated(self, w: float, h: float) -> bool:
        return self.width >= h and self.height >= w
    
    def score_baf(self, w: float, h: float) -> float:
        """Best Area Fit score (lower is better)."""
        return self.area() - (w * h)
    
    def score_bssf(self, w: float, h: float) -> float:
        """Best Short Side Fit score."""
        return min(self.width - w, self.height - h)
    
    def score_blsf(self, w: float, h: float) -> float:
        """Best Long Side Fit score."""
        return max(self.width - w, self.height - h)


@dataclass
class Offcut:
    """A reusable offcut from cutting."""
    x: float
    y: float
    width: float
    height: float
    quality_score: float = 1.0  # 0-1, higher = better quality
    
    def area(self) -> float:
        return self.width * self.height
    
    def is_usable(self, min_size: float = 100) -> bool:
        return self.width >= min_size and self.height >= min_size
    
    def aspect_ratio(self) -> float:
        return max(self.width, self.height) / min(self.width, self.height) if min(self.width, self.height) > 0 else float('inf')


@dataclass
class SkylineNode:
    """Node in the skyline representation."""
    x: float
    y: float
    width: float


@dataclass
class Panel:
    """A stock panel with cutting result."""
    id: int
    width: float
    height: float
    is_offcut: bool = False
    grain_direction: int = 1
    placements: List[Placement] = field(default_factory=list)
    offcuts: List[Offcut] = field(default_factory=list)
    
    def area(self) -> float:
        return self.width * self.height
    
    def used_area(self) -> float:
        return sum(p.width * p.height for p in self.placements)
    
    def waste_percentage(self) -> float:
        if self.area() == 0:
            return 0
        return (1 - self.used_area() / self.area()) * 100
    
    def utilization(self) -> float:
        return self.used_area() / self.area() if self.area() > 0 else 0


@dataclass
class OptimizationMetrics:
    """Comprehensive metrics for optimization result."""
    total_pieces: int
    pieces_placed: int
    panels_used: int
    total_stock_area: float
    total_used_area: float
    waste_percentage: float
    k_metric: float  # Kenyon theoretical lower bound ratio
    execution_time_ms: float
    algorithm_used: str
    split_strategy: str
    offcuts_generated: int
    offcuts_total_area: float
    
    def to_dict(self) -> Dict:
        return {
            "total_pieces": self.total_pieces,
            "pieces_placed": self.pieces_placed,
            "panels_used": self.panels_used,
            "total_stock_area": round(self.total_stock_area, 2),
            "total_used_area": round(self.total_used_area, 2),
            "waste_percentage": round(self.waste_percentage, 2),
            "k_metric": round(self.k_metric, 4),
            "execution_time_ms": round(self.execution_time_ms, 2),
            "algorithm_used": self.algorithm_used,
            "split_strategy": self.split_strategy,
            "offcuts_generated": self.offcuts_generated,
            "offcuts_total_area": round(self.offcuts_total_area, 2)
        }


# =============================================================================
# OPTIMIZATION STRATEGY INTERFACE
# =============================================================================

class OptimizationStrategy(ABC):
    """Abstract base class for optimization strategies."""
    
    @abstractmethod
    def optimize(self, pieces: List[Piece], panels: List[Panel], 
                 kerf: float, grain_strict: bool = True) -> List[Panel]:
        """Execute optimization and return used panels with placements."""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Strategy name for logging."""
        pass
