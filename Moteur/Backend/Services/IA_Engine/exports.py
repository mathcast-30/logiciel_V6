"""
Export generation module for OptiCut Pro.

Generates PDF, DXF, PNG, and SVG exports of cutting plans.
"""

import os
import json
from datetime import datetime
from typing import List, Dict, Any
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
import ezdxf
from PIL import Image, ImageDraw, ImageFont
import qrcode
from .config import get_settings

def compute_placements_bbox(placements: List[Dict[str, Any]], padding_mm: float = 30.0) -> tuple:
    """
    Calcule le rectangle englobant de toutes les pièces placées.
    Returns: (bbox_x, bbox_y, bbox_width, bbox_height) en mm
    """
    if not placements:
        return (0, 0, 100, 100)
    
    # Extract coordinates, supporting both 'x'/'y' and 'polygon_coords'
    all_x = []
    all_y = []
    
    for p in placements:
        if 'polygon_coords' in p and p['polygon_coords']:
            for px, py in p['polygon_coords']:
                all_x.append(px)
                all_y.append(py)
        else:
            px, py = p.get('x', 0), p.get('y', 0)
            pw, ph = p.get('width', 0), p.get('height', 0)
            all_x.extend([px, px + pw])
            all_y.extend([py, py + ph])
            
    if not all_x:
        return (0, 0, 100, 100)
        
    min_x, max_x = min(all_x), max(all_x)
    min_y, max_y = min(all_y), max(all_y)
    
    # Appliquer le padding
    bbox_x = max(0, min_x - padding_mm)
    bbox_y = max(0, min_y - padding_mm)
    bbox_width = (max_x - min_x) + 2 * padding_mm
    bbox_height = (max_y - min_y) + 2 * padding_mm
    
    return (bbox_x, bbox_y, bbox_width, bbox_height)

def compute_scale_factor(
    bbox_width_mm: float,
    bbox_height_mm: float,
    target_width_px: int = 2480,
    target_height_px: int = 1754,
    min_scale: float = 0.5,
    max_scale: float = 10.0
) -> float:
    """
    Calcule le scale factor (px/mm) pour que la bounding box
    tienne dans les dimensions cibles.
    """
    if bbox_width_mm <= 0 or bbox_height_mm <= 0:
        return 1.0
        
    scale_x = target_width_px / bbox_width_mm
    scale_y = target_height_px / bbox_height_mm
    
    scale = min(scale_x, scale_y)
    return max(min_scale, min(max_scale, scale))

def should_use_smart_viewport(placements: List[Dict[str, Any]], panel_w: float, panel_h: float) -> bool:
    """
    Détermine si le smart viewport doit être activé selon l'occupation.
    """
    settings = get_settings()
    if not settings.EXPORT_SMART_VIEWPORT or not placements:
        return False
    
    total_piece_area = 0
    for p in placements:
        total_piece_area += p.get('width', 0) * p.get('height', 0)
        
    panel_area = panel_w * panel_h
    if panel_area <= 0:
        return False
        
    utilization_ratio = total_piece_area / panel_area
    return utilization_ratio < settings.EXPORT_SMART_VIEWPORT_THRESHOLD



class ExportGenerator:
    """Generate various export formats for cutting plans."""
    
    def __init__(self, output_dir: str = "./exports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_all(
        self, 
        optimization_result: Dict[str, Any],
        project_name: str,
        formats: List[str],
        client_name: str = "Général"
    ) -> Dict[str, str]:
        """
        Generate exports in all requested formats using dynamic structure:
        output_dir / Client / Project / Timestamp
        """
        from pathlib import Path
        
        if not optimization_result:
            print(f"[WARN] ExportGenerator: optimization_result is empty for {project_name}")
            return {}
            
        # Count total panels
        total_panels = sum(len(material_data.get("panels", [])) for material_data in optimization_result.values() if isinstance(material_data, dict))
        if total_panels == 0:
            print(f"[INFO] ExportGenerator: Aucun panneau à exporter pour {project_name}. Annulation.")
            return {}
            
        timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
        
        # Sanitize names for folder and file creation
        def sanitize(name: str) -> str:
            if not name:
                return "Sans_Nom"
            clean = "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip()
            clean = clean.replace(' ', '_')
            return clean or "Sans_Nom"

        safe_client = sanitize(client_name)
        safe_project = sanitize(project_name)
        
        # Professional Dynamic Structure
        # Target: Moteur/UserData/Clients/[Nom_du_Client]/[Nom_du_Projet]/
        base_path = Path(self.output_dir) / "Clients" / safe_client / safe_project
        
        # Create subfolders
        optim_dir = base_path / "Optimisations"
        other_dir = base_path / "Autres"
        
        optim_dir.mkdir(parents=True, exist_ok=True)
        other_dir.mkdir(parents=True, exist_ok=True)
        
        export_files = {}
        base_name = f"{safe_project}_{timestamp}"

        for material_name, material_result in optimization_result.items():
            if not isinstance(material_result, dict):
                continue
                
            safe_material = sanitize(material_name)
            panels = material_result.get("panels", [])
            
            if not panels:
                continue

            for i, panel in enumerate(panels):
                panel_name = f"{base_name}_{safe_material}_panel_{i+1}"
                
                # Full paths using Pathlib
                # panels/PNG/PDF will go to optim_dir
                
                if "pdf" in formats:
                    path = self.generate_pdf(panel, material_name, str(optim_dir / panel_name), i + 1, project_name=project_name)
                    export_files[f"{material_name}/pdf_{i+1}"] = str(path)
                
                if "png" in formats:
                    path = self.generate_png_export(panel, str(optim_dir / panel_name))
                    export_files[f"{material_name}/png_{i+1}"] = str(path)
                
                if "dxf" in formats:
                    path = self.generate_dxf(panel, str(other_dir / panel_name))
                    export_files[f"{material_name}/dxf_{i+1}"] = str(path)
        
        return export_files
    
    def generate_pdf(
        self, 
        panel: Dict[str, Any], 
        material_name: str,
        base_name: str,
        panel_number: int,
        project_name: str = "Projet Inconnu"
    ) -> str:
        """Generate PDF cutting plan for a panel, using generated PNG."""
        # Check if base_name is already a path or just a name
        if os.path.isabs(base_name) or '/' in base_name or '\\' in base_name:
             file_path = f"{base_name}.pdf"
             # Generate the corresponding PNG path
             png_path = f"{base_name}.png"
        else:
             file_path = os.path.join(self.output_dir, f"{base_name}.pdf")
             png_path = os.path.join(self.output_dir, f"{base_name}.png")
        
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Ensure we have the PNG
        if not os.path.exists(png_path):
             # It might not have been generated yet or failed. We'll try to generate it locally.
             # We assume generate_png_export was already called or we call it ourselves
             png_path = self.generate_png_export(panel, base_name if not (os.path.isabs(base_name) or '/' in base_name or '\\' in base_name) else base_name)
        
        # Use landscape A4
        page_width, page_height = landscape(A4)
        c = canvas.Canvas(file_path, pagesize=landscape(A4))
        
        # --- En-tête ---
        c.setFont("Helvetica-Bold", 16)
        c.drawString(20*mm, page_height - 15*mm, f"Fiche d'Atelier - {project_name}")
        c.setFont("Helvetica", 12)
        c.drawString(20*mm, page_height - 22*mm, f"Panneau {panel_number} - {material_name}")
        c.drawString(20*mm, page_height - 28*mm, f"Dimensions: {panel['width']} × {panel['height']} mm")
        
        # Add zoom mention if applicable
        settings = get_settings()
        placements = panel.get("placements", []) or panel.get("placed_pieces", [])
        if should_use_smart_viewport(placements, panel['width'], panel['height']):
            bbox_x, bbox_y, bbox_w, bbox_h = compute_placements_bbox(placements, settings.EXPORT_PADDING_MM)
            scale = compute_scale_factor(bbox_w, bbox_h, settings.EXPORT_PNG_TARGET_WIDTH, 1400) # 1400 is an approx height
            c.setFont("Helvetica-Oblique", 10)
            c.drawString(20*mm, page_height - 33*mm, f"Zoom : {scale:.2f}px/mm (Vue optimisée)")
            c.setFont("Helvetica", 12)

        c.drawString(page_width - 60*mm, page_height - 15*mm, f"Date: {datetime.now().strftime('%d/%m/%Y')}")
        
        # --- Schéma (Image PNG) ---
        # Calculate image area
        margin = 15*mm
        header_height = 35*mm
        footer_height = 20*mm
        
        # We'll split the remaining height into 60% for image, 40% for table
        available_height = page_height - header_height - footer_height
        img_max_height = available_height * 0.65
        img_max_width = page_width - (2 * margin)
        
        # Calculate precise image dimensions to adjust table position later
        actual_draw_h = 0
        img_y_start = page_height - header_height - img_max_height
        
        try:
            from PIL import Image
            with Image.open(png_path) as img:
                img_w, img_h = img.size
                
                # Calculate scale to fit
                scale_w = img_max_width / img_w
                scale_h = img_max_height / img_h
                scale = min(scale_w, scale_h)
                
                draw_w = img_w * scale
                draw_h = img_h * scale
                actual_draw_h = draw_h
                
                # Center horizontally
                draw_x = margin + (img_max_width - draw_w) / 2
                # Place at the top of the available image area
                draw_y = page_height - header_height - draw_h
                
                c.drawImage(png_path, draw_x, draw_y, width=draw_w, height=draw_h)
        except Exception as e:
            print(f"[ERROR] PDF Generation: Could not insert PNG ({png_path}) - {e}")
            c.setFont("Helvetica-Oblique", 12)
            c.drawString(margin, img_y_start + img_max_height/2, f"Erreur de chargement du schéma : {e}")
            actual_draw_h = 20*mm

        # --- Listing des Pièces ---
        # Position table based on actual image height
        table_top_y = page_height - header_height - actual_draw_h - 10*mm
        
        # Aggregate parts for this board
        parts_list = []
        placements = panel.get("placements", [])
        if not placements and "placed_pieces" in panel:
            placements = panel.get("placed_pieces", [])
            
        # Count identical pieces
        from collections import defaultdict
        piece_counts = defaultdict(int)
        piece_details = {}
        for p in placements:
            # We use name + dimensions + rot as unique key
            # Or just name if we want them aggregated simply
            # The prompt says: "Pour chaque planche optimisée, ajoute un Tableau de Débit juste en dessous du schéma."
            # "ID/Repère, Nom de la pièce, Dimensions brutes, Quantité (sur cette planche spécifique)"
            # Let's group them by piece_name, width, height, and rotation
            is_rotated = p.get("is_rotated", False) or p.get("rotated", False)
                 
            # In placements from backend, sometimes w/h are swapped if rotated.
            name = str(p.get('piece_name', p.get('name', 'Inconnu')))
            w = int(p.get('width', 0))
            h = int(p.get('height', 0))
            pid = p.get('piece_id', p.get('id', 'N/A'))
            
            key = f"{pid}_{name}_{w}x{h}_{is_rotated}"
            piece_counts[key] += 1
            if key not in piece_details:
                piece_details[key] = {
                    "id": pid,
                    "name": name,
                    "w": w,
                    "h": h,
                    "rotated": is_rotated
                }
                
        # Build table data
        data = [["ID/Repère", "Nom de la pièce", "Dimensions (L x H)", "Quantité", "Info"]]
        for key, count in piece_counts.items():
            details = piece_details[key]
            info = "(Pivoté)" if details["rotated"] else ""
            data.append([
                str(details["id"]),
                details["name"],
                f"{details['w']} × {details['h']}",
                str(count),
                info
            ])
            
        if len(data) > 1:
            table = Table(data, colWidths=[30*mm, 80*mm, 50*mm, 30*mm, 30*mm])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 6),
                ('BACKGROUND', (0, 1), (-1, -1), colors.white),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
            ]))
            
            # Draw table
            table_w, table_h = table.wrap(page_width, table_top_y - footer_height)
            # Center the table and place it right below the image
            table.drawOn(c, (page_width - table_w) / 2, table_top_y - table_h)

        # --- Pied de page ---
        c.setFont("Helvetica-Oblique", 10)
        c.drawString(20*mm, 15*mm, f"Taux de chute: {panel.get('waste_percentage', 0):.1f}%")
        
        # Legend for offcuts/pieces counts
        c.drawString(page_width - 80*mm, 15*mm, f"Pièces: {len(placements)} | Chutes: {len(panel.get('offcuts', []))}")
        
        c.save()
        return file_path
    
    def generate_png_export(self, panel: Dict[str, Any], base_name: str) -> str:
        """Generate PNG image of cutting plan with precise coordinates and labels."""
        import pathlib
        settings = get_settings()
        
        if os.path.isabs(base_name) or '/' in base_name or '\\' in base_name:
            file_path = f"{base_name}.png"
        else:
            file_path = os.path.join(self.output_dir, f"{base_name}.png")
            
        # Guarantee recursive directory creation
        path_obj = pathlib.Path(file_path)
        path_obj.parent.mkdir(parents=True, exist_ok=True)
        
        # Remove existing file
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except:
                pass
        
        panel_w = panel.get('width', 2000)
        panel_h = panel.get('height', 1000)
        placements = panel.get("placements", [])
        if not placements and "placed_pieces" in panel:
            placements = panel.get("placed_pieces", [])
            
        # === SMART VIEWPORT LOGIC ===
        use_smart = should_use_smart_viewport(placements, panel_w, panel_h)
        padding_mm = settings.EXPORT_PADDING_MM
        
        if use_smart:
            bbox_x, bbox_y, bbox_w, bbox_h = compute_placements_bbox(placements, padding_mm)
            # Assurer que la bbox ne dépasse pas la planche de trop (contexte)
            bbox_w = min(bbox_w, panel_w - bbox_x + padding_mm)
            bbox_h = min(bbox_h, panel_h - bbox_y + padding_mm)
        else:
            bbox_x, bbox_y = 0, 0
            bbox_w, bbox_h = panel_w, panel_h
            
        # Scale logic
        target_width = settings.EXPORT_PNG_TARGET_WIDTH
        # Target a natural height or a maximum to avoid absurdly tall images
        target_height = int(target_width * (bbox_h / bbox_w)) if bbox_w > 0 else 1000
        target_height = min(target_height, int(target_width * 1.5))
        
        scale = compute_scale_factor(bbox_w, bbox_h, target_width, target_height)
        
        width_px = int(bbox_w * scale)
        height_px = int(bbox_h * scale)
        
        # Create image with light gray background for the "outside"
        img = Image.new('RGB', (width_px, height_px), color=(240, 240, 240))
        draw = ImageDraw.Draw(img)
        
        def mm_to_px(x_mm, y_mm):
            """Convertit des coordonnées mm (absolues) en px (relatives au viewport)."""
            return (
                int((x_mm - bbox_x) * scale),
                int((y_mm - bbox_y) * scale)
            )

        # Trace de la planche (Contexte)
        p_x0, p_y0 = mm_to_px(0, 0)
        p_x1, p_y1 = mm_to_px(panel_w, panel_h)
        # Board fill
        draw.rectangle([p_x0, p_y0, p_x1, p_y1], fill='#E5E7EB', outline=(180, 180, 180), width=2)
        
        # Color palette
        colors_list = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
            '#14B8A6', '#F43F5E'
        ]
        
        def get_font(size):
            try:
                return ImageFont.truetype("arial.ttf", size)
            except IOError:
                try:
                    return ImageFont.truetype("DejaVuSans.ttf", size)
                except IOError:
                    return ImageFont.load_default()

        font_label = get_font(max(10, int(18 * scale)))
        font_info = get_font(max(8, int(14 * scale)))
        
        def get_text_size(text, font):
            try:
                bbox = draw.textbbox((0, 0), text, font=font)
                return bbox[2] - bbox[0], bbox[3] - bbox[1]
            except AttributeError:
                size = draw.textsize(text, font=font)
                return size[0], size[1]
            
        kerf = panel.get("kerf", 2.0)
        
        # 2. Dessiner les défauts (zones d'exclusion)
        defects = panel.get('defects', [])
        for defect_poly in defects:
            if defect_poly and len(defect_poly) > 2:
                draw_coords = [mm_to_px(dx, dy) for dx, dy in defect_poly]
                draw.polygon(draw_coords, fill='#FECACA', outline='#EF4444', width=1)

        # 3. Dessiner les placements
        for i, p in enumerate(placements):
            color = colors_list[i % len(colors_list)]
            piece_poly = p.get('polygon_coords')
            pw = p.get('width', 0)
            ph = p.get('height', 0)
            
            if piece_poly and len(piece_poly) > 2:
                draw_coords = [mm_to_px(px, py) for px, py in piece_poly]
                draw.polygon(draw_coords, fill=color, outline='black', width=2)
                px_coords = [c[0] for c in draw_coords]
                py_coords = [c[1] for c in draw_coords]
                x1, y1, x2, y2 = min(px_coords), min(py_coords), max(px_coords), max(py_coords)
            else:
                x, y = p.get('x', 0), p.get('y', 0)
                x1, y1 = mm_to_px(x, y)
                x2, y2 = mm_to_px(x + pw, y + ph)
                
                if kerf > 0:
                    kx1, ky1 = mm_to_px(max(0, x - kerf/2), max(0, y - kerf/2))
                    kx2, ky2 = mm_to_px(min(panel_w, x + pw + kerf/2), min(panel_h, y + ph + kerf/2))
                    draw.rectangle([kx1, ky1, kx2, ky2], fill=color, outline='black', width=1)
                
                draw.rectangle([x1, y1, x2, y2], fill=color, outline='black', width=2)
            
            # Label
            try:
                # Basic color estimation for contrast
                color_hex = color.lstrip('#')
                r, g, b = tuple(int(color_hex[j:j+2], 16) for j in (0, 2, 4))
                luminance = (0.299 * r + 0.587 * g + 0.114 * b)
                text_color = 'black' if luminance > 128 else 'white'
            except:
                text_color = 'black'
            
            name = str(p.get('piece_name', p.get('name', 'Inconnu')))
            dim_text = f"{int(pw)}x{int(ph)}"
            full_text = f"{name}\n{dim_text}"
            
            center_x = (x1 + x2) // 2
            center_y = (y1 + y2) // 2
            box_width = x2 - x1
            box_height = y2 - y1
            
            def try_place_text(target_draw, t_center_x, t_center_y, t_box_w, t_box_h, t_full_text, t_color):
                max_f = max(14, int(25 * scale))
                min_f = max(6, int(10 * scale))
                for f_size in range(int(max_f), int(min_f) - 1, -2):
                    c_font = get_font(f_size)
                    lns = t_full_text.split('\n')
                    mx_w = 0
                    ttl_h = 0
                    for ln in lns:
                        lw, lh = get_text_size(ln, c_font)
                        mx_w = max(mx_w, lw)
                        ttl_h += lh
                    if t_box_w >= mx_w + 4 and t_box_h >= ttl_h + 4:
                        y_curr = t_center_y - ttl_h // 2
                        for ln in lns:
                            lw, lh = get_text_size(ln, c_font)
                            target_draw.text((t_center_x - lw // 2, y_curr), ln, fill=t_color, font=c_font)
                            y_curr += lh
                        return True
                return False

            success = try_place_text(draw, center_x, center_y, box_width, box_height, full_text, text_color)
            
            if not success:
                # Force minimal font
                min_font = get_font(max(8, int(12 * scale)))
                lns = full_text.split('\n')
                ttl_h = sum(get_text_size(l, min_font)[1] for l in lns)
                y_curr = center_y - ttl_h // 2
                stroke = 'white' if text_color == 'black' else 'black'
                for ln in lns:
                    lw, lh = get_text_size(ln, min_font)
                    pos = (center_x - lw // 2, y_curr)
                    for dx, dy in [(-1,-1), (-1,1), (1,-1), (1,1)]:
                        draw.text((pos[0]+dx, pos[1]+dy), ln, fill=stroke, font=min_font)
                    draw.text(pos, ln, fill=text_color, font=min_font)
                    y_curr += lh

        # 4. Offcuts
        for o in panel.get("offcuts", []):
            x0, y0 = mm_to_px(o['x'], o['y'])
            x1, y1 = mm_to_px(o['x'] + o['width'], o['y'] + o['height'])
            draw.rectangle([x0, y0, x1, y1], outline=(150, 150, 150), width=1)

        # 5. Legend / Info
        info_text = (
            f"Planche: {panel_w}x{panel_h}mm | "
            f"Vue: {bbox_w:.0f}x{bbox_h:.0f}mm | "
            f"Zoom: {scale:.2f}px/mm | Chutes: {len(panel.get('offcuts', []))}"
        )
        # Background for info text for visibility
        tw, th = get_text_size(info_text, font_info)
        draw.rectangle([5, height_px - th - 10, tw + 15, height_px - 5], fill=(255, 255, 255))
        draw.text((10, height_px - th - 8), info_text, fill=(50, 50, 50), font=font_info)
        
        try:
            img.save(file_path, optimize=True, dpi=(settings.EXPORT_DPI, settings.EXPORT_DPI))
        except Exception as e:
            print(f"[ERROR] PNG generation failed for {base_name}: {e}")
            
        return file_path
    
    def generate_dxf(self, panel: Dict[str, Any], base_name: str) -> str:
        """Generate DXF file for CNC machines."""
        if os.path.isabs(base_name) or '/' in base_name or '\\' in base_name:
            file_path = f"{base_name}.dxf"
        else:
            file_path = os.path.join(self.output_dir, f"{base_name}.dxf")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        doc = ezdxf.new('R2010')
        msp = doc.modelspace()
        
        # Create layers
        doc.layers.add('PANEL', color=7)  # White
        doc.layers.add('CUTS', color=1)    # Red - cutting lines
        doc.layers.add('LABELS', color=3)  # Green - text labels
        doc.layers.add('OFFCUTS', color=2) # Yellow - offcut areas
        doc.layers.add('DRILLS', color=4)   # Cyan - drilling holes Ø
        
        # Draw panel outline
        board_poly = panel.get('polygon_coords')
        if board_poly and len(board_poly) > 2:
            msp.add_lwpolyline(board_poly, dxfattribs={'layer': 'PANEL'})
        else:
            msp.add_lwpolyline(
                [(0, 0), (panel['width'], 0), (panel['width'], panel['height']), (0, panel['height']), (0, 0)],
                dxfattribs={'layer': 'PANEL'}
            )

        # Draw defects
        defects = panel.get('defects', [])
        if defects:
            doc.layers.add('DEFECTS', color=1) # Red
            for defect_poly in defects:
                if defect_poly and len(defect_poly) > 2:
                    msp.add_lwpolyline(defect_poly, dxfattribs={'layer': 'DEFECTS'})

        # Draw cut lines for each piece
        for p in panel.get("placements", []):
            piece_poly = p.get('polygon_coords')
            
            if piece_poly and len(piece_poly) > 2:
                msp.add_lwpolyline(piece_poly, dxfattribs={'layer': 'CUTS'})
                # Simple centroid for label
                px_coords = [c[0] for c in piece_poly]
                py_coords = [c[1] for c in piece_poly]
                x1, y1, x2, y2 = min(px_coords), min(py_coords), max(px_coords), max(py_coords)
                label_x, label_y = (x1 + x2) / 2, (y1 + y2) / 2
                pw, ph = x2 - x1, y2 - y1
            else:
                x, y, pw, ph = p['x'], p['y'], p['width'], p['height']
                msp.add_lwpolyline(
                    [(x, y), (x + pw, y), (x + pw, y + ph), (x, y + ph), (x, y)],
                    dxfattribs={'layer': 'CUTS'}
                )
                label_x, label_y = x + pw / 2, y + ph / 2
            
            # Label
            msp.add_text(
                p.get('piece_name', 'Piece'),
                dxfattribs={
                    'layer': 'LABELS',
                    'height': min(20, pw / 10)
                }
            ).set_placement((label_x, label_y), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)
            
            # Draw Drills (using original rect logic if available, or offset if polygonal)
            # For simplicity, we assume drills are already in absolute coords if polygonal piece, 
            # or relative if rectangular piece.
            for d in p.get("drills", []):
                dx = (p.get('x', 0) + d['x']) if not piece_poly else d['x']
                dy = (p.get('y', 0) + d['y']) if not piece_poly else d['y']
                msp.add_circle(
                    (dx, dy), 
                    radius=d['diameter'] / 2,
                    dxfattribs={'layer': 'DRILLS'}
                )
                if d.get("depth"):
                    msp.add_text(
                        f"Z{d['depth']}",
                        dxfattribs={'layer': ' DRILLS', 'height': 2}
                    ).set_placement((dx + 2, dy + 2))
        
        # Draw offcut areas
        for o in panel.get("offcuts", []):
            x, y, w, h = o['x'], o['y'], o['width'], o['height']
            msp.add_lwpolyline(
                [(x, y), (x + w, y), (x + w, y + h), (x, y + h), (x, y)],
                dxfattribs={'layer': 'OFFCUTS'}
            )
        
        doc.saveas(file_path)
        return file_path
    
    def generate_svg(self, panel: Dict[str, Any], base_name: str) -> str:
        """Generate SVG file."""
        if os.path.isabs(base_name) or '/' in base_name or '\\' in base_name:
            file_path = f"{base_name}.svg"
        else:
            file_path = os.path.join(self.output_dir, f"{base_name}.svg")
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Dynamic scale based on board dimensions
        # Target a width of approx 400 SVG units for the preview
        scale = 400.0 / panel['width'] if panel['width'] > 0 else 0.3
        width = panel['width'] * scale
        height = panel['height'] * scale
        
        colors_list = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
            '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
        ]
        
        # 1. Dessiner la planche
        board_poly = panel.get('polygon_coords')
        if board_poly and len(board_poly) > 2:
            points = " ".join([f"{10 + px * scale},{10 + py * scale}" for px, py in board_poly])
            svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width + 20}" height="{height + 20}" xmlns="http://www.w3.org/2000/svg">
  <polygon points="{points}" fill="#f8fafc" stroke="#1e293b" stroke-width="2"/>
'''
        else:
            svg_content = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width + 20}" height="{height + 20}" xmlns="http://www.w3.org/2000/svg">
  <rect x="10" y="10" width="{width}" height="{height}" fill="#f8fafc" stroke="#1e293b" stroke-width="2"/>
'''

        # 2. Défauts
        for defect in panel.get('defects', []):
            if defect and len(defect) > 2:
                points = " ".join([f"{10 + dx * scale},{10 + dy * scale}" for dx, dy in defect])
                svg_content += f'  <polygon points="{points}" fill="#fee2e2" stroke="#ef4444" stroke-width="1" opacity="0.6"/>\n'
        
        # 3. Placements
        for i, p in enumerate(panel.get("placements", [])):
            color = colors_list[i % len(colors_list)]
            piece_poly = p.get('polygon_coords')
            
            if piece_poly and len(piece_poly) > 2:
                points = " ".join([f"{10 + px * scale},{10 + py * scale}" for px, py in piece_poly])
                svg_content += f'  <polygon points="{points}" fill="{color}" stroke="#1e293b" stroke-width="1" opacity="0.85"/>\n'
                # BBox for label
                pxs = [c[0] for c in piece_poly]
                pys = [c[1] for c in piece_poly]
                cx, cy = (min(pxs) + max(pxs)) / 2 * scale + 10, (min(pys) + max(pys)) / 2 * scale + 10
                fs = min(12, (max(pxs) - min(pxs)) * scale / 8)
            else:
                x = 10 + p['x'] * scale
                y = 10 + p['y'] * scale
                w = p['width'] * scale
                h = p['height'] * scale
                svg_content += f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{color}" stroke="#1e293b" stroke-width="1" opacity="0.85"/>\n'
                cx, cy, fs = x + w/2, y + h/2, min(12, w/8)

            svg_content += f'  <text x="{cx}" y="{cy}" text-anchor="middle" dominant-baseline="middle" fill="white" font-size="{fs}" font-weight="bold">{p.get("piece_name", "Piece")}</text>\n'
        
        # 4. Offcuts
        for o in panel.get("offcuts", []):
            x = 10 + o['x'] * scale
            y = 10 + o['y'] * scale
            w = o['width'] * scale
            h = o['height'] * scale
            svg_content += f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#fef3c7" stroke="#d97706" stroke-width="1" stroke-dasharray="4"/>\n'
        
        svg_content += '</svg>'
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(svg_content)
        
        return file_path
    
    def generate_labels_pdf(
        self,
        pieces: List[Dict[str, Any]],
        project_name: str,
        client_name: str = "Général"
    ) -> str:
        """Generate a PDF with labels for all pieces."""
        timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
        
        def sanitize(name):
            return "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip() or "Sans_Nom"

        safe_client = sanitize(client_name)
        safe_project = sanitize(project_name)
        
        final_dir = os.path.join(self.output_dir, safe_client, safe_project, timestamp)
        os.makedirs(final_dir, exist_ok=True)
        
        file_path = os.path.join(final_dir, f"{safe_project}_labels.pdf")
        
        # A4 Page
        width, height = A4
        c = canvas.Canvas(file_path, pagesize=A4)
        
        # Label dimensions (approx Avery 3x8 or similar - 70x37mm)
        label_w = 70 * mm
        label_h = 37 * mm
        cols = 3
        rows = 8
        margin_x = 0 * mm # Adjust margins for printer
        margin_y = 0 * mm
        start_x = 0 * mm
        start_y = height - label_h
        
        x = start_x
        y = start_y
        
        col_idx = 0
        row_idx = 0
        
        for piece in pieces:
            # Draw Label Border
            # c.rect(x, y, label_w, label_h)
            
            # Content
            c.setFont("Helvetica-Bold", 10)
            c.drawString(x + 2*mm, y + label_h - 5*mm, piece['name'][:20])
            
            c.setFont("Helvetica", 8)
            c.drawString(x + 2*mm, y + label_h - 10*mm, f"Dim: {piece['width']} x {piece['height']} mm")
            c.drawString(x + 2*mm, y + label_h - 14*mm, f"Mat: {piece.get('material_name', '')[:20]}")
            c.drawString(x + 2*mm, y + label_h - 18*mm, f"Projet: {project_name[:15]}")
            
            # Draw QR Code if available
            try:
                # Use reportlab native QR if possible, or PIL image
                import qrcode
                qr = qrcode.QRCode(box_size=2, border=0)
                qr_data = json.dumps({"id": piece['id'], "w": piece['width'], "h": piece['height']}, separators=(',', ':'))
                qr.add_data(qr_data)
                qr.make(fit=True)
                qr_img = qr.make_image(fill_color="black", back_color="white")
                
                # Save temp image
                temp_qr = os.path.join(self.output_dir, f"temp_qr_{piece['id']}.png")
                qr_img.save(temp_qr)
                
                qr_size = 20 * mm
                c.drawImage(temp_qr, x + label_w - qr_size - 2*mm, y + (label_h - qr_size)/2, width=qr_size, height=qr_size)
                
                # Clean up
                try:
                    os.remove(temp_qr)
                except:
                    pass
            except Exception as e:
                print(f"QR Gen Error: {e}")
            
            # Move position
            col_idx += 1
            x += label_w
            
            if col_idx >= cols:
                col_idx = 0
                x = start_x
                row_idx += 1
                y -= label_h
            
            if row_idx >= rows:
                c.showPage()
                row_idx = 0
                y = start_y
        
        c.save()
        return file_path


class QRLabelGenerator:
    """Generate QR code labels for pieces."""
    
    def __init__(self, output_dir: str = "./exports"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
    
    def generate_label(
        self,
        piece_id: int,
        piece_name: str,
        dimensions: str,
        material: str,
        project: str,
        quantity: int = 1
    ) -> str:
        """Generate a single label with QR code."""
        # QR code data
        qr_data = json.dumps({
            "id": piece_id,
            "name": piece_name,
            "dim": dimensions,
            "mat": material,
            "proj": project
        }, ensure_ascii=False)
        
        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=4, border=1)
        qr.add_data(qr_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        
        # Create label (80mm x 40mm at 300dpi)
        label_width = int(80 * 300 / 25.4)
        label_height = int(40 * 300 / 25.4)
        
        label = Image.new('RGB', (label_width, label_height), color='white')
        draw = ImageDraw.Draw(label)
        
        # Paste QR code
        qr_size = int(label_height * 0.8)
        qr_img = qr_img.resize((qr_size, qr_size))
        label.paste(qr_img, (20, (label_height - qr_size) // 2))
        
        # Add text (simplified without font file)
        text_x = qr_size + 40
        text_y = 30
        
        try:
            draw.text((text_x, text_y), piece_name[:25], fill='black')
            draw.text((text_x, text_y + 40), f"Dim: {dimensions}", fill='black')
            draw.text((text_x, text_y + 80), f"Mat: {material[:20]}", fill='black')
            draw.text((text_x, text_y + 120), f"Projet: {project[:20]}", fill='black')
            draw.text((text_x, text_y + 160), f"Qté: {quantity}", fill='black')
        except:
            pass
        
        # Border
        draw.rectangle([0, 0, label_width - 1, label_height - 1], outline='black', width=2)
        
        file_path = os.path.join(self.output_dir, f"label_{piece_id}_{piece_name.replace(' ', '_')}.png")
        label.save(file_path)
        return file_path
    
    def generate_labels_sheet(
        self,
        pieces: List[Dict[str, Any]],
        project_name: str,
        material_name: str,
        client_name: str = "Général"
    ) -> str:
        """Generate a full A4 sheet of labels."""
        timestamp = datetime.now().strftime("%Y-%m-%d_%Hh%M")
        
        def sanitize(name):
            return "".join([c for c in name if c.isalnum() or c in (' ', '-', '_')]).strip() or "Sans_Nom"

        safe_client = sanitize(client_name)
        safe_project = sanitize(project_name)
        
        final_dir = os.path.join(self.output_dir, safe_client, safe_project, timestamp)
        os.makedirs(final_dir, exist_ok=True)
        # A4 at 300dpi
        page_width = int(210 * 300 / 25.4)
        page_height = int(297 * 300 / 25.4)
        
        # Label size (80mm x 40mm)
        label_width = int(80 * 300 / 25.4)
        label_height = int(40 * 300 / 25.4)
        
        # Grid: 2 columns, 7 rows
        cols = 2
        rows = 7
        margin_x = (page_width - cols * label_width) // 2
        margin_y = (page_height - rows * label_height) // 2
        
        page = Image.new('RGB', (page_width, page_height), color='white')
        
        label_idx = 0
        for row in range(rows):
            for col in range(cols):
                if label_idx >= len(pieces):
                    break
                
                piece = pieces[label_idx]
                
                # Generate individual label
                label_path = self.generate_label(
                    piece_id=piece.get('id', label_idx),
                    piece_name=piece.get('name', ''),
                    dimensions=f"{piece.get('width', 0)}×{piece.get('height', 0)}",
                    material=material_name,
                    project=project_name,
                    quantity=piece.get('quantity', 1)
                )
                
                # Load and paste
                label_img = Image.open(label_path)
                label_img = label_img.resize((label_width, label_height))
                
                x = margin_x + col * label_width
                y = margin_y + row * label_height
                page.paste(label_img, (x, y))
                
                label_idx += 1
        
        file_path = os.path.join(final_dir, f"labels_sheet_{safe_project}.png")
        page.save(file_path)
        return file_path
