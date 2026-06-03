# Backend Endpoints Testing Guide

## Quick Start

### 1. Start Backend Server
```bash
cd "Moteur/Backend/System/Bin"
conda activate opticut_pro
uvicorn app.main:app --reload
```
Backend will be available at `http://localhost:8000`

### 2. Start Frontend (in separate terminal)
```bash
cd "Moteur/Frontend"
npm run dev
```
Frontend will be available at `http://localhost:5173`

---

## Manual Testing with cURL

### Endpoint 1: GET Project Statistics

```bash
# Get stats for project ID 1
curl -X GET "http://localhost:8000/api/projects/1/stats"
```

Expected Response:
```json
{
    "piece_count": 21,
    "material_count": 1,
    "estimated_area": 125000.0
}
```

### Endpoint 2: Identify Materials from Pieces

```bash
# Identify materials from pieces 1, 2, 3
curl -X POST "http://localhost:8000/api/materials/identify-from-pieces" \
  -H "Content-Type: application/json" \
  -d '{
    "piece_ids": [1, 2, 3],
    "project_ids": [1]
  }'
```

Expected Response:
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

### Endpoint 3: Check Stock Availability

```bash
# Check availability for material ID 1
curl -X POST "http://localhost:8000/api/stock/availability" \
  -H "Content-Type: application/json" \
  -d '{
    "material_ids": [1]
  }'
```

Expected Response:
```json
{
    "availability": [
        {
            "material_id": 1,
            "material_name": "Chêne Massif",
            "material_species": "chêne",
            "is_panel": false,
            "thickness": 20.0,
            "stock_count": 1,
            "available_area": 1200.0,
            "available_panels": [
                {
                    "id": 1,
                    "width": 100,
                    "height": 125,
                    "quantity": 1,
                    "area": 1200.0,
                    "is_offcut": false,
                    "grain_direction": 1,
                    "quality_score": 1.0,
                    "label": null
                }
            ],
            "estimated_cost": 54.0
        }
    ]
}
```

### Endpoint 4: Run Optimization with Material Sources

```bash
# Run optimization with mixed material sources
curl -X POST "http://localhost:8000/api/optimize/run" \
  -H "Content-Type: application/json" \
  -d '{
    "project_ids": [1],
    "piece_ids": [1, 2, 3],
    "engine": "auto",
    "algorithm": "guillotine",
    "kerf": 3.0,
    "trim_margin": 2.0,
    "safety_margin": 5.0,
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

## Frontend Testing

### Test Workflow in UI

1. **Navigate to Optimize page**
   - URL: `http://localhost:5173/optimize`

2. **Step 1: Select Projects**
   - Click on projects in EnhancedProjectSelector
   - Should display: piece_count, material_count, estimated_area
   - Verify stats endpoint is called: Check browser Network tab

3. **Step 2: Select Pieces**
   - Click on pieces to select them
   - Should display pieces filtered by project

4. **Step 3: View Materials**
   - MaterialBreakdown should auto-populate with identified materials
   - Check browser Console for API calls
   - Expected endpoint call: `/api/materials/identify-from-pieces`

5. **Step 4: Choose Material Sources**
   - For each material, radio buttons: "Stock" vs "Supplier"
   - Should show stock availability info
   - Check browser Network tab: `/api/stock/availability` should be called

6. **Step 5-7: Complete Optimization**
   - Set parameters, run optimization
   - Should send material_sources dict to `/api/optimize/run`

---

## Browser Console Debugging

### Check Network Calls

1. Open DevTools: **F12** → **Network** tab
2. Filter by XHR requests
3. Look for these endpoints:
   - `GET /projects/{id}/stats`
   - `POST /materials/identify-from-pieces`
   - `POST /stock/availability`
   - `POST /optimize/run`

### Check Console for Errors

1. Open DevTools: **F12** → **Console** tab
2. Look for any error messages
3. Common issues:
   - 404 errors: Check endpoint paths (missing `/api` prefix, wrong method)
   - CORS errors: Check main.py CORS configuration
   - Type errors: Check request/response JSON structure

---

## Database Test Queries

### Check Test Data

```bash
# Using Python
python3 << 'EOF'
import sqlite3
db_path = "Moteur/UserData/BaseDeDonnees/opticut.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("=== Projects ===")
cursor.execute("SELECT id, name, status FROM projects LIMIT 5")
for row in cursor.fetchall():
    print(row)

print("\n=== Parts ===")
cursor.execute("SELECT id, project_id, name, width, height, quantity FROM parts LIMIT 10")
for row in cursor.fetchall():
    print(row)

print("\n=== Materials ===")
cursor.execute("SELECT id, name, thickness, cost_per_sqm, is_panel FROM materials")
for row in cursor.fetchall():
    print(row)

print("\n=== Stock ===")
cursor.execute("SELECT id, material_id, width, height, quantity FROM stock")
for row in cursor.fetchall():
    print(row)

conn.close()
EOF
```

---

## Troubleshooting

### Issue: 404 Not Found on Endpoint

**Check 1**: Verify endpoint path in router file
- GET /api/projects/{id}/stats should be in `projects.py` at line ~43
- POST /api/materials/identify-from-pieces should be in `materials.py` at end of file
- POST /api/stock/availability should be in `stock.py` at end of file

**Check 2**: Verify router is mounted in main.py
```python
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(materials.router, prefix="/api/materials", tags=["materials"])
app.include_router(stock.router, prefix="/api", tags=["Stock"])
```

**Check 3**: Restart backend server after changes

### Issue: Type Mismatch in Response

**Check**: 
- Verify response data format matches frontend expectations
- Check `identifiedMaterials` state in Optimize.tsx expects array of objects with id, name, etc.
- Check `stockAvailability` expects nested structure with availability array

### Issue: Material IDs Not Found

**Check**:
- Verify `piece_ids` correspond to actual parts in database
- Verify each part has a valid `material_id` foreign key
- Run: `SELECT * FROM parts WHERE id IN (1,2,3) AND material_id IS NOT NULL`

### Issue: Stock Not Showing Up

**Check**:
- Verify stock items exist: `SELECT * FROM stock WHERE quantity > 0`
- Verify stock.material_id matches material being queried
- Check `is_offcut` flag if filtering by offcut status

---

## Performance Considerations

### Expected Response Times

- **GET /api/projects/{id}/stats**: < 100ms (simple COUNT queries)
- **POST /api/materials/identify-from-pieces**: < 200ms (groups ~20 pieces by material)
- **POST /api/stock/availability**: < 150ms (aggregates stock items)
- **POST /api/optimize/run**: 1-30s (depends on piece count and algorithm)

### If Slow

1. Check database indexes:
   ```sql
   SELECT name FROM sqlite_master WHERE type='index' 
   AND (tbl_name='parts' OR tbl_name='stock' OR tbl_name='materials');
   ```

2. Add missing indexes:
   ```sql
   CREATE INDEX idx_parts_project_id ON parts(project_id);
   CREATE INDEX idx_parts_material_id ON parts(material_id);
   CREATE INDEX idx_stock_material_id ON stock(material_id);
   ```

3. Monitor backend logs for slow queries

---

## Success Checklist

- [ ] Backend starts without errors on port 8000
- [ ] Frontend starts without errors on port 5173
- [ ] GET /api/projects/{id}/stats returns valid JSON
- [ ] POST /api/materials/identify-from-pieces returns material array
- [ ] POST /api/stock/availability returns availability dict
- [ ] Material sources can be changed in UI
- [ ] Optimization runs with material_sources parameter
- [ ] No TypeScript errors in browser console
- [ ] No CORS errors in browser console
- [ ] Network requests show correct endpoint paths
- [ ] Database still consistent after tests

---

## Additional Resources

### API Documentation
- FastAPI interactive docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Code References
- Backend routers: `Moteur/Backend/System/Bin/app/routers/`
- Frontend services: `Moteur/Frontend/src/services/`
- Frontend components: `Moteur/Frontend/src/components/Optimize/`

### Logs
- Backend logs: Check terminal where `uvicorn` is running
- Frontend logs: Browser DevTools Console (F12)
- Database logs: Check SQLite error messages in terminal

