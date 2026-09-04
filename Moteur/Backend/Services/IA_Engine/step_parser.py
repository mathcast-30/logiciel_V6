"""
STEP File Parser with XDE (Extended Data Exchange)
Extracts geometry AND metadata (Names) from STEP files.
Optimized for Fusion 360 assemblies with robust OBB calculation.
"""
from typing import Optional, Dict, List, Tuple, Any
from pathlib import Path
import logging
from datetime import datetime

logger = logging.getLogger("StepParser")

# ---------------------------------------------------------------------------
# pythonOCC — graceful import
# ---------------------------------------------------------------------------
OCC_AVAILABLE: bool = False
OCC_VERSION: str = "N/A"
OCC_IMPORT_ERROR: str = ""

try:
    from OCC.Core.STEPControl import STEPControl_Reader
    from OCC.Core.IFSelect import IFSelect_RetDone
    from OCC.Core.TopAbs import TopAbs_SHELL
    from OCC.Core.TopExp import TopExp_Explorer

    try:
        import OCC
        OCC_VERSION = getattr(OCC, "__version__", "installed")
    except Exception:
        pass

    OCC_AVAILABLE = True
except ImportError as e:
    OCC_AVAILABLE = False
    OCC_IMPORT_ERROR = str(e)
    logger.warning(f"pythonOCC NOT found: {e}")

try:
    from .piece_geometry_analyzer import PieceGeometryAnalyzer
    from .step_name_extractor import extract_named_solids_safe
except ImportError:
    try:
        from piece_geometry_analyzer import PieceGeometryAnalyzer
        from step_name_extractor import extract_named_solids_safe
    except ImportError as e:
        logger.warning(f"Imports PieceGeometryAnalyzer/extract_named_solids_safe failed: {e}")
        PieceGeometryAnalyzer = None
        extract_named_solids_safe = None


class StepParser:
    """
    Advanced STEP Parser for woodworking applications.
    Uses extract_named_solids_safe for component names (XCAF + fallback)
    and PieceGeometryAnalyzer for guaranteed OBB dimensions and optional features.
    """

    VERSION = "5.0.0-ROBUST-OBB"

    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"STEP file not found: {filepath}")

        self.parts: List[Dict[str, Any]] = []
        self.pieces: List[Dict[str, Any]] = []
        self.global_warnings: List[str] = []
        self.names_source: str = "fusion_xcaf"
        self._analyzer = PieceGeometryAnalyzer() if PieceGeometryAnalyzer is not None else None

    def parse(self) -> Dict[str, Any]:
        """Entry point for parsing the STEP file."""
        if not OCC_AVAILABLE:
            raise RuntimeError("pythonOCC is not available. STEP import disabled.")

        if extract_named_solids_safe is None or self._analyzer is None:
            raise RuntimeError("Modules piece_geometry_analyzer ou step_name_extractor non disponibles.")

        try:
            # 1. Extraction sécurisée des solides nommés (XCAF ou fallback interne)
            extracted = extract_named_solids_safe(str(self.filepath))
            named_solids = extracted.get("solids", [])
            self.names_source = extracted.get("names_source", "generic_fallback")

            if extracted.get("warning"):
                self.global_warnings.append(extracted["warning"])

            if not named_solids:
                # Vérifier si le fichier contient des surfaces ouvertes (coquilles) pour diagnostic précis
                try:
                    reader = STEPControl_Reader()
                    status = reader.ReadFile(str(self.filepath))
                    if status == IFSelect_RetDone:
                        reader.TransferRoots()
                        has_shells = any(
                            TopExp_Explorer(reader.Shape(i), TopAbs_SHELL).More()
                            for i in range(1, reader.NbShapes() + 1)
                        )
                        if has_shells:
                            raise ValueError(
                                "Le fichier contient des surfaces ouvertes (pas de corps solide fermé). "
                                "Vérifiez dans Fusion 360 que vos corps sont bien de type 'Solid' et fermés."
                            )
                except Exception:
                    pass

                raise ValueError("No solid bodies found in STEP file.")

            # 2. Analyse géométrique pour chaque solide (OBB toujours prioritaire)
            for item in named_solids:
                solid = item["solid"]
                name = item.get("name", "Piece")

                try:
                    analysis = self._analyzer.analyze_solid(solid)
                except Exception as exc:
                    # Ne jamais bloquer tout l'import pour une erreur sur une pièce individuelle
                    logger.warning(f"Erreur analyse géométrique sur la pièce '{name}': {exc}")
                    self.global_warnings.append(f"Erreur géométrie sur '{name}': {exc}")
                    continue

                piece_warnings = analysis.get("warnings", [])
                for w in piece_warnings:
                    logger.warning(f"[{name}] {w}")

                # Structure de pièce conforme au contrat d'intégration
                piece_data = {
                    "name": name,
                    "width": float(analysis["length"]),
                    "height": float(analysis["width"]),
                    "thickness": float(analysis["thickness"]),
                    "thickness_confidence": analysis.get("thickness_confidence"),
                    "thickness_method": analysis.get("thickness_method", "obb"),
                    "contour_2d": analysis.get("contour_2d"),
                    "machining_features": analysis.get("machining_features", []),
                    "warnings": piece_warnings,
                }
                self.pieces.append(piece_data)

                # Format part compatible avec les routes et le modèle Part existant
                part_entry = {
                    "nom": name,
                    "component_name": name,
                    "names_source": self.names_source,
                    "longueur": float(analysis["length"]),
                    "largeur": float(analysis["width"]),
                    "epaisseur": float(analysis["thickness"]),
                    "thickness_confidence": analysis.get("thickness_confidence"),
                    "thickness_method": analysis.get("thickness_method", "obb"),
                    "contour_2d": analysis.get("contour_2d"),
                    "machining_features": analysis.get("machining_features", []),
                    "original_dimensions": {
                        "x": float(analysis["length"]),
                        "y": float(analysis["width"]),
                        "z": float(analysis["thickness"]),
                    },
                    "volume_mm3": analysis.get("volume_mm3", 0.0),
                    "obb_center": analysis.get("obb_center", [0.0, 0.0, 0.0]),
                    "volume_accuracy_percent": 100.0,
                    "extraction_method": f"OBB-STAT ({analysis.get('thickness_method', 'obb')})",
                    "warnings": piece_warnings,
                }
                self.parts.append(part_entry)

            if not self.pieces:
                raise ValueError("No solid bodies could be analyzed in STEP file.")

            return self._format_results()

        except Exception as e:
            logger.error(f"Error parsing STEP file: {e}", exc_info=True)
            raise

    def _format_results(self) -> Dict[str, Any]:
        """Formatte et structure les résultats attendus."""
        grouped: Dict[Tuple[float, float, float, str], Dict[str, Any]] = {}
        for p in self.parts:
            key = (p["epaisseur"], p["largeur"], p["longueur"], p["nom"])
            if key not in grouped:
                grouped[key] = p.copy()
                grouped[key]["quantite"] = 1
            else:
                grouped[key]["quantite"] += 1

        metadata = {
            "filename": self.filepath.name,
            "timestamp": datetime.now().isoformat(),
            "total_parts": len(self.parts),
            "unit": "mm",
            "parser_version": self.VERSION,
        }

        return {
            "solids_count": len(self.pieces),
            "names_source": self.names_source,
            "pieces": self.pieces,
            "global_warnings": self.global_warnings,
            # Rétrocompatibilité avec step_import.py existant
            "parts": self.parts,
            "grouped": grouped,
            "metadata": metadata,
            "warnings": self.global_warnings,
        }


class StepExtractor(StepParser):
    """Alias for backward compatibility."""
    pass
