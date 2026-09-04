# -*- coding: utf-8 -*-
"""
piece_geometry_analyzer.py (v2 — simplifié)
=============================================

Module d'analyse géométrique pour OptiCut Pro.

CHANGEMENT DE PHILOSOPHIE PAR RAPPORT À LA V1 :
Pour l'optimisation de découpe bois/panneaux, la pièce est TOUJOURS réservée
comme un rectangle sur le panneau/la planche — c'est la nature même de la
découpe guillotine/rectangulaire. Le contour réel (avec ses éventuelles
découpes non convexes) n'a d'intérêt que pour l'export CNC, jamais pour les
dimensions d'optimisation.

En v1, la classification "forme_structurelle_non_convexe" pouvait influencer
le contour retourné, et toute erreur dans cette logique annexe (convex hull,
extraction d'usinages) pouvait dégrader silencieusement le résultat. En v2 :

  - `length`, `width`, `thickness` viennent TOUJOURS de l'OBB (+ affinage
    statistique de l'épaisseur si possible), point final. Rien d'autre ne
    peut les modifier.
  - Le contour 2D et les usinages détectés sont calculés en best-effort,
    dans un bloc qui ne peut JAMAIS faire échouer `analyze_solid()` ni
    changer les dimensions retournées. En cas d'échec, ils sont simplement
    absents (None / liste vide), avec un warning informatif.
  - Le contour est systématiquement simplifié (Ramer-Douglas-Peucker) pour
    éviter le bloat de points en DB/frontend.

Dépendances : pythonocc-core (module OCC), numpy, scipy.

NOTE : non exécuté/testé dans l'environnement de rédaction (pas d'accès
réseau pour installer pythonocc-core, pas de fichier STEP réel disponible).
À valider sur votre machine avec un vrai fichier avant intégration.
"""

import math
from collections import Counter

import numpy as np

try:
    from scipy.spatial import ConvexHull
except ImportError as e:
    raise ImportError(
        "scipy est requis pour ce module (pip install scipy --break-system-packages)"
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
# Réglages par défaut
# ---------------------------------------------------------------------------

DEFAULT_MESH_DEFLECTION = 0.3          # mm, finesse de triangulation
DEFAULT_THICKNESS_TOLERANCE = 0.2      # mm, regroupement des mesures d'épaisseur
DEFAULT_PARALLEL_TOLERANCE_DEG = 3.0   # degrés, tolérance pour "faces parallèles"
DEFAULT_CONTOUR_SIMPLIFY_TOLERANCE = 0.5  # mm, tolérance Douglas-Peucker


class PieceGeometryAnalyzer:
    """Analyse un solide OCC (TopoDS_Solid). Les dimensions rectangulaires
    (OBB) sont toujours calculées et fiables ; le contour/usinages sont
    des métadonnées annexes best-effort, jamais bloquantes."""

    def __init__(
        self,
        mesh_deflection: float = DEFAULT_MESH_DEFLECTION,
        thickness_tolerance: float = DEFAULT_THICKNESS_TOLERANCE,
        parallel_tolerance_deg: float = DEFAULT_PARALLEL_TOLERANCE_DEG,
        contour_simplify_tolerance: float = DEFAULT_CONTOUR_SIMPLIFY_TOLERANCE,
    ):
        self.mesh_deflection = mesh_deflection
        self.thickness_tolerance = thickness_tolerance
        self.parallel_tolerance_deg = parallel_tolerance_deg
        self.contour_simplify_tolerance = contour_simplify_tolerance

    # ------------------------------------------------------------------
    # Point d'entrée principal
    # ------------------------------------------------------------------

    def analyze_solid(self, solid) -> dict:
        """Analyse un solide. GARANTIE : length/width/thickness sont
        toujours renseignés et jamais affectés par un échec de l'extraction
        de contour/usinages (best-effort, isolée dans son propre bloc)."""

        warnings = []

        # --- 1. Dimensions rectangulaires : TOUJOURS via OBB -----------
        # C'est la seule source de vérité pour length/width. Aucune autre
        # logique dans ce fichier ne doit pouvoir les modifier.
        obb = self.compute_obb_dimensions(solid)
        length = obb["length"]
        width = obb["width"]
        thickness = obb["thickness_obb"]
        thickness_confidence = None
        thickness_method = "obb"

        # --- 2. Affinage optionnel de l'épaisseur par échantillonnage --
        # Best-effort : si ça échoue, on garde l'épaisseur OBB (déjà fixée
        # ci-dessus) sans jamais lever d'exception vers l'appelant.
        faces_info = []
        try:
            faces_info = self._get_planar_faces_with_area(solid)
            main_pair = self._find_main_face_pair(faces_info) if len(faces_info) >= 2 else None

            if main_pair is not None:
                thickness_result = self._sample_thickness(*main_pair)
                thickness = thickness_result["thickness"]
                thickness_confidence = thickness_result["confidence"]
                thickness_method = "sample_stat"
                if thickness_confidence < 0.6:
                    warnings.append(
                        f"Confiance de mesure d'épaisseur faible "
                        f"({thickness_confidence:.0%}) : épaisseur OBB conservée "
                        f"en référence, vérifiez manuellement si besoin."
                    )
        except Exception as exc:
            warnings.append(
                f"Affinage statistique de l'épaisseur impossible ({exc}) : "
                f"épaisseur OBB utilisée telle quelle."
            )

        # --- 3. Contour + usinages : best-effort, JAMAIS bloquant -------
        # Encapsulé dans un try/except large exprès : quoi qu'il arrive ici,
        # length/width/thickness ci-dessus restent valides et inchangés.
        contour_2d = None
        machining_features = []
        try:
            if not faces_info:
                faces_info = self._get_planar_faces_with_area(solid)
            if faces_info:
                ref_face = max(faces_info, key=lambda f: f["area"])
                contour_result = self._extract_contour_and_features(ref_face)
                contour_2d = contour_result["contour_2d"]
                machining_features = contour_result["machining_features"]
        except Exception as exc:
            warnings.append(
                f"Extraction du contour/usinages échouée ({exc}) — sans impact "
                f"sur les dimensions de la pièce, utilisables normalement."
            )

        return {
            "length": length,
            "width": width,
            "thickness": thickness,
            "thickness_confidence": thickness_confidence,
            "thickness_method": thickness_method,
            "contour_2d": contour_2d,
            "machining_features": machining_features,
            "obb_center": obb["center"],
            "warnings": warnings,
        }

    # ------------------------------------------------------------------
    # 1. Dimensions via Oriented Bounding Box (seule source de vérité)
    # ------------------------------------------------------------------

    def compute_obb_dimensions(self, solid, use_triangulation: bool = True) -> dict:
        """Bounding box orientée : fiable quelle que soit l'orientation de
        la pièce dans le fichier STEP, et insensible aux rainures/perçages
        qui ne débordent pas de l'enveloppe extérieure (cas normal)."""
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
    # 2. Épaisseur par échantillonnage statistique (affinage optionnel)
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
        candidates = faces_info[:10]
        best_pair = None
        best_area = 0
        for i in range(len(candidates)):
            for j in range(i + 1, len(candidates)):
                n1 = candidates[i]["normal"]
                n2 = candidates[j]["normal"]
                dot = n1.X() * n2.X() + n1.Y() * n2.Y() + n1.Z() * n2.Z()
                if dot <= tol_cos:
                    combined_area = candidates[i]["area"] + candidates[j]["area"]
                    if combined_area > best_area:
                        best_area = combined_area
                        best_pair = (candidates[i], candidates[j])
        return best_pair

    def _sample_thickness(self, face_info_a: dict, face_info_b: dict) -> dict:
        """Échantillonne la distance entre les nœuds du maillage de la face A
        et le plan de la face B ; retourne la distance la plus fréquente."""
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
    # 3. Contour (best-effort) + détection des usinages (best-effort)
    # ------------------------------------------------------------------
    # Rien ici n'influence length/width/thickness. Le contour retourné
    # est TOUJOURS le convex hull simplifié (Douglas-Peucker) — c'est
    # suffisant et le plus robuste pour un usage CNC/DXF indicatif ; pour
    # une pièce en L ou une forme structurelle réellement non convexe,
    # affinez manuellement au besoin, ce module ne tente plus de deviner
    # automatiquement "usinage mineur" vs "forme voulue" (source de bugs
    # en v1, retiré volontairement).

    def _extract_contour_and_features(self, face_info: dict) -> dict:
        face = face_info["face"]
        plane = face_info["plane"]

        points_2d, origin, x_dir, y_dir = self._triangulation_points_2d(face, plane)

        hull = ConvexHull(points_2d)
        hull_points = points_2d[hull.vertices]
        simplified = self._simplify_polygon(
            hull_points.tolist(), self.contour_simplify_tolerance
        )

        machining_features = self._detect_machining_features(face, plane, origin, x_dir, y_dir)

        return {
            "contour_2d": simplified,
            "machining_features": machining_features,
        }

    def _triangulation_points_2d(self, face, plane):
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

    @staticmethod
    def _simplify_polygon(points: list, tolerance: float) -> list:
        """Simplification Ramer-Douglas-Peucker d'un polygone fermé, pour
        éviter le bloat de points stockés en DB / envoyés au frontend.
        Implémentation autonome (pas de dépendance à shapely)."""

        def perpendicular_distance(pt, line_start, line_end):
            x, y = pt
            x1, y1 = line_start
            x2, y2 = line_end
            dx, dy = x2 - x1, y2 - y1
            if dx == 0 and dy == 0:
                return math.hypot(x - x1, y - y1)
            t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
            proj_x, proj_y = x1 + t * dx, y1 + t * dy
            return math.hypot(x - proj_x, y - proj_y)

        def rdp(pts, eps):
            if len(pts) < 3:
                return pts
            start, end = pts[0], pts[-1]
            max_dist = 0.0
            index = 0
            for i in range(1, len(pts) - 1):
                dist = perpendicular_distance(pts[i], start, end)
                if dist > max_dist:
                    max_dist = dist
                    index = i
            if max_dist > eps:
                left = rdp(pts[: index + 1], eps)
                right = rdp(pts[index:], eps)
                return left[:-1] + right
            return [start, end]

        if len(points) < 4:
            return points
        simplified = rdp(points, tolerance)
        # on s'assure que le polygone reste fermé
        if simplified[0] != simplified[-1]:
            simplified.append(simplified[0])
        return [[round(p[0], 2), round(p[1], 2)] for p in simplified]

    def _detect_machining_features(self, face, plane, origin, x_dir, y_dir) -> list:
        """Détecte les contours intérieurs (inner wires) = usinages
        (perçages, mortaises, rainures), classifiés par forme géométrique.
        Best-effort : appelé depuis un bloc déjà protégé par try/except."""
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
                            points.append((vec.Dot(x_dir.XYZ()), vec.Dot(y_dir.XYZ())))
                    edge_explorer.Next()

                if points:
                    pts = np.array(points)
                    xmin, ymin = pts.min(axis=0)
                    xmax, ymax = pts.max(axis=0)
                    width = xmax - xmin
                    height = ymax - ymin
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
                            "position_center": (
                                round((xmin + xmax) / 2, 2),
                                round((ymin + ymax) / 2, 2),
                            ),
                        }
                    )
            wire_explorer.Next()

        return features


# ---------------------------------------------------------------------------
# Utilitaire : extraire tous les solides d'un shape (compound/assemblage)
# ---------------------------------------------------------------------------

def extract_all_solids(shape):
    """Explore récursivement le shape pour trouver TOUS les solides, même
    imbriqués dans des compounds/assemblages."""
    solids = []
    explorer = TopExp_Explorer(shape, TopAbs_SOLID)
    while explorer.More():
        solids.append(topods.Solid(explorer.Current()))
        explorer.Next()
    return solids


# ---------------------------------------------------------------------------
# Script de test à lancer CHEZ VOUS (environnement avec pythonocc-core)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage : python piece_geometry_analyzer.py chemin_vers_fichier.step")
        sys.exit(1)

    from OCC.Core.STEPControl import STEPControl_Reader
    from OCC.Core.IFSelect import IFSelect_RetDone

    filepath = sys.argv[1]
    reader = STEPControl_Reader()
    status = reader.ReadFile(filepath)
    if status != IFSelect_RetDone:
        print("Erreur de lecture du fichier STEP.")
        sys.exit(1)

    reader.TransferRoots()
    all_solids = []
    for i in range(1, reader.NbShapes() + 1):
        all_solids.extend(extract_all_solids(reader.Shape(i)))

    print(f"Solides trouvés : {len(all_solids)}")

    analyzer = PieceGeometryAnalyzer()
    for idx, solid in enumerate(all_solids, start=1):
        print(f"\n--- Pièce {idx} ---")
        result = analyzer.analyze_solid(solid)
        for key, value in result.items():
            if key == "contour_2d" and value and len(value) > 6:
                print(f"  {key}: [{len(value)} points]")
            else:
                print(f"  {key}: {value}")
