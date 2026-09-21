"""Schemas Pydantic pour les projets."""
from pydantic import BaseModel
from typing import Optional


class ProjectStats(BaseModel):
    """
    Statistiques d'un projet pour l'affichage dans EnhancedProjectSelector.

    Attributes:
        project_id (int): ID du projet.
        piece_count (int): Nombre total de pièces dans le projet.
        material_count (int): Nombre de matériaux UNIQUES utilisés (exclut les null).
        estimated_area (float): Surface totale estimée en m² (arrondie à 4 décimales).
        total_quantity (int): Quantité totale de pièces (somme des 'quantity' de chaque Part).
        last_updated (Optional[str]): Date de dernière mise à jour du projet (format ISO 8601).
    """
    project_id: int
    piece_count: int
    material_count: int
    estimated_area: float
    total_quantity: int
    last_updated: Optional[str] = None
