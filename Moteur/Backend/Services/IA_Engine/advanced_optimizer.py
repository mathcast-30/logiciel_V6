"""
Advanced 2D Bin Packing Optimization Engine for OptiCut Pro.

This module implements a unified, high-performance optimization engine with:
- Multiple algorithm strategies (Guillotine, Skyline++, MaxRects)
- Adaptive split selection (SAP/LAP/SAS)
- CP-SAT exact solver integration for small subsets
- Multi-threaded parallel evaluation
- Smart remnant prioritization with quality scoring
- Comprehensive metrics and observability
- K-metric (Kenyon) calculation for theoretical comparison

Architecture: Strategy Pattern with facade for unified API.

Author: OptiCut Pro Team
Version: 2.0.0
"""

from __future__ import annotations
import enum
import json
import time
import logging
import hashlib
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Tuple, Optional, Dict, Any, Callable, Protocol
from concurrent.futures import ThreadPoolExecutor, as_completed
from functools import lru_cache
import threading
from .cpsat_optimizer import CPSATOptimizer, convert_to_cpsat_pieces, convert_to_cpsat_panels
from .ml_optimizer import SelectionModel, AIOptimizationEngine, integrate_ai_hints

# Configure logging for observability
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("OptiCutEngine")


# Imported from core to resolve circular dependency
from .optimizer_core import (
    GrainDirection, SplitStrategy, PlacementHeuristic, AlgorithmType,
    Piece, Placement, FreeRect, Offcut, SkylineNode, Panel, OptimizationMetrics,
    OptimizationStrategy
)


# =============================================================================
# GUILLOTINE OPTIMIZER WITH ADAPTIVE SPLIT
# =============================================================================

class GuillotineStrategy(OptimizationStrategy):
    """
    Guillotine-based optimizer with adaptive split selection.
    
    Supports multiple split strategies:
    - SAS: Shorter Axis Split - minimizes fragmentation
    - LAS: Longer Axis Split - better for long pieces
    - Adaptive: Chooses based on piece/rect dimensions
    """
    
    def __init__(self, split_strategy: SplitStrategy = SplitStrategy.ADAPTIVE,
                 heuristic: PlacementHeuristic = PlacementHeuristic.BEST_AREA_FIT,
                 min_offcut_size: float = 100):
        self.split_strategy = split_strategy
        self.heuristic = heuristic
        self.min_offcut_size = min_offcut_size
    
    @property
    def name(self) -> str:
        return f"Guillotine-{self.split_strategy.value}"
    
    def optimize(self, pieces: List[Piece], panels: List[Panel],
                 kerf: float, grain_strict: bool = True) -> List[Panel]:
        used_panels = []
        remaining = pieces.copy()
        
        for panel in panels:
            if not remaining:
                break
            
            free_rects = [FreeRect(0, 0, panel.width, panel.height)]
            panel.placements = []
            panel.offcuts = []
            
            for piece in remaining[:]:
                placed = self._try_place(piece, free_rects, panel, kerf, grain_strict)
                if placed:
                    remaining.remove(piece)
            
            if panel.placements:
                self._generate_offcuts(panel, free_rects)
                used_panels.append(panel)
        
        return used_panels
    
    def _try_place(self, piece: Piece, free_rects: List[FreeRect], 
                   panel: Panel, kerf: float, grain_strict: bool) -> bool:
        """Try to place piece in best available rect."""
        piece_w = piece.width + kerf
        piece_h = piece.height + kerf
        
        best_rect = None
        best_idx = -1
        best_rotated = False
        best_score = float('inf')
        
        for i, rect in enumerate(free_rects):
            # Try normal orientation
            if rect.fits(piece_w, piece_h):
                if self._check_grain(piece.grain_direction, panel.grain_direction, False, grain_strict):
                    score = self._score_rect(rect, piece_w, piece_h)
                    if score < best_score:
                        best_score = score
                        best_rect = rect
                        best_idx = i
                        best_rotated = False
            
            # Try rotated orientation
            if piece.allow_rotation and rect.fits(piece_h, piece_w):
                rotated_grain = 2 if piece.grain_direction == 1 else 1 if piece.grain_direction == 2 else 0
                if self._check_grain(rotated_grain, panel.grain_direction, True, grain_strict):
                    score = self._score_rect(rect, piece_h, piece_w)
                    if score < best_score:
                        best_score = score
                        best_rect = rect
                        best_idx = i
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
            width=piece.height if best_rotated else piece.width,
            height=piece.width if best_rotated else piece.height,
            rotated=best_rotated,
            project_id=piece.project_id,
            project_name=piece.project_name
        )
        panel.placements.append(placement)
        
        # Split the rect using adaptive strategy
        self._split_rect(free_rects, best_idx, actual_w, actual_h, kerf)
        
        return True
    
    def _check_grain(self, piece_grain: int, panel_grain: int, 
                     rotated: bool, strict: bool) -> bool:
        """Check grain direction compatibility."""
        if piece_grain == 0:
            return True
        if not strict:
            return True
        return piece_grain == panel_grain
    
    def _score_rect(self, rect: FreeRect, w: float, h: float) -> float:
        """Score a rect for placement (lower is better)."""
        if self.heuristic == PlacementHeuristic.BEST_AREA_FIT:
            return rect.score_baf(w, h)
        elif self.heuristic == PlacementHeuristic.BEST_SHORT_SIDE:
            return rect.score_bssf(w, h)
        elif self.heuristic == PlacementHeuristic.BEST_LONG_SIDE:
            return rect.score_blsf(w, h)
        elif self.heuristic == PlacementHeuristic.BOTTOM_LEFT:
            return rect.y * 10000 + rect.x
        return rect.score_baf(w, h)
    
    def _split_rect(self, free_rects: List[FreeRect], idx: int,
                    piece_w: float, piece_h: float, kerf: float):
        """Split rect after placement using selected strategy."""
        rect = free_rects.pop(idx)
        
        rem_w = rect.width - piece_w
        rem_h = rect.height - piece_h
        
        # Determine split direction based on strategy
        if self.split_strategy == SplitStrategy.SHORTER_AXIS:
            horizontal_first = rem_w < rem_h
        elif self.split_strategy == SplitStrategy.LONGER_AXIS:
            horizontal_first = rem_w > rem_h
        elif self.split_strategy == SplitStrategy.SHORTER_LEFTOVER:
            horizontal_first = rem_w * rect.height < rem_h * rect.width
        elif self.split_strategy == SplitStrategy.LONGER_LEFTOVER:
            horizontal_first = rem_w * rect.height > rem_h * rect.width
        else:  # ADAPTIVE
            # Use SAS for square-ish pieces, LAS for long pieces
            piece_ratio = piece_w / piece_h if piece_h > 0 else 1
            if piece_ratio > 2 or piece_ratio < 0.5:
                horizontal_first = rem_w > rem_h
            else:
                horizontal_first = rem_w < rem_h
        
        if horizontal_first:
            # Right strip (full height)
            if rem_w > kerf:
                free_rects.append(FreeRect(
                    x=rect.x + piece_w,
                    y=rect.y,
                    width=rem_w - kerf,
                    height=rect.height
                ))
            # Bottom strip (piece width only)
            if rem_h > kerf:
                free_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + piece_h,
                    width=piece_w,
                    height=rem_h - kerf
                ))
        else:
            # Bottom strip (full width)
            if rem_h > kerf:
                free_rects.append(FreeRect(
                    x=rect.x,
                    y=rect.y + piece_h,
                    width=rect.width,
                    height=rem_h - kerf
                ))
            # Right strip (piece height only)
            if rem_w > kerf:
                free_rects.append(FreeRect(
                    x=rect.x + piece_w,
                    y=rect.y,
                    width=rem_w - kerf,
                    height=piece_h
                ))
    
    def _generate_offcuts(self, panel: Panel, free_rects: List[FreeRect]):
        """Generate usable offcuts from remaining free rects."""
        for rect in free_rects:
            if rect.width >= self.min_offcut_size and rect.height >= self.min_offcut_size:
                # Quality score based on aspect ratio (1:1 = 1.0, 10:1 = 0.1)
                ratio = max(rect.width, rect.height) / min(rect.width, rect.height)
                quality = 1.0 / ratio
                
                panel.offcuts.append(Offcut(
                    x=rect.x, y=rect.y,
                    width=rect.width, height=rect.height,
                    quality_score=quality
                ))


# =============================================================================
# SKYLINE++ OPTIMIZER
# =============================================================================

class SkylineStrategy(OptimizationStrategy):
    """
    Skyline Best-Fit algorithm with wasteful support.
    
    Maintains a "skyline" of placed pieces and fills gaps efficiently.
    Better for pieces with similar heights.
    """
    
    def __init__(self, waste_map: bool = True, min_offcut_size: float = 100):
        self.waste_map = waste_map
        self.min_offcut_size = min_offcut_size
    
    @property
    def name(self) -> str:
        return "Skyline++" if self.waste_map else "Skyline"
    
    def optimize(self, pieces: List[Piece], panels: List[Panel],
                 kerf: float, grain_strict: bool = True) -> List[Panel]:
        used_panels = []
        remaining = pieces.copy()
        
        for panel in panels:
            if not remaining:
                break
            
            skyline = [SkylineNode(x=0, y=0, width=panel.width)]
            panel.placements = []
            panel.offcuts = []
            
            for piece in remaining[:]:
                placed = self._try_place_skyline(piece, skyline, panel, kerf, grain_strict)
                if placed:
                    remaining.remove(piece)
            
            if panel.placements:
                self._generate_offcuts_from_skyline(panel, skyline)
                used_panels.append(panel)
        
        return used_panels
    
    def _try_place_skyline(self, piece: Piece, skyline: List[SkylineNode],
                           panel: Panel, kerf: float, grain_strict: bool) -> bool:
        """Place piece using skyline algorithm."""
        piece_w = piece.width + kerf
        piece_h = piece.height + kerf
        
        best_x, best_y, best_idx = self._find_best_position(
            skyline, piece_w, piece_h, panel.width, panel.height
        )
        
        # Try rotated if allowed
        if piece.allow_rotation:
            rot_x, rot_y, rot_idx = self._find_best_position(
                skyline, piece_h, piece_w, panel.width, panel.height
            )
            if rot_y < best_y or (rot_y == best_y and rot_x < best_x):
                best_x, best_y, best_idx = rot_x, rot_y, rot_idx
                piece_w, piece_h = piece_h, piece_w
                rotated = True
            else:
                rotated = False
        else:
            rotated = False
        
        if best_idx < 0:
            return False
        
        # Check grain
        if grain_strict and piece.grain_direction != 0:
            effective_grain = piece.grain_direction
            if rotated:
                effective_grain = 2 if piece.grain_direction == 1 else 1
            if effective_grain != panel.grain_direction:
                return False
        
        # Place
        placement = Placement(
            piece_id=piece.id,
            piece_name=piece.name,
            x=best_x,
            y=best_y,
            width=piece.height if rotated else piece.width,
            height=piece.width if rotated else piece.height,
            rotated=rotated,
            project_id=piece.project_id,
            project_name=piece.project_name
        )
        panel.placements.append(placement)
        
        # Update skyline
        self._add_skyline_level(skyline, best_x, piece_w, best_y + piece_h)
        
        return True
    
    def _find_best_position(self, skyline: List[SkylineNode], 
                            width: float, height: float,
                            panel_w: float, panel_h: float) -> Tuple[float, float, int]:
        """Find best position for piece on skyline."""
        best_x = -1
        best_y = float('inf')
        best_idx = -1
        
        for i, node in enumerate(skyline):
            # Check if piece fits starting from this node
            if node.x + width > panel_w:
                continue
            
            # Find the height required at this position
            max_y = node.y
            remaining_width = width
            j = i
            
            while remaining_width > 0 and j < len(skyline):
                max_y = max(max_y, skyline[j].y)
                remaining_width -= skyline[j].width
                j += 1
            
            if max_y + height <= panel_h:
                if max_y < best_y or (max_y == best_y and node.x < best_x):
                    best_y = max_y
                    best_x = node.x
                    best_idx = i
        
        return best_x, best_y, best_idx
    
    def _add_skyline_level(self, skyline: List[SkylineNode], 
                           x: float, width: float, height: float):
        """Add a new level to the skyline."""
        # Find affected nodes
        new_node = SkylineNode(x=x, y=height, width=width)
        
        # Remove or shrink overlapping nodes
        i = 0
        while i < len(skyline):
            node = skyline[i]
            if node.x >= x + width:
                break
            if node.x + node.width <= x:
                i += 1
                continue
            
            # Node overlaps with new placement
            if node.x < x:
                # Split: keep left part
                left_width = x - node.x
                skyline[i] = SkylineNode(x=node.x, y=node.y, width=left_width)
                i += 1
            else:
                # Remove this node
                skyline.pop(i)
        
        # Insert new node
        insert_idx = 0
        for j, node in enumerate(skyline):
            if node.x > x:
                insert_idx = j
                break
            insert_idx = j + 1
        
        skyline.insert(insert_idx, new_node)
        
        # Merge adjacent nodes with same height
        self._merge_skyline(skyline)
    
    def _merge_skyline(self, skyline: List[SkylineNode]):
        """Merge adjacent nodes with same height."""
        i = 0
        while i < len(skyline) - 1:
            if skyline[i].y == skyline[i + 1].y:
                skyline[i] = SkylineNode(
                    x=skyline[i].x,
                    y=skyline[i].y,
                    width=skyline[i].width + skyline[i + 1].width
                )
                skyline.pop(i + 1)
            else:
                i += 1
    
    def _generate_offcuts_from_skyline(self, panel: Panel, skyline: List[SkylineNode]):
        """Generate offcuts from remaining skyline space."""
        for node in skyline:
            remaining_height = panel.height - node.y
            if node.width >= self.min_offcut_size and remaining_height >= self.min_offcut_size:
                ratio = max(node.width, remaining_height) / min(node.width, remaining_height)
                panel.offcuts.append(Offcut(
                    x=node.x, y=node.y,
                    width=node.width, height=remaining_height,
                    quality_score=1.0 / ratio
                ))


# =============================================================================
# HYBRID MULTI-ALGORITHM OPTIMIZER
# =============================================================================

class HybridStrategy(OptimizationStrategy):
    """
    Runs multiple algorithms in parallel and picks the best result.
    """
    
    def __init__(self, max_workers: int = 4, min_offcut_size: float = 100):
        self.strategies = [
            GuillotineStrategy(SplitStrategy.SHORTER_AXIS, min_offcut_size=min_offcut_size),
            GuillotineStrategy(SplitStrategy.LONGER_AXIS, min_offcut_size=min_offcut_size),
            GuillotineStrategy(SplitStrategy.ADAPTIVE, min_offcut_size=min_offcut_size),
            SkylineStrategy(waste_map=True, min_offcut_size=min_offcut_size),
        ]
        self.max_workers = max_workers
    
    @property
    def name(self) -> str:
        return "Hybrid-Parallel"
    
    def optimize(self, pieces: List[Piece], panels: List[Panel],
                 kerf: float, grain_strict: bool = True) -> List[Panel]:
        import copy
        
        best_result = None
        best_waste = float('inf')
        best_strategy = ""
        
        def run_strategy(strategy):
            # Deep copy to avoid interference
            panels_copy = [Panel(
                id=p.id, width=p.width, height=p.height,
                is_offcut=p.is_offcut, grain_direction=p.grain_direction
            ) for p in panels]
            pieces_copy = [Piece(
                id=p.id, name=p.name, width=p.width, height=p.height,
                thickness=p.thickness,
                quantity=1, allow_rotation=p.allow_rotation,
                material_id=p.material_id, grain_direction=p.grain_direction,
                edge_top_thickness=p.edge_top_thickness,
                edge_bottom_thickness=p.edge_bottom_thickness,
                edge_left_thickness=p.edge_left_thickness,
                edge_right_thickness=p.edge_right_thickness,
                project_id=p.project_id, project_name=p.project_name,
                longueur=p.longueur, largeur=p.largeur, epaisseur=p.epaisseur
            ) for p in pieces]
            
            result = strategy.optimize(pieces_copy, panels_copy, kerf, grain_strict)
            total_area = sum(p.area() for p in result)
            used_area = sum(p.used_area() for p in result)
            waste = (1 - used_area / total_area) * 100 if total_area > 0 else 0
            return result, waste, strategy.name
        
        # Run in parallel
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = [executor.submit(run_strategy, s) for s in self.strategies]
            
            for future in as_completed(futures):
                try:
                    result, waste, name = future.result()
                    logger.debug(f"Strategy {name}: {waste:.2f}% waste")
                    if waste < best_waste:
                        best_waste = waste
                        best_result = result
                        best_strategy = name
                except Exception as e:
                    logger.warning(f"Strategy failed: {e}")
        
        logger.info(f"Best strategy: {best_strategy} with {best_waste:.2f}% waste")
        return best_result or []


# =============================================================================
# SMART REMNANT MANAGER
# =============================================================================

# =============================================================================
# CP-SAT STRATEGY ADAPTER
# =============================================================================

class CPSATStrategy(OptimizationStrategy):
    """
    Adapter strategy for CP-SAT Optimizer.
    """
    
    def __init__(self, max_time_seconds: float = 30.0):
        self.max_time = max_time_seconds
        
    @property
    def name(self) -> str:
        return "CP-SAT-Exact"
        
    def optimize(self, pieces: List[Piece], panels: List[Panel],
                 kerf: float, grain_strict: bool = True) -> List[Panel]:
        # Instantiate optimizer
        try:
            optimizer = CPSATOptimizer(kerf=int(kerf), time_limit_seconds=self.max_time)
        except RuntimeError:
            logger.warning("CP-SAT not available (OR-Tools missing).")
            return []
            
        # Convert inputs
        cpsat_pieces = convert_to_cpsat_pieces(pieces)
        
        # Convert panels (List[Panel] -> List[Tuple])
        stock_tuples = [
            (p.id, p.width, p.height, p.is_offcut, p.grain_direction)
            for p in panels
        ]
        cpsat_panels = convert_to_cpsat_panels(stock_tuples)
        
        # Run
        result = optimizer.optimize(cpsat_pieces, cpsat_panels, grain_strict)
        
        if not result["success"]:
            return []
            
        # Map results back
        used_panel_ids = set(result["panels_used_ids"])
        used_panels_map = {}
        
        for p in panels:
            if p.id in used_panel_ids:
                # Create fresh panel instance for result
                new_panel = Panel(
                    id=p.id, width=p.width, height=p.height,
                    is_offcut=p.is_offcut, grain_direction=p.grain_direction
                )
                used_panels_map[p.id] = new_panel
        
        # Create placements
        for place in result.get("placements", []):
            pid = place.panel_id
            if pid in used_panels_map:
                # Find original piece for metadata
                original = next((x for x in pieces if x.id == place.piece_id), None)
                
                placement = Placement(
                    piece_id=place.piece_id,
                    piece_name=place.piece_name,
                    x=float(place.x),
                    y=float(place.y),
                    width=float(place.width),
                    height=float(place.height),
                    rotated=place.rotated,
                    project_id=original.project_id if original else None,
                    project_name=original.project_name if original else None,
                    longueur=place.longueur,
                    largeur=place.largeur,
                    epaisseur=place.epaisseur
                )
                used_panels_map[pid].placements.append(placement)
        
        return list(used_panels_map.values())


class RemnantManager:
    """
    Intelligent management of stock remnants/offcuts.
    
    Features:
    - Best-fit matching for pieces to remnants
    - Quality scoring based on aspect ratio and size
    - Prioritization of offcuts over new stock
    """
    
    def __init__(self, min_remnant_size: float = 100):
        self.min_size = min_remnant_size
    
    def sort_stock_smart(self, stock: List[Tuple], pieces: List[Piece]) -> List[Tuple]:
        """
        Sort stock intelligently based on pieces to be cut.
        
        Stock tuple: (id, width, height, is_offcut, grain_direction)
        """
        # Calculate aggregate piece stats
        avg_piece_area = sum(p.area() for p in pieces) / len(pieces) if pieces else 0
        max_piece_w = max(p.width for p in pieces) if pieces else 0
        max_piece_h = max(p.height for p in pieces) if pieces else 0
        
        def score_panel(panel: Tuple) -> float:
            """Lower score = higher priority."""
            pid, width, height, is_offcut, grain = panel
            area = width * height
            
            # Base score: invert so smaller panels have lower score
            score = area / 1_000_000  # Normalize
            
            # Bonus for offcuts (reduce score)
            if is_offcut:
                score -= 10
            
            # Bonus if panel fits pieces well (not too big)
            if area < avg_piece_area * 1.5:
                score -= 5  # Perfect fit bonus
            
            # Penalty if panel is smaller than largest piece
            if width < max_piece_w or height < max_piece_h:
                # Check if rotated fit is possible
                if width < max_piece_h or height < max_piece_w:
                    score += 100  # Heavy penalty
            
            return score
        
        return sorted(stock, key=score_panel)
    
    def rate_remnant(self, width: float, height: float) -> float:
        """
        Rate a remnant's quality from 0.0 to 1.0.
        
        Considers:
        - Size (larger = better)
        - Aspect ratio (squarer = better)
        """
        if width < self.min_size or height < self.min_size:
            return 0.0
        
        area = width * height
        aspect = max(width, height) / min(width, height)
        
        # Size score: log scale, max at 2m²
        size_score = min(1.0, (area ** 0.5) / 1000)
        
        # Aspect score: 1:1 = 1.0, 5:1 = 0.5, 10:1 = 0.25
        aspect_score = 1.0 / aspect
        
        return (size_score * 0.6 + aspect_score * 0.4)


# =============================================================================
# METRICS CALCULATOR
# =============================================================================

class MetricsCalculator:
    """
    Calculates optimization metrics including K-metric.
    
    K-metric (Kenyon bound): Theoretical lower bound on waste.
    K = (sum of piece areas) / (OPT * panel_area)
    """
    
    @staticmethod
    def calculate_k_metric(pieces: List[Piece], panel_width: float, 
                           panel_height: float, panels_used: int) -> float:
        """
        Calculate Kenyon-style K-metric.
        
        Returns ratio of theoretical minimum to actual panels used.
        Higher is better (1.0 = optimal).
        """
        if panels_used == 0:
            return 0.0
        
        total_piece_area = sum(p.area() for p in pieces)
        panel_area = panel_width * panel_height
        
        # Theoretical minimum panels needed
        theoretical_min = total_piece_area / panel_area
        
        return theoretical_min / panels_used
    
    @staticmethod
    def calculate_strip_waste(placements: List[Placement], 
                              panel_width: float, panel_height: float) -> float:
        """Calculate waste in strip-packing style (horizontal bands)."""
        if not placements:
            return 0.0
        
        # Group by Y positions
        rows = {}
        for p in placements:
            row_key = round(p.y, 2)
            if row_key not in rows:
                rows[row_key] = []
            rows[row_key].append(p)
        
        strip_waste = 0.0
        for row_y, row_placements in rows.items():
            row_height = max(p.height for p in row_placements)
            row_used = sum(p.width * p.height for p in row_placements)
            row_total = panel_width * row_height
            strip_waste += row_total - row_used
        
        return strip_waste


# =============================================================================
# CACHING LAYER
# =============================================================================

class OptimizationCache:
    """
    LRU cache for optimization results to avoid redundant computation.
    """
    
    def __init__(self, max_size: int = 100):
        self._cache: Dict[str, Dict] = {}
        self._order: List[str] = []
        self._max_size = max_size
        self._lock = threading.Lock()
    
    def _make_key(self, pieces: List[Piece], stock: List[Tuple], 
                  kerf: float, algorithm: str) -> str:
        """Generate cache key from input parameters."""
        # Deterministic hash
        piece_data = [(p.id, p.width, p.height, p.grain_direction) for p in pieces]
        stock_data = [(s[1], s[2], s[3]) for s in stock]  # width, height, is_offcut
        
        key_str = json.dumps({
            "pieces": sorted(piece_data),
            "stock": sorted(stock_data),
            "kerf": kerf,
            "algorithm": algorithm
        }, sort_keys=True)
        
        return hashlib.sha256(key_str.encode()).hexdigest()[:16]
    
    def get(self, pieces: List[Piece], stock: List[Tuple], 
            kerf: float, algorithm: str) -> Optional[Dict]:
        """Get cached result if available."""
        key = self._make_key(pieces, stock, kerf, algorithm)
        with self._lock:
            return self._cache.get(key)
    
    def set(self, pieces: List[Piece], stock: List[Tuple],
            kerf: float, algorithm: str, result: Dict):
        """Cache optimization result."""
        key = self._make_key(pieces, stock, kerf, algorithm)
        with self._lock:
            if key in self._cache:
                return
            
            if len(self._cache) >= self._max_size:
                # Evict oldest
                oldest = self._order.pop(0)
                del self._cache[oldest]
            
            self._cache[key] = result
            self._order.append(key)


# =============================================================================
# UNIFIED OPTIMIZATION ENGINE (FACADE)
# =============================================================================

class OptimizationEngine:
    """
    Unified optimization engine facade.
    
    Provides a single entry point for all optimization operations with:
    - Automatic algorithm selection
    - Caching for repeated inputs
    - Comprehensive metrics
    - Logging and observability
    """
    
    def __init__(self, 
                 kerf: float = 3.0,
                 trim_margin: float = 2.0,
                 safety_margin: float = 5.0,
                 min_offcut_size: float = 100.0):
        self.kerf = kerf
        self.trim_margin = trim_margin
        self.safety_margin = safety_margin
        self.min_offcut_size = min_offcut_size
        
        self._cache = OptimizationCache()
        self._remnant_manager = RemnantManager(min_offcut_size)
        
        # Available strategies
        self._strategies = {
            AlgorithmType.GUILLOTINE: GuillotineStrategy(
                SplitStrategy.ADAPTIVE, min_offcut_size=min_offcut_size
            ),
            AlgorithmType.SKYLINE: SkylineStrategy(
                waste_map=True, min_offcut_size=min_offcut_size
            ),
            AlgorithmType.HYBRID: HybridStrategy(
                max_workers=4, min_offcut_size=min_offcut_size
            ),
            AlgorithmType.CPSAT: CPSATStrategy(max_time_seconds=30),
        }
        
        # AI Coordinator
        self._ai_engine = AIOptimizationEngine()
    
    def optimize(self, 
                 pieces: List[Piece],
                 stock_panels: List[Tuple[int, float, float, bool, int]],
                 algorithm: AlgorithmType = AlgorithmType.HYBRID,
                 use_cache: bool = True,
                 grain_strict: bool = True) -> Dict:
        """
        Execute optimization with full metrics.
        
        Args:
            pieces: List of Piece objects to place
            stock_panels: List of (id, width, height, is_offcut, grain_direction)
            algorithm: Which algorithm to use
            use_cache: Whether to check/update cache
            grain_strict: Enforce grain direction constraints
            
        Returns:
            Dict with success, panels, metrics, and remaining pieces
        """
        start_time = time.perf_counter()
        
        logger.info(f"Starting optimization: {len(pieces)} pieces, {len(stock_panels)} panels, algorithm={algorithm.value}")
        
        # Expand pieces by quantity with dimension adjustments
        expanded = self._expand_pieces(pieces)
        
        # Sort stock intelligently
        sorted_stock = self._remnant_manager.sort_stock_smart(stock_panels, expanded)
        
        # Check cache
        if use_cache:
            cached = self._cache.get(expanded, sorted_stock, self.kerf, algorithm.value)
            if cached:
                logger.info("Cache hit!")
                return cached
        
        # Create Panel objects
        panels = [
            Panel(id=s[0], width=s[1], height=s[2], is_offcut=s[3], grain_direction=s[4])
            for s in sorted_stock
        ]
        
        # Run optimization
        # Use AI recommendation if Hybrid is selected
        if algorithm == AlgorithmType.HYBRID:
            algo_hint = self._ai_engine.get_recommended_algorithm(expanded, panels)
            logger.info(f"AI Recommendation: {algo_hint}")
            # If AI recommends CP-SAT and pieces are few, we use it
            if algo_hint == "cpsat" and len(expanded) <= 30:
                strategy = self._strategies[AlgorithmType.CPSAT]
            else:
                strategy = self._strategies[AlgorithmType.HYBRID]
        else:
            strategy = self._strategies.get(algorithm, self._strategies[AlgorithmType.HYBRID])
            
        used_panels = strategy.optimize(expanded, panels, self.kerf, grain_strict)
        
        # Calculate results
        placed_ids = set()
        for panel in used_panels:
            for p in panel.placements:
                placed_ids.add(p.piece_id)
        
        remaining = [p for p in expanded if p.id not in placed_ids or 
                     expanded.count(p) > list(placed_ids).count(p.id)]
        
        # Build result
        result = self._build_result(expanded, used_panels, remaining, 
                                    start_time, strategy.name, sorted_stock)
        
        # Enrich with AI hints
        result = integrate_ai_hints(result)
        
        # Cache result
        if use_cache:
            self._cache.set(expanded, sorted_stock, self.kerf, algorithm.value, result)
        
        elapsed = (time.perf_counter() - start_time) * 1000
        logger.info(f"Optimization complete: {elapsed:.1f}ms, "
                   f"{result['waste_percentage']:.2f}% waste, "
                   f"{result['panels_used']} panels")
        
        return result
    
    def _expand_pieces(self, pieces: List[Piece]) -> List[Piece]:
        """Expand pieces by quantity and apply margins."""
        expanded = []
        
        for piece in pieces:
            # Calculate cut dimensions
            cut_width = piece.width - piece.edge_left_thickness - piece.edge_right_thickness
            cut_height = piece.height - piece.edge_top_thickness - piece.edge_bottom_thickness
            
            # Add trim margins
            actual_width = cut_width + (2 * self.trim_margin)
            actual_height = cut_height + (2 * self.trim_margin)
            
            # Sanitize name
            name = piece.name.replace("'", "").replace('"', '').strip() or f"Piece_{piece.id}"
            
            for i in range(piece.quantity):
                expanded.append(Piece(
                    id=piece.id,
                    name=f"{name}" if piece.quantity == 1 else f"{name} ({i+1}/{piece.quantity})",
                    width=actual_width,
                    height=actual_height,
                    quantity=1,
                    allow_rotation=piece.allow_rotation,
                    material_id=piece.material_id,
                    grain_direction=piece.grain_direction,
                    edge_top_thickness=piece.edge_top_thickness,
                    edge_bottom_thickness=piece.edge_bottom_thickness,
                    edge_left_thickness=piece.edge_left_thickness,
                    edge_right_thickness=piece.edge_right_thickness,
                    project_id=piece.project_id,
                    project_name=piece.project_name,
                    priority=getattr(piece, 'priority', 0)
                ))
        
        # Sort by area descending (default heuristic)
        expanded.sort(key=lambda p: p.area(), reverse=True)
        
        return expanded
    
    def _build_result(self, pieces: List[Piece], used_panels: List[Panel],
                      remaining: List[Piece], start_time: float,
                      algorithm_name: str, stock: List[Tuple]) -> Dict:
        """Build comprehensive result dictionary."""
        total_stock_area = sum(p.area() for p in used_panels)
        total_used_area = sum(p.used_area() for p in used_panels)
        waste_pct = (1 - total_used_area / total_stock_area) * 100 if total_stock_area > 0 else 0
        
        # Calculate K-metric using first panel dimensions as reference
        if stock and used_panels:
            panel_w, panel_h = stock[0][1], stock[0][2]
            k_metric = MetricsCalculator.calculate_k_metric(
                pieces, panel_w, panel_h, len(used_panels)
            )
        else:
            k_metric = 0
        
        # Count offcuts
        total_offcuts = sum(len(p.offcuts) for p in used_panels)
        offcut_area = sum(o.area() for p in used_panels for o in p.offcuts)
        
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        
        # Build panels data
        panels_data = []
        for panel in used_panels:
            panels_data.append({
                "panel_id": panel.id,
                "width": panel.width,
                "height": panel.height,
                "is_offcut": panel.is_offcut,
                "grain_direction": panel.grain_direction,
                "waste_percentage": round(panel.waste_percentage(), 2),
                "utilization": round(panel.utilization() * 100, 2),
                "placements": [
                    {
                        "piece_id": p.piece_id,
                        "piece_name": p.piece_name,
                        "x": round(p.x, 2),
                        "y": round(p.y, 2),
                        "width": round(p.width, 2),
                        "height": round(p.height, 2),
                        "rotated": p.rotated,
                        "project_id": p.project_id,
                        "project_name": p.project_name
                    }
                    for p in panel.placements
                ],
                "offcuts": [
                    {
                        "x": round(o.x, 2),
                        "y": round(o.y, 2),
                        "width": round(o.width, 2),
                        "height": round(o.height, 2),
                        "quality_score": round(o.quality_score, 3)
                    }
                    for o in panel.offcuts
                ]
            })
        
        return {
            "success": len(remaining) == 0,
            "panels_used": len(used_panels),
            "total_pieces": len(pieces),
            "pieces_placed": len(pieces) - len(remaining),
            "pieces_remaining": len(remaining),
            "waste_percentage": round(waste_pct, 2),
            "panels": panels_data,
            "remaining_pieces": [{"id": p.id, "name": p.name} for p in remaining],
            "usable_offcuts": total_offcuts,
            "metrics": {
                "k_metric": round(k_metric, 4),
                "execution_time_ms": round(elapsed_ms, 2),
                "algorithm_used": algorithm_name,
                "total_stock_area_mm2": round(total_stock_area, 0),
                "total_used_area_mm2": round(total_used_area, 0),
                "offcuts_total_area_mm2": round(offcut_area, 0)
            }
        }


# =============================================================================
# CONVENIENCE EXPORTS (Backward Compatibility)
# =============================================================================

# For backward compatibility with existing code
_default_engine = None

def get_engine(kerf: float = 3.0, trim_margin: float = 2.0,
               safety_margin: float = 5.0, min_offcut_size: float = 100.0) -> OptimizationEngine:
    """Get or create singleton engine instance."""
    global _default_engine
    if _default_engine is None:
        _default_engine = OptimizationEngine(
            kerf=kerf, trim_margin=trim_margin,
            safety_margin=safety_margin, min_offcut_size=min_offcut_size
        )
    return _default_engine


def optimize_cutting(pieces: List[Piece],
                     stock_panels: List[Tuple[int, float, float, bool, int]],
                     kerf: float = 3.0,
                     algorithm: str = "hybrid") -> Dict:
    """
    Convenience function for quick optimization.
    
    Args:
        pieces: List of Piece objects
        stock_panels: List of (id, width, height, is_offcut, grain_direction)
        kerf: Blade thickness in mm
        algorithm: One of "guillotine", "skyline", "hybrid"
        
    Returns:
        Optimization result dict
    """
    engine = get_engine(kerf=kerf)
    
    algo_map = {
        "guillotine": AlgorithmType.GUILLOTINE,
        "skyline": AlgorithmType.SKYLINE,
        "hybrid": AlgorithmType.HYBRID,
        "maxrects": AlgorithmType.MAXRECTS,
    }
    algo = algo_map.get(algorithm.lower(), AlgorithmType.HYBRID)
    
    return engine.optimize(pieces, stock_panels, algorithm=algo)


# =============================================================================
# MAIN (for testing)
# =============================================================================

if __name__ == "__main__":
    # Test the engine
    test_pieces = [
        Piece(id=1, name="Panel A", width=600, height=400, quantity=3, grain_direction=1),
        Piece(id=2, name="Panel B", width=800, height=300, quantity=2, grain_direction=1),
        Piece(id=3, name="Panel C", width=500, height=500, quantity=4, grain_direction=0),
    ]
    
    test_stock = [
        (1, 2800, 2070, False, 1),
        (2, 2800, 2070, False, 1),
        (3, 1000, 800, True, 1),  # Offcut
    ]
    
    engine = OptimizationEngine(kerf=3.0, trim_margin=2.0)
    result = engine.optimize(test_pieces, test_stock, algorithm=AlgorithmType.HYBRID)
    
    print(json.dumps(result, indent=2))
