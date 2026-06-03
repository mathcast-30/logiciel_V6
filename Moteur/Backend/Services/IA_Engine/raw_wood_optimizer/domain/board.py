"""
RawBoard - Represents a raw wood stock board with defects.

The board is defined by:
- boundary: The outer contour (may be irregular/non-convex)
- defects: List of exclusion zones (knots, cracks, sapwood, etc.)
- grain_vector: Direction of the wood grain
- species: Type of wood (affects margins)
"""

from dataclasses import dataclass, field
from typing import List, Optional
from shapely.geometry import Polygon
from shapely.ops import unary_union

from .grain import WoodSpecies, GrainVector, SPECIES_MARGINS


@dataclass
class RawBoard:
    """
    Represents a raw wood stock board for optimization.
    
    Attributes:
        id: Unique identifier
        boundary: Outer contour as Shapely Polygon (may be non-convex)
        defects: List of exclusion zones as Shapely Polygons
        grain_vector: Direction of wood grain
        species: Wood species (determines safety margin)
        label: Optional descriptive label
    """
    
    id: int
    boundary: Polygon
    grain_vector: GrainVector
    species: WoodSpecies = WoodSpecies.CHENE
    defects: List[Polygon] = field(default_factory=list)
    label: Optional[str] = None
    is_offcut: bool = False
    
    def __post_init__(self):
        """Validate the board geometry."""
        if not self.boundary.is_valid:
            raise ValueError(f"Board {self.id}: Invalid boundary polygon")
        if not self.boundary.is_simple:
            raise ValueError(f"Board {self.id}: Boundary polygon must be simple (no self-intersection)")
        
        for i, defect in enumerate(self.defects):
            if not defect.is_valid:
                raise ValueError(f"Board {self.id}: Invalid defect polygon at index {i}")
    
    @property
    def margin(self) -> float:
        """Get the species-specific safety margin in mm."""
        return SPECIES_MARGINS.get(self.species, SPECIES_MARGINS[WoodSpecies.UNKNOWN])
    
    @property
    def width(self) -> float:
        """Width of bounding box in mm."""
        minx, _, maxx, _ = self.boundary.bounds
        return maxx - minx
    
    @property
    def height(self) -> float:
        """Height of bounding box in mm."""
        _, miny, _, maxy = self.boundary.bounds
        return maxy - miny
    
    def get_working_area(self) -> Polygon:
        """
        Calculate the usable working area.
        
        Formula: boundary - defects - buffer(species_margin)
        
        Returns:
            Polygon representing the safe placement area
        """
        # Start with the boundary
        working = self.boundary
        
        # Subtract all defects
        if self.defects:
            defects_union = unary_union(self.defects)
            working = working.difference(defects_union)
        
        # Apply inward buffer for species margin
        # Negative buffer = inward shrink
        if self.margin > 0:
            working = working.buffer(-self.margin)
        
        # Handle case where buffer makes polygon invalid/empty
        if working.is_empty or not working.is_valid:
            raise ValueError(
                f"Board {self.id}: Working area is empty after applying "
                f"{self.margin}mm margin for {self.species.value}"
            )
        
        return working
    
    @property
    def total_area(self) -> float:
        """Total boundary area in mm²."""
        return self.boundary.area
    
    @property
    def defect_area(self) -> float:
        """Total area of defects in mm²."""
        if not self.defects:
            return 0.0
        return unary_union(self.defects).area
    
    @property
    def usable_area(self) -> float:
        """Usable area after defects and margins in mm²."""
        return self.get_working_area().area
    
    @property
    def usability_ratio(self) -> float:
        """Ratio of usable area to total area (0-1)."""
        if self.total_area == 0:
            return 0.0
        return self.usable_area / self.total_area
    
    @classmethod
    def from_rectangle(
        cls,
        id: int,
        width: float,
        height: float,
        grain_vector: GrainVector,
        species: WoodSpecies = WoodSpecies.CHENE,
        defects: Optional[List[Polygon]] = None,
        label: Optional[str] = None
    ) -> "RawBoard":
        """
        Create a RawBoard from rectangular dimensions.
        
        Note: Even for rectangles, we use Polygon representation.
        This is intentional - no rectangle-specific logic allowed.
        
        Args:
            id: Board identifier
            width: Width in mm
            height: Height in mm
            grain_vector: Grain direction
            species: Wood species
            defects: Optional list of defect polygons
            label: Optional label
            
        Returns:
            RawBoard instance
        """
        boundary = Polygon([
            (0, 0),
            (width, 0),
            (width, height),
            (0, height)
        ])
        
        return cls(
            id=id,
            boundary=boundary,
            grain_vector=grain_vector,
            species=species,
            defects=defects or [],
            label=label
        )
    
    def __repr__(self) -> str:
        bounds = self.boundary.bounds
        return (
            f"RawBoard(id={self.id}, "
            f"bounds={bounds[2]-bounds[0]:.0f}x{bounds[3]-bounds[1]:.0f}mm, "
            f"species={self.species.value}, "
            f"defects={len(self.defects)}, "
            f"usability={self.usability_ratio:.1%})"
        )
