"""
Rectpack-based 2D Bin Packing Optimization Engine for OptiCut Pro.

This module uses the 'rectpack' library to provide superior yields 
compared to the standard greedy guillotine approach.
"""

import rectpack
from typing import List, Tuple, Dict, Any, Optional
from dataclasses import dataclass
import json

@dataclass
class RectpackPiece:
    id: int
    name: str
    width: float
    height: float
    allow_rotation: bool = True
    grain_direction: int = 0  # 0: None, 1: Horizontal, 2: Vertical
    project_id: Optional[int] = None
    project_name: Optional[str] = None

class RectpackOptimizer:
    """
    Advanced 2D bin packing using the rectpack library.
    """
    
    def __init__(
        self,
        kerf: float = 3.0,
        trim_margin: float = 2.0,
        safety_margin: float = 5.0,
        min_offcut_size: float = 100.0
    ):
        self.kerf = kerf
        self.trim_margin = trim_margin
        self.safety_margin = safety_margin
        self.min_offcut_size = min_offcut_size

    def optimize(
        self,
        pieces: List[Any], # Can be any object with width, height, etc.
        stock_panels: List[Tuple[int, float, float, bool, int]]
    ) -> Dict[str, Any]:
        """
        Run the optimization using multiple rectpack heuristics.
        """
        # Prepare packer
        # We use a MaxRects packer as it often yields better resultados than simple guillotine
        # although for wood it might sometimes suggest non-guillotine cuts.
        # However, rectpack's Guillotine packer is also available if needed.
        
        # We'll try common heuristics to find the best one
        best_result = None
        best_waste = 101.0
        
        # Try both MaxRects and Guillotine
        # Note: Guillotine is safer for workshops with manual saws
        # MaxRects is better for CNC.
        packer_types = [
            (rectpack.PackerBNF, rectpack.PackingBin.Global, rectpack.PackingMode.Online), # Basic
            (rectpack.PackerGecko, rectpack.PackingBin.Global, rectpack.PackingMode.Online), # More advanced
        ]
        
        # rectpack pieces are (width, height, rid)
        # We add kerf to piece dimensions to ensure space between them
        # Total piece size = width + kerf, height + kerf
        
        expanded_pieces = []
        piece_map = {}
        
        for p in pieces:
            # Consistent with GuillotineOptimizer:
            # Cut dimensions = Piece dims - edges + trim
            # Rectpack internal dims = Cut dims + kerf
            width_with_kerf = p.width + self.kerf
            height_with_kerf = p.height + self.kerf
            
            # We use p.id as rid, but since we might have duplicates (quantity), 
            # we need a unique identifier for rectpack
            for i in range(getattr(p, 'quantity', 1)):
                uid = len(expanded_pieces)
                expanded_pieces.append((width_with_kerf, height_with_kerf, uid))
                piece_map[uid] = p

        for packer_class, bin_algo, pack_mode in packer_types:
            packer = packer_class(bin_algo=bin_algo, pack_mode=pack_mode, rotation=True)
            
            # Add bins (stock)
            for sid, width, height, is_offcut, grain in stock_panels:
                # Kerf is already applied to piece dimensions, so bins use their actual size
                # This ensures pieces + kerf fit correctly within the bin bounds
                packer.add_bin(int(width), int(height), sid)
            
            # Add rectangles
            for w, h, rid in expanded_pieces:
                packer.add_rect(w, h, rid)
            
            packer.pack()
            
            # Process result
            current_result = self._format_result(packer, piece_map, stock_panels)
            if current_result["success"] and current_result["waste_percentage"] < best_waste:
                best_waste = current_result["waste_percentage"]
                best_result = current_result
            elif best_result is None: # Even if failed (not all pieces placed), keep first result
                best_result = current_result
                
        return best_result or {"success": False, "error": "No result found"}

    def _format_result(self, packer: Any, piece_map: Dict, stock_info: List) -> Dict:
        """Convert rectpack result to OptiCut compatible format."""
        all_bins = packer.bin_count()
        placed_count = 0
        panels_data = []
        
        total_stock_area = 0
        total_used_area = 0
        
        # rectpack stores result in packer[bin_index]
        for i in range(len(packer)):
            bin_instance = packer[i]
            # rectpack bin object has width, height, and we can access sid?
            # actually we can match by index if we added bins in order
            sid = bin_instance.bid
            
            # Find original stock info
            sinfo = next((s for s in stock_info if s[0] == sid), None)
            panel_width = bin_instance.width - self.kerf
            panel_height = bin_instance.height - self.kerf
            is_offcut = sinfo[3] if sinfo else False
            
            placements = []
            bin_used_area = 0
            
            for rect in bin_instance:
                # rect is (x, y, w, h, rid)
                x, y, w, h, rid = rect.x, rect.y, rect.width, rect.height, rect.rid
                p = piece_map[rid]
                
                # Check if it was rotated
                # Original piece (with kerf) was (p.width+k, p.height+k)
                was_rotated = False
                if abs(w - (p.height + self.kerf)) < 0.1:
                    was_rotated = True
                
                # Final dimensions stored in placement should be WITHOUT kerf
                placements.append({
                    "piece_id": p.id,
                    "piece_name": p.name,
                    "x": x,
                    "y": y,
                    "width": p.height if was_rotated else p.width,
                    "height": p.width if was_rotated else p.height,
                    "rotated": was_rotated,
                    "project_id": getattr(p, 'project_id', None),
                    "project_name": getattr(p, 'project_name', None)
                })
                
                # Area used (without kerf for waste calc or with? 
                # Workshop reality: kerf IS waste. 
                # So used area = piece final area.
                bin_used_area += (p.width * p.height)
                placed_count += 1

            total_stock_area += (panel_width * panel_height)
            total_used_area += bin_used_area
            
            waste_pct = (1 - (bin_used_area / (panel_width * panel_height))) * 100 if panel_width > 0 else 0
            
            # Generate offcuts using bounding box heuristic
            offcuts = []
            if placements and bin_used_area < (panel_width * panel_height * 0.95):
                # Find bounding box of all placements
                max_x = max(pl["x"] + pl["width"] for pl in placements)
                max_y = max(pl["y"] + pl["height"] for pl in placements)
                
                # Right strip offcut (full panel height)
                right_width = panel_width - max_x - self.kerf
                if right_width >= self.min_offcut_size and panel_height >= self.min_offcut_size:
                    offcuts.append({
                        "x": max_x + self.kerf,
                        "y": 0,
                        "width": right_width,
                        "height": panel_height
                    })
                
                # Bottom strip offcut (up to max_x width)
                bottom_height = panel_height - max_y - self.kerf
                if bottom_height >= self.min_offcut_size and max_x >= self.min_offcut_size:
                    offcuts.append({
                        "x": 0,
                        "y": max_y + self.kerf,
                        "width": max_x,
                        "height": bottom_height
                    })
            
            panels_data.append({
                "panel_id": sid,
                "width": panel_width,
                "height": panel_height,
                "is_offcut": is_offcut,
                "waste_percentage": round(waste_pct, 2),
                "placements": placements,
                "offcuts": offcuts
            })

        waste_overall = (1 - (total_used_area / total_stock_area)) * 100 if total_stock_area > 0 else 0
        total_requested = len(piece_map)
        
        return {
            "success": placed_count == total_requested,
            "panels_used": len(panels_data),
            "total_pieces": total_requested,
            "pieces_placed": placed_count,
            "pieces_remaining": total_requested - placed_count,
            "waste_percentage": round(waste_overall, 2),
            "panels": panels_data,
            "remaining_pieces": [], # TODO: List those not in packer
            "usable_offcuts": 0
        }
