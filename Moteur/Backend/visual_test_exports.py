
import sys
import os
import json
from pathlib import Path

# Add backend to path to import IA_Engine
backend_path = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Backend\Services"
if backend_path not in sys.path:
    sys.path.append(backend_path)

from IA_Engine.exports import ExportGenerator

# Mock data for a long thin board
panel_long_thin = {
    "width": 3100,
    "height": 200,
    "waste_percentage": 5.2,
    "placements": [
        {"piece_id": 1, "piece_name": "Long Rail", "width": 1500, "height": 180, "x": 10, "y": 10, "is_rotated": False},
        {"piece_id": 2, "piece_name": "Short Rail", "width": 800, "height": 180, "x": 1520, "y": 10, "is_rotated": False}
    ],
    "offcuts": []
}

mock_results = {
    "Chêne Massif": {
        "panels": [panel_long_thin],
        "success": True,
        "waste_percentage": 5.2,
        "panels_used": 1
    }
}

def test_exports():
    test_dir = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Backend\test_exports"
    os.makedirs(test_dir, exist_ok=True)
    
    generator = ExportGenerator(output_dir=test_dir)
    print(f"Generating exports in {test_dir}...")
    
    files = generator.generate_all(
        mock_results,
        "Test_Proportion_Fix",
        ["png", "pdf", "svg"],
        client_name="Test_Client"
    )
    
    print("\nGenerated files:")
    for key, path in files.items():
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"- {key}: {path} ({size} bytes)")
        else:
            print(f"- {key}: {path} (FAILED - FILE NOT FOUND)")

if __name__ == "__main__":
    test_exports()
