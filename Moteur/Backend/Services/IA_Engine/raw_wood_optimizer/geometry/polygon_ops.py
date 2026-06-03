"""
Shapely polygon operations - thin wrapper.

This module provides a minimal abstraction over Shapely operations.
All functions work with Shapely Polygon objects directly.

⚠️ No bounding-box-only approximations allowed.
"""

from typing import List, Tuple, Union
from shapely.geometry import Polygon, MultiPolygon, Point
from shapely.affinity import translate, rotate
from shapely.ops import unary_union


def polygon_from_points(points: List[Tuple[float, float]]) -> Polygon:
    """
    Create a Polygon from a list of (x, y) points.
    
    Args:
        points: List of (x, y) coordinates forming the polygon exterior
        
    Returns:
        Shapely Polygon
        
    Raises:
        ValueError: If polygon is invalid or has fewer than 3 points
    """
    if len(points) < 3:
        raise ValueError("Polygon requires at least 3 points")
    
    poly = Polygon(points)
    
    if not poly.is_valid:
        # Attempt to fix with buffer(0)
        poly = poly.buffer(0)
        if not poly.is_valid or poly.is_empty:
            raise ValueError("Cannot create valid polygon from given points")
    
    return poly


def polygon_contains(outer: Polygon, inner: Polygon) -> bool:
    """
    Check if outer polygon fully contains inner polygon.
    
    Args:
        outer: The containing polygon
        inner: The polygon to check containment of
        
    Returns:
        True if inner is fully within outer
    """
    return outer.contains(inner)


def polygon_contains_point(polygon: Polygon, x: float, y: float) -> bool:
    """
    Check if polygon contains a point.
    
    Args:
        polygon: The polygon
        x: Point X coordinate
        y: Point Y coordinate
        
    Returns:
        True if point is inside polygon
    """
    return polygon.contains(Point(x, y))


def polygons_intersect(poly1: Polygon, poly2: Polygon) -> bool:
    """
    Check if two polygons intersect (overlap or touch).
    
    Args:
        poly1: First polygon
        poly2: Second polygon
        
    Returns:
        True if polygons intersect
    """
    return poly1.intersects(poly2)


def polygons_overlap(poly1: Polygon, poly2: Polygon) -> bool:
    """
    Check if two polygons have overlapping area (not just touching).
    
    Args:
        poly1: First polygon
        poly2: Second polygon
        
    Returns:
        True if polygons have shared interior area
    """
    intersection = poly1.intersection(poly2)
    return intersection.area > 0


def polygon_intersection(poly1: Polygon, poly2: Polygon) -> Union[Polygon, MultiPolygon]:
    """
    Calculate the intersection of two polygons.
    
    Args:
        poly1: First polygon
        poly2: Second polygon
        
    Returns:
        Intersection geometry (may be empty, Polygon, or MultiPolygon)
    """
    return poly1.intersection(poly2)


def polygon_difference(poly1: Polygon, poly2: Polygon) -> Union[Polygon, MultiPolygon]:
    """
    Subtract poly2 from poly1.
    
    Args:
        poly1: Base polygon
        poly2: Polygon to subtract
        
    Returns:
        Remaining geometry after subtraction
    """
    return poly1.difference(poly2)


def polygon_union(polygons: List[Polygon]) -> Union[Polygon, MultiPolygon]:
    """
    Union multiple polygons.
    
    Args:
        polygons: List of polygons to union
        
    Returns:
        Unified geometry
    """
    if not polygons:
        return Polygon()
    return unary_union(polygons)


def translate_polygon(polygon: Polygon, dx: float, dy: float) -> Polygon:
    """
    Translate a polygon by (dx, dy).
    
    Args:
        polygon: Polygon to translate
        dx: X translation in mm
        dy: Y translation in mm
        
    Returns:
        Translated polygon
    """
    return translate(polygon, dx, dy)


def rotate_polygon(
    polygon: Polygon, 
    angle: float, 
    origin: Union[str, Tuple[float, float]] = 'centroid'
) -> Polygon:
    """
    Rotate a polygon around a point.
    
    Args:
        polygon: Polygon to rotate
        angle: Rotation angle in degrees (counterclockwise positive)
        origin: Rotation center ('centroid', 'center', or (x, y) tuple)
        
    Returns:
        Rotated polygon
    """
    return rotate(polygon, angle, origin=origin)


def normalize_polygon(polygon: Polygon) -> Polygon:
    """
    Normalize a polygon by moving its bounding box to origin.
    
    Args:
        polygon: Polygon to normalize
        
    Returns:
        Polygon with lower-left corner at (0, 0)
    """
    minx, miny, _, _ = polygon.bounds
    return translate(polygon, -minx, -miny)


def get_polygon_bounds(polygon: Polygon) -> Tuple[float, float, float, float]:
    """
    Get polygon bounding box.
    
    Args:
        polygon: The polygon
        
    Returns:
        (minx, miny, maxx, maxy)
    """
    return polygon.bounds


def get_polygon_dimensions(polygon: Polygon) -> Tuple[float, float]:
    """
    Get polygon bounding box dimensions.
    
    Args:
        polygon: The polygon
        
    Returns:
        (width, height)
    """
    minx, miny, maxx, maxy = polygon.bounds
    return (maxx - minx, maxy - miny)
