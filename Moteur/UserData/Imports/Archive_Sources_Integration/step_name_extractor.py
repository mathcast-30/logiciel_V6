# -*- coding: utf-8 -*-
"""
step_name_extractor.py
========================

Lit un fichier STEP via STEPCAFControl_Reader (au lieu de STEPControl_Reader)
pour récupérer, en plus de la géométrie, les NOMS de composants/corps tels que
définis dans Fusion 360 (ou tout autre CAD respectant la structure produit STEP).

STEPControl_Reader (utilisé jusqu'ici) ne lit que la géométrie brute : il ne
voit pas la couche "structure produit" du fichier (PRODUCT_DEFINITION,
NEXT_ASSEMBLY_USAGE_OCCURRENCE...) où sont stockés les noms de composants.
STEPCAFControl_Reader lit cette couche en plus, via un document XCAF (OCAF).

NOTE : non testé en exécution réelle (pas de pythonocc-core disponible dans
l'environnement de rédaction). À valider avec un vrai fichier Fusion 360 avant
intégration en production, en particulier la conversion TCollection_ExtendedString
-> str qui peut varier légèrement selon la version de pythonocc-core installée.
"""

import logging

from OCC.Core.STEPCAFControl import STEPCAFControl_Reader
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.TDF import TDF_LabelSequence, TDF_Label
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_SOLID
from OCC.Core.TopoDS import topods

logger = logging.getLogger("StepNameExtractor")


def _label_name(label: "TDF_Label") -> str:
    """Récupère le nom stocké sur un label XCAF, ou une chaîne vide si absent."""
    name_attr = TDataStd_Name()
    if label.FindAttribute(TDataStd_Name.GetID(), name_attr):
        ext_string = name_attr.Get()
        # Conversion TCollection_ExtendedString -> str Python.
        # PrintToString() est la méthode la plus portable selon les versions
        # de pythonocc-core ; à défaut, str(ext_string) fonctionne souvent aussi.
        try:
            return ext_string.PrintToString()
        except AttributeError:
            return str(ext_string)
    return ""


def _walk_components(shape_tool, label: "TDF_Label", inherited_name: str, results: list):
    """Parcourt récursivement l'arborescence XCAF (composants et
    sous-assemblages) et collecte, pour chaque forme feuille, son nom et son
    TopoDS_Shape."""
    name = _label_name(label) or inherited_name

    if shape_tool.IsAssembly(label):
        components = TDF_LabelSequence()
        shape_tool.GetComponents(label, components)
        for i in range(1, components.Length() + 1):
            comp_label = components.Value(i)
            # Un label de composant est une référence -> il faut résoudre
            # vers le label réel de la forme référencée
            ref_label = TDF_Label()
            if shape_tool.GetReferredShape(comp_label, ref_label):
                _walk_components(shape_tool, ref_label, _label_name(comp_label) or name, results)
            else:
                _walk_components(shape_tool, comp_label, name, results)
    else:
        shape = shape_tool.GetShape(label)
        if shape is not None and not shape.IsNull():
            results.append({"name": name, "shape": shape})


def extract_named_solids(filepath: str) -> list:
    """
    Lit un fichier STEP et retourne une liste de dicts :
        {"name": "NomDuComposantFusion", "solid": <TopoDS_Solid>}

    Un composant peut contenir plusieurs solides (ex: un corps avec des
    trous non fusionnés, ou un composant multi-corps) : dans ce cas les
    solides reçoivent un suffixe numérique ("Pied_1", "Pied_2"...).

    Si un composant n'a aucun nom dans le fichier STEP (Fusion 360 n'exporte
    pas toujours les noms selon les réglages d'export), le nom hérité du
    parent est utilisé, ou "Piece_sans_nom_N" en dernier recours.
    """
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

    named_components = []
    for i in range(1, free_shapes.Length() + 1):
        label = free_shapes.Value(i)
        _walk_components(shape_tool, label, "", named_components)

    # Éclatement de chaque composant nommé en solides individuels
    named_solids = []
    unnamed_counter = 1
    for component in named_components:
        base_name = component["name"].strip()
        if not base_name:
            base_name = f"Piece_sans_nom_{unnamed_counter}"
            unnamed_counter += 1

        explorer = TopExp_Explorer(component["shape"], TopAbs_SOLID)
        solids_in_component = []
        while explorer.More():
            solids_in_component.append(topods.Solid(explorer.Current()))
            explorer.Next()

        if len(solids_in_component) == 1:
            named_solids.append({"name": base_name, "solid": solids_in_component[0]})
        else:
            for idx, solid in enumerate(solids_in_component, start=1):
                named_solids.append({"name": f"{base_name}_{idx}", "solid": solid})

    return named_solids


# ---------------------------------------------------------------------------
# Filet de sécurité : lecture géométrique pure, sans noms
# ---------------------------------------------------------------------------

def _extract_all_solids_plain(shape) -> list:
    """Explore récursivement un shape pour trouver tous les TopoDS_Solid,
    même imbriqués dans des compounds/assemblages (même logique que
    extract_all_solids() dans piece_geometry_analyzer.py, dupliquée ici pour
    que ce module reste autonome et utilisable même sans l'autre fichier)."""
    solids = []
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        solids.append(topods.Solid(explorer.Current()))
        explorer.Next()
    return solids


def _extract_solids_without_names(filepath: str) -> list:
    """Voie de repli : lecture géométrique classique (STEPControl_Reader),
    sans structure produit. Utilisée quand la lecture XCAF échoue (fichier
    sans structure produit exploitable, export non-Fusion, fichier ancien...).
    Retourne le même format que extract_named_solids(), avec des noms
    génériques "Piece_1", "Piece_2"..."""
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

    Essaie d'abord la lecture avec noms (XCAF/STEPCAFControl_Reader). Si ça
    échoue pour n'importe quelle raison (fichier sans structure produit,
    erreur de lecture CAF, bug pythonocc sur un fichier particulier...),
    retombe automatiquement sur la lecture géométrique classique avec des
    noms génériques, plutôt que de faire planter tout l'import.

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
# Intégration avec piece_geometry_analyzer.py
# ---------------------------------------------------------------------------
#
#   from step_name_extractor import extract_named_solids_safe
#   from piece_geometry_analyzer import PieceGeometryAnalyzer
#
#   analyzer = PieceGeometryAnalyzer()
#   result = extract_named_solids_safe(filepath)
#
#   pieces = []
#   for item in result["solids"]:
#       analysis = analyzer.analyze_solid(item["solid"])
#       pieces.append({
#           "name": item["name"],       # <- le nom Fusion 360, ou générique en repli
#           "width": analysis["length"],
#           "height": analysis["width"],
#           "thickness": analysis["thickness"],
#           # ... reste des champs comme avant
#       })
#
#   response = {
#       "solids_count": len(result["solids"]),
#       "pieces": pieces,
#       "names_source": result["names_source"],   # à afficher côté frontend
#   }
#   if result["warning"]:
#       response["warnings"] = [result["warning"]]
#
# extract_named_solids_safe() est le SEUL point d'entrée à appeler depuis
# step_parser.py : il gère lui-même la bascule entre lecture avec noms et
# lecture de repli, vous n'avez pas besoin de gérer le try/except vous-même.


# ---------------------------------------------------------------------------
# Script de test à lancer CHEZ VOUS
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
