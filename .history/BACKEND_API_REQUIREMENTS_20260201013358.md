# 🔌 Backend APIs Requises

**Pour**: Intégration des nouveaux composants d'optimisation  
**Stack**: FastAPI (Python)

---

## 1️⃣ GET `/api/projects/{project_id}/stats`

**Description**: Récupère les statistiques d'un projet (pièces, matériaux, surface)

**Route FastAPI**:
```python
@router.get("/{project_id}/stats", response_model=ProjectStats)
def get_project_stats(project_id: int, db: Session = Depends(get_db)):
    """
    Retourne les statistiques d'un projet:
    - Nombre de pièces
    - Nombre de matériaux uniques
    - Surface estimée totale
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Récupérer les pièces du projet
    pieces = db.query(Part).filter(Part.project_id == project_id).all()
    
    # Compter matériaux uniques
    material_ids = set(p.material_id for p in pieces if p.material_id)
    
    # Calculer surface estimée
    estimated_area = sum(
        (p.width * p.height * p.quantity) / 1_000_000  # mm² → m²
        for p in pieces
    )
    
    return {
        "piece_count": len(pieces),
        "material_count": len(material_ids),
        "estimated_area": estimated_area
    }
```

**Response Model**:
```python
class ProjectStats(BaseModel):
    piece_count: int
    material_count: int
    estimated_area: float
```

**Exemple Response**:
```json
{
    "piece_count": 12,
    "material_count": 3,
    "estimated_area": 4.25
}
```

---

## 2️⃣ POST `/api/pieces/materials`

**Description**: Analyse pièces sélectionnées et identifie les matériaux

**Route FastAPI**:
```python
from typing import List

class MaterialsRequest(BaseModel):
    piece_ids: List[int]
    project_ids: List[int] = []

class IdentifiedMaterial(BaseModel):
    id: int
    name: str
    species: str | None
    is_panel: bool
    piece_count: int
    total_quantity: int
    estimated_area: float
    estimated_weight: float
    cost_per_unit: float
    estimated_total_cost: float

class MaterialsResponse(BaseModel):
    materials: List[IdentifiedMaterial]

@router.post("/materials", response_model=MaterialsResponse)
def identify_materials(request: MaterialsRequest, db: Session = Depends(get_db)):
    """
    Identifie les matériaux utilisés par les pièces sélectionnées
    """
    # Chercher les pièces
    pieces = db.query(Part).filter(Part.id.in_(request.piece_ids)).all()
    
    # Grouper par matériau
    materials_dict = {}
    
    for piece in pieces:
        if not piece.material_id:
            continue
            
        material = db.query(Material).filter(Material.id == piece.material_id).first()
        if not material:
            continue
        
        if material.id not in materials_dict:
            materials_dict[material.id] = {
                'id': material.id,
                'name': material.name,
                'species': material.species,
                'is_panel': material.is_panel,
                'pieces': [],
                'total_quantity': 0,
                'estimated_area': 0.0,
                'estimated_weight': 0.0,
                'cost_per_unit': material.cost_per_sqm or 0,
            }
        
        materials_dict[material.id]['pieces'].append(piece)
        materials_dict[material.id]['total_quantity'] += piece.quantity
        
        # Calculer surface (mm² → m²)
        area = (piece.width * piece.height * piece.quantity) / 1_000_000
        materials_dict[material.id]['estimated_area'] += area
        
        # Calculer poids estimé (approx: bois = 600-900 kg/m³, panneaux = 500-750)
        density = 750 if material.is_panel else 750
        materials_dict[material.id]['estimated_weight'] += area * material.thickness * density
    
    # Construire réponse
    materials = []
    for mat_id, mat_data in materials_dict.items():
        estimated_total_cost = mat_data['estimated_area'] * mat_data['cost_per_unit']
        
        materials.append(IdentifiedMaterial(
            id=mat_data['id'],
            name=mat_data['name'],
            species=mat_data['species'],
            is_panel=mat_data['is_panel'],
            piece_count=len(mat_data['pieces']),
            total_quantity=mat_data['total_quantity'],
            estimated_area=mat_data['estimated_area'],
            estimated_weight=mat_data['estimated_weight'],
            cost_per_unit=mat_data['cost_per_unit'],
            estimated_total_cost=estimated_total_cost
        ))
    
    return MaterialsResponse(materials=materials)
```

**Request Example**:
```json
{
    "piece_ids": [1, 2, 3, 4, 5],
    "project_ids": [1, 2]
}
```

**Response Example**:
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
            "estimated_area": 2.4,
            "estimated_weight": 1800.0,
            "cost_per_unit": 45.50,
            "estimated_total_cost": 109.2
        },
        {
            "id": 2,
            "name": "MDF 18mm",
            "species": null,
            "is_panel": true,
            "piece_count": 2,
            "total_quantity": 12,
            "estimated_area": 3.8,
            "estimated_weight": 2850.0,
            "cost_per_unit": 28.00,
            "estimated_total_cost": 106.4
        }
    ]
}
```

---

## 3️⃣ POST `/api/stock/availability`

**Description**: Vérifie la disponibilité du stock pour chaque matériau

**Route FastAPI**:
```python
class StockAvailabilityRequest(BaseModel):
    material_ids: List[int]

class StockAvailability(BaseModel):
    material_id: int
    stock_count: int
    available_area: float  # m²
    estimated_cost: float

class StockAvailabilityResponse(BaseModel):
    availability: List[StockAvailability]

@router.post("/availability", response_model=StockAvailabilityResponse)
def check_stock_availability(request: StockAvailabilityRequest, db: Session = Depends(get_db)):
    """
    Vérifie la disponibilité du stock pour les matériaux
    """
    availability_list = []
    
    for material_id in request.material_ids:
        # Récupérer le stock disponible pour ce matériau
        stock_items = db.query(Stock).filter(
            Stock.material_id == material_id,
            Stock.quantity > 0
        ).all()
        
        # Calculer disponibilité totale
        stock_count = len(stock_items)
        available_area = sum(
            (s.width * s.height * s.quantity) / 1_000_000
            for s in stock_items
        )
        
        # Coût estimé du stock disponible
        material = db.query(Material).filter(Material.id == material_id).first()
        cost_per_unit = material.cost_per_sqm if material else 0
        estimated_cost = available_area * cost_per_unit
        
        availability_list.append(StockAvailability(
            material_id=material_id,
            stock_count=stock_count,
            available_area=available_area,
            estimated_cost=estimated_cost
        ))
    
    return StockAvailabilityResponse(availability=availability_list)
```

**Request Example**:
```json
{
    "material_ids": [1, 2, 3]
}
```

**Response Example**:
```json
{
    "availability": [
        {
            "material_id": 1,
            "stock_count": 8,
            "available_area": 24.5,
            "estimated_cost": 1115.75
        },
        {
            "material_id": 2,
            "stock_count": 3,
            "available_area": 8.2,
            "estimated_cost": 229.6
        },
        {
            "material_id": 3,
            "stock_count": 0,
            "available_area": 0.0,
            "estimated_cost": 0.0
        }
    ]
}
```

---

## 4️⃣ POST `/api/optimize` (Mise à Jour)

**Description**: Lancer l'optimisation avec support material_sources

**Modification de Request**:
```python
class OptimizeRequest(BaseModel):
    piece_ids: List[int]
    project_ids: List[int]
    
    # [NEW] Source de matériau par matériau
    material_sources: Dict[int, Literal['stock', 'supplier']]  # Ex: {"1": "stock", "2": "supplier"}
    
    # [NEW] Stock sélectionné par matériau
    stock_ids: Dict[int, List[int]] | None = None  # Ex: {"1": [10, 11, 12]}
    
    # Existing fields
    kerf: float = 3.0
    trim_margin: float = 2.0
    safety_margin: float = 5.0
    algorithm: str = "guillotine"
    engine: str = "auto"
    validate_and_update_stock: bool = False
```

**Logique Backend Modifiée**:
```python
@router.post("/optimize")
def optimize(request: OptimizeRequest, db: Session = Depends(get_db)):
    """
    Optimise avec support multi-matériau et source configurable
    """
    
    # Récupérer les pièces
    pieces = db.query(Part).filter(Part.id.in_(request.piece_ids)).all()
    
    # Grouper par matériau
    materials_pieces = {}
    for piece in pieces:
        if piece.material_id not in materials_pieces:
            materials_pieces[piece.material_id] = []
        materials_pieces[piece.material_id].append(piece)
    
    # Optimiser par matériau
    all_results = {}
    
    for material_id, material_pieces in materials_pieces.items():
        source = request.material_sources.get(str(material_id), 'stock')
        
        if source == 'stock':
            # Utiliser le stock sélectionné (si fourni) ou chercher stock disponible
            if request.stock_ids and str(material_id) in request.stock_ids:
                stock_ids = request.stock_ids[str(material_id)]
                stock_items = db.query(Stock).filter(Stock.id.in_(stock_ids)).all()
            else:
                stock_items = db.query(Stock).filter(
                    Stock.material_id == material_id,
                    Stock.quantity > 0
                ).all()
        else:  # source == 'supplier'
            # Récupérer du catalogue fournisseur (taille standard)
            # Ex: MDF 2800×2070, Chêne 3200×2000, etc.
            standard_sizes = get_supplier_standard_sizes(material_id)
            stock_items = standard_sizes  # Créer items virtuels
        
        # Lancer optimisation pour ce matériau
        material_result = optimize_single_material(
            pieces=material_pieces,
            stock_items=stock_items,
            kerf=request.kerf,
            trim_margin=request.trim_margin,
            safety_margin=request.safety_margin,
            algorithm=request.algorithm,
            engine=request.engine
        )
        
        all_results[material_id] = material_result
    
    # Fusionner les résultats
    return {
        "success": True,
        "results_by_material": all_results,
        "summary": {
            "total_panels_used": sum(len(r.get("panels", [])) for r in all_results.values()),
            "total_utilization": calculate_total_utilization(all_results)
        }
    }
```

---

## 🔗 Intégration Fichiers Backend

**Ajouter dans**: `Moteur/Backend/System/Bin/app/routers/projects.py`
- Endpoint: `GET /api/projects/{project_id}/stats`

**Ajouter dans**: `Moteur/Backend/System/Bin/app/routers/parts.py` (ou créer `pieces.py`)
- Endpoint: `POST /api/pieces/materials`

**Ajouter dans**: `Moteur/Backend/System/Bin/app/routers/stock.py`
- Endpoint: `POST /api/stock/availability`

**Modifier dans**: `Moteur/Backend/System/Bin/app/routers/optimize.py`
- Endpoint: `POST /api/optimize` (ajouter support material_sources)

---

## ✅ Checklist Implémentation Backend

- [ ] Créer `/api/projects/{id}/stats` (routes/projects.py)
- [ ] Créer `/api/pieces/materials` (routes/parts.py ou pieces.py)
- [ ] Créer `/api/stock/availability` (routes/stock.py)
- [ ] Mettre à jour `/api/optimize` (routes/optimize.py)
- [ ] Tester chaque endpoint avec Postman/curl
- [ ] Vérifier les réponses JSON
- [ ] Gérer les erreurs correctement
- [ ] Ajouter logs pour debug

---

## 🧪 Tests Curl

```bash
# 1. GET project stats
curl -X GET "http://localhost:8000/api/projects/1/stats"

# 2. POST pieces materials
curl -X POST "http://localhost:8000/api/pieces/materials" \
  -H "Content-Type: application/json" \
  -d '{"piece_ids": [1,2,3], "project_ids": [1]}'

# 3. POST stock availability
curl -X POST "http://localhost:8000/api/stock/availability" \
  -H "Content-Type: application/json" \
  -d '{"material_ids": [1, 2]}'

# 4. POST optimize (NEW FORMAT)
curl -X POST "http://localhost:8000/api/optimize" \
  -H "Content-Type: application/json" \
  -d '{
    "piece_ids": [1,2,3,4],
    "project_ids": [1],
    "material_sources": {"1": "stock", "2": "supplier"},
    "stock_ids": {"1": [10, 11, 12]},
    "kerf": 3.0,
    "algorithm": "guillotine"
  }'
```

---

**Status**: 🔴 Backends à implémenter
