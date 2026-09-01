"""
STEP File Parser with XDE (Extended Data Exchange)
Extracts geometry AND metadata (Names, Colors) from STEP files.
Optimized for Fusion 360 assemblies with naming inheritance and OBB calculation.
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
    from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
    from OCC.Core.IFSelect import IFSelect_RetDone
    from OCC.Core.TDocStd import TDocStd_Document
    from OCC.Core.XCAFApp import XCAFApp_Application
    from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
    from OCC.Core.TDF import TDF_LabelSequence, TDF_Label, TDF_AttributeIterator
    from OCC.Core.TDataStd import TDataStd_Name
    from OCC.Core.TopAbs import TopAbs_SOLID, TopAbs_FACE, TopAbs_SHELL
    from OCC.Core.TopoDS import topods
    from OCC.Core.Bnd import Bnd_OBB
    from OCC.Core.GProp import GProp_GProps
    from OCC.Core.TopExp import TopExp_Explorer
    from OCC.Core.BRepGProp import brepgprop
    from OCC.Core.BRepBndLib import brepbndlib

    # Get version if possible
    try:
        import OCC
        OCC_VERSION = getattr(OCC, "__version__", "installed")
    except:
        pass

    OCC_AVAILABLE = True
except ImportError as e:
    OCC_AVAILABLE = False
    OCC_IMPORT_ERROR = str(e)
    logger.warning(f"pythonOCC NOT found: {e}")

class StepParser:
    """
    Advanced STEP Parser for woodworking applications.
    Handles Fusion 360 assembly structures, extracts OBB dimensions,
    and implements naming inheritance logic.
    """

    VERSION = "4.1.0-OBB"
    GENERIC_NAMES = {"Body", "Solid", "Component", "Part", "Part_", "Body_", "Solid_"}

    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"STEP file not found: {filepath}")
        
        self.parts: List[Dict[str, Any]] = []
        self.warnings: List[str] = []
        self._doc: Optional[TDocStd_Document] = None
        self._shape_tool: Optional[XCAFDoc_DocumentTool] = None

    def parse(self) -> Dict[str, Any]:
        """Entry point for parsing the STEP file."""
        if not OCC_AVAILABLE:
            raise RuntimeError("pythonOCC is not available. STEP import disabled.")

        try:
            self._load_document()
            if self._shape_tool is None:
                raise RuntimeError("Shape tool not initialized")

            root_labels = TDF_LabelSequence()
            self._shape_tool.GetFreeShapes(root_labels)

            for i in range(root_labels.Length()):
                self._traverse_label(root_labels.Value(i+1), parent_name=None)

            if not self.parts:
                raise ValueError("No solid bodies found in STEP file.")

            return self._format_results()

        except Exception as e:
            logger.error(f"Error parsing STEP file: {e}", exc_info=True)
            raise

    def _load_document(self):
        """Initialize XDE document and load STEP file."""
        app = XCAFApp_Application.GetApplication()
        self._doc = TDocStd_Document("MDTV-XCAF")
        app.NewDocument("MDTV-XCAF", self._doc)

        reader = STEPCAFControl_Reader()
        reader.SetColorMode(True)
        reader.SetNameMode(True)
        
        status = reader.ReadFile(str(self.filepath))
        if status != IFSelect_RetDone:
            raise ValueError(f"Failed to read STEP file. Status: {status}")

        if not reader.Transfer(self._doc):
            raise ValueError("Failed to transfer STEP data to document")

        self._shape_tool = XCAFDoc_DocumentTool.ShapeTool(self._doc.Main())

    def _traverse_label(self, label: Any, parent_name: Optional[str] = None):
        """Recursively traverse the assembly hierarchy."""
        if self._shape_tool is None:
            return

        current_label_name = self._get_label_name(label)
        
        # Naming Inheritance Logic
        # If current label is generic or unnamed, we might need parent name
        # Target format: {Parent}_{Body} if body is generic
        is_generic = not current_label_name or self._is_generic_name(current_label_name)
        
        if is_generic and parent_name:
            if current_label_name and not self._is_super_generic(current_label_name):
                effective_name = f"{parent_name}_{current_label_name}"
            else:
                effective_name = parent_name
        else:
            effective_name = current_label_name or "Unnamed Part"

        # Handle Assembly
        if self._shape_tool.IsAssembly(label):
            components = TDF_LabelSequence()
            self._shape_tool.GetComponents(label, components)
            for i in range(components.Length()):
                self._traverse_label(components.Value(i+1), parent_name=effective_name)
            return

        # Handle Reference
        if self._shape_tool.IsReference(label):
            referred_label = TDF_Label()
            if self._shape_tool.GetReferredShape(label, referred_label):
                self._traverse_label(referred_label, parent_name=effective_name)
                return

        # Handle Geometry Shape (Compounds, CompSolids, Solids, Shells)
        shape = self._shape_tool.GetShape(label)
        if not shape.IsNull():
            solids = self._extract_solids(shape)
            if solids:
                for solid in solids:
                    try:
                        part_data = self._analyze_geometry(solid, effective_name)
                        self.parts.append(part_data)
                    except Exception as e:
                        msg = f"Geometry error for '{effective_name}': {e}"
                        logger.warning(msg)
                        self.warnings.append(msg)
            else:
                # Check for open shells (surfaces)
                shell_exp = TopExp_Explorer(shape, TopAbs_SHELL)
                if shell_exp.More():
                    self.warnings.append(
                        f"Entité '{effective_name}' contient des surfaces ouvertes (pas de corps solide fermé). "
                        "Vérifiez dans votre logiciel CAD que vos corps sont bien de type 'Solid' et fermés."
                    )
                else:
                    self.warnings.append(f"Ignored non-solid entity '{effective_name}' (Type: {shape.ShapeType()})")

    def _extract_solids(self, shape) -> List[Any]:
        """Explore récursivement le shape pour trouver TOUS les solides,
        même imbriqués dans des compounds/assemblages."""
        solids = []
        explorer = TopExp_Explorer(shape, TopAbs_SOLID)
        while explorer.More():
            solids.append(topods.Solid(explorer.Current()))
            explorer.Next()
        return solids

    def _get_label_name(self, label: Any) -> Optional[str]:
        """Extract Name attribute from label."""
        try:
            it = TDF_AttributeIterator(label)
            while it.More():
                attr = it.Value()
                if attr.ID() == TDataStd_Name.GetID():
                    name_attr = TDataStd_Name.DownCast(attr)
                    tstr = name_attr.Get()
                    if hasattr(tstr, 'ToExtString'):
                        return str(tstr.ToExtString())
                    return str(tstr)
                it.Next()
        except:
            pass
        return None

    def _is_generic_name(self, name: str) -> bool:
        """Check if a name is likely a default generator name."""
        name_clean = name.split(':')[0].strip()
        for gen in self.GENERIC_NAMES:
            if name_clean.startswith(gen) and (len(name_clean) == len(gen) or name_clean[len(gen):].isdigit()):
                return True
        return False

    def _is_super_generic(self, name: str) -> bool:
        """Check if name is extremely generic like 'Solid' or 'Body' without numbers."""
        return name.lower() in {"solid", "body", "part", "component"}

    def _analyze_geometry(self, shape, name: str) -> Dict[str, Any]:
        """Extract bounding box dimensions using OBB and Volume."""
        obb = Bnd_OBB()
        brepbndlib.AddOBB(shape, obb, True, True, True)

        if obb.IsVoid():
            raise ValueError("Calculated OBB is void")

        # Dimensions from OBB
        half_x, half_y, half_z = obb.XHSize(), obb.YHSize(), obb.ZHSize()
        raw_dims = [round(2 * half_x, 2), round(2 * half_y, 2), round(2 * half_z, 2)]
        
        # Intelligent Sorting Logic:
        # thickness = min, length = max, width = intermediate
        sorted_dims = sorted(raw_dims)
        thickness, width, length = sorted_dims

        # Volumetric check
        props = GProp_GProps()
        brepgprop.VolumeProperties(shape, props)
        volume = props.Mass()

        return {
            "nom": name,
            "longueur": length,
            "largeur": width,
            "epaisseur": thickness,
            "original_dimensions": {
                "x": raw_dims[0],
                "y": raw_dims[1],
                "z": raw_dims[2]
            },
            "volume_mm3": round(volume, 2),
            "obb_center": [obb.Center().X(), obb.Center().Y(), obb.Center().Z()],
            "volume_accuracy_percent": 100.0, # Placeholder
            "extraction_method": "OBB-XDE"
        }

    def _format_results(self) -> Dict[str, Any]:
        """Group parts and add metadata for API compatibility."""
        grouped: Dict[Tuple[float, float, float, str], Dict[str, Any]] = {}
        for p in self.parts:
            key = (p["epaisseur"], p["largeur"], p["longueur"], p["nom"])
            if key not in grouped:
                grouped[key] = p.copy()
                grouped[key]["quantite"] = 1
            else:
                grouped[key]["quantite"] += 1

        parts_list = list(grouped.values())

        # Metadata expected by step_import.py
        metadata = {
            "filename": self.filepath.name,
            "timestamp": datetime.now().isoformat(),
            "total_parts": len(self.parts),
            "unit": "mm",
            "parser_version": self.VERSION
        }

        # Structure expected by step_import.py
        return {
            "parts": self.parts,     # Raw parts for step_import.py loop
            "grouped": grouped,      # Compatibility with existing logic if needed
            "metadata": metadata,
            "warnings": self.warnings
        }

class StepExtractor(StepParser):
    """Alias for backward compatibility."""
    pass
