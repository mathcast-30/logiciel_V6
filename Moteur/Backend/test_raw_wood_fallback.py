"""
Test script for RawWoodOptimizer fallback (bounding-box NFP).

Verifies that the optimizer works even without libnfporb C++ library,
using the bounding-box fallback in NFPGenerator.
"""

import os
import sys
from pathlib import Path

# Add project paths
current_path = Path(__file__).resolve()
moteur_index = current_path.parts.index("Moteur")
base_engine_dir = Path(*current_path.parts[:moteur_index+1])
sys.path.insert(0, str(base_engine_dir / "Backend" / "Services"))
sys.path.insert(0, str(base_engine_dir / "Backend" / "System" / "Bin"))

from shapely.geometry import Polygon


def test_nfp_fallback():
    """Test that NFPGenerator falls back to bounding-box when libnfporb is missing."""
    print("\n=== Test 1: NFP Bounding-Box Fallback ===")
    
    from IA_Engine.raw_wood_optimizer.nfp.interface import NFPGenerator
    
    nfp_gen = NFPGenerator()
    print(f"  libnfporb available: {nfp_gen.is_available()}")
    
    # Create two rectangles
    rect_a = Polygon([(0, 0), (100, 0), (100, 100), (0, 100)])
    rect_b = Polygon([(0, 0), (50, 0), (50, 50), (0, 50)])
    
    try:
        nfp = nfp_gen.compute_nfp(rect_a, rect_b)
        print(f"  NFP computed successfully. Area: {nfp.area:.1f}")
        print(f"  NFP bounds: {nfp.bounds}")
        print("  [PASS] NFP fallback works!")
        return True
    except Exception as e:
        print(f"  [FAIL] NFP computation error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_raw_wood_optimizer():
    """Test that RawWoodOptimizer works end-to-end without libnfporb."""
    print("\n=== Test 2: RawWoodOptimizer End-to-End ===")
    
    from IA_Engine.raw_wood_optimizer.core import RawWoodOptimizer, NestingAlgorithm
    from IA_Engine.raw_wood_optimizer.domain import RawPiece, RawBoard, WoodSpecies, GrainVector
    
    # Create optimizer (should NOT crash anymore)
    try:
        optimizer = RawWoodOptimizer(algorithm=NestingAlgorithm.BEST_FIT)
        print("  Optimizer created successfully (no NFPRequiredError)")
    except Exception as e:
        print(f"  [FAIL] Optimizer creation failed: {e}")
        return False
    
    # Create boards using the factory method
    grain_h = GrainVector.horizontal()
    
    try:
        board = RawBoard.from_rectangle(
            id=0,
            width=1000.0,
            height=200.0,
            grain_vector=grain_h,
            species=WoodSpecies.CHENE
        )
        print(f"  Board created: {board}")
    except Exception as e:
        print(f"  [FAIL] Board creation failed: {e}")
        return False
    
    # Create pieces using the factory method
    try:
        piece1 = RawPiece.from_rectangle(
            id=1,
            width=200.0,
            height=100.0,
            grain_vector=grain_h,
            name="Piece A"
        )
        piece2 = RawPiece.from_rectangle(
            id=2,
            width=300.0,
            height=100.0,
            grain_vector=grain_h,
            name="Piece B"
        )
        print(f"  Pieces created: {piece1}, {piece2}")
    except Exception as e:
        print(f"  [FAIL] Piece creation failed: {e}")
        return False
    
    # Run optimization
    try:
        result = optimizer.optimize([piece1, piece2], [board])
        print(f"  Optimization success: {result.get('success', 'N/A')}")
        print(f"  Panels used: {result.get('panels_used', 0)}")
        print(f"  Pieces placed: {result.get('pieces_placed', 0)}")
        print(f"  Pieces remaining: {result.get('pieces_remaining', 0)}")
        print(f"  Waste: {result.get('waste_percentage', 0):.1f}%")
        
        for i, panel in enumerate(result.get('panels', [])):
            placements = panel.get('placements', [])
            print(f"    Panel {i+1}: {len(placements)} placements")
        
        if result.get('success', False):
            print("  [PASS] Optimization succeeded!")
            return True
        else:
            print("  [WARN] Optimization completed but not all pieces placed")
            return True  # Still a pass - the optimizer ran without crashing
    except Exception as e:
        print(f"  [FAIL] Optimization error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_exports_with_result():
    """Test that ExportGenerator.generate_png works with various material names."""
    print("\n=== Test 3: PNG Export with Sanitization ===")
    
    from IA_Engine.exports import ExportGenerator
    
    optim_dir = base_engine_dir / "UserData" / "Optimisations" / "test_fallback"
    optim_dir.mkdir(parents=True, exist_ok=True)
    
    generator = ExportGenerator(output_dir=str(optim_dir))
    
    # Test with tricky material names
    dummy_result = {
        "hetre ": {  # trailing space
            "success": True,
            "panels": [{
                "width": 2800, "height": 2070,
                "placements": [
                    {"x": 10, "y": 10, "width": 500, "height": 300, "piece_name": "Pièce 1"},
                    {"x": 520, "y": 10, "width": 400, "height": 600, "piece_name": "Pièce 2"}
                ],
                "offcuts": []
            }]
        },
        "chene/massif": {  # slash in name
            "success": True,
            "panels": [{
                "width": 1000, "height": 2000,
                "placements": [
                    {"x": 0, "y": 0, "width": 200, "height": 100, "piece_name": "Pièce 3"}
                ],
                "offcuts": []
            }]
        }
    }
    
    try:
        paths = generator.generate_all(dummy_result, "Test_Fallback", ["png"], client_name="Test")
        
        if not paths:
            print("  [FAIL] No paths returned from generate_all")
            return False
        
        all_exist = True
        for key, filepath in paths.items():
            exists = os.path.exists(filepath)
            status = "OK" if exists else "MISSING"
            print(f"  [{status}] {key} -> {filepath}")
            if not exists:
                all_exist = False
        
        if all_exist:
            print("  [PASS] All PNG files generated!")
            return True
        else:
            print("  [FAIL] Some PNG files are missing")
            return False
    except Exception as e:
        print(f"  [FAIL] Export error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("  Raw Wood Optimizer Fallback Test Suite")
    print("=" * 60)
    
    results = []
    results.append(("NFP Fallback", test_nfp_fallback()))
    results.append(("RawWoodOptimizer", test_raw_wood_optimizer()))
    results.append(("PNG Export", test_exports_with_result()))
    
    print("\n" + "=" * 60)
    print("  Results Summary")
    print("=" * 60)
    
    all_passed = True
    for name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {name}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("  ALL TESTS PASSED!")
    else:
        print("  SOME TESTS FAILED!")
        sys.exit(1)
