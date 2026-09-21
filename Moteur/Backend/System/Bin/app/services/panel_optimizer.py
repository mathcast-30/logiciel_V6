"""Service d'optimisation de découpe pour panneaux (MDF, mélaminé, contreplaqué)."""
from typing import List, Dict, Any, Optional
import math


def optimize_panel(
    parts: List[Dict[str, Any]],
    panels: List[Dict[str, Any]],
    kerf: float = 3.0,
    algorithm: str = "guillotine",
    trim_margin: float = 2.0,
    safety_margin: float = 5.0,
    high_precision: bool = False,
    **kwargs
) -> Dict[str, Any]:
    """
    Optimise le placement des pièces sur des panneaux rectangulaires.
    
    Args:
        parts: Liste de dictionnaires représentant les pièces à découper.
               Format: [{"id": int, "width": float, "height": float, "quantity": int, ...}]
        panels: Liste de panneaux disponibles.
                Format: [{"id": int, "width": float, "height": float, "quantity": int, "cost": float, ...}]
        kerf: Épaisseur du trait de scie en mm.
        algorithm: 'guillotine' ou 'rectpack'.
        trim_margin: Marge de finition en mm.
        safety_margin: Marge de sécurité en mm.
        high_precision: Mode haute précision.
        
    Returns:
        Dictionnaire avec les résultats d'optimisation:
        {
            "success": bool,
            "panels": List[Dict],
            "total_panels_used": int,
            "total_waste": float,  # en m²
            "total_used_area": float,  # en m²
            "waste_percentage": float,
            "algorithm": str,
        }
    """
    # Essayer d'utiliser le moteur IA_Engine existant
    try:
        from IA_Engine.optimizer import GuillotineOptimizer, Piece
        
        # 1. Convertir les pièces en objets Piece
        pieces_objects: List[Piece] = []
        for p in parts:
            p_w = float(p.get("width", 0.0))
            p_h = float(p.get("height", 0.0))
            p_qty = int(p.get("quantity", 1))
            
            pieces_objects.append(Piece(
                id=int(p.get("id", 0)),
                name=str(p.get("name", f"Piece {p.get('id', '')}")),
                width=p_w,
                height=p_h,
                thickness=float(p.get("thickness", 0.0)),
                quantity=p_qty,
                allow_rotation=bool(p.get("allow_rotation", True)),
                material_id=int(p.get("material_id", 0)),
                grain_direction=int(p.get("grain_direction", 0)),
                priority=int(p.get("priority", 0)),
            ))
            
        # 2. Convertir les panneaux en stock_list (id, width, height, is_offcut, grain_direction)
        stock_list = []
        for pan in panels:
            pan_id = int(pan.get("id", 0))
            pan_w = float(pan.get("width", 2500.0))
            pan_h = float(pan.get("height", 1200.0))
            pan_qty = int(pan.get("quantity", 1))
            is_offcut = bool(pan.get("is_offcut", False))
            grain = int(pan.get("grain_direction", 1))
            
            for _ in range(pan_qty):
                stock_list.append((pan_id, pan_w, pan_h, is_offcut, grain))
                
        # 3. Exécuter l'optimiseur Guillotine
        opt = GuillotineOptimizer(
            kerf=kerf,
            trim_margin=trim_margin,
            safety_margin=safety_margin
        )
        raw_res = opt.optimize(pieces_objects, stock_list)
        
        used_panels = raw_res.get("panels", [])
        total_used_area = 0.0
        total_waste = 0.0
        
        for pan_dict in used_panels:
            p_w = pan_dict.get("width", 0.0)
            p_h = pan_dict.get("height", 0.0)
            pan_area_m2 = (p_w * p_h) / 1_000_000
            
            placed_area_m2 = sum(
                (plc.get("width", 0.0) * plc.get("height", 0.0)) / 1_000_000
                for plc in pan_dict.get("placements", [])
            )
            total_used_area += placed_area_m2
            waste_m2 = max(0.0, pan_area_m2 - placed_area_m2)
            total_waste += waste_m2
            
        total_panels_used = len(used_panels)
        denom = total_used_area + total_waste
        waste_pct = (total_waste / denom * 100) if denom > 0 else 0.0
        
        return {
            "success": raw_res.get("success", True),
            "panels": used_panels,
            "total_panels_used": total_panels_used,
            "total_waste": round(total_waste, 4),
            "total_used_area": round(total_used_area, 4),
            "waste_percentage": round(waste_pct, 2),
            "algorithm": algorithm,
            "raw": raw_res
        }
        
    except Exception:
        # Algorithme de secours autonome (First Fit Shelf)
        return _fallback_shelf_packer(parts, panels, kerf, algorithm)


def _fallback_shelf_packer(
    parts: List[Dict[str, Any]],
    panels: List[Dict[str, Any]],
    kerf: float = 3.0,
    algorithm: str = "guillotine"
) -> Dict[str, Any]:
    """Algorithme de repli simple et robuste en étagères."""
    items = []
    for p in parts:
        for _ in range(int(p.get("quantity", 1))):
            items.append({
                "piece_id": p.get("id"),
                "name": p.get("name", f"Piece {p.get('id')}"),
                "width": float(p.get("width", 100)),
                "height": float(p.get("height", 100)),
            })
            
    # Trier par hauteur décroissante
    items.sort(key=lambda x: max(x["width"], x["height"]), reverse=True)
    
    available_panels = []
    for pan in panels:
        for _ in range(int(pan.get("quantity", 1))):
            available_panels.append({
                "id": pan.get("id"),
                "width": float(pan.get("width", 2500)),
                "height": float(pan.get("height", 1200)),
            })
            
    if not available_panels:
        available_panels.append({"id": -1, "width": 2500.0, "height": 1200.0})
        
    result_panels = []
    total_used_area = 0.0
    total_waste = 0.0
    
    pan_idx = 0
    current_panel = available_panels[pan_idx]
    current_placements = []
    
    curr_x = kerf
    curr_y = kerf
    shelf_height = 0.0
    
    for item in items:
        w, h = item["width"], item["height"]
        if curr_x + w + kerf > current_panel["width"]:
            curr_x = kerf
            curr_y += shelf_height + kerf
            shelf_height = 0.0
            
        if curr_y + h + kerf > current_panel["height"]:
            # Panneau plein, passer au suivant
            pan_area = (current_panel["width"] * current_panel["height"]) / 1_000_000
            used_a = sum((pl["width"] * pl["height"]) / 1_000_000 for pl in current_placements)
            total_used_area += used_a
            total_waste += max(0.0, pan_area - used_a)
            
            result_panels.append({
                "panel_id": current_panel["id"],
                "width": current_panel["width"],
                "height": current_panel["height"],
                "placements": current_placements,
            })
            
            pan_idx += 1
            if pan_idx < len(available_panels):
                current_panel = available_panels[pan_idx]
            else:
                current_panel = {"id": -1, "width": 2500.0, "height": 1200.0}
                
            current_placements = []
            curr_x = kerf
            curr_y = kerf
            shelf_height = 0.0
            
        current_placements.append({
            "piece_id": item["piece_id"],
            "piece_name": item["name"],
            "x": curr_x,
            "y": curr_y,
            "width": w,
            "height": h,
            "rotated": False,
        })
        curr_x += w + kerf
        shelf_height = max(shelf_height, h)
        
    if current_placements:
        pan_area = (current_panel["width"] * current_panel["height"]) / 1_000_000
        used_a = sum((pl["width"] * pl["height"]) / 1_000_000 for pl in current_placements)
        total_used_area += used_a
        total_waste += max(0.0, pan_area - used_a)
        
        result_panels.append({
            "panel_id": current_panel["id"],
            "width": current_panel["width"],
            "height": current_panel["height"],
            "placements": current_placements,
        })
        
    denom = total_used_area + total_waste
    waste_pct = (total_waste / denom * 100) if denom > 0 else 0.0
    
    return {
        "success": True,
        "panels": result_panels,
        "total_panels_used": len(result_panels),
        "total_waste": round(total_waste, 4),
        "total_used_area": round(total_used_area, 4),
        "waste_percentage": round(waste_pct, 2),
        "algorithm": algorithm,
    }
