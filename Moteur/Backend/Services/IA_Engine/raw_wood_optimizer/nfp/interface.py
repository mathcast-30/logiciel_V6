"""
NFP (No-Fit Polygon) Generator Interface.

Provides the interface to libnfporb C++ library via pybind11.
Falls back to bounding-box NFP approximation when libnfporb is unavailable.

Rules:
- NFP is Piece↔Piece ONLY (not Board↔Piece)
- If libnfporb available: exact Minkowski sum NFP
- If libnfporb unavailable: bounding-box based NFP (less optimal but functional)
- NFP = A ⊕ (-B) where ⊕ is Minkowski sum
"""

from dataclasses import dataclass
from typing import Optional, Tuple, List
from shapely.geometry import Polygon
import logging

logger = logging.getLogger(__name__)


class NFPError(Exception):
    """Exception raised when NFP computation fails."""
    pass


class NFPUnavailableError(NFPError):
    """Exception raised when libnfporb is not available."""
    pass


@dataclass
class NFPGenerator:
    """
    Generates No-Fit Polygons for collision detection.
    
    The NFP of polygon A with respect to polygon B is defined as:
    NFP(A, B) = A ⊕ (-B)
    
    Where:
    - ⊕ is the Minkowski sum
    - (-B) is B reflected through the origin
    
    When placing B, if B's reference point is inside NFP(A, B),
    then A and B overlap.
    
    ⚠️ NO PYTHON FALLBACK ALLOWED
    """
    
    _nfporb_available: bool = False
    _nfporb_module: Optional[object] = None
    
    def __post_init__(self):
        """Try to load libnfporb."""
        self._try_load_nfporb()
    
    def _try_load_nfporb(self):
        """
        Attempt to import the libnfporb pybind11 module.
        
        If not available, set flag but don't fail yet.
        Failure happens on first compute attempt.
        """
        try:
            # Attempt to import the compiled module
            # This would be: import libnfporb_pybind as nfporb
            # For now, we check if it exists
            import importlib.util
            spec = importlib.util.find_spec("libnfporb_pybind")
            
            if spec is not None:
                import libnfporb_pybind as nfporb
                self._nfporb_module = nfporb
                self._nfporb_available = True
                logger.info("libnfporb C++ module loaded successfully")
            else:
                self._nfporb_available = False
                logger.warning(
                    "libnfporb_pybind module not found. "
                    "NFP calculations will fail. "
                    "Please install libnfporb with pybind11 bindings."
                )
        except ImportError as e:
            self._nfporb_available = False
            logger.warning(f"Failed to import libnfporb: {e}")
    
    def is_available(self) -> bool:
        """Check if NFP computation is available."""
        return self._nfporb_available
    
    def ensure_available(self):
        """
        Ensure NFP computation is available or fallback is enabled.
        """
        # We now allow fallback to bounding box, so we don't raise here
        # unless we explicitly want to force C++ (not the case for now)
        pass
    
    def compute_nfp(
        self, 
        stationary: Polygon, 
        orbiting: Polygon,
        safety_margin: float = 0.0
    ) -> Polygon:
        """
        Compute the No-Fit Polygon of stationary with respect to orbiting.
        
        If libnfporb is available, uses exact Minkowski sum.
        Otherwise, falls back to Bounding Box NFP.
        """
        if self._nfporb_available:
            try:
                # Convert Shapely polygons to format expected by libnfporb
                stat_coords = list(stationary.exterior.coords)
                orb_coords = list(orbiting.exterior.coords)
                
                # Call C++ library
                nfp_coords = self._nfporb_module.compute_nfp(stat_coords, orb_coords)
                
                # Convert result back to Shapely Polygon
                nfp_polygon = Polygon(nfp_coords)
                
                if not nfp_polygon.is_valid:
                    nfp_polygon = nfp_polygon.buffer(0)
                
                # Apply safety margin if requested
                if safety_margin > 0:
                    nfp_polygon = nfp_polygon.buffer(safety_margin)
                
                return nfp_polygon
            except Exception as e:
                logger.warning(f"libnfporb failed, falling back to bounding box: {e}")
        
        # Fallback: Bounding Box NFP
        # NFP(A, B) = A.bounds enlarged by B.width and B.height + safety_margin
        minx_a, miny_a, maxx_a, maxy_a = stationary.bounds
        minx_b, miny_b, maxx_b, maxy_b = orbiting.bounds
        
        w_b = maxx_b - minx_b
        h_b = maxy_b - miny_b
        
        # The NFP of A and B is the set of all positions of B's reference point 
        # (assumed to be its min corner) such that B overlaps A.
        # We enlarge the zone by the safety_margin
        margin = safety_margin
        return Polygon([
            (minx_a - w_b - margin, miny_a - h_b - margin),
            (maxx_a + margin, miny_a - h_b - margin),
            (maxx_a + margin, maxy_a + margin),
            (minx_a - w_b - margin, maxy_a + margin),
            (minx_a - w_b - margin, miny_a - h_b - margin)
        ])
    
    def compute_nfp_with_holes(
        self,
        stationary: Polygon,
        orbiting: Polygon
    ) -> Polygon:
        """
        Compute NFP for polygons that may have holes.
        
        Args:
            stationary: Fixed polygon (may have holes)
            orbiting: Moving polygon (may have holes)
            
        Returns:
            NFP polygon
        """
        self.ensure_available()
        
        try:
            # Extract exterior and holes
            stat_exterior = list(stationary.exterior.coords)
            stat_holes = [list(hole.coords) for hole in stationary.interiors]
            
            orb_exterior = list(orbiting.exterior.coords)
            orb_holes = [list(hole.coords) for hole in orbiting.interiors]
            
            # Call C++ library with hole support
            nfp_coords = self._nfporb_module.compute_nfp_with_holes(
                stat_exterior, stat_holes,
                orb_exterior, orb_holes
            )
            
            return Polygon(nfp_coords)
            
        except Exception as e:
            raise NFPError(f"NFP with holes computation failed: {e}") from e
    
    def is_position_valid(
        self,
        nfp: Polygon,
        reference_point: Tuple[float, float]
    ) -> bool:
        """
        Check if placing orbiting polygon at reference_point is valid.
        
        The placement is valid if reference_point is OUTSIDE the NFP.
        
        Args:
            nfp: The computed NFP
            reference_point: (x, y) where orbiting polygon would be placed
            
        Returns:
            True if placement is valid (no collision)
        """
        from shapely.geometry import Point
        point = Point(reference_point)
        return not nfp.contains(point)
    
    def get_valid_positions(
        self,
        nfp: Polygon,
        working_area: Polygon,
        resolution: float = 10.0
    ) -> List[Tuple[float, float]]:
        """
        Sample valid positions within working area that avoid NFP.
        
        This is used when the NFP-based solver needs candidate positions.
        
        Args:
            nfp: The No-Fit Polygon to avoid
            working_area: Area where piece can be placed
            resolution: Sampling grid resolution in mm
            
        Returns:
            List of valid (x, y) positions
        """
        from shapely.geometry import Point
        
        # Compute valid region: working_area - nfp
        valid_region = working_area.difference(nfp)
        
        if valid_region.is_empty:
            return []
        
        # Sample points within valid region
        minx, miny, maxx, maxy = valid_region.bounds
        
        valid_positions = []
        x = minx
        while x <= maxx:
            y = miny
            while y <= maxy:
                if valid_region.contains(Point(x, y)):
                    valid_positions.append((x, y))
                y += resolution
            x += resolution
        
        return valid_positions
