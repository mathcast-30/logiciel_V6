"""Pieces API router — endpoints d'analyse des pièces sélectionnées."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List, Any

from app.db.database import get_db
from app.models import Part as PartModel, Material as MaterialModel
from app.schemas.materials import MaterialsRequest, IdentifiedMaterial, MaterialsResponse

router = APIRouter()


@router.post("/materials", response_model=MaterialsResponse)
def identify_materials(
    request: MaterialsRequest,
    db: Session = Depends(get_db)
):
    """
    Analyse les pièces sélectionnées et retourne :
    - La liste des matériaux uniques utilisés
    - Pour chaque matériau :
      - Nombre de pièces
      - Quantité totale
      - Surface estimée (m²)
      - Poids estimé (kg)
      - Coût unitaire et total

    **Utilisation** :
    - Appelé par `MaterialBreakdown.tsx` pour afficher le tableau des matériaux.

    **Exemple de requête** :
    ```json
    {
      "piece_ids": [1, 2, 3, 4, 5],
      "project_ids": [1]
    }
    ```

    **Exemple de réponse** :
    ```json
    {
      "materials": [
        {
          "id": 1,
          "name": "Chêne Massif",
          "species": "chene",
          "is_panel": false,
          "piece_count": 3,
          "total_quantity": 8,
          "estimated_area": 2.4000,
          "estimated_weight": 1536.00,
          "cost_per_unit": 45.50,
          "estimated_total_cost": 109.20
        }
      ]
    }
    ```
    """
    # --- ÉTAPE 1 : Validation de la requête ---
    if not request.piece_ids:
        raise HTTPException(
            status_code=400,
            detail="piece_ids cannot be empty"
        )

    # --- ÉTAPE 2 : Récupérer les pièces depuis la base ---
    pieces = db.query(PartModel).filter(PartModel.id.in_(request.piece_ids)).all()

    # --- ÉTAPE 3 : Cas particulier - Aucune pièce trouvée ---
    if not pieces:
        return MaterialsResponse(materials=[])

    # --- ÉTAPE 4 : Grouper les pièces par material_id ---
    # Structure: {material_id: {id, name, species, is_panel, pieces: [],
    #              total_quantity, estimated_area, estimated_weight, cost_per_unit}}
    materials_dict: Dict[int, Dict[str, Any]] = {}

    for piece in pieces:
        # Ignorer les pièces sans material_id
        if piece.material_id is None:
            continue

        # Récupérer le matériau correspondant
        material = db.query(MaterialModel).filter(MaterialModel.id == piece.material_id).first()
        if material is None:
            continue  # Matériau introuvable (ne devrait pas arriver)

        # Initialiser le matériau dans le dict si absent
        if material.id not in materials_dict:
            materials_dict[material.id] = {
                "id": material.id,
                "name": material.name,
                "species": material.species,
                "is_panel": material.is_panel,
                "pieces": [],  # Liste des pièces utilisant ce matériau
                "total_quantity": 0,
                "estimated_area": 0.0,
                "estimated_weight": 0.0,
                "cost_per_unit": material.cost_per_sqm if material.cost_per_sqm is not None else 0.0,
            }

        # Ajouter la pièce au groupe
        materials_dict[material.id]["pieces"].append(piece)
        materials_dict[material.id]["total_quantity"] += piece.quantity

        # --- ÉTAPE 5 : Calculer la surface de cette pièce (mm² → m²) ---
        if piece.width is not None and piece.height is not None:
            piece_area = (piece.width * piece.height * piece.quantity) / 1_000_000  # m²
            materials_dict[material.id]["estimated_area"] += piece_area

            # --- ÉTAPE 6 : Calculer le poids (kg) ---
            # Densité :
            # - 750 kg/m³ pour les panneaux (MDF, contreplaqué)
            # - 800 kg/m³ pour le bois massif
            density = 750 if material.is_panel else 800

            # Épaisseur en mètres (material.thickness est en mm)
            thickness_m = (material.thickness or 20) / 1000  # 20mm par défaut si None

            # Volume = surface (m²) * épaisseur (m)
            volume = piece_area * thickness_m

            # Poids = volume * densité
            weight = volume * density
            materials_dict[material.id]["estimated_weight"] += weight

    # --- ÉTAPE 7 : Construire la réponse ---
    materials: List[IdentifiedMaterial] = []

    for mat_data in materials_dict.values():
        # Calculer le coût total estimé
        estimated_total_cost = mat_data["estimated_area"] * mat_data["cost_per_unit"]

        materials.append(
            IdentifiedMaterial(
                id=mat_data["id"],
                name=mat_data["name"],
                species=mat_data["species"],
                is_panel=mat_data["is_panel"],
                piece_count=len(mat_data["pieces"]),
                total_quantity=mat_data["total_quantity"],
                estimated_area=round(mat_data["estimated_area"], 4),       # Arrondir à 4 décimales
                estimated_weight=round(mat_data["estimated_weight"], 2),    # Arrondir à 2 décimales
                cost_per_unit=mat_data["cost_per_unit"],
                estimated_total_cost=round(estimated_total_cost, 2),        # Arrondir à 2 décimales
            )
        )

    # --- ÉTAPE 8 : Trier les matériaux par nom (ordre alphabétique) ---
    materials.sort(key=lambda x: x.name.lower())

    return MaterialsResponse(materials=materials)
