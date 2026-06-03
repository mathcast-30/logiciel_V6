import sys
import os
import logging
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

# Allow importing directly from current directory context if needed
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.db.database import SessionLocal, Base, engine
from app.models import Material, Stock, Project, Part, Client
from app.main import app

# Suppress verbose startup logs if possible
logging.getLogger("passlib").setLevel(logging.ERROR)

client_api = TestClient(app)

def setup_test_data(db: Session):
    print("[SETUP] Setting up test data...")
    
    # 1. Material (Chêne Massif)
    mat = db.query(Material).filter(Material.name == "IntegrationTest Wood").first()
    if not mat:
        print("   -> Creating new Material...")
        mat = Material(
            name="IntegrationTest Wood",
            thickness=22.0,
            is_panel=False,  # Trigger for Raw Wood
            species="chene"
        )
        db.add(mat)
        db.commit()
        db.refresh(mat)
    else:
        print(f"   -> Using existing Material ID: {mat.id}")

    # 2. Stock (Board)
    # Check if stock exists for this material to avoid duplicates
    existing_stock = db.query(Stock).filter(Stock.material_id == mat.id).first()
    if not existing_stock:
        stock = Stock(
            material_id=mat.id,
            height=2500.0,
            width=200.0,
            quantity=10,
            is_offcut=False,
            grain_direction=1
        )
        db.add(stock)
        db.commit()
    else:
         print(f"   -> Using existing Stock ID: {existing_stock.id}")
    
    # 3. Client & Project
    # Create a dummy client if none exists
    client = db.query(Client).filter(Client.contact_email == "test@integration.com").first()
    if not client:
        client = Client(name="Test Client", contact_email="test@integration.com", contact_phone="0102030405")
        db.add(client)
        db.commit()
        db.refresh(client)
        
    proj = Project(
        name="Integration Test Project",
        client_id=client.id,
        status="draft"
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    
    # 4. Parts (to be cut from the wood)
    p1 = Part(
        name="Montant 1",
        width=80.0,
        height=2000.0,
        quantity=2,
        material_id=mat.id,
        project_id=proj.id,
        grain_direction=1,
        allow_rotation=True
    )
    p2 = Part(
        name="Traverse 1",
        width=80.0,
        height=800.0,
        quantity=4,
        material_id=mat.id,
        project_id=proj.id,
        grain_direction=1,
        allow_rotation=True
    )
    db.add(p1)
    db.add(p2)
    db.commit()
    db.refresh(p1)
    db.refresh(p2)
    
    print(f"   -> Created Material ID: {mat.id}")
    print(f"   -> Created Project ID: {proj.id}")
    print(f"   -> Created {p1.quantity + p2.quantity} parts total.")
    
    return mat.id, proj.id, [p1.id, p2.id]

def cleanup_test_data(db: Session, mat_id, proj_id):
    print("[CLEANUP] Cleaning up test data...")
    try:
        # Delete Parts
        db.query(Part).filter(Part.project_id == proj_id).delete()
        # Delete Stock
        db.query(Stock).filter(Stock.material_id == mat_id).delete()
        # Delete Project
        db.query(Project).filter(Project.id == proj_id).delete()
        # Delete Material
        db.query(Material).filter(Material.id == mat_id).delete()
        
        db.commit()
        print("   -> Cleanup successful.")
    except Exception as e:
        print(f"   -> Cleanup warning: {e}")
        db.rollback()

def run_integration_test(mat_id, proj_id, p_ids):
    print("\n[TEST] Starting Optimization Request (Engine: 'raw_wood')...")
    
    payload = {
        "project_ids": [proj_id],
        "piece_ids": p_ids,
        "engine": "raw_wood",
        "algorithm": "best_fit",
        "kerf": 3.0,
        "validate_and_update_stock": False,
        "raw_wood_params": {
            "position_resolution": 10.0,
            "min_offcut_dimension": 100.0,
            "scoring_weights": {"utilization": 1.0, "compactness": 0.0, "offcut_quality": 0.0}
        }
    }
    
    try:
        response = client_api.post("/api/optimize/run", json=payload)
        
        if response.status_code == 200:
            data = response.json()
            print("\n[OK] API Response: 200 OK")
            
            engine_used = data.get("engine_used")
            metrics = data.get("result_data", {})
            
            print(f"   -> Engine Reported: '{engine_used}'")
            print(f"   -> Items Processed: {len(metrics)}")
            
            if engine_used in ["raw_wood", "mixed"]:
                print("   [SUCCESS] The Raw Wood Engine was successfully triggered and executed.")
            else:
                print(f"   [WARNING] Optimization ran but engine was '{engine_used}' (Expected 'raw_wood')")
                
        else:
            print(f"\n[FAIL] API Request Failed. Status: {response.status_code}")
            print(f"   Error: {response.text}")
            
    except Exception as e:
        print(f"\n[FAIL] Fatal Error during request: {e}")

if __name__ == "__main__":
    db = SessionLocal()
    mat_id = proj_id = None
    try:
        mat_id, proj_id, p_ids = setup_test_data(db)
        run_integration_test(mat_id, proj_id, p_ids)
    except Exception as e:
        print(f"[ERROR] Initialization Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        if mat_id and proj_id:
            cleanup_test_data(db, mat_id, proj_id)
        db.close()
