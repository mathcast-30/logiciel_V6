"""
RawPiece - Represents a piece to be cut from raw wood.

Every piece is represented as a Polygon, even if rectangular.
No rectangle-specific logic is allowed.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from shapely.geometry import Polygon
from shapely.affinity import rotate, translate

from .grain import GrainVector


@dataclass
class RawPiece:
    """
    Represents a piece to be cut from raw wood stock.
    
    ⚠️ CRITICAL: Always represented as Polygon.
    No rectangle-specific optimization paths.
    
    Attributes:
        id: Unique identifier
        polygon: Shape as Shapely Polygon
        grain_vector: Required grain direction
        allowed_rotations: List of allowed rotation angles (default: [0°, 180°])
        name: Optional descriptive name
        project_id: Optional parent project ID
        project_name: Optional parent project name
    """
    
    id: int
    polygon: Polygon
    grain_vector: GrainVector
    allowed_rotations: List[float] = field(default_factory=lambda: [0.0, 180.0])
    name: Optional[str] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    
    def __post_init__(self):
        """Validate piece geometry."""
        if not self.polygon.is_valid:
            raise ValueError(f"Piece {self.id}: Invalid polygon geometry")
        if not self.polygon.is_simple:
            raise ValueError(f"Piece {self.id}: Polygon must be simple (no self-intersection)")
        if self.polygon.is_empty:
            raise ValueError(f"Piece {self.id}: Polygon cannot be empty")
        
        # Ensure allowed_rotations is not empty
        if not self.allowed_rotations:
            raise ValueError(f"Piece {self.id}: Must have at least one allowed rotation")
    
    @property
    def area(self) -> float:
        """Area in mm²."""
        return self.polygon.area
    
    @property
    def bounds(self) -> Tuple[float, float, float, float]:
        """Bounding box as (minx, miny, maxx, maxy)."""
        return self.polygon.bounds
    
    @property
    def width(self) -> float:
        """Width of bounding box in mm."""
        minx, _, maxx, _ = self.bounds
        return maxx - minx
    
    @property
    def height(self) -> float:
        """Height of bounding box in mm."""
        _, miny, _, maxy = self.bounds
        return maxy - miny
    
    @property
    def centroid(self) -> Tuple[float, float]:
        """Centroid coordinates."""
        c = self.polygon.centroid
        return (c.x, c.y)
    
    def rotated(self, angle_degrees: float, force: bool = False) -> "RawPiece":
        """
        Return a new RawPiece rotated by the given angle around its centroid.
        
        Args:
            angle_degrees: Rotation angle in degrees
            
        Returns:
            New RawPiece with rotated polygon and grain vector
        """
        if not force and angle_degrees not in self.allowed_rotations:
            raise ValueError(
                f"Piece {self.id}: Rotation {angle_degrees}° not allowed. "
                f"Allowed: {self.allowed_rotations}"
            )
        
        # Rotate polygon around centroid
        rotated_poly = rotate(self.polygon, angle_degrees, origin='centroid')
        
        # Rotate grain vector
        rotated_grain = self.grain_vector.rotated(angle_degrees)
        
        return RawPiece(
            id=self.id,
            polygon=rotated_poly,
            grain_vector=rotated_grain,
            allowed_rotations=self.allowed_rotations,
            name=self.name,
            project_id=self.project_id,
            project_name=self.project_name
        )
    
    def translated(self, dx: float, dy: float) -> "RawPiece":
        """
        Return a new RawPiece translated by (dx, dy).
        
        Args:
            dx: Translation in X direction (mm)
            dy: Translation in Y direction (mm)
            
        Returns:
            New RawPiece at new position
        """
        translated_poly = translate(self.polygon, dx, dy)
        
        return RawPiece(
            id=self.id,
            polygon=translated_poly,
            grain_vector=self.grain_vector,  # Grain direction unchanged by translation
            allowed_rotations=self.allowed_rotations,
            name=self.name,
            project_id=self.project_id,
            project_name=self.project_name
        )
    
    def at_origin(self) -> "RawPiece":
        """
        Return a new RawPiece with its bounding box starting at origin (0, 0).
        
        Useful for NFP calculations.
        """
        minx, miny, _, _ = self.bounds
        return self.translated(-minx, -miny)
    
    @classmethod
    def from_rectangle(
        cls,
        id: int,
        width: float,
        height: float,
        grain_vector: GrainVector,
        allowed_rotations: Optional[List[float]] = None,
        name: Optional[str] = None,
        project_id: Optional[int] = None,
        project_name: Optional[str] = None
    ) -> "RawPiece":
        """
        Create a RawPiece from rectangular dimensions.
        
        Note: The piece is still stored as a Polygon.
        This factory method is a convenience, not a special code path.
        
        Args:
            id: Piece identifier
            width: Width in mm
            height: Height in mm
            grain_vector: Required grain direction
            allowed_rotations: Allowed rotation angles
            name: Optional name
            project_id: Optional project ID
            project_name: Optional project name
            
        Returns:
            RawPiece instance
        """
        polygon = Polygon([
            (0, 0),
            (width, 0),
            (width, height),
            (0, height)
        ])
        
        return cls(
            id=id,
            polygon=polygon,
            grain_vector=grain_vector,
            allowed_rotations=allowed_rotations or [0.0, 180.0],
            name=name,
            project_id=project_id,
            project_name=project_name
        )
    
    def __repr__(self) -> str:
        return (
            f"RawPiece(id={self.id}, "
            f"name='{self.name or 'unnamed'}', "
            f"area={self.area:.0f}mm², "
            f"grain={self.grain_vector})"
        )
