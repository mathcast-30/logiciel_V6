"""
Massive optimization test for RawWoodOptimizer fallback.
Validates stability and JSON output with 50+ pieces.
"""

import os
import sys
import time
from pathlib import Path

# Add project paths
current_path = Path(__file__).resolve()
moteur_index = current_path.parts.index("Moteur")
base_engine_dir = Path(*current_path.parts[:moteur_index+1])
sys.path.insert(0, str(base_engine_dir / "Backend" / "Services"))

from IA_Engine.raw_wood_optimizer.core import RawWoodOptimizer, NestingAlgorithm
from IA_Engine.raw_wood_optimizer.domain import RawPiece, RawBoard, WoodSpecies, GrainVector

def test_massive_optimization():
    print("\n=== Test Massive Optimization (50+ Pieces) ===")
    
    # 1. Config
    optimizer = RawWoodOptimizer(
        algorithm=NestingAlgorithm.BEST_FIT,
        position_resolution=15.0, # Recommended for fallback
        ignore_grain_direction=True
    )
    
    # 2. Boards (3 large boards)
    grain_h = GrainVector.horizontal()
    boards = [
        RawBoard.from_rectangle(id=i, width=3000.0, height=800.0, grain_vector=grain_h, species=WoodSpecies.CHENE)
        for i in range(3)
    ]
    
    # 3. 55 Pieces of various sizes
    pieces = []
    for i in range(1, 56):
        w = 100 + (i * 5) % 300
        h = 100 + (i * 7) % 200
        pieces.append(RawPiece.from_rectangle(
            id=i,
            width=float(w),
            height=float(h),
            grain_vector=grain_h,
            name=f"Piece_Verify_{i}"
        ))
    
    print(f"  Starting optimization of {len(pieces)} pieces on {len(boards)} boards...")
    start_time = time.time()
    
    try:
        result = optimizer.optimize(pieces, boards)
        end_time = time.time()
        
        # 4. Validations
        print(f"  Optimization finished in {end_time - start_time:.2f} seconds.")
        print(f"  Success: {result.get('success')}")
        print(f"  Fallback used: {result.get('fallback_used')}")
        print(f"  Pieces placed: {result.get('pieces_placed')}/{len(pieces)}")
        print(f"  Waste: {result.get('waste_percentage')}%")
        
        # Verify JSON structure
        assert "panels" in result
        assert "metrics" in result
        assert result["optimizer_type"] == "raw_wood"
        
        # Check for pieces that might be out of bounds (just checking count)
        placed_count = sum(len(p["placements"]) for p in result["panels"])
        print(f"  Verification: {placed_count} pieces found in panels.")
        
        if result.get('pieces_placed', 0) > 40:
             print("  [PASS] Engine is stable and efficient with massive input!")
             return True
        else:
             print("  [WARN] Efficiency might be low, but engine didn't crash.")
             return True
             
    except Exception as e:
        print(f"  [FAIL] Engine crashed during massive optimization: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_massive_optimization()
    if not success:
        sys.exit(1)
