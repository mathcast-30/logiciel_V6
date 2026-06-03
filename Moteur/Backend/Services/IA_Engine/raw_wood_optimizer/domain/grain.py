from __future__ import annotations
"""
Grain direction and wood species definitions.

Handles:
- Wood species with their specific margins
- Grain vector representation and alignment checking
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple
import math


class WoodSpecies(str, Enum):
    """Supported wood species with their behavior characteristics."""
    
    CHENE = "chene"          # Oak - stable
    HETRE = "hetre"          # Beech - nervous/unstable
    NOYER = "noyer"          # Walnut - stable
    FRENE = "frene"          # Ash - semi-stable
    MERISIER = "merisier"    # Cherry - stable
    ERABLE = "erable"        # Maple - stable
    ORME = "orme"            # Elm - semi-stable
    UNKNOWN = "unknown"


# Species-specific safety margins in mm
# Nervous woods require larger margins due to movement
SPECIES_MARGINS: dict[WoodSpecies, float] = {
    WoodSpecies.CHENE: 5.0,       # Stable - standard margin
    WoodSpecies.HETRE: 10.0,      # Nervous - increased margin
    WoodSpecies.NOYER: 5.0,       # Stable
    WoodSpecies.FRENE: 7.0,       # Semi-stable
    WoodSpecies.MERISIER: 5.0,    # Stable
    WoodSpecies.ERABLE: 5.0,      # Stable
    WoodSpecies.ORME: 7.0,        # Semi-stable
    WoodSpecies.UNKNOWN: 10.0,    # Conservative default
}


@dataclass(frozen=True)
class GrainVector:
    """
    Represents the grain direction as a 2D unit vector.
    
    Convention:
    - (1, 0) = Horizontal grain (along X axis)
    - (0, 1) = Vertical grain (along Y axis)
    """
    
    x: float
    y: float
    
    def __post_init__(self):
        # Normalize to unit vector
        magnitude = math.sqrt(self.x ** 2 + self.y ** 2)
        if magnitude > 0:
            object.__setattr__(self, 'x', self.x / magnitude)
            object.__setattr__(self, 'y', self.y / magnitude)
    
    @classmethod
    def horizontal(cls) -> "GrainVector":
        """Create a horizontal grain vector (1, 0)."""
        return cls(1.0, 0.0)
    
    @classmethod
    def vertical(cls) -> "GrainVector":
        """Create a vertical grain vector (0, 1)."""
        return cls(0.0, 1.0)
    
    @classmethod
    def from_angle_degrees(cls, angle: float) -> "GrainVector":
        """Create grain vector from angle in degrees (0° = horizontal)."""
        rad = math.radians(angle)
        return cls(math.cos(rad), math.sin(rad))
    
    def rotated(self, angle_degrees: float) -> "GrainVector":
        """Return a new GrainVector rotated by the given angle."""
        rad = math.radians(angle_degrees)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        new_x = self.x * cos_a - self.y * sin_a
        new_y = self.x * sin_a + self.y * cos_a
        return GrainVector(new_x, new_y)
    
    def is_aligned_with(self, other: "GrainVector", tolerance_degrees: float = 5.0) -> bool:
        """
        Check if this grain vector is aligned with another.
        
        Alignment means parallel (0°) or anti-parallel (180°).
        This is critical for wood cutting - grain must match.
        
        Args:
            other: The grain vector to compare against
            tolerance_degrees: Allowed angular deviation (default 5°)
            
        Returns:
            True if vectors are aligned within tolerance
        """
        # Dot product gives cos(angle) for unit vectors
        dot = abs(self.x * other.x + self.y * other.y)
        # For aligned vectors (0° or 180°), |dot| should be ~1
        tolerance_cos = math.cos(math.radians(tolerance_degrees))
        return dot >= tolerance_cos
    
    def angle_degrees(self) -> float:
        """Return the angle in degrees from horizontal (0-360)."""
        return math.degrees(math.atan2(self.y, self.x)) % 360
    
    def to_tuple(self) -> Tuple[float, float]:
        """Return as (x, y) tuple."""
        return (self.x, self.y)
    
    def __repr__(self) -> str:
        angle = self.angle_degrees()
        return f"GrainVector({self.x:.3f}, {self.y:.3f}) @ {angle:.1f}°"
