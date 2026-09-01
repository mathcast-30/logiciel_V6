# -*- coding: utf-8 -*-
"""
piece_geometry_analyzer.py
===========================

Module d'analyse géométrique avancée pour OptiCut Pro.

Objectif : corriger 3 problèmes de détection sur les pièces issues d'import STEP
(notamment depuis Fusion 360) :

1. Dimensions (longueur/largeur) faussées si la pièce n'est pas alignée aux axes
   -> utilisation d'une Oriented Bounding Box (Bnd_OBB) au lieu d'un AABB naïf.

2. Épaisseur faussée si la mesure tombe dans une rainure/feuillure/mortaise
   -> échantillonnage statistique sur toute la face (mode statistique, pas un
   point unique) pour retrouver l'épaisseur nominale du panneau.

3. Contour de la pièce pollué par les découpes internes (perçages, mortaises,
   rainures) alors qu'on veut la forme brute pour l'optimisation de découpe
   -> convex hull + heuristique de distinction "usinage mineur" vs
   "forme structurelle réelle" (ex: pièce en L), avec extraction séparée
   des usinages (utile pour l'export CNC/DXF).

4. Simplification du contour (Ramer-Douglas-Peucker) pour éviter le bloat JSON
   et optimiser le rendu SVG côté frontend.

Dépendances : pythonocc-core (module OCC), numpy, scipy.
"""

import math
from collections import Counter
from typing import List, Tuple, Dict, Any, Optional

import numpy as np

try:
    from scipy.spatial import ConvexHull
except ImportError as e:
    raise ImportError(
        "scipy est requis pour ce module (pip install scipy)"
    ) from e

from OCC.Core.Bnd import Bnd_OBB
from OCC.Core.BRepBndLib import brepbndlib
from OCC.Core.BRepMesh import BRepMesh_IncrementalMesh
from OCC.Core.BRepAdaptor import BRepAdaptor_Surface, BRepAdaptor_Curve
from OCC.Core.BRepGProp import brepgprop
from OCC.Core.BRepTools import breptools
from OCC.Core.GProp import GProp_GProps
from OCC.Core.GeomAbs import GeomAbs_Plane, GeomAbs_Circle
from OCC.Core.TopAbs import TopAbs_FACE, TopAbs_EDGE, TopAbs_WIRE, TopAbs_SOLID
from OCC.Core.TopExp import TopExp_Explorer
from OCC.Core.TopoDS import topods
from OCC.Core.TopLoc import TopLoc_Location
from OCC.Core.BRep import BRep_Tool
from OCC.Core.GCPnts import GCPnts_UniformDeflection


# ---------------------------------------------------------------------------
# Réglages par défaut (à ajuster selon la précision de vos machines/matériaux)
# ---------------------------------------------------------------------------

DEFAULT_MESH_DEFLECTION = 0.3          # mm, finesse de triangulation
DEFAULT_THICKNESS_TOLERANCE = 0.2      # mm, regroupement des mesures d'épaisseur
DEFAULT_PARALLEL_TOLERANCE_DEG = 3.0   # degrés, tolérance pour "faces parallèles"
DEFAULT_MACHINING_RATIO_THRESHOLD = 0.15  # 15% d'aire manquante = usinage mineur
DEFAULT_CONTOUR_SIMPLIFY_TOL = 0.5     # mm, tolérance Douglas-Peucker


def ramer_douglas_peucker(points: List[Tuple[float, float]], epsilon: float = DEFAULT_CONTOUR_SIMPLIFY_TOL) -> List[Tuple[float, float]]:
    """
    Simplifie un polygone 2D via l'algorithme de Ramer-Douglas-Peucker
    pour éviter le bloat de points sans perdre les angles et formes réelles.
    """
    if len(points) <= 4:
        return points

    pts = np.array(points, dtype=float)
    
    def _rdp(pts_arr, eps):
        if len(pts_arr) < 3:
            return pts_arr
        
        start, end = pts_arr[0], pts_arr[-1]
        line_vec = end - start
        line_len = np.linalg.norm(line_vec)
        
        if line_len < 1e-6:
            distances = np.linalg.norm(pts_arr[1:-1] - start, axis=1)
        else:
            line_unit = line_vec / line_len
            vecs = pts_arr[1:-1] - start
            proj = np.dot(vecs, line_unit)
            proj_points = start + np.outer(proj, line_unit)
            distances = np.linalg.norm(pts_arr[1:-1] - proj_points, axis=1)
            
        if len(distances) == 0:
            return pts_arr

        max_idx = np.argmax(distances) + 1
        max_dist = distances[max_idx - 1]

        if max_dist > eps:
            left = _rdp(pts_arr[:max_idx + 1], eps)
            right = _rdp(pts_arr[max_idx:], eps)
            return np.vstack((left[:-1], right))
        else:
            return np.array([start, end])

    simplified = _rdp(pts, epsilon)
    return [(round(float(p[0]), 2), round(float(p[1]), 2)) for p in simplified]


class PieceGeometryAnalyzer:
    """Analyse un solide OCC (TopoDS_Solid) pour en extraire des dimensions
    et un contour fiables, robustes aux usinages internes."""

    def __init__(
        self,
        mesh_deflection: float = DEFAULT_MESH_DEFLECTION,
        thickness_tolerance: float = DEFAULT_THICKNESS_TOLERANCE,
        parallel_tolerance_deg: float = DEFAULT_PARALLEL_TOLERANCE_DEG,
        machining_ratio_threshold: float = DEFAULT_MACHINING_RATIO_THRESHOLD,
        contour_simplify_tolerance: float = DEFAULT_CONTOUR_SIMPLIFY_TOL,
    ):
        self.mesh_deflection = mesh_deflection
        self.thickness_tolerance = thickness_tolerance
        self.parallel_tolerance_deg = parallel_tolerance_deg
        self.machining_ratio_threshold = machining_ratio_threshold
        self.contour_simplify_tolerance = contour_simplify_tolerance

    # ------------------------------------------------------------------
    # Point d'entrée principal
    # ------------------------------------------------------------------

    def analyze_solid(self, solid) -> dict:
        """Analyse complète d'un solide. Retourne un dict prêt à être
        stocké / mappé sur votre modèle Part."""

        obb = self.compute_obb_dimensions(solid)

        # Calcul du volume réel pour comparaison
        props = GProp_GProps()
        brepgprop.VolumeProperties(solid, props)
        volume_mm3 = round(props.Mass(), 2)

        faces_info = self._get_planar_faces_with_area(solid)
        if len(faces_info) < 2:
            # Pas assez de faces planes pour une analyse fine (pièce très
            # organique / non-panneau). On retombe sur l'OBB seule.
            return {
                "length": obb["length"],
                "width": obb["width"],
                "thickness": obb["thickness_obb"],
                "thickness_confidence": None,
                "thickness_method": "obb_fallback",
                "contour_2d": None,
                "shape_type": "non_analyse_faces_insuffisantes",
                "machining_features": [],
                "volume_mm3": volume_mm3,
                "obb_center": obb["center"],
                "warnings": [
                    "Moins de 2 faces planes détectées : impossible de faire "
                    "l'échantillonnage statistique. Dimensions basées sur "
                    "l'OBB uniquement."
                ],
            }

        main_pair = self._find_main_face_pair(faces_info)
        warnings = []

        if main_pair is None:
            thickness_result = {"thickness": obb["thickness_obb"], "confidence": None}
            warnings.append(
                "Aucune paire de faces parallèles trouvée : épaisseur basée "
                "sur l'OBB (moins fiable que l'échantillonnage statistique)."
            )
            contour_result = self._extract_contour_and_features(faces_info[0])
        else:
            face_a, face_b = main_pair
            try:
                thickness_result = self._sample_thickness(face_a, face_b)
                if thickness_result["confidence"] is not None and thickness_result["confidence"] < 0.6:
                    warnings.append(
                        f"Confiance de mesure d'épaisseur faible "
                        f"({thickness_result['confidence']:.0%}) : la pièce a peut-être "
                        f"une géométrie inhabituelle ou beaucoup d'usinages en surface. "
                        f"Vérifiez manuellement."
                    )
            except Exception as e:
                thickness_result = {"thickness": obb["thickness_obb"], "confidence": None}
                warnings.append(f"Échantillonnage d'épaisseur échoué ({e}), repli sur OBB.")

            # on prend la plus grande des deux faces comme face de référence pour le contour
            ref_face = face_a if face_a["area"] >= face_b["area"] else face_b
            try:
                contour_result = self._extract_contour_and_features(ref_face)
            except Exception as e:
                contour_result = {
                    "shape_type": "erreur_extraction_contour",
                    "contour_2d": None,
                    "hull_area": 0.0,
                    "real_area": 0.0,
                    "missing_ratio": 0.0,
                    "machining_features": [],
                }
                warnings.append(f"Extraction du contour échouée ({e}).")

        return {
            "length": obb["length"],
            "width": obb["width"],
            "thickness": thickness_result["thickness"],
            "thickness_confidence": thickness_result.get("confidence"),
            "thickness_method": "sample_stat" if (main_pair and thickness_result.get("confidence") is not None) else "obb_fallback",
            "contour_2d": contour_result.get("contour_2d"),
            "shape_type": contour_result.get("shape_type", "panneau_rectangulaire"),
            "machining_features": contour_result.get("machining_features", []),
            "volume_mm3": volume_mm3,
            "obb_center": obb["center"],
            "warnings": warnings,
        }

    # ------------------------------------------------------------------
    # 1. Dimensions via Oriented Bounding Box
    # ------------------------------------------------------------------

    def compute_obb_dimensions(self, solid, use_triangulation: bool = True) -> dict:
        """Bounding box orientée : beaucoup plus fiable qu'un AABB pour des
        pièces qui ne sont pas alignées avec les axes globaux du fichier
        STEP (cas fréquent avec les exports Fusion 360)."""
        BRepMesh_IncrementalMesh(solid, self.mesh_deflection)
        obb = Bnd_OBB()
        brepbndlib.AddOBB(solid, obb, use_triangulation, True, False)

        dims = sorted(
            [2 * obb.XHSize(), 2 * obb.YHSize(), 2 * obb.ZHSize()], reverse=True
        )
        return {
            "length": round(dims[0], 2),
            "width": round(dims[1], 2),
            "thickness_obb": round(dims[2], 2),
            "center": (
                round(obb.Center().X(), 2),
                round(obb.Center().Y(), 2),
                round(obb.Center().Z(), 2),
            ),
        }

    # ------------------------------------------------------------------
    # 2. Épaisseur par échantillonnage statistique
    # ------------------------------------------------------------------

    def _get_planar_faces_with_area(self, solid) -> list:
        """Liste des faces planes du solide, triées par aire décroissante."""
        faces_info = []
        explorer = TopExp_Explorer(solid, TopAbs_FACE)
        while explorer.More():
            face = topods.Face(explorer.Current())
            adaptor = BRepAdaptor_Surface(face, True)
            if adaptor.GetType() == GeomAbs_Plane:
                plane = adaptor.Plane()
                props = GProp_GProps()
                brepgprop.SurfaceProperties(face, props)
                area = props.Mass()
                faces_info.append(
                    {
                        "face": face,
                        "plane": plane,
                        "normal": plane.Axis().Direction(),
                        "area": area,
                    }
                )
            explorer.Next()
        faces_info.sort(key=lambda f: f["area"], reverse=True)
        return faces_info

    def _find_main_face_pair(self, faces_info: list):
        """Trouve la paire de faces planes les plus grandes et quasi
        anti-parallèles (= dessus/dessous d'un panneau)."""
        tol_cos = math.cos(math.radians(180 - self.parallel_tolerance_deg))
        candidates = faces_info[:10]  # on limite pour ne pas comparer tout
        best_pair = None
        best_area = 0
        for i in range(len(candidates)):
            for j in range(i + 1, len(candidates)):
                n1 = candidates[i]["normal"]
                n2 = candidates[j]["normal"]
                dot = n1.X() * n2.X() + n1.Y() * n2.Y() + n1.Z() * n2.Z()
                if dot <= tol_cos:  # normales quasi opposées
                    combined_area = candidates[i]["area"] + candidates[j]["area"]
                    if combined_area > best_area:
                        best_area = combined_area
                        best_pair = (candidates[i], candidates[j])
        return best_pair

    def _sample_thickness(self, face_info_a: dict, face_info_b: dict) -> dict:
        """Maille la face A et mesure, pour chaque nœud du maillage, sa distance
        au plan de la face B. Retourne la distance la plus fréquente = épaisseur nominale."""
        face_a = face_info_a["face"]
        plane_b = face_info_b["plane"]

        BRepMesh_IncrementalMesh(face_a, self.mesh_deflection)
        location = TopLoc_Location()
        triangulation = BRep_Tool.Triangulation(face_a, location)
        if triangulation is None:
            raise ValueError("Impossible de mailler la face pour l'échantillonnage d'épaisseur.")

        transform = location.Transformation()
        distances = []
        for i in range(1, triangulation.NbNodes() + 1):
            pnt = triangulation.Node(i)
            pnt.Transform(transform)
            distances.append(plane_b.Distance(pnt))

        if not distances:
            raise ValueError("Aucun point échantillonné sur la face.")

        tol = self.thickness_tolerance
        rounded = [round(d / tol) * tol for d in distances]
        most_common, count = Counter(rounded).most_common(1)[0]
        confidence = count / len(rounded)

        return {
            "thickness": round(most_common, 2),
            "confidence": round(confidence, 3),
            "sample_count": len(rounded),
        }

    # ------------------------------------------------------------------
    # 3. Contour brut + détection des usinages
    # ------------------------------------------------------------------

    def _extract_contour_and_features(self, face_info: dict) -> dict:
        """Calcule le convex hull 2D de la face (contour brut probable) et
        le compare à l'aire réelle pour distinguer usinages mineurs et
        forme structurelle réelle. Extrait aussi les usinages séparément."""
        face = face_info["face"]
        plane = face_info["plane"]

        points_2d, origin, x_dir, y_dir = self._triangulation_points_2d(face, plane)

        hull = ConvexHull(points_2d)
        hull_points = points_2d[hull.vertices]

        real_area = face_info["area"]
        hull_area = hull.volume  # en 2D, ConvexHull.volume == aire

        ratio_missing = 1 - (real_area / hull_area) if hull_area > 0 else 0

        machining_features = self._detect_machining_features(face, plane, origin, x_dir, y_dir)

        if ratio_missing < self.machining_ratio_threshold:
            shape_type = "panneau_rectangulaire_avec_usinages_mineurs"
            raw_contour = hull_points.tolist()
        else:
            shape_type = "forme_structurelle_non_convexe"
            raw_contour = self._extract_outer_wire_2d(face, plane, origin, x_dir, y_dir)

        # Simplification Ramer-Douglas-Peucker pour éviter l'explosion de points
        simplified_contour = ramer_douglas_peucker(raw_contour, self.contour_simplify_tolerance)

        return {
            "shape_type": shape_type,
            "contour_2d": simplified_contour,
            "hull_area": round(hull_area, 2),
            "real_area": round(real_area, 2),
            "missing_ratio": round(ratio_missing, 3),
            "machining_features": machining_features,
        }

    def _triangulation_points_2d(self, face, plane):
        """Triangule la face et projette tous les nœuds dans le repère 2D
        du plan (origin, x_dir, y_dir)."""
        BRepMesh_IncrementalMesh(face, self.mesh_deflection)
        location = TopLoc_Location()
        triangulation = BRep_Tool.Triangulation(face, location)
        if triangulation is None:
            raise ValueError("Impossible de mailler la face pour l'extraction du contour.")

        transform = location.Transformation()
        origin = plane.Location()
        x_dir = plane.XAxis().Direction()
        y_dir = plane.YAxis().Direction()

        points_2d = []
        for i in range(1, triangulation.NbNodes() + 1):
            pnt = triangulation.Node(i)
            pnt.Transform(transform)
            vec = pnt.XYZ() - origin.XYZ()
            u = vec.Dot(x_dir.XYZ())
            v = vec.Dot(y_dir.XYZ())
            points_2d.append((u, v))

        return np.array(points_2d), origin, x_dir, y_dir

    def _extract_outer_wire_2d(self, face, plane, origin, x_dir, y_dir) -> list:
        """Extrait le contour extérieur réel (outer wire) projeté en 2D,
        pour les pièces à forme structurelle non convexe (ex: équerre en L)."""
        outer_wire = breptools.OuterWire(face)
        contour = []
        edge_explorer = TopExp_Explorer(outer_wire, TopAbs_EDGE)
        while edge_explorer.More():
            edge = topods.Edge(edge_explorer.Current())
            curve_adaptor = BRepAdaptor_Curve(edge)
            discretizer = GCPnts_UniformDeflection(curve_adaptor, 0.2)
            if discretizer.IsDone():
                for i in range(1, discretizer.NbPoints() + 1):
                    pnt = discretizer.Value(i)
                    vec = pnt.XYZ() - origin.XYZ()
                    contour.append(
                        (round(float(vec.Dot(x_dir.XYZ())), 2), round(float(vec.Dot(y_dir.XYZ())), 2))
                    )
            edge_explorer.Next()
        return contour

    def _detect_machining_features(self, face, plane, origin, x_dir, y_dir) -> list:
        """Détecte les contours intérieurs (inner wires) d'une face = les
        usinages (perçages, mortaises, rainures), et les classifie par forme
        géométrique."""
        outer_wire = breptools.OuterWire(face)
        features = []

        wire_explorer = TopExp_Explorer(face, TopAbs_WIRE)
        while wire_explorer.More():
            wire = topods.Wire(wire_explorer.Current())
            if not wire.IsSame(outer_wire):
                points = []
                n_edges = 0
                n_circular_edges = 0
                edge_explorer = TopExp_Explorer(wire, TopAbs_EDGE)
                while edge_explorer.More():
                    edge = topods.Edge(edge_explorer.Current())
                    curve_adaptor = BRepAdaptor_Curve(edge)
                    n_edges += 1
                    if curve_adaptor.GetType() == GeomAbs_Circle:
                        n_circular_edges += 1
                    discretizer = GCPnts_UniformDeflection(curve_adaptor, 0.2)
                    if discretizer.IsDone():
                        for i in range(1, discretizer.NbPoints() + 1):
                            pnt = discretizer.Value(i)
                            vec = pnt.XYZ() - origin.XYZ()
                            points.append((float(vec.Dot(x_dir.XYZ())), float(vec.Dot(y_dir.XYZ()))))
                    edge_explorer.Next()

                if points:
                    pts = np.array(points)
                    xmin, ymin = pts.min(axis=0)
                    xmax, ymax = pts.max(axis=0)
                    width = float(xmax - xmin)
                    height = float(ymax - ymin)
                    max_dim = max(width, height) or 1e-6

                    if n_edges <= 2 and n_circular_edges >= 1:
                        feature_type = "percage"
                    elif min(width, height) / max_dim < 0.3:
                        feature_type = "rainure"
                    else:
                        feature_type = "mortaise_ou_poche"

                    features.append(
                        {
                            "type": feature_type,
                            "bbox_width": round(width, 2),
                            "bbox_height": round(height, 2),
                            "position_center": [
                                round(float((xmin + xmax) / 2), 2),
                                round(float((ymin + ymax) / 2), 2),
                            ],
                        }
                    )
            wire_explorer.Next()

        return features


# ---------------------------------------------------------------------------
# Utilitaire : extraire tous les solides d'un shape (compound/assemblage)
# ---------------------------------------------------------------------------

def extract_all_solids(shape) -> List[Any]:
    """Explore récursivement le shape pour trouver TOUS les solides, même
    imbriqués dans des compounds/assemblages (fix du bug d'import Fusion 360)."""
    solids = []
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        solids.append(topods.Solid(explorer.Current()))
        explorer.Next()
    return solids
