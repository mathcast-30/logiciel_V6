# OptiCut Pro V4 - Backend API Reference

## Base URL
```
http://localhost:8000/api
```

## Authentication
Currently no authentication required (CORS open to all origins in development)

---

## Endpoints

### Projects

#### Get Project Statistics
```http
GET /projects/{project_id}/stats
```

**Path Parameters:**
- `project_id` (integer, required): Project ID

**Response:**
```json
{
  "piece_count": 21,
  "material_count": 1,
  "estimated_area": 125000.0
}
```

**Status Codes:**
- `200`: Success
- `404`: Project not found
- `500`: Server error

**Example:**
```bash
curl -X GET "http://localhost:8000/api/projects/1/stats"
```

---

### Materials

#### Identify Materials from Pieces
```http
POST /materials/identify-from-pieces
```

**Request Body:**
```json
{
  "piece_ids": [1, 2, 3],
  "project_ids": [1]
}
```

**Request Parameters:**
- `piece_ids` (array of integers, required): IDs of pieces to analyze
- `project_ids` (array of integers, optional): Project context (for logging)

**Response:**
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

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| id | integer | Material ID |
| name | string | Material name |
| thickness | number | Material thickness in mm |
| species | string | Wood species (e.g., "chêne", "hêtre") |
| is_panel | boolean | True if panel, false if solid wood |
| total_area | number | Total area needed in mm² |
| cost_per_sqm | number | Cost per square meter |
| estimated_cost | number | Total estimated cost |
| total_weight | number | Estimated total weight in kg |
| piece_count | number | Number of pieces using this material |
| stock_available | number | Available stock area in mm² |
| stock_quantity | number | Number of stock items available |

**Status Codes:**
- `200`: Success
- `400`: Invalid parameters
- `500`: Server error

**Example:**
```bash
curl -X POST "http://localhost:8000/api/materials/identify-from-pieces" \
  -H "Content-Type: application/json" \
  -d '{
    "piece_ids": [1, 2, 3],
    "project_ids": [1]
  }'
```

---

### Stock

#### Check Stock Availability
```http
POST /stock/availability
```

**Request Body:**
```json
{
  "material_ids": [1, 2]
}
```

**Request Parameters:**
- `material_ids` (array of integers, required): Material IDs to check

**Response:**
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

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| material_id | integer | Material ID |
| material_name | string | Material name |
| material_species | string | Wood species |
| is_panel | boolean | Material type |
| thickness | number | Material thickness in mm |
| stock_count | integer | Number of stock items |
| available_area | number | Total available area in mm² |
| available_panels | array | List of individual stock panels |
| available_panels[].id | integer | Stock item ID |
| available_panels[].width | number | Width in mm |
| available_panels[].height | number | Height in mm |
| available_panels[].quantity | integer | Quantity available |
| available_panels[].area | number | Panel area in mm² |
| available_panels[].is_offcut | boolean | Is offcut or main stock |
| available_panels[].grain_direction | integer | Grain direction (0=none, 1=h, 2=v) |
| available_panels[].quality_score | number | Quality score 0-1 |
| available_panels[].label | string | Optional label |
| estimated_cost | number | Total estimated cost |

**Status Codes:**
- `200`: Success
- `400`: Invalid parameters
- `500`: Server error

**Example:**
```bash
curl -X POST "http://localhost:8000/api/stock/availability" \
  -H "Content-Type: application/json" \
  -d '{
    "material_ids": [1, 2]
  }'
```

---

### Optimization

#### Run Cutting Optimization
```http
POST /optimize/run
```

**Request Body:**
```json
{
  "project_ids": [1],
  "piece_ids": [1, 2, 3],
  "engine": "auto",
  "algorithm": "guillotine",
  "kerf": 3.0,
  "trim_margin": 2.0,
  "safety_margin": 5.0,
  "material_source": "stock",
  "material_sources": {
    "1": "stock",
    "2": "supplier"
  },
  "export_formats": ["pdf"],
  "validate_and_update_stock": false,
  "high_precision": false
}
```

**Request Parameters:**

**Project/Piece Selection:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| project_ids | array | Yes | List of project IDs |
| piece_ids | array | No | Specific pieces to optimize (all if omitted) |
| project_id | integer | Legacy | Single project (use project_ids) |

**Engine & Algorithm:**
| Field | Type | Values | Default | Description |
|-------|------|--------|---------|-------------|
| engine | string | "auto", "panel", "raw_wood" | "auto" | Optimization engine |
| algorithm | string | "guillotine", "rectpack", "next_fit", "best_fit" | "guillotine" | Cutting algorithm |
| high_precision | boolean | true/false | false | Use genetic algorithm (slower, better) |

**Material Source:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| material_source | string | "stock" | Global material source (stock or supplier) |
| material_sources | object | null | Per-material source override {material_id: "stock"\|"supplier"} |

**Parameters:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| kerf | number | 3.0 | Blade thickness in mm (> 0) |
| trim_margin | number | 2.0 | Sanding margin in mm (≥ 0) |
| safety_margin | number | 5.0 | Safety margin between parts in mm (≥ 0) |

**Processing:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| export_formats | array | ["pdf"] | Export formats: "png", "pdf", "dxf", "svg", "json" |
| validate_and_update_stock | boolean | false | Update stock and add offcuts after optimization |

**Raw Wood Parameters:**
| Field | Type | Description |
|-------|------|-------------|
| raw_wood_params | object | Raw wood specific parameters (only if engine="raw_wood") |
| raw_wood_params.position_resolution | number | Position resolution in mm |
| raw_wood_params.min_offcut_dimension | number | Minimum offcut dimension in mm |
| raw_wood_params.scoring_weights.utilization | number | Weight for utilization metric |
| raw_wood_params.scoring_weights.compactness | number | Weight for compactness metric |
| raw_wood_params.scoring_weights.offcut_quality | number | Weight for offcut quality |

**Response:**
```json
{
  "optimization_id": 42,
  "engine_used": "panel",
  "total_panels_used": 3,
  "waste_percentage": 12.5,
  "result_data": {
    "material_1": {
      "success": true,
      "panels_used": 3,
      "total_pieces": 21,
      "pieces_placed": 21,
      "pieces_remaining": 0,
      "waste_percentage": 12.5,
      "panels": [
        {
          "panel_id": 1,
          "width": 2800,
          "height": 2070,
          "is_offcut": false,
          "grain_direction": 1,
          "waste_percentage": 15.0,
          "placements": [
            {
              "piece_id": 1,
              "piece_name": "Part 1",
              "x": 0,
              "y": 0,
              "width": 500,
              "height": 250,
              "rotated": false,
              "grain_direction": 0
            }
          ],
          "offcuts": [
            {
              "x": 0,
              "y": 250,
              "width": 500,
              "height": 100
            }
          ]
        }
      ]
    }
  },
  "export_files": {
    "pdf": "/api/exports/optimization_42.pdf",
    "png": "/api/exports/optimization_42.png"
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid parameters or no stock available
- `404`: Project/material not found
- `500`: Server error

**Example:**
```bash
curl -X POST "http://localhost:8000/api/optimize/run" \
  -H "Content-Type: application/json" \
  -d '{
    "project_ids": [1],
    "piece_ids": [1, 2, 3],
    "engine": "auto",
    "algorithm": "guillotine",
    "kerf": 3.0,
    "material_source": "stock",
    "material_sources": {
      "1": "stock"
    },
    "export_formats": ["pdf"],
    "validate_and_update_stock": false,
    "high_precision": false
  }'
```

---

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message describing what went wrong"
}
```

### Common Error Messages

| Status | Message | Cause |
|--------|---------|-------|
| 400 | "No project(s) specified for optimization" | project_ids or project_id is empty |
| 400 | "Selected projects/pieces map to no parts to optimize" | No parts found with given criteria |
| 400 | "No stock available for material ID {id}" | Material has no stock items with quantity > 0 |
| 404 | "Project not found" | project_id doesn't exist |
| 404 | "Material not found" | material_id doesn't exist |
| 500 | "Erreur lors du chargement des projets: {error}" | Database error loading projects |

---

## Rate Limiting
None currently implemented (development mode)

---

## CORS
**Allowed Origins:**
- `http://localhost:5173` (Frontend)
- `http://localhost:3001` (Mobile)
- `*` (All - development only)

**Allowed Methods:** GET, POST, PUT, DELETE, OPTIONS, PATCH

**Allowed Headers:** All

---

## Data Types

### Measurements
- **Dimensions (mm)**: width, height, thickness - floating point numbers
- **Area (mm²)**: Calculated as width × height × quantity
- **Area (m²)**: mm² ÷ 1,000,000
- **Weight (kg)**: Estimated using material density

### Materials
- **Species**: "chêne", "hêtre", "sapin", "epicea", "aulne", "erable", etc.
- **Price Type**: "m2" (per square meter), "m3" (per cubic meter), "unit" (per unit)
- **Grain Direction**: 0 (none), 1 (horizontal), 2 (vertical)

### Cost Calculations
- **m2**: `area_m2 × cost_per_sqm`
- **m3**: `(area_m2 × thickness_m) × cost_per_sqm`
- **unit**: `piece_count × cost_per_sqm`

---

## Integration Examples

### JavaScript/TypeScript Frontend

```typescript
// Get project stats
const stats = await api.get(`/projects/1/stats`);
console.log(`Project has ${stats.piece_count} pieces`);

// Identify materials
const materials = await api.post('/materials/identify-from-pieces', {
  piece_ids: [1, 2, 3],
  project_ids: [1]
});
console.log(`Found ${materials.length} unique materials`);

// Check stock availability
const availability = await api.post('/stock/availability', {
  material_ids: materials.map(m => m.id)
});

// Run optimization
const result = await api.post('/optimize/run', {
  project_ids: [1],
  piece_ids: [1, 2, 3],
  material_sources: {1: 'stock'},
  kerf: 3.0
});
console.log(`Used ${result.total_panels_used} panels, waste: ${result.waste_percentage}%`);
```

---

## Batch Processing

All endpoints support batch processing where specified:

### Multiple Projects
```json
{
  "project_ids": [1, 2, 3]
}
```

### Multiple Materials
```json
{
  "material_ids": [1, 2, 3, 4, 5]
}
```

### Per-Material Source Selection
```json
{
  "material_sources": {
    "1": "stock",
    "2": "supplier",
    "3": "stock"
  }
}
```

---

## Pagination
Not currently implemented. All results returned in full (scalability consideration for future versions).

---

## Versioning
Current API version: **4.0.0**

No versioning in URL path. Major changes will increment to v5.

---

## Webhooks
Not currently implemented.

---

## Support

### Documentation
- Interactive API docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Testing
- See `TESTING_GUIDE.md` for detailed testing procedures
- See `BACKEND_IMPLEMENTATION_SUMMARY.md` for architecture overview

### Issues
Check logs:
- Backend: Terminal where `uvicorn` is running
- Frontend: Browser DevTools Console (F12)
- Database: SQLite error messages

