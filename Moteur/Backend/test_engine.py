import sys
import os

# Ensure the root of Backend is in path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

# Import the bridge
from Services.IA_Engine.raw_wood_optimizer.bridge_cpp import solve_placement

def test():
    pieces = [
        {"id": 1, "width": 1000.0, "height": 500.0},
        {"id": 2, "width": 800.0, "height": 500.0},
        {"id": 3, "width": 600.0, "height": 600.0}
    ]

    boards = [
        {
            "id": 100,
            "minx": 0.0,
            "miny": 0.0,
            "maxx": 2800.0,
            "maxy": 2070.0,
            "defects": []
        }
    ]

    print("--- Running solve_placement ---")
    placements = solve_placement(pieces, boards, kerf=3.0, allow_transverse=False, resolution=1.0)
    for p in placements:
        print(f"Piece {p['piece_id']} -> Board {p['board_id']} at ({p['x']}, {p['y']}) [w:{p['w']} h:{p['h']}] rotated: {p['rotated']}")
    print("--- Test finished ---")

if __name__ == "__main__":
    test()
