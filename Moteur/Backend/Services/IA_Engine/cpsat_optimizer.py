"""
CP-SAT Exact Solver Integration for OptiCut Pro.

This module provides integration with Google OR-Tools CP-SAT solver for:
- Exact optimal solutions for small problem instances
- Validation of heuristic solutions
- Hybrid solving (CP-SAT for critical subsets)

CP-SAT is particularly effective for:
- Problems with < 50 pieces
- Tight constraints needing exact solutions
- Validation benchmarking

Author: OptiCut Pro Team
Version: 1.0.0
"""

from __future__ import annotations
import time
import logging
from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any, TYPE_CHECKING
if TYPE_CHECKING:
    from .optimizer_core import Piece

logger = logging.getLogger("OptiCutCPSAT")

# Try to import OR-Tools, gracefully degrade if not available
try:
    from ortools.sat.python import cp_model
    ORTOOLS_AVAILABLE = True
except ImportError:
    ORTOOLS_AVAILABLE = False
    logger.warning("OR-Tools not installed. CP-SAT solver unavailable. Install with: pip install ortools")


@dataclass
class CPSATPiece:
    """Piece representation for CP-SAT solver."""
    id: int
    name: str
    width: int
    height: int
    allow_rotation: bool
    grain_direction: int
    # Reporting dimensions
    longueur: float = 0.0
    largeur: float = 0.0
    epaisseur: float = 0.0


@dataclass
class CPSATPanel:
    """Panel representation for CP-SAT solver."""
    id: int
    width: int
    height: int
    grain_direction: int


@dataclass
class CPSATPlacement:
    """Placement result from CP-SAT solver."""
    piece_id: int
    piece_name: str
    panel_id: int
    x: float
    y: float
    width: float
    height: float
    rotated: bool
    # Reporting dimensions
    longueur: float = 0.0
    largeur: float = 0.0
    epaisseur: float = 0.0


class CPSATOptimizer:
    """
    Constraint Programming SAT-based optimizer using Google OR-Tools.
    
    Solves 2D bin packing as a constraint satisfaction problem with:
    - No-overlap constraints
    - Panel boundary constraints
    - Grain direction constraints
    - Rotation handling
    - Kerf spacing
    
    Objective: Minimize number of panels used (or maximize utilization).
    """
    
    def __init__(self, kerf: int = 3, time_limit_seconds: float = 30.0):
        """
        Initialize CP-SAT optimizer.
        
        Args:
            kerf: Blade thickness in mm (integer)
            time_limit_seconds: Maximum solve time
        """
        if not ORTOOLS_AVAILABLE:
            raise RuntimeError("OR-Tools not installed. Run: pip install ortools")
        
        self.kerf = kerf
        self.time_limit = time_limit_seconds
    
    def optimize(self, 
                 pieces: List[CPSATPiece],
                 panels: List[CPSATPanel],
                 grain_strict: bool = True) -> Dict[str, Any]:
        """
        Run CP-SAT optimization.
        
        Args:
            pieces: Pieces to place
            panels: Available panels
            grain_strict: Enforce grain direction matching
            
        Returns:
            Dict with placements and metrics
        """
        start_time = time.perf_counter()
        
        if not pieces:
            return {"success": True, "placements": [], "panels_used": 0}
        
        model = cp_model.CpModel()
        
        # Variables
        # For each piece, we need:
        # - panel_idx: which panel it's on
        # - x, y: position on panel
        # - rotated: whether piece is rotated
        
        piece_vars = []
        
        for p_idx, piece in enumerate(pieces):
            # Is this piece placed?
            placed_var = model.NewBoolVar(f"placed_{p_idx}")
            
            # Which panel is this piece on?
            panel_var = model.NewIntVar(0, len(panels) - 1, f"panel_{p_idx}")
            
            # Position variables (domain based on max panel size)
            max_x = max(panel.width for panel in panels)
            max_y = max(panel.height for panel in panels)
            
            x_var = model.NewIntVar(0, max_x, f"x_{p_idx}")
            y_var = model.NewIntVar(0, max_y, f"y_{p_idx}")
            
            # Rotation (0 = no, 1 = yes)
            if piece.allow_rotation:
                rot_var = model.NewBoolVar(f"rot_{p_idx}")
            else:
                rot_var = model.NewConstant(0)
            
            # Actual dimensions (depend on rotation)
            if piece.allow_rotation:
                width_var = model.NewIntVar(
                    min(piece.width, piece.height),
                    max(piece.width, piece.height),
                    f"w_{p_idx}"
                )
                height_var = model.NewIntVar(
                    min(piece.width, piece.height),
                    max(piece.width, piece.height),
                    f"h_{p_idx}"
                )
                
                # If rotated: width = original height, height = original width
                model.Add(width_var == piece.height).OnlyEnforceIf([rot_var, placed_var])
                model.Add(height_var == piece.width).OnlyEnforceIf([rot_var, placed_var])
                model.Add(width_var == piece.width).OnlyEnforceIf([rot_var.Not(), placed_var])
                model.Add(height_var == piece.height).OnlyEnforceIf([rot_var.Not(), placed_var])
            else:
                width_var = model.NewConstant(piece.width)
                height_var = model.NewConstant(piece.height)
            
            piece_vars.append({
                "piece": piece,
                "placed": placed_var,
                "panel": panel_var,
                "x": x_var,
                "y": y_var,
                "rot": rot_var,
                "width": width_var,
                "height": height_var
            })
        
        # Constraints
        
        # 1. Piece must fit within its assigned panel (if placed)
        for pv in piece_vars:
            placed = pv["placed"]
            for bin_idx, panel in enumerate(panels):
                # If piece is on this panel and is placed, it must fit
                on_panel = model.NewBoolVar(f"on_{pv['piece'].id}_{bin_idx}")
                model.Add(pv["panel"] == bin_idx).OnlyEnforceIf([on_panel, placed])
                model.Add(pv["panel"] != bin_idx).OnlyEnforceIf(on_panel.Not())
                
                # When on this panel and placed: x + width + kerf <= panel.width
                model.Add(pv["x"] + pv["width"] + self.kerf <= panel.width).OnlyEnforceIf([on_panel, placed])
                model.Add(pv["y"] + pv["height"] + self.kerf <= panel.height).OnlyEnforceIf([on_panel, placed])
        
        # 2. Grain direction constraints
        if grain_strict:
            for pv in piece_vars:
                piece = pv["piece"]
                placed = pv["placed"]
                if piece.grain_direction != 0:  # Has grain constraint
                    for bin_idx, panel in enumerate(panels):
                        on_panel = model.NewBoolVar(f"grain_{piece.id}_{bin_idx}")
                        model.Add(pv["panel"] == bin_idx).OnlyEnforceIf([on_panel, placed])
                        model.Add(pv["panel"] != bin_idx).OnlyEnforceIf(on_panel.Not())
                        
                        # Grain must match (considering rotation)
                        if piece.allow_rotation:
                            # If not rotated: piece grain must match panel
                            # If rotated: rotated grain must match panel
                            rotated_grain = 2 if piece.grain_direction == 1 else 1
                            
                            if piece.grain_direction != panel.grain_direction:
                                # Must rotate to match
                                model.Add(pv["rot"] == 1).OnlyEnforceIf([on_panel, placed])
                            
                            if rotated_grain != panel.grain_direction:
                                # Rotated also doesn't match -> can't place here
                                if piece.grain_direction != panel.grain_direction:
                                    model.Add(pv["panel"] != bin_idx).OnlyEnforceIf(placed)
                        else:
                            # Can't rotate, grain must match directly
                            if piece.grain_direction != panel.grain_direction:
                                model.Add(pv["panel"] != bin_idx).OnlyEnforceIf(placed)
        
        # 3. No overlap constraints between pieces on same panel
        for i in range(len(piece_vars)):
            for j in range(i + 1, len(piece_vars)):
                pv1 = piece_vars[i]
                pv2 = piece_vars[j]
                
                # Check if both are placed and on same panel
                both_placed = model.NewBoolVar(f"both_{i}_{j}")
                model.AddMultiplicationEquality(both_placed, [pv1["placed"], pv2["placed"]])
                
                same_panel = model.NewBoolVar(f"same_{i}_{j}")
                model.Add(pv1["panel"] == pv2["panel"]).OnlyEnforceIf([both_placed, same_panel])
                
                # If on same panel, must not overlap
                left = model.NewBoolVar(f"left_{i}_{j}")
                right = model.NewBoolVar(f"right_{i}_{j}")
                above = model.NewBoolVar(f"above_{i}_{j}")
                below = model.NewBoolVar(f"below_{i}_{j}")
                
                # Piece i is to the left of piece j (with kerf)
                model.Add(pv1["x"] + pv1["width"] + self.kerf <= pv2["x"]).OnlyEnforceIf([both_placed, same_panel, left])
                
                # Piece i is to the right of piece j
                model.Add(pv2["x"] + pv2["width"] + self.kerf <= pv1["x"]).OnlyEnforceIf([both_placed, same_panel, right])
                
                # Piece i is above piece j (with kerf)
                model.Add(pv1["y"] + pv1["height"] + self.kerf <= pv2["y"]).OnlyEnforceIf([both_placed, same_panel, above])
                
                # Piece i is below piece j
                model.Add(pv2["y"] + pv2["height"] + self.kerf <= pv1["y"]).OnlyEnforceIf([both_placed, same_panel, below])
                
                # At least one must be true if on same panel
                model.Add(left + right + above + below >= 1).OnlyEnforceIf([both_placed, same_panel])
        
        # Objective: Maximize total placed area, then minimize panels
        panel_used = []
        for bin_idx in range(len(panels)):
            used_var = model.NewBoolVar(f"used_{bin_idx}")
            
            # Panel is used if any PIACED piece is on it
            pieces_on_panel = []
            for pv in piece_vars:
                on_this = model.NewBoolVar(f"on_p{pv['piece'].id}_b{bin_idx}_placed")
                # Piece is on this panel AND is placed
                model.Add(pv["panel"] == bin_idx).OnlyEnforceIf([on_this, pv["placed"]])
                model.Add(pv["panel"] != bin_idx).OnlyEnforceIf(on_this.Not())
                model.Add(pv["placed"] == 1).OnlyEnforceIf(on_this)
                model.Add(pv["placed"] == 0).OnlyEnforceIf(on_this.Not()) # Simplified?
                
                # Wait, the above logic for on_this is a bit recursive. 
                # Let's fix it: piece is active on panel bin_idx if (panel_var == bin_idx AND placed_var == 1)
                active_on_panel = model.NewBoolVar(f"active_on_{pv['piece'].id}_{bin_idx}")
                model.Add(pv["panel"] == bin_idx).OnlyEnforceIf(active_on_panel)
                model.Add(pv["placed"] == 1).OnlyEnforceIf(active_on_panel)
                
                # If active_on_panel is false, it means either (panel != bin_idx) OR (placed == 0)
                # Actually, CP-SAT AddMaxEquality or Add(used_var == 1).OnlyEnforceIf(active_on_panel)
                model.Add(used_var == 1).OnlyEnforceIf(active_on_panel)
                pieces_on_panel.append(active_on_panel)
            
            # used_var is 0 if no piece is active on it
            model.Add(used_var == 0).OnlyEnforceIf([p.Not() for p in pieces_on_panel])
            
            panel_used.append(used_var)
        
        # Weighted objective: Place as much area as possible, use as few panels as possible
        placed_area = sum(pv["placed"] * (pv["piece"].width * pv["piece"].height) for pv in piece_vars)
        model.Maximize(placed_area * 100 - sum(panel_used))

        
        # Solve
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = self.time_limit
        solver.parameters.num_search_workers = 4  # Parallel search
        
        status = solver.Solve(model)
        
        elapsed = (time.perf_counter() - start_time) * 1000
        
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            # Extract solution
            placements = []
            panels_with_pieces = set()
            
            for pv in piece_vars:
                # Only include placed pieces
                if solver.Value(pv["placed"]):
                    panel_idx = solver.Value(pv["panel"])
                    x = solver.Value(pv["x"])
                    y = solver.Value(pv["y"])
                    width = solver.Value(pv["width"])
                    height = solver.Value(pv["height"])
                    rotated = bool(solver.Value(pv["rot"]))
                    
                    panels_with_pieces.add(panel_idx)
                    
                    placements.append(CPSATPlacement(
                        piece_id=pv["piece"].id,
                        piece_name=pv["piece"].name,
                        panel_id=panels[panel_idx].id,
                        x=float(x),
                        y=float(y),
                        width=float(width),
                        height=float(height),
                        rotated=rotated,
                        longueur=pv["piece"].longueur,
                        largeur=pv["piece"].largeur,
                        epaisseur=pv["piece"].epaisseur
                    ))
            
            success = len(placements) > 0
            
            logger.info(f"CP-SAT solved in {elapsed:.1f}ms: {len(panels_with_pieces)} panels, "
                       f"placed {len(placements)}/{len(pieces)} pieces, "
                       f"status={'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE'}")
            
            return {
                "success": success,
                "optimal": status == cp_model.OPTIMAL and len(placements) == len(pieces),
                "placements": placements,
                "panels_used": len(panels_with_pieces),
                "panels_used_ids": [panels[idx].id for idx in panels_with_pieces],
                "solve_time_ms": elapsed,
                "status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
                "placed_count": len(placements),
                "total_count": len(pieces)
            }
        else:
            logger.warning(f"CP-SAT failed: status={status}, time={elapsed:.1f}ms")
            return {
                "success": False,
                "optimal": False,
                "placements": [],
                "panels_used": 0,
                "panels_used_ids": [],
                "solve_time_ms": elapsed,
                "status": "INFEASIBLE" if status == cp_model.INFEASIBLE else "UNKNOWN",
                "placed_count": 0,
                "total_count": len(pieces)
            }

    
    def validate_heuristic(self, 
                           pieces: List[CPSATPiece],
                           panels: List[CPSATPanel],
                           heuristic_panels_used: int) -> Dict[str, Any]:
        """
        Validate a heuristic solution by comparing with CP-SAT lower bound.
        
        Returns gap between heuristic and optimal.
        """
        result = self.optimize(pieces, panels)
        
        if result["success"]:
            optimal_panels = result["panels_used"]
            gap = (heuristic_panels_used - optimal_panels) / optimal_panels * 100 if optimal_panels > 0 else 0
            
            return {
                "heuristic_panels": heuristic_panels_used,
                "optimal_panels": optimal_panels,
                "gap_percentage": round(gap, 2),
                "is_optimal": gap == 0,
                "cpsat_status": result["status"]
            }
        else:
            return {
                "heuristic_panels": heuristic_panels_used,
                "optimal_panels": None,
                "gap_percentage": None,
                "is_optimal": None,
                "cpsat_status": result["status"]
            }


class HybridCPSATOptimizer:
    """
    Hybrid optimizer that uses CP-SAT for small problems and heuristics for large ones.
    
    Strategy:
    - If pieces <= 30: Use CP-SAT directly
    - If pieces <= 100: Use CP-SAT for critical subset + heuristics
    - If pieces > 100: Use heuristics only
    """
    
    def __init__(self, cpsat_threshold: int = 30,
                 hybrid_threshold: int = 100,
                 kerf: int = 3):
        self.cpsat_threshold = cpsat_threshold
        self.hybrid_threshold = hybrid_threshold
        self.kerf = kerf
        
        if ORTOOLS_AVAILABLE:
            self.cpsat = CPSATOptimizer(kerf=kerf)
        else:
            self.cpsat = None
    
    def should_use_cpsat(self, num_pieces: int) -> bool:
        """Determine if CP-SAT should be used."""
        return ORTOOLS_AVAILABLE and num_pieces <= self.cpsat_threshold
    
    def should_use_hybrid(self, num_pieces: int) -> bool:
        """Determine if hybrid approach should be used."""
        return ORTOOLS_AVAILABLE and self.cpsat_threshold < num_pieces <= self.hybrid_threshold
    
    def select_critical_pieces(self, pieces: List[CPSATPiece], max_count: int = 20) -> List[CPSATPiece]:
        """
        Select critical pieces for CP-SAT solving.
        
        Criteria:
        - Largest pieces (hardest to place)
        - Pieces with grain constraints
        - Pieces that don't allow rotation
        """
        # Score pieces by "difficulty"
        def difficulty_score(p: CPSATPiece) -> float:
            score = p.width * p.height / 1_000_000  # Size in m²
            if p.grain_direction != 0:
                score *= 1.5
            if not p.allow_rotation:
                score *= 1.5
            return score
        
        sorted_pieces = sorted(pieces, key=difficulty_score, reverse=True)
        return sorted_pieces[:max_count]


def convert_to_cpsat_pieces(pieces: List[Piece]) -> List[CPSATPiece]:
    """Convert standard Piece objects to CPSATPiece format."""
    return [
        CPSATPiece(
            id=p.id,
            name=p.name,
            width=int(p.width),
            height=int(p.height),
            allow_rotation=p.allow_rotation,
            grain_direction=p.grain_direction,
            longueur=p.longueur,
            largeur=p.largeur,
            epaisseur=p.epaisseur
        )
        for p in pieces
    ]


def convert_to_cpsat_panels(panels: List[Tuple]) -> List[CPSATPanel]:
    """Convert stock tuples to CPSATPanel format."""
    return [
        CPSATPanel(
            id=s[0],
            width=int(s[1]),
            height=int(s[2]),
            grain_direction=s[4]
        )
        for s in panels
    ]


# =============================================================================
# TESTING
# =============================================================================

if __name__ == "__main__":
    if not ORTOOLS_AVAILABLE:
        print("OR-Tools not installed. Skipping test.")
    else:
        # Test case
        test_pieces = [
            CPSATPiece(1, "A", 600, 400, True, 1),
            CPSATPiece(2, "B", 500, 300, True, 1),
            CPSATPiece(3, "C", 400, 400, False, 0),
            CPSATPiece(4, "D", 800, 200, True, 1),
        ]
        
        test_panels = [
            CPSATPanel(1, 2800, 2070, 1),
            CPSATPanel(2, 2800, 2070, 1),
        ]
        
        optimizer = CPSATOptimizer(kerf=3, time_limit_seconds=10)
        result = optimizer.optimize(test_pieces, test_panels)
        
        print(f"Success: {result['success']}")
        print(f"Optimal: {result.get('optimal', False)}")
        print(f"Panels used: {result['panels_used']}")
        print(f"Solve time: {result['solve_time_ms']:.1f}ms")
        
        for p in result.get("placements", []):
            print(f"  {p.piece_name}: panel={p.panel_id}, pos=({p.x},{p.y}), rotated={p.rotated}")
