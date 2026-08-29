"""Export and Import API router."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import json
from app.db.database import get_db
from app.models import Project, Part, Material, OptimizationResult, SupplierMaterial, Supplier
from IA_Engine.exports import ExportGenerator, QRLabelGenerator
from IA_Engine.importer import PartsImporter
from IA_Engine.project_exports import ProjectExportGenerator

router = APIRouter()

from pathlib import Path
from app.core.config import get_data_dir

# Répertoire de données utilisateur (dev : Moteur/UserData, exe : %APPDATA%/OptiCutPro)
user_data_root = get_data_dir()
user_data_root.mkdir(parents=True, exist_ok=True)
export_dir = user_data_root / 'Exports'
export_dir.mkdir(parents=True, exist_ok=True)

# Initialize generators with the new UserData root
export_generator = ExportGenerator(output_dir=str(user_data_root))
label_generator = QRLabelGenerator(output_dir=str(user_data_root)) # Labels will now follow the client structure if updated
parts_importer = PartsImporter()
project_export_generator = ProjectExportGenerator(output_dir=str(user_data_root))


@router.post("/generate/{optimization_id}")
def generate_exports(
    optimization_id: int,
    formats: List[str] = ["pdf"],
    db: Session = Depends(get_db)
):
    """Generate export files for an optimization result."""
    # Get optimization result
    result = db.query(OptimizationResult).filter(OptimizationResult.id == optimization_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Optimization result not found")
    
    # Get project name
    project = db.query(Project).filter(Project.id == result.project_id).first()
    project_name = project.name if project else f"Project_{result.project_id}"
    
    # Parse result data
    result_data = json.loads(result.result_data) if result.result_data else {}
    
    # Generate exports
    try:
        client_name = project.client.name if project.client else "Général"
        export_files = export_generator.generate_all(result_data, project_name, formats, client_name=client_name)
        
        # Save the primary export path to the database
        if export_files:
            # We store the first PDF or first available file as the representative path
            representative_path = None
            for key in ["pdf", "pdf_1", "png_1"]:
                if key in export_files:
                    representative_path = export_files[key]
                    break
            
            if not representative_path and export_files:
                representative_path = list(export_files.values())[0]
            
            if representative_path:
                # Store relative to UserData root
                rel_rep_path = os.path.relpath(representative_path, str(user_data_root))
                result.file_path = rel_rep_path.replace("\\", "/")
                db.commit()

        # Return the path relative to 'UserData' root for the download endpoint
        relative_files = {}
        for key, full_path in export_files.items():
            rel_path = os.path.relpath(full_path, str(user_data_root))
            relative_files[key] = rel_path.replace("\\", "/") # Use forward slashes for URLs

        return {
            "success": True,
            "files": relative_files,
            "message": f"Generated {len(export_files)} export files"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export generation failed: {str(e)}")


@router.post("/project/{project_id}")
def generate_project_exports(
    project_id: int,
    formats: List[str] = ["pdf", "excel"],
    db: Session = Depends(get_db)
):
    """Generate export files for an entire project list."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    parts = db.query(Part).filter(Part.project_id == project_id).all()
    if not parts:
        raise HTTPException(status_code=400, detail="Project has no parts")
        
    # Get materials for lookup
    materials = {m.id: m for m in db.query(Material).all()}
    
    parts_data = []
    for part in parts:
        mat = materials.get(part.material_id)
        parts_data.append({
            'name': part.name,
            'width': part.width,
            'height': part.height,
            'quantity': part.quantity,
            'material_name': mat.name if mat else 'Inconnu',
            'material_thickness': mat.thickness if mat else '-'
        })
        
    client_name = project.client.name if project.client else "Général"
    
    try:
        export_files = project_export_generator.generate_all(
            parts=parts_data,
            project_name=project.name,
            client_name=client_name,
            formats=formats
        )
        
        # Return the path relative to 'UserData' root for the download endpoint
        relative_files = {}
        for key, full_path in export_files.items():
            rel_path = os.path.relpath(full_path, str(user_data_root))
            relative_files[key] = rel_path.replace("\\", "/") # Use forward slashes for URLs

        return {
            "success": True,
            "files": relative_files,
            "message": f"Generated {len(export_files)} export files"
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Project export generation failed: {str(e)}")


@router.get("/download/{subpath:path}")
def download_export(subpath: str):
    """Download a generated export file from hierarchical structure."""
    # Security: prevent path traversal outside exports
    # Normalize path and ensure it's not trying to go up
    normalized_path = os.path.normpath(subpath)
    if normalized_path.startswith("..") or os.path.isabs(normalized_path):
        raise HTTPException(status_code=400, detail="Invalid path")
    
    file_path = os.path.normpath(os.path.join(str(user_data_root), subpath))
    
    # Check if the path is still within UserData for security
    if not os.path.abspath(file_path).startswith(os.path.abspath(str(user_data_root))):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if os.path.exists(file_path):
        return FileResponse(
            file_path,
            filename=os.path.basename(file_path),
            media_type="application/octet-stream"
        )
    
    raise HTTPException(status_code=404, detail="File not found")


@router.post("/labels/{project_id}")
def generate_labels(project_id: int, db: Session = Depends(get_db)):
    """Generate QR code labels for all parts in a project."""
    # Get project and parts
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    parts = db.query(Part).filter(Part.project_id == project_id).all()
    if not parts:
        raise HTTPException(status_code=400, detail="Project has no parts")
    
    # Get materials for lookup
    materials = {m.id: m.name for m in db.query(Material).all()}
    
    # Prepare parts data
    parts_data = []
    for part in parts:
        parts_data.append({
            'id': part.id,
            'name': part.name,
            'width': part.width,
            'height': part.height,
            'quantity': part.quantity
        })
    
    # Get first material name for the sheet
    first_material = materials.get(parts[0].material_id, "Unknown")
    
    try:
        # Generate individual labels
        label_files = []
        client_name = project.client.name if project.client else "Général"
        for part in parts:
            material_name = materials.get(part.material_id, "Unknown")
            # We don't have a good way to pass client/project/date to generate_label directly 
            # without changing its signature too. But generate_labels_sheet is the main one.
            # Actually generate_label is fine for now as it goes to its own dir usually.
            label_path = label_generator.generate_label(
                piece_id=part.id,
                piece_name=part.name,
                dimensions=f"{part.width}×{part.height}",
                material=material_name,
                project=project.name,
                quantity=part.quantity
            )
            label_files.append(label_path)
        
        # Generate sheet
        sheet_path = label_generator.generate_labels_sheet(
            parts_data,
            project.name,
            first_material,
            client_name=client_name
        )
        
        rel_sheet_path = os.path.relpath(sheet_path, str(export_dir)).replace("\\", "/")
        
        return {
            "success": True,
            "individual_labels": len(label_files),
            "sheet_path": rel_sheet_path,
            "message": f"Generated {len(label_files)} labels and 1 sheet"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Label generation failed: {str(e)}")


@router.post("/import/csv/{project_id}")
async def import_csv(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import parts from a CSV file into a project."""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read file
    content = await file.read()
    
    try:
        # Parse CSV
        parts_data = parts_importer.import_csv(content)
        
        if not parts_data:
            raise HTTPException(status_code=400, detail="No valid parts found in file")
        
        # Get or create materials
        materials = {m.name.lower(): m.id for m in db.query(Material).all()}
        default_material_id = next(iter(materials.values())) if materials else None
        
        # Create parts
        created_count = 0
        for part_data in parts_data:
            # Find material ID
            material_name = part_data.get('material_name', '').lower()
            material_id = materials.get(material_name, default_material_id)
            
            if not material_id:
                continue  # Skip if no material available
            
            part = Part(
                project_id=project_id,
                material_id=material_id,
                name=part_data['name'],
                width=part_data['width'],
                height=part_data['height'],
                quantity=part_data['quantity'],
                allow_rotation=part_data['allow_rotation'],
                edge_banding=part_data.get('edge_banding'),
                notes=part_data.get('notes')
            )
            db.add(part)
            created_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "parts_imported": created_count,
            "parts_in_file": len(parts_data),
            "message": f"Successfully imported {created_count} parts"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@router.post("/import/excel/{project_id}")
async def import_excel(project_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Import parts from an Excel file into a project."""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read file
    content = await file.read()
    
    try:
        # Parse Excel
        parts_data = parts_importer.import_excel(content)
        
        if not parts_data:
            raise HTTPException(status_code=400, detail="No valid parts found in file")
        
        # Get or create materials
        materials = {m.name.lower(): m.id for m in db.query(Material).all()}
        default_material_id = next(iter(materials.values())) if materials else None
        
        # Create parts
        created_count = 0
        for part_data in parts_data:
            # Find material ID
            material_name = part_data.get('material_name', '').lower()
            material_id = materials.get(material_name, default_material_id)
            
            if not material_id:
                continue
            
            part = Part(
                project_id=project_id,
                material_id=material_id,
                name=part_data['name'],
                width=part_data['width'],
                height=part_data['height'],
                quantity=part_data['quantity'],
                allow_rotation=part_data['allow_rotation'],
                edge_banding=part_data.get('edge_banding'),
                notes=part_data.get('notes')
            )
            db.add(part)
            created_count += 1
        
        db.commit()
        
        return {
            "success": True,
            "parts_imported": created_count,
            "parts_in_file": len(parts_data),
            "message": f"Successfully imported {created_count} parts"
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@router.get("/import/template")
def get_import_template():
    """Get a CSV template for parts import."""
    return {
        "template_csv": parts_importer.get_template_csv(),
        "headers": parts_importer.get_template_headers(),
        "instructions": "Colonnes: nom, largeur, hauteur, quantité (optionnel), matériau (optionnel), rotation (oui/non), chants, notes"
    }
@router.get("/catalog/export")
def export_supplier_catalog(db: Session = Depends(get_db)):
    """Export the entire supplier catalog to CSV."""
    materials = db.query(SupplierMaterial).all()
    
    import csv
    import io
    from fastapi.responses import StreamingResponse
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        "Fournisseur", "Essence", "Type", "Désignation", "Dimensions", 
        "Traitement", "Certification", "Prix", "Unité", "URL", "Référence"
    ])
    
    for m in materials:
        supplier_name = m.supplier.name if m.supplier else "Inconnu"
        dims = f"{m.thickness}x{m.width}x{m.height}" if m.thickness else ""
        writer.writerow([
            supplier_name, m.essence, m.product_type, m.name, dims,
            m.treatment, m.certification, m.price, m.price_type, m.reference, m.reference
        ])
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=catalogue_fournisseurs.csv"}
    )
