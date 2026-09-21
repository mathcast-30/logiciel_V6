"""Schemas Pydantic pour la disponibilité du stock."""
from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class StockAvailabilityRequest(BaseModel):
    """
    Requête pour vérifier la disponibilité du stock pour des matériaux.

    Attributes:
        material_ids (List[int]): Liste des IDs des matériaux à vérifier (obligatoire).
    """
    material_ids: List[int]


class StockItemAvailability(BaseModel):
    """
    Disponibilité d'un matériau en stock.

    Attributes:
        material_id (int): ID du matériau.
        available_quantity (int): Quantité totale disponible (somme des 'quantity' des stocks).
        available_area (float): Surface totale disponible en m² (arrondie à 4 décimales).
        stock_items (List[Dict[str, Any]]): Liste des planches individuelles disponibles.
        sufficient (bool): True si le stock est suffisant (par défaut False, à recalculer côté frontend).
        shortfall (Optional[float]): Déficit en m² si insufficient=True (par défaut None).
    """
    material_id: int
    available_quantity: int
    available_area: float
    stock_items: List[Dict[str, Any]]
    sufficient: bool = False
    shortfall: Optional[float] = None


class StockAvailabilityResponse(BaseModel):
    """
    Réponse : disponibilité pour chaque matériau.

    Attributes:
        availabilities (List[StockItemAvailability]): Liste des disponibilités par matériau.
    """
    availabilities: List[StockItemAvailability]
