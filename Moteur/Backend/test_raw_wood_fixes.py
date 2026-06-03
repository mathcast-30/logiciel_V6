"""
Verification test for Raw Wood Optimizer fixes.
"""

import os
import sys
import logging
from pathlib import Path
from shapely.geometry import Polygon

# Add project paths
current_path = Path(__file__).resolve()
moteur_index = current_path.parts.index("Moteur")
base_engine_dir = Path(*current_path.parts[:moteur_index+1])
sys.path.insert(0, str(base_engine_dir / "Backend" / "Services"))
sys.path.insert(0, str(base_engine_dir / "Backend" / "System" / "Bin"))

from IA_Engine.raw_wood_optimizer.core import RawWoodOptimizer, NestingAlgorithm
from IA_Engine.raw_wood_optimizer.domain import RawPiece, RawBoard, WoodSpecies, GrainVector

# Setup logging to capture and check warnings
log_capture = []
class CaptureHandler(logging.Handler):
    def emit(self, record):
        log_capture.append(record.getMessage())

logger = logging.getLogger("IA_Engine.raw_wood_optimizer")
logger.setLevel(logging.WARNING)
logger.addHandler(CaptureHandler())

def test_rotation_and_logs():
    print("\n=== Testing Rotation & Simplified Logging ===")
    global log_capture
    log_capture = []
    
    optimizer = RawWoodOptimizer(algorithm=NestingAlgorithm.BEST_FIT, ignore_grain_direction=True)
    
    # Board: 1000x200 (Horizontal grain)
    board = RawBoard.from_rectangle(id=0, width=1000, height=200, grain_vector=GrainVector.horizontal())
    
    # Piece: 100x210 (Vertical grain) - Too TALL if not rotated, but fits if rotated 90°
    # Raw dimensions: width=100, height=210. 210 > 200 (board height)
    piece = RawPiece.from_rectangle(id=1, width=100, height=210, grain_vector=GrainVector.vertical())
    
    print(f"  Attempting to place piece {piece.id} ({piece.width}x{piece.height}) on board {board.id} (height 200)")
    print(f"  ignore_grain_direction is {optimizer.ignore_grain_direction}")
    
    result = optimizer.optimize([piece], [board])
    
    print(f"  Success: {result['success']}")
    print(f"  Pieces placed: {result['pieces_placed']}")
    
    # Verify success (should fit rotated)
    if result['success'] and result['pieces_placed'] == 1:
        print("  [PASS] Piece placed successfully after rotation!")
    else:
        print("  [FAIL] Piece could not be placed despite ignore_grain_direction=True")
        
    # Check logs for "once-per-piece" grain alignment warning
    grain_warnings = [m for m in log_capture if "strict grain alignment failed" in m]
    print(f"  Grain warnings found: {len(grain_warnings)}")
    # Since ignore_grain_direction is True, it might not log the warning anymore or log it once.
    # Actually my implementation logs it only if ignore_grain_direction is False.
    # Let's test with ignore_grain_direction=False to see duplication fix.
    
    print("\n=== Testing Log Duplication (ignore_grain_direction=False) ===")
    from IA_Engine.raw_wood_optimizer.constraints.grain_constraint import GrainConstraint
    GrainConstraint.clear_logged_pieces()
    
    # Board with horizontal grain
    log_capture = []
    optimizer_strict = RawWoodOptimizer(algorithm=NestingAlgorithm.BEST_FIT, ignore_grain_direction=False)
    # Piece that fails grain but might be tried multiple times internally
    piece_fail = RawPiece.from_rectangle(id=2, width=50, height=50, grain_vector=GrainVector.vertical())
    # Run optimizer once with multiple boards (force multiple grain checks for same piece)
    boards = [
        RawBoard.from_rectangle(id=0, width=1000, height=200, grain_vector=GrainVector.horizontal()),
        RawBoard.from_rectangle(id=1, width=1000, height=200, grain_vector=GrainVector.horizontal())
    ]
    optimizer_strict.optimize([piece_fail], boards)
    
    grain_warnings_strict = [m for m in log_capture if "Grain alignment impossible" in m or "strict grain alignment failed" in m]
    print(f"  Grain warnings found: {len(grain_warnings_strict)}")
    for w in grain_warnings_strict:
        print(f"    - {w}")
    
    if len(grain_warnings_strict) == 2:
        print("  [PASS] Log deduplication works (1 constraint warning + 1 strategy reason)")
    elif len(grain_warnings_strict) > 2:
        print(f"  [FAIL] Too many warnings: {len(grain_warnings_strict)}")
    else:
        print("  [INFO] No grain warnings found (maybe it didn't even try?)")

def test_failure_reasons():
    print("\n=== Testing Detailed Failure Reasons ===")
    global log_capture
    log_capture = []
    
    optimizer = RawWoodOptimizer(algorithm=NestingAlgorithm.BEST_FIT)
    # Board too small
    board_small = RawBoard.from_rectangle(id=10, width=100, height=100, grain_vector=GrainVector.horizontal())
    # Piece too large
    piece_large = RawPiece.from_rectangle(id=20, width=500, height=500, grain_vector=GrainVector.horizontal())
    
    result = optimizer.optimize([piece_large], [board_small])
    
    reasons = [m for m in log_capture if "Could not place piece" in m]
    for r in reasons:
        print(f"  Log entry: {r}")
        if "exceeds" in r or "too large" in r.lower():
            print("  [PASS] Detected piece size failure reason!")
            return
    print("  [FAIL] Did not find detailed failure reason in logs")

if __name__ == "__main__":
    test_rotation_and_logs()
    test_failure_reasons()
