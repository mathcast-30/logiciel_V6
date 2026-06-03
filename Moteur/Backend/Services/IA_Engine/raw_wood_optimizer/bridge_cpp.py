import logging
from typing import List, Dict

logger = logging.getLogger(__name__)

# Fallback structures
class Rect:
    def __init__(self, x: float, y: float, w: float, h: float):
        self.x = x
        self.y = y
        self.w = w
        self.h = h

class Piece:
    def __init__(self, id: int, width: float, height: float):
        self.id = id
        self.width = width
        self.height = height

class Board:
    def __init__(self, id: int, minx: float, miny: float, maxx: float, maxy: float, defects: List[Rect]):
        self.id = id
        self.minx = minx
        self.miny = miny
        self.maxx = maxx
        self.maxy = maxy
        self.defects = defects

def get_engine():
    try:
        import raw_wood_engine
        return raw_wood_engine, True
    except ImportError as e:
        logger.warning(f"[BRIDGE] C++ Engine raw_wood_engine unavailable ({e}). Falling back to Python implementation.")
        return None, False

def check_collision_fast_python(x: float, y: float, w: float, h: float, placed: List[Rect], defects: List[Rect], kerf: float) -> bool:
    EPSILON = 1e-4
    min_x = x
    min_y = y
    max_x = x + w
    max_y = y + h

    for p in placed:
        p_min_x = p.x
        p_min_y = p.y
        p_max_x = p.x + p.w
        p_max_y = p.y + p.h

        overlap = not (max_x <= p_min_x - kerf + EPSILON or min_x >= p_max_x + kerf - EPSILON or
                       max_y <= p_min_y - kerf + EPSILON or min_y >= p_max_y + kerf - EPSILON)
        if overlap:
            return True

    for d in defects:
        d_min_x = d.x
        d_min_y = d.y
        d_max_x = d.x + d.w
        d_max_y = d.y + d.h

        overlap = not (max_x <= d_min_x + EPSILON or min_x >= d_max_x - EPSILON or
                       max_y <= d_min_y + EPSILON or min_y >= d_max_y - EPSILON)
        if overlap:
            return True

    return False

def find_best_position_python(pieces: List[Piece], boards: List[Board], kerf: float, allow_transverse: bool, resolution: float):
    results = []
    remaining_pieces = pieces
    EPSILON = 1e-4
    
    for board in boards:
        placed = []
        board_w = board.maxx - board.minx
        board_h = board.maxy - board.miny
        
        next_remaining = []
        for piece in remaining_pieces:
            p_long = max(piece.width, piece.height)
            p_short = min(piece.width, piece.height)
            
            orientations = []
            if allow_transverse:
                orientations.append((p_long, p_short))
                if piece.width != piece.height:
                    orientations.append((p_short, p_long))
            else:
                default_w = p_long
                default_h = p_short
                if default_w <= board_w + EPSILON and default_h <= board_h + EPSILON:
                    orientations.append((default_w, default_h))
                elif default_h <= board_w + EPSILON and default_w <= board_h + EPSILON:
                    orientations.append((default_h, default_w))
                    
            placed_piece = False
            for w, h in orientations:
                if w > board_w + EPSILON or h > board_h + EPSILON:
                    continue
                
                best_x, best_y = -1, -1
                
                x = board.minx
                while x <= board.maxx - w + EPSILON:
                    y = board.miny
                    while y <= board.maxy - h + EPSILON:
                        if not check_collision_fast_python(x, y, w, h, placed, board.defects, kerf):
                            best_x = x
                            best_y = y
                            placed_piece = True
                            break
                        y += resolution
                    if placed_piece:
                        break
                    x += resolution
                
                if placed_piece:
                    class PlacementResultPython:
                        pass
                    pr = PlacementResultPython()
                    pr.piece_id = piece.id
                    pr.board_id = board.id
                    pr.x = best_x
                    pr.y = best_y
                    pr.w = w
                    pr.h = h
                    pr.rotated = abs(w - piece.width) > EPSILON
                    results.append(pr)
                    
                    placed.append(Rect(best_x, best_y, w, h))
                    break
                    
            if not placed_piece:
                next_remaining.append(piece)
                
        remaining_pieces = next_remaining
        if not remaining_pieces:
            break
            
    return results

def solve_placement(pieces_data: List[Dict], boards_data: List[Dict], kerf: float, allow_transverse: bool, resolution: float = 1.0) -> List[Dict]:
    engine, is_native = get_engine()
    
    if is_native:
        cpp_pieces = [engine.Piece(p['id'], p['width'], p['height']) for p in pieces_data]
        cpp_boards = []
        for b in boards_data:
            cpp_defects = [engine.Rect(d['x'], d['y'], d['w'], d['h']) for d in b['defects']]
            cpp_boards.append(engine.Board(b['id'], b['minx'], b['miny'], b['maxx'], b['maxy'], cpp_defects))
            
        results = engine.find_best_position(cpp_pieces, cpp_boards, kerf, allow_transverse, resolution)
        
        return [
            {
                "piece_id": r.piece_id,
                "board_id": r.board_id,
                "x": r.x,
                "y": r.y,
                "w": r.w,
                "h": r.h,
                "rotated": r.rotated
            }
            for r in results
        ]
    else:
        # python fallback
        py_pieces = [Piece(p['id'], p['width'], p['height']) for p in pieces_data]
        py_boards = []
        for b in boards_data:
            py_defects = [Rect(d['x'], d['y'], d['w'], d['h']) for d in b['defects']]
            py_boards.append(Board(b['id'], b['minx'], b['miny'], b['maxx'], b['maxy'], py_defects))
            
        fallback_resolution = max(10.0, resolution)
        logger.warning(f"Using Python fallback with {fallback_resolution}mm grid (slower).")
        
        results = find_best_position_python(py_pieces, py_boards, kerf, allow_transverse, fallback_resolution)
        
        return [
            {
                "piece_id": r.piece_id,
                "board_id": r.board_id,
                "x": r.x,
                "y": r.y,
                "w": r.w,
                "h": r.h,
                "rotated": r.rotated
            }
            for r in results
        ]
