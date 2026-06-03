import sys
import os
from pathlib import Path

# Add backend to path to import IA_Engine
backend_path = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\Backend\Services"
if backend_path not in sys.path:
    sys.path.append(backend_path)

from IA_Engine.project_exports import ProjectExportGenerator

mock_parts = [
    {
        'name': 'Côté Droit',
        'width': 2000,
        'height': 600,
        'quantity': 2,
        'material_name': 'Chêne Massif',
        'material_thickness': 19
    },
    {
        'name': 'Étagère',
        'width': 1000,
        'height': 580,
        'quantity': 5,
        'material_name': 'Chêne Massif',
        'material_thickness': 19
    },
    {
        'name': 'Fond',
        'width': 2000,
        'height': 1000,
        'quantity': 1,
        'material_name': 'MDF',
        'material_thickness': 3
    }
]

def test_project_exports():
    test_dir = r"c:\Users\Mathe\Documents\Matheo\passion\menuiserie\optimisation\different script\logiciel_V4\Moteur\UserData\Exports"
    os.makedirs(test_dir, exist_ok=True)
    
    generator = ProjectExportGenerator(output_dir=test_dir)
    print(f"Generating exports in {test_dir}...")
    
    files = generator.generate_all(
        parts=mock_parts,
        project_name="Test_Armoire",
        client_name="Test_Client",
        formats=["pdf", "excel"]
    )
    
    print("\nGenerated files:")
    for key, path in files.items():
        if os.path.exists(path):
            size = os.path.getsize(path)
            print(f"- {key}: {path} ({size} bytes)")
        else:
            print(f"- {key}: {path} (FAILED - FILE NOT FOUND)")

if __name__ == "__main__":
    test_project_exports()
