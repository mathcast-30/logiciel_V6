"""Schemas Pydantic pour l'optimisation des découpes."""
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any, Union


class RawWoodParams(BaseModel):
    """Paramètres spécifiques à l'optimisation pour bois massif."""
    position_resolution: float = Field(default=10.0, gt=0, description="Grid resolution in mm for placement positions")
    min_offcut_dimension: float = Field(default=100.0, ge=0, description="Minimum dimension for reusable offcuts in mm")
    scoring_weights: Dict[str, float] = Field(
        default={"utilization": 0.4, "compactness": 0.3, "offcut_quality": 0.3},
        description="Scoring weights for placement evaluation"
    )


class OptimizationRequest(BaseModel):
    """
    Requête pour lancer une optimisation.

    Attributes:
        piece_ids (List[int]): IDs des pièces à optimiser (obligatoire).
        material_sources (Dict[int, str]): Source par matériau ('stock' ou 'supplier').
        stock_ids (Dict[int, List[int]]): Planches sélectionnées par matériau (IDs des stocks).
        kerf (float): Épaisseur de découpe en mm (défaut: 3.0).
        trim_margin (float): Marge de finition en mm (défaut: 2.0).
        safety_margin (float): Marge de sécurité en mm (défaut: 5.0).
        algorithm (str): Algorithme d'optimisation ('guillotine' ou 'rectpack', défaut: 'guillotine').
        high_precision (bool): Mode haute précision (défaut: False).
        validate_and_update_stock (bool): Mettre à jour le stock après optimisation (défaut: False).
        engine (str): Moteur à utiliser ('auto', 'panel', 'raw_wood', défaut: 'auto').
        raw_wood_params (Optional[Dict]): Paramètres pour raw_wood_engine (défaut: None).
    """
    piece_ids: Optional[List[int]] = None
    material_sources: Dict[int, str] = Field(
        default_factory=dict,
        description="Dict mapping material_id to 'stock' or 'supplier'. Ex: {1: 'stock', 2: 'supplier'}"
    )
    stock_ids: Dict[int, List[int]] = Field(
        default_factory=dict,
        description="Dict mapping material_id to list of stock IDs. Ex: {1: [10, 11], 2: [20]}"
    )
    kerf: float = 3.0
    trim_margin: float = 2.0
    safety_margin: float = 5.0
    algorithm: str = "guillotine"
    high_precision: bool = False
    validate_and_update_stock: bool = False
    engine: str = "auto"
    raw_wood_params: Optional[Union[Dict[str, Any], RawWoodParams]] = None

    # Compatibilité avec l'ancien format par projet
    project_id: Optional[int] = None
    project_ids: Optional[List[int]] = None
    material_source: str = "stock"
    export_formats: List[str] = Field(default_factory=lambda: ["pdf"])


class OptimizationResponse(BaseModel):
    """
    Réponse complète d'optimisation (supporte le nouveau format et le format historique).
    """
    success: bool = True
    message: str = "Optimisation terminée"
    results: List[Dict[str, Any]] = Field(default_factory=list)
    panels: List[Dict[str, Any]] = Field(default_factory=list)
    total_panels_used: int = 0
    total_waste: float = 0.0
    waste_percentage: float = 0.0
    total_used_area: float = 0.0
    algorithm: Optional[str] = "guillotine"
    engine: Optional[str] = "panel"
    material_sources: Optional[Dict[Any, str]] = None
    created_at: Optional[str] = None

    # Champs historiques / rétrocompatibilité
    optimization_id: Optional[int] = None
    engine_used: Optional[str] = None
    total_cost: Optional[float] = 0.0
    result_data: Optional[Dict[str, Any]] = None
    export_files: Optional[Dict[str, str]] = None
