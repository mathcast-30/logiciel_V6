"""
Species-based buffering for wood margins.

Different wood species require different safety margins due to their
natural behavior (movement, nervousness, stability).

Implemented via Shapely buffer operation.
"""

from shapely.geometry import Polygon
from typing import Union

from ..domain.grain import WoodSpecies, SPECIES_MARGINS


def get_species_margin(species: WoodSpecies) -> float:
    """
    Get the safety margin for a wood species in mm.
    
    Args:
        species: The wood species
        
    Returns:
        Margin in mm
    """
    return SPECIES_MARGINS.get(species, SPECIES_MARGINS[WoodSpecies.UNKNOWN])


def apply_species_buffer(
    polygon: Polygon, 
    species: WoodSpecies,
    inward: bool = True
) -> Polygon:
    """
    Apply species-specific buffer to a polygon.
    
    For boards: inward buffer (shrink working area)
    For pieces: outward buffer (expand for safety)
    
    Args:
        polygon: The polygon to buffer
        species: Wood species determining margin size
        inward: If True, shrink (negative buffer). If False, expand.
        
    Returns:
        Buffered polygon
        
    Raises:
        ValueError: If resulting polygon is empty/invalid
    """
    margin = get_species_margin(species)
    
    if margin <= 0:
        return polygon
    
    # Negative buffer = inward shrink
    buffer_distance = -margin if inward else margin
    
    result = polygon.buffer(buffer_distance)
    
    if result.is_empty:
        raise ValueError(
            f"Polygon becomes empty after applying {margin}mm "
            f"{'inward' if inward else 'outward'} buffer for {species.value}"
        )
    
    if not result.is_valid:
        # Try to fix with buffer(0)
        result = result.buffer(0)
        if not result.is_valid or result.is_empty:
            raise ValueError(
                f"Invalid polygon after buffering for {species.value}"
            )
    
    return result


def apply_custom_buffer(
    polygon: Polygon,
    margin_mm: float,
    inward: bool = True
) -> Polygon:
    """
    Apply a custom buffer distance to a polygon.
    
    Args:
        polygon: The polygon to buffer
        margin_mm: Buffer distance in mm (positive value)
        inward: If True, shrink. If False, expand.
        
    Returns:
        Buffered polygon
    """
    if margin_mm <= 0:
        return polygon
    
    buffer_distance = -margin_mm if inward else margin_mm
    result = polygon.buffer(buffer_distance)
    
    if result.is_empty:
        raise ValueError(
            f"Polygon becomes empty after applying {margin_mm}mm buffer"
        )
    
    return result
