"""Output models for raw wood optimization results."""

from .placements import Placement, BoardResult
from .offcuts import Offcut, OffcutCollection

__all__ = [
    "Placement",
    "BoardResult",
    "Offcut",
    "OffcutCollection",
]
