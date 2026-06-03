"""
Offcut output models.

Represents reusable offcuts generated from optimization.
Offcuts are geometrically exact polygons.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
from shapely.geometry import Polygon


@dataclass
class Offcut:
    """
    A reusable offcut from cutting.
    
    ⚠️ Represented as exact polygon, not just bounding box.
    
    Attributes:
        polygon: Exact shape of offcut
        board_id: Source board ID
        surface: Area in mm²
        aspect_ratio: Width/Height ratio (1.0 = square)
        reusable: Whether offcut is large enough to reuse
        quality_score: Quality rating (0-1)
    """
    
    polygon: Polygon
    board_id: int
    surface: float = 0.0
    aspect_ratio: float = 1.0
    reusable: bool = False
    quality_score: float = 1.0
    species: str = "unknown"
    
    def __post_init__(self):
        """Calculate derived properties."""
        if self.surface == 0:
            self.surface = self.polygon.area
        
        if self.aspect_ratio == 1.0:
            minx, miny, maxx, maxy = self.polygon.bounds
            width = maxx - minx
            height = maxy - miny
            if height > 0:
                self.aspect_ratio = width / height
    
    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        """Get bounding box (minx, miny, maxx, maxy)."""
        return self.polygon.bounds
    
    @property
    def width(self) -> float:
        """Bounding box width."""
        minx, _, maxx, _ = self.bounds
        return maxx - minx
    
    @property
    def height(self) -> float:
        """Bounding box height."""
        _, miny, _, maxy = self.bounds
        return maxy - miny
    
    @property
    def min_dimension(self) -> float:
        """Smaller of width/height."""
        return min(self.width, self.height)
    
    @property
    def is_rectangular(self) -> bool:
        """Check if offcut is approximately rectangular."""
        bbox_area = self.width * self.height
        if bbox_area == 0:
            return False
        ratio = self.surface / bbox_area
        return ratio > 0.95  # 95% of bounding box = rectangular
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON/storage."""
        minx, miny, _, _ = self.bounds
        
        return {
            "x": minx,
            "y": miny,
            "width": self.width,
            "height": self.height,
            "surface_mm2": self.surface,
            "aspect_ratio": round(self.aspect_ratio, 2),
            "reusable": self.reusable,
            "quality_score": round(self.quality_score, 2),
            "is_rectangular": self.is_rectangular,
            "polygon_coords": list(self.polygon.exterior.coords),
            "board_id": self.board_id,
            "species": self.species
        }
    
    @classmethod
    def from_polygon(
        cls,
        polygon: Polygon,
        board_id: int,
        min_dimension: float = 100.0,
        species: str = "unknown"
    ) -> "Offcut":
        """
        Create Offcut from polygon.
        
        Args:
            polygon: Offcut shape
            board_id: Source board
            min_dimension: Minimum dimension to be reusable
            species: Wood species
        """
        minx, miny, maxx, maxy = polygon.bounds
        width = maxx - minx
        height = maxy - miny
        
        # Check reusability
        reusable = min(width, height) >= min_dimension
        
        # Calculate quality based on shape
        # Prefer rectangular, well-proportioned offcuts
        bbox_area = width * height
        actual_area = polygon.area
        rectangularity = actual_area / bbox_area if bbox_area > 0 else 0
        
        aspect = max(width, height) / min(width, height) if min(width, height) > 0 else 10
        aspect_score = 1.0 / (1.0 + (aspect - 1) / 3)  # Penalty for high aspect ratio
        
        quality = (rectangularity + aspect_score) / 2
        
        return cls(
            polygon=polygon,
            board_id=board_id,
            surface=actual_area,
            aspect_ratio=width / height if height > 0 else 0,
            reusable=reusable,
            quality_score=quality,
            species=species
        )


@dataclass
class OffcutCollection:
    """
    Collection of offcuts from an optimization run.
    """
    
    offcuts: List[Offcut] = field(default_factory=list)
    
    @property
    def total_count(self) -> int:
        """Total number of offcuts."""
        return len(self.offcuts)
    
    @property
    def reusable_count(self) -> int:
        """Number of reusable offcuts."""
        return sum(1 for o in self.offcuts if o.reusable)
    
    @property
    def total_area(self) -> float:
        """Total offcut area in mm²."""
        return sum(o.surface for o in self.offcuts)
    
    @property
    def reusable_area(self) -> float:
        """Reusable offcut area in mm²."""
        return sum(o.surface for o in self.offcuts if o.reusable)
    
    def get_by_board(self, board_id: int) -> List[Offcut]:
        """Get offcuts from a specific board."""
        return [o for o in self.offcuts if o.board_id == board_id]
    
    def get_reusable(self) -> List[Offcut]:
        """Get only reusable offcuts."""
        return [o for o in self.offcuts if o.reusable]
    
    def to_summary(self) -> Dict[str, Any]:
        """Generate summary statistics."""
        return {
            "total_count": self.total_count,
            "reusable_count": self.reusable_count,
            "total_area_mm2": self.total_area,
            "reusable_area_mm2": self.reusable_area,
            "reusable_percentage": (
                self.reusable_area / self.total_area * 100 
                if self.total_area > 0 else 0
            )
        }
    
    def to_list(self) -> List[Dict[str, Any]]:
        """Convert all offcuts to list of dicts."""
        return [o.to_dict() for o in self.offcuts]
