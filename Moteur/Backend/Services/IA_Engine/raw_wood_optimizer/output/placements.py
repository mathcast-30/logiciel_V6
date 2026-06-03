"""
Placement output models.

Structures for representing optimization results in a format
compatible with the existing panel optimizer output.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any
from shapely.geometry import Polygon


@dataclass
class Placement:
    """
    A single piece placement on a board.
    
    Compatible with existing panel optimizer output format.
    """
    
    piece_id: int
    piece_name: str
    x: float
    y: float
    width: float
    height: float
    rotated: bool = False
    rotation_degrees: float = 0.0
    project_id: int | None = None
    project_name: str | None = None
    
    # Raw wood specific
    polygon_coords: list[tuple[float, float]] | None = None
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization.
        
        ✅ Coordonnées forcées en float pour éviter les erreurs de sérialisation
        JSON qui bloquent l'affichage React (ex: numpy int64, Decimal, etc.).
        """
        result: dict[str, Any] = {
            "piece_id": int(self.piece_id),
            "piece_name": str(self.piece_name),
            "x": float(self.x),
            "y": float(self.y),
            "width": float(self.width),
            "height": float(self.height),
            "rotated": bool(self.rotated),
            "rotation_degrees": float(self.rotation_degrees),
        }
        
        if self.project_id is not None:
            result["project_id"] = self.project_id
        if self.project_name is not None:
            result["project_name"] = self.project_name
        if self.polygon_coords is not None:
            result["polygon_coords"] = self.polygon_coords
        
        return result
    
    @classmethod
    def from_polygon(
        cls,
        piece_id: int,
        piece_name: str,
        polygon: Polygon,
        margin_offset: float = 0.0,
        rotated: bool = False,
        rotation_degrees: float = 0.0,
        project_id: int | None = None,
        project_name: str | None = None
    ) -> "Placement":
        """Create Placement from Shapely Polygon."""
        try:
            if polygon.is_empty or not polygon.is_valid:
                return cls(
                    piece_id=piece_id,
                    piece_name=piece_name,
                    x=margin_offset,
                    y=margin_offset,
                    width=0.0,
                    height=0.0,
                    rotated=rotated,
                    rotation_degrees=rotation_degrees,
                    project_id=project_id,
                    project_name=project_name,
                    polygon_coords=[]
                )
                
            minx, miny, maxx, maxy = polygon.bounds
            
            # Use 0.0 fallout if any coord is NaN
            import math
            def safe_f(v): return 0.0 if math.isnan(v) or math.isinf(v) else v
            
            return cls(
                piece_id=piece_id,
                piece_name=piece_name,
                x=safe_f(minx + margin_offset),
                y=safe_f(miny + margin_offset),
                width=safe_f(maxx - minx),
                height=safe_f(maxy - miny),
                rotated=rotated,
                rotation_degrees=rotation_degrees,
                project_id=project_id,
                project_name=project_name,
                polygon_coords=list(polygon.exterior.coords) if hasattr(polygon, 'exterior') else []
            )
        except Exception:
            # Absolute fallback to avoid API crash
            return cls(
                piece_id=piece_id,
                piece_name=piece_name,
                x=0.0, y=0.0, width=0.0, height=0.0,
                rotated=rotated, rotation_degrees=rotation_degrees,
                project_id=project_id, project_name=project_name,
                polygon_coords=[]
            )


@dataclass
class BoardResult:
    """
    Result for a single board after optimization.
    
    Compatible with existing panel optimizer output format.
    """
    
    board_id: int
    width: float
    height: float
    is_offcut: bool = False
    species: str = "unknown"
    placements: list[Placement] = field(default_factory=list)
    offcuts: list[dict[str, Any]] = field(default_factory=list)
    
    # Raw wood specific
    polygon_coords: list[tuple[float, float]] | None = None
    defects: list[list[tuple[float, float]]] = field(default_factory=list)
    
    # Metrics
    waste_percentage: float = 0.0
    used_area: float = 0.0
    total_area: float = 0.0
    
    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "panel_id": self.board_id,  # Use panel_id for compatibility
            "width": self.width,
            "height": self.height,
            "is_offcut": self.is_offcut,
            "species": self.species,
            "waste_percentage": round(self.waste_percentage, 2),
            "placements": [p.to_dict() for p in self.placements],
            "offcuts": self.offcuts,
            "polygon_coords": self.polygon_coords,
            "defects": self.defects,
            "metrics": {
                "used_area_mm2": self.used_area,
                "total_area_mm2": self.total_area,
                "efficiency": round(self.used_area / self.total_area, 4) if self.total_area > 0 else 0
            }
        }
    
    def calculate_metrics(self):
        """Recalculate metrics from placements."""
        self.total_area = self.width * self.height
        self.used_area = sum(
            p.width * p.height for p in self.placements
        )
        self.waste_percentage = (
            (1 - self.used_area / self.total_area) * 100 
            if self.total_area > 0 else 0
        )
