"""
2D Bin Packing Optimization Engine for OptiCut Pro.

This module implements a guillotine-based 2D bin packing algorithm
optimized for wood panel cutting with support for:
- Kerf (blade thickness)
- Trim margins (sanding allowance)
- Safety margins between pieces
- Rotation constraints
- - Offcut prioritization
- - Grain direction (Sens du fil)
- """

import enum


class GrainDirection(int, enum.Enum):
    """Direction du fil du bois."""
    NONE = 0
    HORIZONTAL = 1
    VERTICAL = 2

from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict
import json


@dataclass
class Piece:
    """A piece to be cut."""
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
    grain_direction: int = 0  # 0: None, 1: Horizontal, 2: Vertical
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    priority: int = 0  # Higher = place first
    longueur: float = 0.0
    largeur: float = 0.0
    epaisseur: float = 0.0
    
    def area(self) -> float:
        return self.width * self.height
    
    def rotated(self) -> 'Piece':
        """Return a rotated copy of this piece."""
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


@dataclass
class Offcut:
    """A reusable offcut from cutting."""
    x: float
    y: float
    width: float
    height: float
    
    def area(self) -> float:
        return self.width * self.height
    
    def is_usable(self, min_size: float = 100) -> bool:
        """Check if offcut is large enough to be reusable."""
        return self.width >= min_size and self.height >= min_size


@dataclass
class Panel:
    """A stock panel with its cutting result."""
    id: int
    width: float
    height: float
    is_offcut: bool = False
    grain_direction: int = 1  # 1: Horizontal, 2: Vertical
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


@dataclass
class FreeRect:
    """A free rectangle available for placing pieces."""
    x: float
    y: float
    width: float
    height: float
    
    def area(self) -> float:
        return self.width * self.height
    
    def fits(self, piece_width: float, piece_height: float) -> bool:
        return piece_width <= self.width and piece_height <= self.height


class GuillotineOptimizer:
    """
    Guillotine-based 2D bin packing optimizer.
    
    Uses a Best Area Fit (BAF) heuristic with guillotine cuts,
    which mirrors how panels are actually cut in a workshop.
    """
    
    def __init__(
        self,
        kerf: float = 3.0,
        trim_margin: float = 2.0,
        safety_margin: float = 5.0,
        min_offcut_size: float = 100.0
    ):
        """
        Initialize the optimizer.
        
        Args:
            kerf: Blade thickness in mm
            trim_margin: Sanding/trim margin in mm (added to each piece dimension)
            safety_margin: Minimum gap between pieces in mm
            min_offcut_size: Minimum dimension for a reusable offcut
        """
        self.kerf = kerf
        self.trim_margin = trim_margin
        self.safety_margin = safety_margin
        self.min_offcut_size = min_offcut_size
    
    def optimize(
        self,
        pieces: List[Piece],
        stock_panels: List[Tuple[int, float, float, bool, int]]  # (id, width, height, is_offcut, grain_direction)
    ) -> Dict:
        """
        Run the optimization algorithm.
        
        Args:
            pieces: List of pieces to cut
            stock_panels: List of available stock panels, sorted by preference (offcuts first)
        
        Returns:
            Dictionary with optimization results
        """
        # Expand pieces by quantity and add margins
        expanded_pieces = []
        for piece in pieces:
            # IMPORTANT: Adjust dimensions based on edge banding
            # Dimensions in app are FINAL dimensions.
            # Cut width = Final width - (left edge + right edge)
            
            # FAIL-SAFE: Check for aberrant dimensions before subtraction
            sanitized_width = piece.width
            sanitized_height = piece.height
            sanitized_name = piece.name
            
            if sanitized_width <= 0 or sanitized_height <= 0:
                # Log critical warning but don't crash
                 sanitized_name = f"[ERREUR] {piece.name} (Dim: {sanitized_width}x{sanitized_height})"
                 sanitized_width = 100.0 # Default safe value
                 sanitized_height = 100.0
                 print(f"[{self.__class__.__name__}] Fixed invalid piece: {piece.name} -> 100x100mm")

            cut_width = sanitized_width - (piece.edge_left_thickness + piece.edge_right_thickness)
            cut_height = sanitized_height - (piece.edge_top_thickness + piece.edge_bottom_thickness)
            
            # Add trim margins
            actual_width = cut_width + (2 * self.trim_margin)
            actual_height = cut_height + (2 * self.trim_margin)
            
            for i in range(piece.quantity):
                expanded_pieces.append(Piece(
                    id=piece.id,
                    name=f"{sanitized_name}" if piece.quantity == 1 else f"{sanitized_name} ({i+1}/{piece.quantity})",
                    width=actual_width,
                    height=actual_height,
                    thickness=piece.thickness,
                    quantity=1,
                    allow_rotation=piece.allow_rotation,
                    material_id=piece.material_id,
                    edge_top_thickness=piece.edge_top_thickness,
                    edge_bottom_thickness=piece.edge_bottom_thickness,
                    edge_left_thickness=piece.edge_left_thickness,
                    edge_right_thickness=piece.edge_right_thickness,
                    grain_direction=piece.grain_direction,
                    project_id=piece.project_id,
                    project_name=piece.project_name,
                    longueur=piece.longueur,
                    largeur=piece.largeur,
                    epaisseur=piece.epaisseur
                ))
        
        # Sort pieces by area (largest first - decreasing size heuristic)
        expanded_pieces.sort(key=lambda p: p.area(), reverse=True)
        
        # Sort stock: offcuts first, then by area (smallest first to minimize waste)
        sorted_stock = sorted(stock_panels, key=lambda s: (not s[3], s[1] * s[2]))
        
        used_panels: List[Panel] = []
        remaining_pieces = expanded_pieces.copy()
        
        for panel_id, panel_width, panel_height, is_offcut, grain_direction in sorted_stock:
            if not remaining_pieces:
                break
            
            panel = Panel(
                id=panel_id,
                width=panel_width,
                height=panel_height,
                is_offcut=is_offcut,
                grain_direction=grain_direction
            )
            
            # Initialize free rectangles with the entire panel
            free_rects = [FreeRect(0, 0, panel_width, panel_height)]
            
            pieces_placed_this_panel = []
            
            for piece in remaining_pieces[:]:  # Copy list for safe iteration
                placed = self._try_place_piece(piece, free_rects, panel)
                if placed:
                    pieces_placed_this_panel.append(piece)
                    remaining_pieces.remove(piece)
            
            if pieces_placed_this_panel:
                # Generate offcuts from remaining free rectangles
                for rect in free_rects:
                    if rect.width >= self.min_offcut_size and rect.height >= self.min_offcut_size:
                        panel.offcuts.append(Offcut(
                            x=rect.x,
                            y=rect.y,
                            width=rect.width,
                            height=rect.height
                        ))
                used_panels.append(panel)
        
        # Calculate statistics
        total_stock_area = sum(p.area() for p in used_panels)
        total_used_area = sum(p.used_area() for p in used_panels)
        waste_percentage = (1 - total_used_area / total_stock_area) * 100 if total_stock_area > 0 else 0
        
        return {
            "success": len(remaining_pieces) == 0,
            "panels_used": len(used_panels),
            "total_pieces": len(expanded_pieces),
            "pieces_placed": len(expanded_pieces) - len(remaining_pieces),
            "pieces_remaining": len(remaining_pieces),
            "waste_percentage": round(waste_percentage, 2),
            "panels": [self._panel_to_dict(p) for p in used_panels],
            "remaining_pieces": [{"id": p.id, "name": p.name} for p in remaining_pieces],
            "usable_offcuts": self._count_usable_offcuts(used_panels)
        }
    
    def _try_place_piece(self, piece: Piece, free_rects: List[FreeRect], panel: Panel) -> bool:
        """Try to place a piece in the best available free rectangle."""
        best_rect = None
        best_rect_index = -1
        best_rotated = False
        best_score = float('inf')
        
        piece_w = piece.width + self.kerf
        piece_h = piece.height + self.kerf
        
        for i, rect in enumerate(free_rects):
            # Try normal orientation
            can_place_normal = rect.fits(piece_w, piece_h)
            if can_place_normal:
                # Check grain direction for normal orientation
                # grain_direction: 0 = None (any), 1 = Horizontal (along width), 2 = Vertical (along height)
                # In normal orientation, piece grain matches panel grain directly
                grain_ok = (piece.grain_direction == 0 or piece.grain_direction == panel.grain_direction)
                if grain_ok:
                    score = rect.area() - (piece_w * piece_h)
                    if score < best_score:
                        best_score = score
                        best_rect = rect
                        best_rect_index = i
                        best_rotated = False
            
            # Try rotated orientation (90°)
            can_place_rotated = piece.allow_rotation and rect.fits(piece_h, piece_w)
            if can_place_rotated:
                # When rotated 90°, the grain direction also rotates:
                # - Original Horizontal (1) becomes Vertical (2)
                # - Original Vertical (2) becomes Horizontal (1)
                # - None (0) stays None (0)
                if piece.grain_direction == 0:
                    rotated_grain = 0
                elif piece.grain_direction == 1:
                    rotated_grain = 2
                else:  # grain_direction == 2
                    rotated_grain = 1
                
                grain_ok = (rotated_grain == 0 or rotated_grain == panel.grain_direction)
                if grain_ok:
                    score = rect.area() - (piece_w * piece_h)
                    if score < best_score:
                        best_score = score
                        best_rect = rect
                        best_rect_index = i
                        best_rotated = True
        
        if best_rect is None:
            return False
        
        # Place the piece
        actual_w = piece_h if best_rotated else piece_w
        actual_h = piece_w if best_rotated else piece_h
        
        placement = Placement(
            piece_id=piece.id,
            piece_name=piece.name,
            x=best_rect.x,
            y=best_rect.y,
            width=piece.height if best_rotated else piece.width,  # Store original dimensions
            height=piece.width if best_rotated else piece.height,
            rotated=best_rotated,
            project_id=piece.project_id,
            project_name=piece.project_name
        )
        panel.placements.append(placement)
        
        # Split the free rectangle (guillotine split)
        self._split_free_rect(free_rects, best_rect_index, actual_w, actual_h)
        
        return True
    
    def _split_free_rect(self, free_rects: List[FreeRect], rect_index: int, 
                         piece_width: float, piece_height: float):
        """Split a free rectangle after placing a piece (Shorter Axis Split - SAS)."""
        rect = free_rects[rect_index]
        
        # Remove the used rectangle
        free_rects.pop(rect_index)
        
        # Calculate remaining dimensions
        remaining_width = rect.width - piece_width
        remaining_height = rect.height - piece_height
        
        # Shorter Axis Split (SAS): Split along the shorter remaining dimension
        # This minimizes fragmentation and improves packing efficiency
        if remaining_width < remaining_height:
            # Horizontal split first (right of piece, full height)
            if remaining_width > self.kerf:
                free_rects.append(FreeRect(
                    x=rect.x + piece_width,
                    y=rect.y,
                    width=remaining_width - self.kerf,
                    height=rect.height
                ))
            # Vertical split (below piece, piece width only)
            if remaining_height > self.kerf:
                free_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + piece_height,
                    width=piece_width,
                    height=remaining_height - self.kerf
                ))
        else:
            # Vertical split first (below piece, full width)
            if remaining_height > self.kerf:
                free_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + piece_height,
                    width=rect.width,
                    height=remaining_height - self.kerf
                ))
            # Horizontal split (right of piece, piece height only)
            if remaining_width > self.kerf:
                free_rects.append(FreeRect(
                    x=rect.x + piece_width,
                    y=rect.y,
                    width=remaining_width - self.kerf,
                    height=piece_height
                ))
    
    def _panel_to_dict(self, panel: Panel) -> dict:
        """Convert a panel to a dictionary for JSON serialization."""
        return {
            "panel_id": panel.id,
            "width": panel.width,
            "height": panel.height,
            "is_offcut": panel.is_offcut,
            "waste_percentage": round(panel.waste_percentage(), 2),
            "placements": [
                {
                    "piece_id": p.piece_id,
                    "piece_name": p.piece_name,
                    "x": p.x,
                    "y": p.y,
                    "width": p.width,
                    "height": p.height,
                    "rotated": p.rotated,
                    "project_id": p.project_id,
                    "project_name": p.project_name
                }
                for p in panel.placements
            ],
            "offcuts": [
                {
                    "x": o.x,
                    "y": o.y,
                    "width": o.width,
                    "height": o.height
                }
                for o in panel.offcuts
            ]
        }
    
    def _count_usable_offcuts(self, panels: List[Panel]) -> int:
        """Count total usable offcuts across all panels."""
        return sum(len(p.offcuts) for p in panels)


# Test function
if __name__ == "__main__":
    # Example usage
    optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=2.0, safety_margin=5.0)
    
    pieces = [
        Piece(id=1, name="Porte haute", width=600, height=400, quantity=2),
        Piece(id=2, name="Côté", width=800, height=300, quantity=2),
        Piece(id=3, name="Fond", width=500, height=500, quantity=1),
        Piece(id=4, name="Étagère", width=400, height=200, quantity=4),
    ]
    
    stock = [
        (1, 2800, 2070, False),  # Full panel
        (2, 1500, 1000, True),   # Offcut
    ]
    
    result = optimizer.optimize(pieces, stock)
    print(json.dumps(result, indent=2, ensure_ascii=False))
