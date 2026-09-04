# -*- coding: utf-8 -*-
"""
step_name_extractor.py
========================

Lit un fichier STEP via STEPCAFControl_Reader pour récupérer la géométrie
et les NOMS réels des composants et corps définis dans Fusion 360 (ou tout autre CAO).

Active le paramètre OCCT 'read.stepcaf.subshapes.name' pour extraire les noms
individuels des corps lorsque plusieurs corps vivent sous un même composant ou à la racine,
et résout les noms via shape_tool.FindSubShape() et FindShape().
"""

import logging

from OCC.Core.STEPCAFControl import STEPCAFControl_Reader, STEPCAFControl_Controller
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.TDF import TDF_LabelSequence, TDF_Label
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.Interface import Interface_Static
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_SOLID
from OCC.Core.TopoDS import topods

logger = logging.getLogger("StepNameExtractor")


def _init_occt_step_reader_params():
    """Active la lecture des noms de sous-formes dans OCCT."""
    try:
        STEPCAFControl_Controller.Init()
        Interface_Static.SetIVal("read.stepcaf.subshapes.name", 1)
    except Exception as e:
        logger.warning(f"Impossible de configurer read.stepcaf.subshapes.name : {e}")


def _label_name(label: "TDF_Label") -> str:
    """Récupère le nom stocké sur un label XCAF, ou une chaîne vide si absent."""
    try:
        if hasattr(label, "GetLabelName"):
            name = label.GetLabelName()
            if name:
                return str(name).strip()
    except Exception:
        pass

    try:
        name_attr = TDataStd_Name()
        if label.FindAttribute(TDataStd_Name.GetID(), name_attr):
            ext_string = name_attr.Get()
            try:
                return ext_string.PrintToString().strip()
            except AttributeError:
                return str(ext_string).strip()
    except Exception:
        pass

    return ""


def _walk_components(shape_tool, label: "TDF_Label", inherited_name: str, results: list):
    """Parcourt récursivement l'arborescence XCAF (composants et sous-assemblages)
    et extrait chaque solide avec son nom individuel le plus précis."""
    name = _label_name(label) or inherited_name

    if shape_tool.IsAssembly(label):
        components = TDF_LabelSequence()
        shape_tool.GetComponents(label, components)
        for i in range(1, components.Length() + 1):
            comp_label = components.Value(i)
            ref_label = TDF_Label()
            comp_name = _label_name(comp_label) or name
            if shape_tool.GetReferredShape(comp_label, ref_label):
                _walk_components(shape_tool, ref_label, comp_name, results)
            else:
                _walk_components(shape_tool, comp_label, comp_name, results)
    else:
        shape = shape_tool.GetShape(label)
        if shape is not None and not shape.IsNull():
            explorer = TopExp_Explorer(shape, TopAbs_SOLID)
            local_solids = []
            while explorer.More():
                solid = topods.Solid(explorer.Current())
                
                # 1. Résolution de nom individuel par sous-forme (corps Fusion 360 sous un composant)
                solid_name = ""
                sub_label = TDF_Label()
                if shape_tool.FindSubShape(label, solid, sub_label):
                    solid_name = _label_name(sub_label)
                
                # 2. Complément via FindShape si non trouvé
                if not solid_name and shape_tool.FindShape(solid, sub_label):
                    solid_name = _label_name(sub_label)
                
                local_solids.append((solid, solid_name))
                explorer.Next()

            if len(local_solids) == 1:
                solid, solid_name = local_solids[0]
                final_name = solid_name or name or "Piece"
                results.append({"name": final_name, "solid": solid})
            else:
                for idx, (solid, solid_name) in enumerate(local_solids, start=1):
                    final_name = solid_name or (f"{name}_{idx}" if name else f"Piece_{idx}")
                    results.append({"name": final_name, "solid": solid})


def extract_named_solids(filepath: str) -> list:
    """
    Lit un fichier STEP et retourne une liste de dicts :
        {"name": "NomDuComposantFusion", "solid": <TopoDS_Solid>}
    """
    _init_occt_step_reader_params()

    app = XCAFApp_Application.GetApplication()
    doc = TDocStd_Document("XmlXCAF")
    app.NewDocument("MDTV-XCAF", doc)

    reader = STEPCAFControl_Reader()
    reader.SetNameMode(True)
    reader.SetColorMode(False)
    reader.SetLayerMode(False)

    status = reader.ReadFile(filepath)
    if status != IFSelect_RetDone:
        raise ValueError("Impossible de lire le fichier STEP (échec ReadFile).")

    if not reader.Transfer(doc):
        raise ValueError("Échec du transfert des données XCAF depuis le fichier STEP.")

    shape_tool = XCAFDoc_DocumentTool.ShapeTool(doc.Main())

    free_shapes = TDF_LabelSequence()
    shape_tool.GetFreeShapes(free_shapes)

    named_solids = []
    for i in range(1, free_shapes.Length() + 1):
        label = free_shapes.Value(i)
        _walk_components(shape_tool, label, "", named_solids)

    return named_solids


# ---------------------------------------------------------------------------
# Filet de sécurité : lecture géométrique pure, sans noms
# ---------------------------------------------------------------------------

def _extract_all_solids_plain(shape) -> list:
    """Explore récursivement un shape pour trouver tous les TopoDS_Solid."""
    solids = []
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        solids.append(topods.Solid(explorer.Current()))
        explorer.Next()
    return solids


def _extract_solids_without_names(filepath: str) -> list:
    """Voie de repli : lecture géométrique classique (STEPControl_Reader),
    sans structure produit."""
    reader = STEPControl_Reader()
    status = reader.ReadFile(filepath)
    if status != IFSelect_RetDone:
        raise ValueError("Impossible de lire le fichier STEP (échec ReadFile, voie de repli).")

    reader.TransferRoots()
    all_solids = []
    for i in range(1, reader.NbShapes() + 1):
        all_solids.extend(_extract_all_solids_plain(reader.Shape(i)))

    if not all_solids:
        raise ValueError("Aucun solide trouvé dans le fichier STEP (voie de repli).")

    return [
        {"name": f"Piece_{idx}", "solid": solid}
        for idx, solid in enumerate(all_solids, start=1)
    ]


def extract_named_solids_safe(filepath: str) -> dict:
    """
    Point d'entrée recommandé pour step_parser.py.

    Retourne un dict :
        {
            "solids": [{"name": str, "solid": TopoDS_Solid}, ...],
            "names_source": "fusion_xcaf" | "generic_fallback",
            "warning": str | None,
        }
    """
    try:
        named_solids = extract_named_solids(filepath)
        if not named_solids:
            raise ValueError("Lecture XCAF réussie mais aucun solide nommé trouvé.")
        return {
            "solids": named_solids,
            "names_source": "fusion_xcaf",
            "warning": None,
        }
    except Exception as exc:
        logger.warning(
            f"Lecture XCAF (noms de composants) échouée pour '{filepath}' : {exc}. "
            f"Repli sur la lecture géométrique classique avec noms génériques."
        )
        fallback_solids = _extract_solids_without_names(filepath)
        return {
            "solids": fallback_solids,
            "names_source": "generic_fallback",
            "warning": (
                "Les noms de composants Fusion 360 n'ont pas pu être récupérés "
                "pour ce fichier (structure produit absente ou illisible). "
                "Des noms génériques ont été attribués (Piece_1, Piece_2, ...)."
            ),
        }


# ---------------------------------------------------------------------------
# Script de test à lancer
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage : python step_name_extractor.py chemin_vers_fichier.step")
        sys.exit(1)

    logging.basicConfig(level=logging.INFO)

    result = extract_named_solids_safe(sys.argv[1])
    print(f"Source des noms : {result['names_source']}")
    if result["warning"]:
        print(f"Avertissement : {result['warning']}")
    print(f"{len(result['solids'])} solide(s) trouvé(s) :\n")
    for r in result["solids"]:
        print(f"  - {r['name']}")
