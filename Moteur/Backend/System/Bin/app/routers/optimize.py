from fastapi import APIRouter, Depends, HTTPException, Body
import pydantic
import logging
from sqlalchemy.orm import Session
from typing import List
import json
import os
from app.db.database import get_db, OPTIMIZATIONS_DIR
from app.schemas import OptimizationRequest, OptimizationResponse
from app.models import Project, Part, Stock, Material, OptimizationResult, EdgeBand, SupplierMaterial, Supplier
from IA_Engine.optimizer import GuillotineOptimizer, Piece
from IA_Engine.genetic_optimizer import GeneticOptimizer
from IA_Engine.rectpack_optimizer import RectpackOptimizer
from IA_Engine.advanced_optimizer import OptimizationEngine, AlgorithmType, Piece as AdvancedPiece
from IA_Engine.exports import ExportGenerator
from IA_Engine.hardware_engine import hardware_engine

router = APIRouter()

# Initialize export generator using professional storage path
export_generator = ExportGenerator(output_dir=str(OPTIMIZATIONS_DIR))


logger = logging.getLogger(__name__)


@router.post("/run", response_model=OptimizationResponse)
def run_optimization(request_dict: dict = Body(...), db: Session = Depends(get_db)):
    """
    Run cutting optimization for one or more projects (Batching).
    """
    try:
        request = OptimizationRequest(**request_dict)
    except pydantic.ValidationError as e:
        logger.critical("Validation Error 400, payload: %s, error: %s", request_dict, e)
        raise HTTPException(status_code=400, detail=str(e))

    logger.critical("RECEIVED_OPTIMIZATION_START - Payload: %s", request.model_dump_json() if hasattr(request, "model_dump_json") else getattr(request, "json", lambda: str(request))())
    
    # Auto-Correction for Raw Wood engine parameters mismatch
    if request.engine == "panel" and request.raw_wood_params is not None:
        logger.warning("Missing raw_wood_params for panel engine / Conflit détecté: request.engine='panel' avec des paramètres de massif présents. Basculement automatique sur 'raw_wood'.")
        request.engine = "raw_wood"
    
    # Handle both project_id (legacy) and project_ids (new batching)
    project_ids = request.project_ids or ([request.project_id] if request.project_id else [])
    
    if not project_ids:
        raise HTTPException(status_code=400, detail="No project(s) specified for optimization")

    projects = db.query(Project).filter(Project.id.in_(project_ids)).all()
    if len(projects) != len(project_ids):
        # Some projects were not found, but we can continue with what we have
        # Or raise error if strictness required. Let's be helpful but clear.
        if not projects:
            raise HTTPException(status_code=404, detail="None of the specified projects were found")
    
    # Map project IDs to names for labeling pieces
    project_map = {p.id: p.name for p in projects}
    
    # Get parts from selected projects, optionally filtering by piece_ids
    parts_query = db.query(Part).filter(Part.project_id.in_(project_ids))
    if request.piece_ids:
        parts_query = parts_query.filter(Part.id.in_(request.piece_ids))
    
    parts = parts_query.all()
    if not parts:
        raise HTTPException(status_code=400, detail="Selected projects/pieces map to no parts to optimize")
    
    # Group parts by material
    parts_by_material = {}
    for part in parts:
        if part.material_id not in parts_by_material:
            parts_by_material[part.material_id] = []
        parts_by_material[part.material_id].append(part)
    
    all_results = {}
    total_panels_used = 0
    total_waste = 0
    total_cost = 0.0
    export_files = {}
    used_engines = set()
    
    # Optimize each material separately
    for material_id, material_parts in parts_by_material.items():
        # Fetch material to check properties (e.g. massive vs panel)
        material = db.query(Material).filter(Material.id == material_id).first()
        is_massive = not material.is_panel if material else False

        # =====================================================
        # ENGINE SELECTION
        # =====================================================
        # Determine engine for this material
        current_engine = "panel"
        if request.engine == "raw_wood":
            current_engine = "raw_wood"
        elif request.engine == "raw_wood_optimizer": # Legacy alias safety
            current_engine = "raw_wood" 
        elif request.engine == "auto":
             # Auto-detect: if material is not a panel (is_massive), use raw_wood
             current_engine = "raw_wood" if is_massive else "panel"

        # Track engine usage for response
        if current_engine == "raw_wood":
            used_engines.add("raw_wood")
        else:
            used_engines.add("panel")

        # =====================================================
        # RAW WOOD OPTIMIZER DISPATCH
        # =====================================================
        if current_engine == "raw_wood":
            try:
                from IA_Engine.raw_wood_optimizer import RawWoodOptimizer
                from IA_Engine.raw_wood_optimizer.domain import RawPiece, RawBoard, GrainVector, WoodSpecies
                
                # Convert pieces to RawPiece format
                raw_pieces = []
                for p in material_parts:
                    grain = GrainVector.horizontal() if p.grain_direction == 1 else GrainVector.vertical()
                    raw_piece = RawPiece.from_rectangle(
                        id=p.id,
                        width=float(p.width),
                        height=float(p.height),
                        grain_vector=grain,
                        name=p.name,
                        project_id=p.project_id,
                        project_name=project_map.get(p.project_id, "Inconnu")
                    )
                    # Expand by quantity — each copy gets a unique sub-ID to avoid
                    # the optimizer treating them as the same piece.
                    for copy_idx in range(p.quantity):
                        from copy import copy as _copy
                        piece_copy = _copy(raw_piece)
                        if p.quantity > 1:
                            piece_copy.id = p.id * 10000 + copy_idx  # unique ID per copy
                        raw_pieces.append(piece_copy)
                
                # Convert stock to RawBoard format
                raw_boards = []
                
                # Fetch stock with optional filtering
                stock_query = db.query(Stock).filter(
                    Stock.material_id == material_id,
                    Stock.quantity > 0
                )
                if request.stock_ids:
                    stock_query = stock_query.filter(Stock.id.in_(request.stock_ids))
                
                stock_items = stock_query.order_by(Stock.is_offcut.desc()).all()
                
                if not stock_items:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"No stock available for raw wood material ID {material_id}"
                    )
                
                # Get species from material (default to oak)
                species_name = getattr(material, 'species', 'chene') or 'chene'
                try:
                    species = WoodSpecies(species_name.lower())
                except ValueError:
                    species = WoodSpecies.CHENE
                
                board_counter = 0
                for s in stock_items:
                    grain = GrainVector.horizontal() if (s.grain_direction or 1) == 1 else GrainVector.vertical()
                    for _ in range(s.quantity):
                        board = RawBoard.from_rectangle(
                            id=board_counter,
                            width=s.width,
                            height=s.height,
                            grain_vector=grain,
                            species=species,
                            label=f"Stock {s.id}"
                        )
                        raw_boards.append(board)
                        board_counter += 1
                
                # Run Raw Wood Optimizer
                from IA_Engine.raw_wood_optimizer.core import NestingAlgorithm
                
                # Parse parameters
                algo = NestingAlgorithm.BEST_FIT
                if request.algorithm == "next_fit":
                    algo = NestingAlgorithm.NEXT_FIT
                
                # Get raw wood params from request or defaults
                res = 2.0
                min_off = 100.0
                safety_m = request.safety_margin
                kerf_m = request.kerf
                allow_transverse = False
                if request.raw_wood_params:
                    res = request.raw_wood_params.position_resolution
                    min_off = request.raw_wood_params.min_offcut_dimension
                    # Use raw_wood specific kerf/margin if provided, fallback to top-level
                    if hasattr(request.raw_wood_params, 'kerf') and request.raw_wood_params.kerf is not None:
                        kerf_m = request.raw_wood_params.kerf
                    if hasattr(request.raw_wood_params, 'safety_margin') and request.raw_wood_params.safety_margin is not None:
                        safety_m = request.raw_wood_params.safety_margin
                    allow_transverse = getattr(request.raw_wood_params, 'allow_transverse_orientation', False)

                raw_optimizer = RawWoodOptimizer(
                    algorithm=algo,
                    position_resolution=res,
                    min_offcut_dimension=min_off,
                    safety_margin=safety_m,
                    kerf=kerf_m,
                    allow_transverse_orientation=allow_transverse,
                    ignore_grain_direction=True  # Always use fallback for better yield
                )
                result = raw_optimizer.optimize(raw_pieces, raw_boards)

                # Determine success: all pieces placed or none unplaced
                pieces_placed = result.get("pieces_placed", 0)
                total_pieces = result.get("total_pieces", 0)
                pieces_remaining = result.get("pieces_remaining", 0)
                if pieces_remaining > 0:
                    logger.warning(
                        f"[RAW_WOOD] {pieces_remaining}/{total_pieces} pièces non placées "
                        f"par manque de stock (pas une erreur si stock insuffisant)."
                    )
                
                # Get material name for results
                material_name = material.name if material else f"Material {material_id}"
                all_results[str(material_id)] = result
                total_panels_used += result["panels_used"]
                total_waste += result["waste_percentage"] * result["panels_used"]
                
                # Continue to next material (skip panel optimizer logic)
                continue
                
            except ImportError as e:
                import sys
                error_msg = (
                    f"Moteur 'Massif' indisponible: bibliothèque 'shapely' manquante. "
                    f"[Python: {sys.executable}] "
                    f"Solution: Installez shapely dans l'environnement virtuel ou "
                    f"ajoutez le bon 'site-packages' au PYTHONPATH."
                )
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail={"error": "SHAPELY_MISSING", "message": error_msg})
            except Exception as e:
                # Log error and fall back
                print(f"[ERROR] RawWoodOptimizer failed: {e}. Using panel optimizer.")
        
        # =====================================================
        # PANEL OPTIMIZER (Existing Logic - UNCHANGED)
        # =====================================================
        
        # Convert to optimizer format
        pieces = []
        for p in material_parts:
            # Get thicknesses for each edge
            t_top = db.query(EdgeBand.thickness).filter(EdgeBand.id == p.edge_top_id).scalar() or 0.0
            t_bottom = db.query(EdgeBand.thickness).filter(EdgeBand.id == p.edge_bottom_id).scalar() or 0.0
            t_left = db.query(EdgeBand.thickness).filter(EdgeBand.id == p.edge_left_id).scalar() or 0.0
            t_right = db.query(EdgeBand.thickness).filter(EdgeBand.id == p.edge_right_id).scalar() or 0.0
            
            # Apply Manufacturing Rules
            p_width, p_height = p.width, p.height
            
            # Rule 1: Massive Wood Safety Margin (+10mm)
            if is_massive:
                p_width += 10.0
                p_height += 10.0
                
            # Rule 2: Grooving for Back Panels (+15mm)
            if "fond" in p.name.lower() or "back" in p.name.lower() or "derniere" in p.name.lower():
                p_width += 15.0
                p_height += 15.0

            # Extraction des dimensions 3D depuis les métadonnées si disponibles (import STEP)
            meta_width, meta_height, meta_thickness = p_width, p_height, (material.thickness if material else 0.0)
            if p.extraction_metadata:
                try:
                    meta = json.loads(p.extraction_metadata)
                    meta_width = meta.get("width") or meta.get("largeur") or meta.get("longueur") or p_width
                    meta_height = meta.get("height") or meta.get("hauteur") or p_height
                    meta_thickness = meta.get("thickness") or meta.get("epaisseur") or meta_thickness
                except:
                    pass

            pieces.append(Piece(
                id=p.id,
                name=p.name,
                width=float(meta_width),
                height=float(meta_height),
                thickness=float(meta_thickness),
                quantity=p.quantity,
                allow_rotation=p.allow_rotation,
                material_id=p.material_id,
                edge_top_thickness=float(t_top),
                edge_bottom_thickness=float(t_bottom),
                edge_left_thickness=float(t_left),
                edge_right_thickness=float(t_right),
                grain_direction=p.grain_direction,
                project_id=p.project_id,
                project_name=project_map.get(p.project_id, "Inconnu"),
                longueur=float(meta_width),
                largeur=float(meta_height),
                epaisseur=float(meta_thickness),
                priority=getattr(p, 'priority', 0)
            ))
        
        # Prepare stock list based on material_source
        stock_list = []
        
        # Determine source for this specific material (from material_sources dict if provided)
        material_source = request.material_source
        if request.material_sources and material_id in request.material_sources:
            material_source = request.material_sources[material_id]
        
        if material_source == "supplier":
            # Use supplier catalog dimensions instead of hardcoded values
            supplier_offer = db.query(SupplierMaterial).filter(
                SupplierMaterial.material_id == material_id
            ).order_by(SupplierMaterial.price.asc()).first()
            
            if supplier_offer and supplier_offer.width and supplier_offer.height:
                panel_w = supplier_offer.width
                panel_h = supplier_offer.height
            else:
                # Fallback to standard panel dimensions with warning
                panel_w = 2800.0
                panel_h = 2070.0
                print(f"[WARN] No supplier panel dimensions for material {material_id}, using default {panel_w}x{panel_h}")
            
            # Use material's grain setting
            grain = 1 if (material and material.has_grain) else 0
            for i in range(20):
                stock_list.append((i, panel_w, panel_h, False, grain))
        else:
            # Use existing stock (offcuts first)
            stock_items = db.query(Stock).filter(
                Stock.material_id == material_id,
                Stock.quantity > 0
            ).order_by(Stock.is_offcut.desc()).all()
            
            if not stock_items:
                raise HTTPException(
                    status_code=400, 
                    detail=f"No stock available for material ID {material_id}"
                )
            
            # Expand stock by quantity
            for s in stock_items:
                for _ in range(s.quantity):
                    stock_list.append((s.id, s.width, s.height, s.is_offcut, s.grain_direction or 1))

        # =====================================================
        # UNIT CONSISTENCY CHECK
        # =====================================================
        if pieces and stock_list:
            max_piece_dim = max(max(p.width, p.height) for p in pieces)
            max_stock_dim = max(max(s[1], s[2]) for s in stock_list)
            
            # If pieces are e.g. 10x larger than stock, there's likely a unit mismatch (mm vs cm)
            if max_piece_dim > max_stock_dim * 1.5:
                print(f"[WARN] Unit mismatch suspected for {material_name}: "
                      f"Max piece ({max_piece_dim}mm) > Max stock ({max_stock_dim}mm).")
                # We don't block optimization but this warning will be in logs.
        
        # Run optimization using the Advanced Engine with Fallback Loop
        engine = OptimizationEngine(
            kerf=request.kerf,
            trim_margin=request.trim_margin,
            safety_margin=request.safety_margin
        )
        
        # Select base algorithm based on request
        base_algorithm = AlgorithmType.HYBRID
        if request.high_precision:
            base_algorithm = AlgorithmType.HYBRID
        elif request.algorithm == "skyline":
            base_algorithm = AlgorithmType.SKYLINE
        elif request.algorithm == "guillotine":
            base_algorithm = AlgorithmType.GUILLOTINE
        
        # Fallback Loop Constants
        # Step 1: User requested margins
        # Step 2: safety_margin = 0
        # Step 3: kerf = 0 (and all other margins = 0)
        MAX_RELAXATION_ATTEMPTS = 3
        current_attempt = 1
        
        # Optimization Loop with Relaxation Strategy
        while current_attempt <= MAX_RELAXATION_ATTEMPTS:
            # Reconstruct legacy rectpack if needed
            if request.algorithm == "rectpack":
                optimizer = RectpackOptimizer(
                    kerf=engine.kerf,
                    trim_margin=engine.trim_margin,
                    safety_margin=engine.safety_margin
                )
                result = optimizer.optimize(pieces, stock_list)
            else:
                # FIX: Use 'pieces' instead of 'adv_pieces'
                result = engine.optimize(pieces, stock_list, algorithm=base_algorithm)
            
            # Check for success
            if result.get("success", False):
                break # Successful optimization
                
            # If failed, attempt relaxation
            logger.warning(f"Optimization attempt {current_attempt} failed for material {material_name} (Status: {result.get('status', 'FAILED')}).")
            
            if current_attempt == 1:
                # Attempt 2: Remove safety margin entirely
                logger.info("Attempting automatic relaxation (Step 1): Setting safety_margin to 0.")
                engine.safety_margin = 0.0
            elif current_attempt == 2:
                # Attempt 3: Remove all margins including kerf (Minimum Technique)
                logger.info("Attempting final relaxation (Step 2): Setting kerf and all margins to 0.")
                engine.kerf = 0.0
                engine.trim_margin = 0.0
                engine.safety_margin = 0.0
            
            current_attempt += 1
            
        # Final Error Handling if all attempts failed
        if not result.get("success", False):
            # Attempt to identify the problematic piece
            problematic_piece_name = "Inconnue"
            problematic_piece_id = None
            required_w, required_h = 0, 0
            
            max_stock_width = max([s[1] for s in stock_list]) if stock_list else 0
            max_stock_height = max([s[2] for s in stock_list]) if stock_list else 0
            
            # Identify first piece that can't fit even in the largest board (no margins)
            for p in pieces:
                # Using base dimensions (no margins) for identification of physical impossibility
                if (p.width > max_stock_width and p.width > max_stock_height) or \
                   (p.height > max_stock_width and p.height > max_stock_height):
                    problematic_piece_name = p.name
                    problematic_piece_id = p.id
                    required_w, required_h = p.width, p.height
                    break
                   
            error_details = {
                "error": "PIECE_TOO_LARGE",
                "message": f"La pièce '{problematic_piece_name}' est physiquement trop grande pour le stock disponible ({max_stock_width}x{max_stock_height}).",
                "piece_id": problematic_piece_id,
                "required": [required_w, required_h],
                "available": [max_stock_width, max_stock_height],
                "material": material_name
            }
            logger.error(f"Optimization failed completely: {error_details}")
            raise HTTPException(status_code=400, detail=error_details)

        
        # Get material for cost calculation
        material = db.query(Material).filter(Material.id == material_id).first()
        material_name = material.name if material else f"Material {material_id}"
        
        # Calculate cost for this material's result
        material_cost = 0.0
        if material and material.cost_per_sqm > 0:
            for panel_info in result["panels"]:
                # Dimensions are in mm
                p_width = panel_info["width"]
                p_height = panel_info["height"]
                
                if material.price_type == "unit":
                    material_cost += material.cost_per_sqm
                elif material.price_type == "m3":
                    # Volume in m3: (w/1000) * (h/1000) * (thickness/1000)
                    volume_m3 = (p_width / 1000) * (p_height / 1000) * (material.thickness / 1000)
                    material_cost += volume_m3 * material.cost_per_sqm
                else:  # default to m2
                    # Area in m2: (w/1000) * (h/1000)
                    area_m2 = (p_width / 1000) * (p_height / 1000)
                    material_cost += area_m2 * material.cost_per_sqm
        
        # Calculate edge banding costs for these parts
        edge_costs = 0.0
        edge_summary = {} # {eb_id: {"name": str, "length": float, "cost": float}}
        
        for p in material_parts:
            # Map edge IDs to their lengths (in mm)
            edges = [
                (p.edge_top_id, p.width),
                (p.edge_bottom_id, p.width),
                (p.edge_left_id, p.height),
                (p.edge_right_id, p.height)
            ]
            
            for eb_id, length_mm in edges:
                if eb_id:
                    eb = db.query(EdgeBand).filter(EdgeBand.id == eb_id).first()
                    if eb:
                        length_m = (length_mm / 1000.0) * p.quantity
                        cost = length_m * eb.cost_per_m
                        
                        if eb_id not in edge_summary:
                            edge_summary[eb_id] = {"name": eb.name, "length": 0.0, "cost": 0.0, "thickness": eb.thickness}
                        
                        edge_summary[eb_id]["length"] += length_m
                        edge_summary[eb_id]["cost"] += cost
                        edge_costs += cost

        result["edge_banding_summary"] = edge_summary
        result["edge_banding_total_cost"] = edge_costs
        
        # Enrich result with drills for DXF/CNC
        for panel in result.get("panels", []):
            for placement in panel.get("placements", []):
                piece_id = placement.get("piece_id")
                if piece_id:
                    part = db.query(Part).filter(Part.id == piece_id).first()
                    if part:
                        drills = hardware_engine.get_drills_for_part(db, part)
                        placement["drills"] = drills

        panels_count = result.get("panels_used", 0)
        print(f"[DEBUG] Optimization for {material_name}: Success={result['success']}, Panels={panels_count}, Waste={result['waste_percentage']:.2f}%")
        
        all_results[str(material_id)] = result
        total_panels_used += result["panels_used"]
        total_waste += result["waste_percentage"] * result["panels_used"]
        total_cost += material_cost + edge_costs
        
        # If validation requested, update stock
        if request.validate_and_update_stock and result["success"]:
            _update_stock_after_optimization(db, result, material_id, stock_items)
    
    # Calculate average waste
    avg_waste = total_waste / total_panels_used if total_panels_used > 0 else 0
    
    # Generate exports if requested
    if request.export_formats:
        try:
            # Batch name
            if len(projects) > 1:
                batch_name = f"BATCH_{len(projects)}_Projets"
                client_name = "Multi-Clients"
            else:
                batch_name = projects[0].name
                client_name = projects[0].client.name if projects[0].client else "Général"

            print(f"[DEBUG] Export formats requested: {request.export_formats}")
            full_paths = export_generator.generate_all(
                all_results, 
                batch_name, 
                request.export_formats,
                client_name=client_name
            )
            print(f"[DEBUG] Export generation completed. Files: {list(full_paths.keys())}")
            
            # Convert to relative paths with forward slashes
            export_files = {
                k: os.path.relpath(v, str(OPTIMIZATIONS_DIR)).replace("\\", "/") 
                for k, v in full_paths.items()
            }
        except Exception as e:
            print(f"[ERROR] Export generation error: {e}")
            import traceback
            traceback.print_exc()
            export_files = {}
    
    # Save optimization result (link to the first project for now, or record batch context in JSON)
    # TODO: Add a specific batching table if this becomes common
    main_project_id = project_ids[0] if project_ids else None
    
    optimization_record = OptimizationResult(
        project_id=main_project_id,
        kerf=request.kerf,
        trim_margin=request.trim_margin,
        safety_margin=request.safety_margin,
        total_panels_used=total_panels_used,
        waste_percentage=avg_waste,
        total_cost=total_cost,
        k_metric=sum(r.get("metrics", {}).get("k_metric", 0) for r in all_results.values()) / len(all_results) if all_results else 0,
        solve_time_ms=sum(r.get("metrics", {}).get("execution_time_ms", 0) for r in all_results.values()),
        total_stock_area=sum(r.get("metrics", {}).get("total_stock_area_mm2", 0) for r in all_results.values()),
        result_data=json.dumps(all_results, ensure_ascii=False)
    )
    db.add(optimization_record)
    db.commit()
    db.refresh(optimization_record)
    
    engine_str = "panel"
    if "raw_wood" in used_engines:
        engine_str = "raw_wood"
    if len(used_engines) > 1:
        engine_str = "mixed"

    return OptimizationResponse(
        optimization_id=optimization_record.id,
        engine_used=engine_str,
        total_panels_used=total_panels_used,
        waste_percentage=round(avg_waste, 2),
        result_data=all_results,
        export_files=export_files
    )


@router.get("/needs/{project_id}")
def calculate_project_needs(project_id: int, db: Session = Depends(get_db)):
    """
    Calculate raw material needs for a project vs current stock.
    Does NOT run full nesting optimization, just area/quantity checks.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    parts = db.query(Part).filter(Part.project_id == project_id).all()
    if not parts:
        return {"needs": []}
        
    # Group by material
    needs = {}
    
    for part in parts:
        if part.material_id not in needs:
            material = db.query(Material).filter(Material.id == part.material_id).first()
            needs[part.material_id] = {
                "material": material,
                "required_area_m2": 0.0,
                "parts_count": 0,
                "stock_available_area_m2": 0.0,
                "stock_count": 0,
                "missing_area_m2": 0.0
            }
            
            # Get current stock
            stock_items = db.query(Stock).filter(Stock.material_id == part.material_id).all()
            total_stock_area = sum([(s.width * s.height) / 1000000.0 * s.quantity for s in stock_items])
            total_stock_count = sum([s.quantity for s in stock_items])
            
            needs[part.material_id]["stock_available_area_m2"] = total_stock_area
            needs[part.material_id]["stock_count"] = total_stock_count

        # Add part area
        area = (part.width * part.height) / 1000000.0 * part.quantity
        needs[part.material_id]["required_area_m2"] += area
        needs[part.material_id]["parts_count"] += part.quantity
        
    # Calculate missing and suggest suppliers
    result = []
    for mat_id, data in needs.items():
        # Simple safety margin of 20% for cuts/waste estimation
        estimated_required = data["required_area_m2"] * 1.2
        missing = max(0, estimated_required - data["stock_available_area_m2"])
        
        item_data = {
            "material_id": mat_id,
            "material_name": data["material"].name if data["material"] else f"Material {mat_id}",
            "thickness": data["material"].thickness if data["material"] else 0,
            "parts_count": data["parts_count"],
            "required_area_m2": round(data["required_area_m2"], 2),
            "stock_area_m2": round(data["stock_available_area_m2"], 2),
            "stock_count_panels": data["stock_count"],
            "estimated_missing_m2": round(missing, 2),
            "status": "ok" if missing <= 0 else "missing",
            "best_offer": None
        }

        # If missing, find best supplier offer
        if missing > 0:
            best_offer = db.query(SupplierMaterial).filter(
                SupplierMaterial.material_id == mat_id
            ).order_by(SupplierMaterial.price.asc()).first()
            
            if best_offer:
                supplier = db.query(Supplier).filter(Supplier.id == best_offer.supplier_id).first()
                item_data["best_offer"] = {
                    "supplier_id": best_offer.supplier_id,
                    "supplier_name": supplier.name if supplier else "Inconnu",
                    "price": best_offer.price,
                    "price_type": best_offer.price_type,
                    "reference": best_offer.reference,
                    "delivery_days": supplier.delivery_delay_days if supplier else 7
                }
        
        result.append(item_data)
        
    return result


def _update_stock_after_optimization(db: Session, result: dict, material_id: int, stock_items: List[Stock]):
    """
    Update stock quantities and add usable offcuts after optimization validation.
    """
    # Track which stock panels were used
    used_panel_ids = set()
    for panel in result.get("panels", []):
        used_panel_ids.add(panel["panel_id"])
    
    # Decrease quantity for used panels
    for stock in stock_items:
        if stock.id in used_panel_ids:
            # Count how many times this stock ID appears in used panels
            times_used = sum(1 for p in result["panels"] if p["panel_id"] == stock.id)
            stock.quantity = max(0, stock.quantity - times_used)
    
    # Add usable offcuts as new stock items
    for panel in result.get("panels", []):
        for offcut in panel.get("offcuts", []):
            if offcut["width"] >= 100 and offcut["height"] >= 100:
                new_offcut = Stock(
                    material_id=material_id,
                    width=offcut["width"],
                    height=offcut["height"],
                    quantity=1,
                    is_offcut=True,
                    quality_score=offcut.get("quality_score", 1.0),
                    label=f"Chute de panneau {panel['panel_id']}"
                )
                db.add(new_offcut)
    
    db.commit()


@router.get("/history/{project_id}")
def get_optimization_history(project_id: int, db: Session = Depends(get_db)):
    """Get optimization history for a project."""
    results = db.query(OptimizationResult).filter(
        OptimizationResult.project_id == project_id
    ).order_by(OptimizationResult.created_at.desc()).all()
    
    return [
        {
            "id": r.id,
            "created_at": r.created_at.isoformat(),
            "kerf": r.kerf,
            "trim_margin": r.trim_margin,
            "safety_margin": r.safety_margin,
            "total_panels_used": r.total_panels_used,
            "waste_percentage": r.waste_percentage
        }
        for r in results
    ]


@router.get("/result/{optimization_id}")
def get_optimization_result(optimization_id: int, db: Session = Depends(get_db)):
    """Get a specific optimization result with full data."""
    result = db.query(OptimizationResult).filter(OptimizationResult.id == optimization_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Optimization result not found")
    
    return {
        "id": result.id,
        "project_id": result.project_id,
        "created_at": result.created_at.isoformat(),
        "kerf": result.kerf,
        "trim_margin": result.trim_margin,
        "safety_margin": result.safety_margin,
        "total_panels_used": result.total_panels_used,
        "waste_percentage": result.waste_percentage,
        "result_data": json.loads(result.result_data) if result.result_data else {}
    }


@router.get("/project/{project_id}/latest")
def get_latest_optimization(project_id: int, db: Session = Depends(get_db)):
    """Get the latest optimization result for a project."""
    result = db.query(OptimizationResult).filter(
        OptimizationResult.project_id == project_id
    ).order_by(OptimizationResult.created_at.desc()).first()
    
    if not result:
        raise HTTPException(status_code=404, detail="No optimization found for this project")
    
    return {
        "id": result.id,
        "project_id": result.project_id,
        "created_at": result.created_at.isoformat(),
        "kerf": result.kerf,
        "trim_margin": result.trim_margin,
        "safety_margin": result.safety_margin,
        "total_panels_used": result.total_panels_used,
        "waste_percentage": result.waste_percentage,
        "result_data": json.loads(result.result_data) if result.result_data else {}
    }


@router.get("/{project_id}/labels")
def generate_project_labels(project_id: int, db: Session = Depends(get_db)):
    """Generate labels PDF for a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    parts = db.query(Part).filter(Part.project_id == project_id).all()
    
    # Enrich parts with material name
    parts_data = []
    for p in parts:
        material = db.query(Material).filter(Material.id == p.material_id).first()
        for _ in range(p.quantity):
            parts_data.append({
                "id": p.id,
                "name": p.name,
                "width": p.width,
                "height": p.height,
                "material_name": material.name if material else "Inconnu"
            })
            
    if not parts_data:
        raise HTTPException(status_code=400, detail="No parts in project")

    try:
        client_name = project.client.name if project.client else "Général"
        pdf_path = export_generator.generate_labels_pdf(parts_data, project.name, client_name=client_name)
        return {"url": f"/api/files/{os.path.basename(pdf_path)}"} # Assuming we have a file serve endpoint or similar
    except Exception as e:
        print(f"Label generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate labels")


@router.post("/validate/{optimization_id}")
def validate_optimization(optimization_id: int, db: Session = Depends(get_db)):
    """
    Marque une optimisation comme 'Validée pour la Production'.
    Cela met à jour le statut du projet lié.
    """
    opt = db.query(OptimizationResult).filter(OptimizationResult.id == optimization_id).first()
    if not opt:
        raise HTTPException(status_code=404, detail="Optimisation non trouvée")
    
    # Réinitialiser les autres validations pour ce projet (un seul plan à la fois en production)
    db.query(OptimizationResult).filter(
        OptimizationResult.project_id == opt.project_id
    ).update({"is_validated": False})
    
    # Valider celle-ci
    opt.is_validated = True
    
    # Mettre à jour le statut du projet
    project = db.query(Project).filter(Project.id == opt.project_id).first()
    if project:
        project.status = "in_progress"
    
    db.commit()
    return {"success": True, "message": "Optimisation validée pour la production"}
