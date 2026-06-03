"""
NFP Cache - Memoization for NFP computations.

NFP computation is expensive. Since pieces and boards are reused,
we cache computed NFPs to avoid redundant calculations.
"""

from dataclasses import dataclass, field
from typing import Dict, Tuple, Optional
from shapely.geometry import Polygon
import hashlib
import logging

logger = logging.getLogger(__name__)


def _polygon_hash(polygon: Polygon) -> str:
    """
    Generate a hash for a polygon based on its coordinates.
    
    Used as cache key component.
    """
    coords = tuple(polygon.exterior.coords)
    # Include holes
    holes = tuple(tuple(hole.coords) for hole in polygon.interiors)
    
    content = str((coords, holes)).encode('utf-8')
    return hashlib.md5(content).hexdigest()[:16]


@dataclass
class NFPCache:
    """
    Cache for computed NFP results.
    
    Key: (hash(stationary), hash(orbiting))
    Value: NFP Polygon
    """
    
    _cache: Dict[Tuple[str, str], Polygon] = field(default_factory=dict)
    _hits: int = 0
    _misses: int = 0
    max_size: int = 1000  # Limit cache size
    
    def get_key(self, stationary: Polygon, orbiting: Polygon) -> Tuple[str, str]:
        """Generate cache key for polygon pair."""
        return (_polygon_hash(stationary), _polygon_hash(orbiting))
    
    def get(
        self, 
        stationary: Polygon, 
        orbiting: Polygon
    ) -> Optional[Polygon]:
        """
        Get cached NFP if available.
        
        Args:
            stationary: Fixed polygon
            orbiting: Moving polygon
            
        Returns:
            Cached NFP polygon or None
        """
        key = self.get_key(stationary, orbiting)
        result = self._cache.get(key)
        
        if result is not None:
            self._hits += 1
        else:
            self._misses += 1
        
        return result
    
    def put(
        self, 
        stationary: Polygon, 
        orbiting: Polygon, 
        nfp: Polygon
    ):
        """
        Cache an NFP result.
        
        Args:
            stationary: Fixed polygon
            orbiting: Moving polygon
            nfp: Computed NFP to cache
        """
        # Evict oldest entries if cache too large
        if len(self._cache) >= self.max_size:
            # Simple eviction: remove first 10%
            keys_to_remove = list(self._cache.keys())[:self.max_size // 10]
            for key in keys_to_remove:
                del self._cache[key]
            logger.debug(f"NFP cache evicted {len(keys_to_remove)} entries")
        
        key = self.get_key(stationary, orbiting)
        self._cache[key] = nfp
    
    def clear(self):
        """Clear all cached entries."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
        logger.info("NFP cache cleared")
    
    @property
    def size(self) -> int:
        """Current number of cached entries."""
        return len(self._cache)
    
    @property
    def hit_rate(self) -> float:
        """Cache hit rate (0-1)."""
        total = self._hits + self._misses
        if total == 0:
            return 0.0
        return self._hits / total
    
    def stats(self) -> Dict:
        """Get cache statistics."""
        return {
            "size": self.size,
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": f"{self.hit_rate:.1%}"
        }
    
    def __repr__(self) -> str:
        return f"NFPCache(size={self.size}, hit_rate={self.hit_rate:.1%})"
