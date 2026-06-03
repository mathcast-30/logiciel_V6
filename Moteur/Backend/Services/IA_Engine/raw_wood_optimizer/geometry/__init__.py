"""Geometry utilities for raw wood optimization."""

from .polygon_ops import (
    polygon_from_points,
    polygon_contains,
    polygons_intersect,
    polygon_intersection,
    polygon_difference,
    polygon_union,
    translate_polygon,
    rotate_polygon,
)
from .buffering import apply_species_buffer, get_species_margin

__all__ = [
    "polygon_from_points",
    "polygon_contains",
    "polygons_intersect",
    "polygon_intersection",
    "polygon_difference",
    "polygon_union",
    "translate_polygon",
    "rotate_polygon",
    "apply_species_buffer",
    "get_species_margin",
]
