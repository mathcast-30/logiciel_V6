"""Schemas Pydantic pour les matériaux identifiés depuis des pièces."""
from pydantic import BaseModel
from typing import List, Optional


class MaterialsRequest(BaseModel):
    """
    Requête pour identifier les matériaux utilisés par des pièces.

    Attributes:
        piece_ids (List[int]): Liste des IDs des pièces à analyser (obligatoire).
        project_ids (List[int]): Liste des IDs des projets (optionnel, pour contexte).
    """
    piece_ids: List[int]
    project_ids: List[int] = []  # Par défaut: liste vide


class IdentifiedMaterial(BaseModel):
    """
    Matériau identifié avec ses métriques calculées.

    Attributes:
        id (int): ID du matériau dans la base.
        name (str): Nom du matériau (ex: "Chêne Massif").
        species (Optional[str]): Essence (ex: "chene", "hêtre"). Peut être null.
        is_panel (bool): True si c'est un panneau (MDF, contreplaqué), False si bois massif.
        piece_count (int): Nombre de pièces utilisant ce matériau.
        total_quantity (int): Quantité totale (somme des 'quantity' des pièces).
        estimated_area (float): Surface totale estimée en m² (arrondie à 4 décimales).
        estimated_weight (float): Poids estimé en kg (arrondie à 2 décimales).
        cost_per_unit (float): Coût par unité (€/m²).
        estimated_total_cost (float): Coût total estimé en € (arrondie à 2 décimales).
    """
    id: int
    name: str
    species: Optional[str] = None
    is_panel: bool
    piece_count: int
    total_quantity: int
    estimated_area: float
    estimated_weight: float
    cost_per_unit: float
    estimated_total_cost: float


class MaterialsResponse(BaseModel):
    """
    Réponse : liste des matériaux identifiés.

    Attributes:
        materials (List[IdentifiedMaterial]): Liste des matériaux avec leurs métriques.
    """
    materials: List[IdentifiedMaterial]
