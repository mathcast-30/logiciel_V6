# -*- coding: utf-8 -*-
"""
step_name_extractor.py
========================

Lit un fichier STEP via STEPCAFControl_Reader (au lieu de STEPControl_Reader)
pour récupérer, en plus de la géométrie, les NOMS de composants/corps tels que
définis dans Fusion 360 (ou tout autre CAD respectant la structure produit STEP).

Active le paramètre OCCT 'read.stepcaf.subshapes.name' pour extraire les noms
individuels des corps lorsque plusieurs corps vivent sous un même composant ou à la racine,
et résout les noms via shape_tool.FindSubShape() et FindShape().
"""

import logging
import re

from OCC.Core.STEPCAFControl import STEPCAFControl_Reader, STEPCAFControl_Controller
from OCC.Core.STEPControl import STEPControl_Reader
from OCC.Core.TDocStd import TDocStd_Document
from OCC.Core.XCAFApp import XCAFApp_Application
from OCC.Core.XCAFDoc import XCAFDoc_DocumentTool
from OCC.Core.TDF import TDF_LabelSequence, TDF_Label, TDF_AttributeIterator
from OCC.Core.TDataStd import TDataStd_Name
from OCC.Core.IFSelect import IFSelect_RetDone
from OCC.Core.Interface import Interface_Static
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopAbs import TopAbs_SOLID
from OCC.Core.TopoDS import topods

logger = logging.getLogger("StepNameExtractor")


def _label_name(label: "TDF_Label") -> str:
    """Récupère le nom stocké sur un label XCAF, ou une chaîne vide si absent.
    Compatible avec toutes les versions de pythonocc-core (y compris 7.8+)."""
    if label is None:
        return ""
    try:
        if label.IsNull():
            return ""
    except Exception:
        pass

    # 1. Méthode universelle via TDF_AttributeIterator + Dump() (très fiable sur pythonocc 7.8+)
    try:
        it = TDF_AttributeIterator(label)
        while it.More():
            attr = it.Value()
            if hasattr(attr, "DynamicType") and attr.DynamicType().Name() == "TDataStd_Name":
                try:
                    name_obj = TDataStd_Name.DownCast(attr)
                    res = name_obj.Dump()
                    text = res[1] if isinstance(res, tuple) and len(res) > 1 else str(res)
                    m = re.search(r"Name=\|([^|]*)\|", text)
                    if m:
                        val = m.group(1).strip()
                        if val:
                            return val
                except Exception:
                    pass
            it.Next()
    except Exception:
        pass

    # 2. Méthode classique FindAttribute (anciennes versions de pythonocc-core)
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

    # 3. Méthode GetLabelName si disponible
    try:
        if hasattr(label, "GetLabelName"):
            name = label.GetLabelName()
            if name:
                return str(name).strip()
    except Exception:
        pass

    return ""


def _walk_components(shape_tool, label: "TDF_Label", inherited_name: str, results: list):
    """Parcourt récursivement l'arborescence XCAF (composants et
    sous-assemblages) et collecte, pour chaque forme feuille, son nom, son
    TopoDS_Shape et son label."""
    name = _label_name(label) or inherited_name

    if shape_tool.IsAssembly(label):
        components = TDF_LabelSequence()
        shape_tool.GetComponents(label, components)
        for i in range(1, components.Length() + 1):
            comp_label = components.Value(i)
            comp_name = _label_name(comp_label) or name
            ref_label = TDF_Label()
            if shape_tool.GetReferredShape(comp_label, ref_label):
                _walk_components(shape_tool, ref_label, comp_name, results)
            else:
                _walk_components(shape_tool, comp_label, comp_name, results)
    else:
        shape = shape_tool.GetShape(label)
        if shape is not None and not shape.IsNull():
            results.append({"name": name, "shape": shape, "label": label})


def _find_subshape_name(shape_tool, comp_label: "TDF_Label", solid) -> str:
    """Tente de retrouver le nom individuel d'un solide en le cherchant
    comme sous-shape dans l'arbre XCAF (utile quand plusieurs corps nommés
    Fusion 360 vivent sous un seul composant). Retourne une chaîne vide si
    aucun nom spécifique n'est trouvé (ne lève jamais d'exception : c'est un
    best-effort, le nom de repli du composant parent prend le relais)."""
    try:
        sub_label = TDF_Label()
        if comp_label is not None:
            try:
                if not comp_label.IsNull() and shape_tool.FindSubShape(comp_label, solid, sub_label):
                    name = _label_name(sub_label)
                    if name:
                        return name
            except Exception:
                pass

        if shape_tool.FindShape(solid, sub_label):
            name = _label_name(sub_label)
            if name:
                return name
    except Exception as exc:
        logger.debug(f"Résolution du nom individuel du solide échouée (best-effort) : {exc}")
    return ""


def extract_named_solids(filepath: str) -> list:
    """
    Lit un fichier STEP et retourne une liste de dicts :
        {"name": "NomDuComposantFusion", "solid": <TopoDS_Solid>}

    Un composant peut contenir plusieurs solides (ex: un corps avec des
    trous non fusionnés, ou un composant multi-corps Fusion 360 où plusieurs
    "Bodies" nommés vivent sous un seul "Component"). Dans ce cas, on tente
    de récupérer le nom individuel de CHAQUE solide via une résolution de
    sous-shape dans l'arbre XCAF (shape_tool.FindSubShape) — sans ce fix,
    OpenCASCADE ne remonte par défaut que le nom du composant parent, et
    tous les corps qu'il contient héritent du même nom avec juste un
    suffixe numérique (bug observé : "MonProjet_1", "MonProjet_2"... au
    lieu des vrais noms de corps Fusion 360).

    Si un solide n'a aucun nom individuel trouvable, le nom du composant
    parent est utilisé en repli, avec suffixe numérique si plusieurs
    solides du même composant sont dans ce cas.
    """
    app = XCAFApp_Application.GetApplication()
    doc = TDocStd_Document("XmlXCAF")
    app.NewDocument("MDTV-XCAF", doc)

    # Sans ce paramètre, OCCT ne récupère les noms qu'au niveau composant
    # (occurrence dans l'assemblage), pas au niveau solide/sous-shape.
    try:
        STEPCAFControl_Controller.Init()
    except Exception:
        pass
    Interface_Static.SetIVal("read.stepcaf.subshapes.name", 1)

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

    # Éclatement de chaque composant nommé en solides individuels, avec
    # tentative de résolution du nom individuel par solide.
    named_solids = []
    unnamed_counter = 1
    for component in named_components:
        base_name = component["name"].strip()
        comp_label = component.get("label")
        if not base_name:
            base_name = f"Piece_sans_nom_{unnamed_counter}"
            unnamed_counter += 1

        explorer = TopExp_Explorer(component["shape"], TopAbs_SOLID)
        solids_in_component = []
        while explorer.More():
            solids_in_component.append(topods.Solid(explorer.Current()))
            explorer.Next()

        if len(solids_in_component) == 1:
            individual_name = _find_subshape_name(shape_tool, comp_label, solids_in_component[0])
            final_name = individual_name or base_name
            named_solids.append({"name": final_name, "solid": solids_in_component[0]})
            continue

        # Plusieurs solides dans ce composant : on essaie de trouver le nom
        # individuel de chacun via l'arbre XCAF avant de retomber sur le
        # suffixe numérique générique.
        for idx, solid in enumerate(solids_in_component, start=1):
            individual_name = _find_subshape_name(shape_tool, comp_label, solid)
            if individual_name:
                named_solids.append({"name": individual_name, "solid": solid})
            else:
                named_solids.append({"name": f"{base_name}_{idx}", "solid": solid})

    return named_solids


# ---------------------------------------------------------------------------
# Filet de sécurité : lecture géométrique pure, sans noms
# ---------------------------------------------------------------------------

def _extract_all_solids_plain(shape) -> list:
    """Explore récursivement un shape pour trouver tous les TopoDS_Solid,
    même imbriqués dans des compounds/assemblages."""
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
        try:
            plain_solids = _extract_solids_without_names(filepath)
            return {
                "solids": plain_solids,
                "names_source": "generic_fallback",
                "warning": (
                    "Les noms de composants Fusion 360 n'ont pas pu être récupérés "
                    "pour ce fichier (structure produit absente ou illisible). "
                    "Des noms génériques ont été attribués (Piece_1, Piece_2, ...)."
                ),
            }
        except Exception as fallback_exc:
            raise ValueError(
                f"Échec complet de la lecture du fichier STEP (XCAF: {exc} | Repli: {fallback_exc})"
            ) from fallback_exc


# ---------------------------------------------------------------------------
# Test en ligne de commande autonome
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python step_name_extractor.py <fichier.step>")
        sys.exit(1)

    logging.basicConfig(level=logging.INFO)
    path = sys.argv[1]
    result = extract_named_solids_safe(path)

    print(f"Source des noms : {result['names_source']}")
    if result["warning"]:
        print(f"Avertissement : {result['warning']}")
    print(f"{len(result['solids'])} solide(s) trouvé(s) :\n")
    for item in result["solids"]:
        print(f"  - {item['name']}")
