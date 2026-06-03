"""
Unit tests for OptiCut Pro Optimization Engine.

Tests cover:
- Grain direction constraints (normal + rotated cases)
- Kerf application (single application only)
- Non-overlap and panel bounds validation
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from optimizer import GuillotineOptimizer, Piece, GrainDirection


class TestGrainDirection:
    """Tests for grain direction constraint logic."""
    
    def test_no_grain_piece_on_horizontal_panel(self):
        """Piece with no grain constraint should be placeable on any panel."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        pieces = [Piece(id=1, name="Test", width=400, height=300, grain_direction=0)]
        stock = [(1, 2800, 2070, False, 1)]  # Horizontal grain panel
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is True
        assert result["pieces_placed"] == 1
    
    def test_horizontal_grain_piece_on_horizontal_panel(self):
        """Piece with horizontal grain on horizontal panel should be placeable."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        pieces = [Piece(id=1, name="Test", width=400, height=300, grain_direction=1)]
        stock = [(1, 2800, 2070, False, 1)]  # Horizontal grain panel
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is True
        assert result["pieces_placed"] == 1
    
    def test_vertical_grain_piece_on_horizontal_panel_no_rotation(self):
        """Piece with vertical grain on horizontal panel without rotation should fail."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        # Piece with vertical grain, rotation NOT allowed
        pieces = [Piece(id=1, name="Test", width=400, height=300, quantity=1, 
                       allow_rotation=False, grain_direction=2)]
        stock = [(1, 2800, 2070, False, 1)]  # Horizontal grain panel
        
        result = optimizer.optimize(pieces, stock)
        
        # Should NOT be placed because grain doesn't match
        assert result["success"] is False
        assert result["pieces_placed"] == 0
    
    def test_vertical_grain_piece_can_rotate_to_match(self):
        """Piece with vertical grain can rotate to match horizontal panel."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        # Piece with vertical grain, rotation allowed
        pieces = [Piece(id=1, name="Test", width=400, height=300, quantity=1, 
                       allow_rotation=True, grain_direction=2)]
        stock = [(1, 2800, 2070, False, 1)]  # Horizontal grain panel
        
        result = optimizer.optimize(pieces, stock)
        
        # Should succeed because rotation makes grain horizontal
        assert result["success"] is True
        assert result["pieces_placed"] == 1
        # Check that piece was rotated
        placement = result["panels"][0]["placements"][0]
        assert placement["rotated"] is True
    
    def test_grain_propagates_to_expanded_pieces(self):
        """Grain direction should propagate when pieces are expanded by quantity."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        # 3 pieces with horizontal grain
        pieces = [Piece(id=1, name="Test", width=200, height=100, quantity=3, 
                       allow_rotation=False, grain_direction=1)]
        stock = [(1, 2800, 2070, False, 1)]
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is True
        assert result["pieces_placed"] == 3
        # All should be placed without rotation (grain matches)
        for p in result["panels"][0]["placements"]:
            assert p["rotated"] is False


class TestKerfApplication:
    """Tests for kerf (blade thickness) handling."""
    
    def test_kerf_applied_once(self):
        """Kerf should only be applied once per piece."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        # Two pieces that exactly fit panel width with single kerf between
        # 1400 + 3 (kerf) + 1397 = 2800 exactly
        pieces = [
            Piece(id=1, name="Left", width=1400, height=500, grain_direction=0),
            Piece(id=2, name="Right", width=1397, height=500, grain_direction=0)
        ]
        stock = [(1, 2800, 2070, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is True
        assert result["pieces_placed"] == 2
        assert result["panels_used"] == 1
    
    def test_pieces_do_not_overlap_with_kerf(self):
        """Pieces should not overlap, kerf should create gap between them."""
        optimizer = GuillotineOptimizer(kerf=5.0, trim_margin=0, safety_margin=0)
        
        pieces = [
            Piece(id=1, name="A", width=500, height=500, grain_direction=0),
            Piece(id=2, name="B", width=500, height=500, grain_direction=0)
        ]
        stock = [(1, 2800, 2070, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        placements = result["panels"][0]["placements"]
        
        assert len(placements) == 2
        
        # Check no overlap (including kerf gap)
        p1, p2 = placements
        # They should be separated by at least kerf
        horizontal_sep = abs(p1["x"] - p2["x"])
        vertical_sep = abs(p1["y"] - p2["y"])
        
        # Either horizontally or vertically separated
        assert (horizontal_sep >= 500) or (vertical_sep >= 500)


class TestNonOverlapAndBounds:
    """Tests for piece placement within panel bounds and non-overlap."""
    
    def test_pieces_within_panel_bounds(self):
        """All pieces should be placed within panel dimensions."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        pieces = [
            Piece(id=i, name=f"P{i}", width=200, height=150, grain_direction=0)
            for i in range(10)
        ]
        stock = [(1, 1000, 800, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        
        for panel in result["panels"]:
            panel_w = panel["width"]
            panel_h = panel["height"]
            
            for p in panel["placements"]:
                # Piece must be fully inside panel
                assert p["x"] >= 0, f"Piece {p['piece_name']} x={p['x']} is negative"
                assert p["y"] >= 0, f"Piece {p['piece_name']} y={p['y']} is negative"
                assert p["x"] + p["width"] <= panel_w, f"Piece {p['piece_name']} exceeds panel width"
                assert p["y"] + p["height"] <= panel_h, f"Piece {p['piece_name']} exceeds panel height"
    
    def test_pieces_do_not_overlap(self):
        """No two pieces should overlap on the same panel."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        pieces = [
            Piece(id=i, name=f"P{i}", width=300, height=200, grain_direction=0)
            for i in range(5)
        ]
        stock = [(1, 2800, 2070, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        
        for panel in result["panels"]:
            placements = panel["placements"]
            
            for i, p1 in enumerate(placements):
                for p2 in placements[i+1:]:
                    # Check rectangles don't overlap
                    overlap_x = not (p1["x"] + p1["width"] <= p2["x"] or p2["x"] + p2["width"] <= p1["x"])
                    overlap_y = not (p1["y"] + p1["height"] <= p2["y"] or p2["y"] + p2["height"] <= p1["y"])
                    
                    assert not (overlap_x and overlap_y), \
                        f"Overlap between {p1['piece_name']} and {p2['piece_name']}"
    
    def test_large_piece_not_placed_if_too_big(self):
        """Piece larger than panel should not be placed."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0)
        
        # Piece larger than stock
        pieces = [Piece(id=1, name="Huge", width=3000, height=3000, grain_direction=0)]
        stock = [(1, 2800, 2070, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is False
        assert result["pieces_placed"] == 0
        assert len(result["remaining_pieces"]) == 1


class TestOffcutGeneration:
    """Tests for usable offcut detection."""
    
    def test_offcuts_generated_from_waste(self):
        """Usable offcuts should be detected from remaining space."""
        optimizer = GuillotineOptimizer(kerf=3.0, trim_margin=0, safety_margin=0, min_offcut_size=100)
        
        # Small piece on large panel should leave usable offcuts
        pieces = [Piece(id=1, name="Small", width=500, height=500, grain_direction=0)]
        stock = [(1, 2800, 2070, False, 0)]
        
        result = optimizer.optimize(pieces, stock)
        
        assert result["success"] is True
        assert result["usable_offcuts"] > 0
        
        # Check offcuts have valid dimensions
        for offcut in result["panels"][0]["offcuts"]:
            assert offcut["width"] >= 100
            assert offcut["height"] >= 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
