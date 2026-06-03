import os
import sys
from pathlib import Path

# Add project root to sys.path
current_path = Path(__file__).resolve()
moteur_index = current_path.parts.index("Moteur")
base_engine_dir = Path(*current_path.parts[:moteur_index+1])
sys.path.append(str(base_engine_dir / "Backend" / "Services"))
sys.path.append(str(base_engine_dir / "Backend" / "System" / "Bin"))

from IA_Engine.exports import ExportGenerator

def test_png_generation():
    optim_dir = base_engine_dir / "UserData" / "Optimisations"
    optim_dir.mkdir(parents=True, exist_ok=True)
    
    generator = ExportGenerator(output_dir=str(optim_dir))
    
    dummy_result = {
        "hetre ": {
            "success": True,
            "panels": [
                {
                    "width": 2800,
                    "height": 2070,
                    "placements": [
                        {"x": 10, "y": 10, "width": 500, "height": 300, "piece_name": "Piece 1"},
                        {"x": 520, "y": 10, "width": 400, "height": 600, "piece_name": "Piece 2"}
                    ],
                    "offcuts": []
                }
            ]
        },
        "chene/massif": {
            "success": True,
            "panels": [
                {
                    "width": 1000,
                    "height": 2000,
                    "placements": [
                        {"x": 0, "y": 0, "width": 200, "height": 100, "piece_name": "Piece 3"}
                    ],
                    "offcuts": []
                }
            ]
        }
    }
    
    print("Starting generation...")
    try:
        paths = generator.generate_all(
            dummy_result,
            "Test_Batch",
            ["png"],
            client_name="Test_Client"
        )
        print(f"Generated paths: {paths}")
        
        for k, v in paths.items():
            if os.path.exists(v):
                print(f"File exists: {v}")
            else:
                print(f"File MISSING: {v}")
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_png_generation()
