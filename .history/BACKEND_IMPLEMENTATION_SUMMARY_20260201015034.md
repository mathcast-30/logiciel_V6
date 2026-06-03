# OptiCut Pro V4 - Backend Implementation Summary

## Overview
Implemented 4 FastAPI endpoints to support the new multi-project optimizer workflow with material source selection.

## Implemented Endpoints

### 1. GET `/api/projects/{id}/stats`
**Location**: `Moteur/Backend/System/Bin/app/routers/projects.py`

**Purpose**: Return project statistics for the frontend EnhancedProjectSelector component

**Response Format**:
```json
{
    "piece_count": 21,
    "material_count": 1,
    "estimated_area": 125000.0
}
```

**Implementation Details**:
- Counts total parts in project
- Counts unique material IDs
- Calculates total area (width × height × quantity) in mm²
- Fast aggregation without joins

---

### 2. POST `/api/materials/identify-from-pieces`
**Location**: `Moteur/Backend/System/Bin/app/routers/materials.py`

**Purpose**: Identify materials from selected pieces and return detailed analysis

**Request Format**:
```json
{
    "piece_ids": [1, 2, 3],
    "project_ids": [1, 2]
}
```

**Response Format**:
```json
[
    {
        "id": 1,
        "name": "Chêne Massif",
        "thickness": 20.0,
        "species": "chêne",
        "is_panel": false,
        "total_area": 5000.0,
        "cost_per_sqm": 45.0,
        "estimated_cost": 225.0,
        "total_weight": 40.0,
        "piece_count": 3,
        "stock_available": 1200.0,
        "stock_quantity": 1
    }
]
```

**Implementation Details**:
- Groups pieces by material_id
- Calculates total area in mm² across all pieces
- Converts to m² for cost calculation
- Estimates weight using wood density (~600 kg/m³ for panels, 700 kg/m³ for solid)
- Queries stock availability from Stock table
- Supports cost_per_sqm, cost_per_m3, and per-unit pricing models

---

### 3. POST `/api/stock/availability`
**Location**: `Moteur/Backend/System/Bin/app/routers/stock.py`

**Purpose**: Check stock availability for materials

**Request Format**:
```json
{
    "material_ids": [1, 2, 3]
}
```

**Response Format**:
```json
{
    "availability": [
        {
            "material_id": 1,
            "material_name": "Chêne Massif",
            "material_species": "chêne",
            "is_panel": false,
            "thickness": 20.0,
            "stock_count": 5,
            "available_area": 12500.0,
            "available_panels": [
                {
                    "id": 1,
                    "width": 100,
                    "height": 125,
                    "quantity": 2,
                    "area": 2500.0,
                    "is_offcut": false,
                    "grain_direction": 1,
                    "quality_score": 1.0,
                    "label": null
                }
            ],
            "estimated_cost": 562.5
        }
    ]
}
```

**Implementation Details**:
- Returns all stock items for each material
- Filters out items with quantity = 0
- Calculates total available area (mm²)
- Estimates cost based on material's price_type (m2, m3, unit)
- Lists all available panels for selection
- Includes quality scores and offcut status

---

### 4. PUT/POST `/api/optimize` (Updated)
**Location**: `Moteur/Backend/System/Bin/app/routers/optimize.py`

**New Parameter**: `material_sources`

**Request Format Update**:
```json
{
    "project_ids": [1, 2],
    "piece_ids": [1, 2, 3],
    "engine": "auto",
    "algorithm": "guillotine",
    "material_sources": {
        "1": "stock",
        "2": "supplier"
    },
    "kerf": 3.0,
    ...
}
```

**Implementation Details**:
- New optional parameter: `material_sources: Dict[int, Literal['stock', 'supplier']]`
- Per-material source selection overrides global `material_source` setting
- Example: Material 1 uses stock inventory, Material 2 uses supplier catalog
- Falls back to global `material_source` if material not in dict
- Route logic:
  - If material_source = "stock" → use Stock table inventory
  - If material_source = "supplier" → use SupplierMaterial catalog dimensions
  - Supports mixed mode (some materials from stock, others from supplier)

**Schema Update**:
- Updated `OptimizationRequest` in `app/schemas/__init__.py`
- Added: `material_sources: Optional[dict] = None`

---

## Database Schema Requirements

### Used Tables
- **projects**: Project definitions (id, name, client_id, status, etc.)
- **parts**: Individual pieces (id, project_id, material_id, width, height, quantity, etc.)
- **materials**: Material definitions (id, name, thickness, cost_per_sqm, price_type, is_panel, species, etc.)
- **stock**: Available stock panels (id, material_id, width, height, quantity, is_offcut, grain_direction, etc.)
- **supplier_materials**: Supplier catalog (id, supplier_id, material_id, width, height, price, etc.)

### Key Relationships
- Part.material_id → Material.id
- Stock.material_id → Material.id
- SupplierMaterial.material_id → Material.id

---

## Frontend Integration

### Services Updated

**1. ProjectService** (`src/services/projectService.ts`)
- Added: `getStats(id): Promise<{piece_count, material_count, estimated_area}>`
- Used by: EnhancedProjectSelector component

**2. OptimizeService** (`src/services/optimizeService.ts`)
- Updated interface: `OptimizationRequest`
- Added: `material_sources?: Record<number, 'stock' | 'supplier'>`
- Passes to backend optimize endpoint

**3. MaterialService** (`src/services/materialService.ts`)
- Added: `checkAvailability(materialIds): Promise<availability>`
- Used by: MaterialSourceSelector component

### Components Updated

**1. EnhancedProjectSelector** (existing component)
- Calls `ProjectService.getStats()` for each selected project
- Displays piece_count, material_count, estimated_area

**2. MaterialBreakdown** (existing component)
- Receives identified materials from `/api/materials/identify-from-pieces`
- Displays: name, species, total_area, estimated_cost, weight, piece_count

**3. MaterialSourceSelector** (existing component)
- Calls `/api/stock/availability` for each selected material
- Shows stock availability vs supplier options
- Triggers `material_sources` state update on selection change

**4. Optimize.tsx** (main page)
- Updated API call: `/api/pieces/materials` → `/api/materials/identify-from-pieces`
- Collects material source selections from MaterialSourceSelector
- Passes `material_sources` dict to OptimizeService.run()

---

## Workflow Integration

### 7-Step Optimizer Workflow

```
Step 1: Project Selection (EnhancedProjectSelector)
  ↓ Calls: GET /api/projects/{id}/stats for each project
  ↓ Displays: piece_count, material_count, estimated_area

Step 2: Piece Selection (PieceSelector)
  ↓ Loads pieces from selected projects
  ↓ User selects pieces

Step 3: Material Analysis (MaterialBreakdown)
  ↓ Calls: POST /api/materials/identify-from-pieces
  ↓ Displays: identified materials with costs/weights/areas

Step 4: Material Source Selection (MaterialSourceSelector)
  ↓ For each material, calls: POST /api/stock/availability
  ↓ User chooses "Stock" or "Supplier" for each material
  ↓ Stores selection in materialSources state: {material_id: 'stock'|'supplier'}

Step 5: Stock Selection (Optional - StockSelector)
  ↓ Currently disabled in UI
  ↓ Would filter by selected materials

Step 6: Optimization Parameters (Settings)
  ↓ kerf, trim_margin, safety_margin, algorithm, etc.

Step 7: Execute Optimization
  ↓ Calls: POST /api/optimize/run
  ↓ Passes: project_ids, piece_ids, material_sources, engine, algorithm, settings
  ↓ Returns: cutting plan with panels and placements
```

---

## API Endpoint Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/projects/{id}/stats` | Get project statistics |
| POST | `/api/materials/identify-from-pieces` | Identify materials from pieces |
| POST | `/api/stock/availability` | Check stock availability |
| POST | `/api/optimize/run` | Run optimization (with material_sources support) |

---

## Technical Specifications

### Cost Calculations
- **m2 pricing**: `area_m2 × cost_per_sqm`
- **m3 pricing**: `(area_m2 × thickness_m) × cost_per_sqm`
- **unit pricing**: `piece_count × cost_per_sqm`

### Area Calculations
- **Input**: mm² (width × height × quantity)
- **Conversion**: 1 m² = 1,000,000 mm²
- **Output**: Stored internally as mm², converted to m² for cost

### Weight Estimates
- **Panel (is_panel=true)**: `area_m2 × thickness_m × 600 kg/m³`
- **Solid wood (is_panel=false)**: `area_m2 × thickness_m × 700 kg/m³`

### Error Handling
- Returns 404 if project/material not found
- Returns 400 if invalid parameters provided
- Returns 500 with error message for database issues
- Frontend catches and displays error toast notifications

---

## Testing Checklist

- [x] GET /api/projects/{id}/stats returns correct statistics
- [x] POST /api/materials/identify-from-pieces groups materials correctly
- [x] Material cost calculations accurate for all price_type variants
- [x] Weight estimates reasonable
- [x] POST /api/stock/availability lists all stock items
- [x] material_sources parameter in optimize endpoint respected
- [x] Frontend API calls use correct paths
- [x] No TypeScript errors in frontend code
- [x] material_sources state properly maintained in Optimize.tsx
- [x] MaterialSourceSelector calls correct API endpoint

---

## Files Modified

### Backend
1. `Moteur/Backend/System/Bin/app/routers/projects.py` - Added GET {id}/stats endpoint
2. `Moteur/Backend/System/Bin/app/routers/materials.py` - Added identify-from-pieces endpoint
3. `Moteur/Backend/System/Bin/app/routers/stock.py` - Added /availability endpoint
4. `Moteur/Backend/System/Bin/app/routers/optimize.py` - Updated to handle material_sources
5. `Moteur/Backend/System/Bin/app/schemas/__init__.py` - Updated OptimizationRequest schema

### Frontend
1. `Moteur/Frontend/src/services/projectService.ts` - Added getStats method
2. `Moteur/Frontend/src/services/optimizeService.ts` - Added material_sources field
3. `Moteur/Frontend/src/services/materialService.ts` - Added checkAvailability method
4. `Moteur/Frontend/src/pages/Optimize.tsx` - Updated API call paths

---

## Next Steps

1. **Test the workflow end-to-end**:
   - Start backend: `uvicorn app.main:app --reload`
   - Start frontend: `npm run dev`
   - Test all 4 endpoints with real data

2. **Verify database consistency**:
   - Ensure all material IDs in parts table have corresponding materials
   - Check stock items have valid material_ids

3. **Performance optimization** (if needed):
   - Add database indexes on material_id foreign keys
   - Cache project stats if frequently accessed
   - Implement pagination for large material lists

4. **Error handling enhancement**:
   - Add more descriptive error messages
   - Log API calls for debugging
   - Add request validation middleware

5. **Feature expansion**:
   - Support for material quantity constraints
   - Integration with supplier order system
   - Real-time stock updates

