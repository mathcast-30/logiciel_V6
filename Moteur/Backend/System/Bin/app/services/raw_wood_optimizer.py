"""Service d'optimisation de découpe pour bois massif (avivés, plots, planches massives)."""
from typing import List, Dict, Any, Optional
from .panel_optimizer import optimize_panel


def optimize_raw_wood(
    parts: List[Dict[str, Any]],
    panels: List[Dict[str, Any]],
    kerf: float = 3.0,
    params: Optional[Dict[str, Any]] = None,
    **kwargs
) -> Dict[str, Any]:
    """
    Optimise le placement pour le bois massif.
    Tente d'utiliser le RawWoodOptimizer de IA_Engine, avec fallback automatique vers panel_optimizer.
    """
    try:
        from IA_Engine.raw_wood_optimizer import RawWoodOptimizer
        from IA_Engine.raw_wood_optimizer.domain import RawPiece, RawBoard, GrainVector, WoodSpecies
        
        # Conversion des pièces
        raw_pieces = []
        for p in parts:
            p_w = float(p.get("width", 100))
            p_h = float(p.get("height", 100))
            grain_dir = int(p.get("grain_direction", 0))
            grain = GrainVector.horizontal() if grain_dir == 1 else GrainVector.vertical()
            
            raw_piece = RawPiece.from_rectangle(
                id=int(p.get("id", 0)),
                width=p_w,
                height=p_h,
                grain_vector=grain,
                name=str(p.get("name", f"Piece {p.get('id', '')}")),
                project_id=p.get("project_id"),
                project_name=p.get("project_name", "Inconnu")
            )
            for copy_idx in range(int(p.get("quantity", 1))):
                raw_pieces.append(raw_piece)
                
        # Conversion des planches
        raw_boards = []
        board_counter = 0
        for pan in panels:
            b_w = float(pan.get("width", 2500))
            b_h = float(pan.get("height", 1200))
            grain = GrainVector.horizontal() if int(pan.get("grain_direction", 1)) == 1 else GrainVector.vertical()
            
            for _ in range(int(pan.get("quantity", 1))):
                board = RawBoard.from_rectangle(
                    id=board_counter,
                    width=b_w,
                    height=b_h,
                    grain_vector=grain,
                    species=WoodSpecies.CHENE,
                    label=str(pan.get("reference", f"Stock {pan.get('id')}"))
                )
                raw_boards.append(board)
                board_counter += 1
                
        optimizer = RawWoodOptimizer(kerf=kerf)
        raw_res = optimizer.optimize(raw_pieces, raw_boards)
        
        # Formater la réponse comme attendu
        panels_res = []
        total_used_area = 0.0
        total_waste = 0.0
        
        for board_res in getattr(raw_res, 'placed_boards', []):
            b_w = float(getattr(board_res, 'width', 2500))
            b_h = float(getattr(board_res, 'height', 1200))
            b_area = (b_w * b_h) / 1_000_000
            
            placements = []
            placed_area = 0.0
            for pl in getattr(board_res, 'placements', []):
                pw = float(getattr(pl, 'width', 0))
                ph = float(getattr(pl, 'height', 0))
                placed_area += (pw * ph) / 1_000_000
                placements.append({
                    "piece_id": getattr(pl, 'piece_id', 0),
                    "x": float(getattr(pl, 'x', 0)),
                    "y": float(getattr(pl, 'y', 0)),
                    "width": pw,
                    "height": ph,
                    "rotated": bool(getattr(pl, 'rotated', False))
                })
                
            total_used_area += placed_area
            total_waste += max(0.0, b_area - placed_area)
            panels_res.append({
                "panel_id": getattr(board_res, 'id', 0),
                "width": b_w,
                "height": b_h,
                "placements": placements
            })
            
        denom = total_used_area + total_waste
        waste_pct = (total_waste / denom * 100) if denom > 0 else 0.0
        
        return {
            "success": True,
            "panels": panels_res,
            "total_panels_used": len(panels_res),
            "total_waste": round(total_waste, 4),
            "total_used_area": round(total_used_area, 4),
            "waste_percentage": round(waste_pct, 2),
            "algorithm": "raw_wood",
            "raw": str(raw_res)
        }
    except Exception:
        # Fallback automatique vers l'optimiseur de panneau
        return optimize_panel(parts, panels, kerf=kerf, algorithm="guillotine")
