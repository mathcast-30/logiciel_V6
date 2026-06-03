"""
Raw Wood Optimizer Extension.

2D Irregular Strip Packing Problem (2DISPP) solver for solid wood.
Handles irregular shapes, defects, and grain direction constraints.

⚠️ STRICT RULES:
- NFP is MANDATORY (no fallback)
- All pieces are Polygons (no rectangle-specific logic)
- NFP = Piece↔Piece only (Board is admissible space)
- Explicit failure if constraints cannot be satisfied
"""

from .core import RawWoodOptimizer

__all__ = ["RawWoodOptimizer"]
__version__ = "1.0.0"
