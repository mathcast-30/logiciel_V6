# Prompt d'intégration — Analyse géométrique STEP + noms de composants Fusion 360

## Contexte

Tu travailles sur OptiCut Pro V6 (`logiciel_V6`), un logiciel de gestion et
d'optimisation pour menuiserie (Python/FastAPI/SQLAlchemy/SQLite en backend,
React/TypeScript/Vite en frontend). L'import de fichiers STEP (export Fusion
360) a plusieurs problèmes à corriger :

1. Erreur "No solid bodies found" sur certains fichiers (compounds/assemblages
   non explorés récursivement).
2. Dimensions et épaisseur des pièces parfois fausses (mesure ponctuelle qui
   tombe dans une rainure/feuillure au lieu de mesurer l'épaisseur nominale).
3. Noms des composants Fusion 360 non récupérés (pièces génériques "Piece_1"
   au lieu du vrai nom donné dans Fusion).

Deux nouveaux modules corrigent ça. Ils sont fournis en pièce jointe :
- `piece_geometry_analyzer.py` — dimensions rectangulaires fiables (OBB) +
  contour/usinages en best-effort.
- `step_name_extractor.py` — récupération des noms de composants Fusion 360
  via XCAF, avec repli automatique si ça échoue.

## Principe non négociable à respecter partout dans l'intégration

**Les dimensions rectangulaires (`length`, `width`, `thickness`) doivent
TOUJOURS être calculées via l'OBB (`Bnd_OBB`) et ne doivent JAMAIS dépendre
du succès de l'extraction de contour, des usinages, ou de la récupération
des noms.** Tout le reste (nom de composant, contour 2D, usinages détectés)
est un enrichissement optionnel, best-effort : si ça échoue, l'import doit
quand même réussir, avec juste un avertissement, jamais une exception qui
fait planter tout l'import.

C'est le principe qui a été violé dans une itération précédente et qui a
causé une régression (moins de pièces détectées, dimensions fausses,
mauvaise classification de forme) — ne le reproduis pas.

## Étapes d'intégration (à faire DANS L'ORDRE, en validant chaque étape avant de passer à la suivante)

### Étape 0 — Sauvegarde obligatoire avant toute chose

Avant de toucher à quoi que ce soit :
```
copier Moteur/UserData/BaseDeDonnees/opticut.db
vers   Moteur/UserData/Sauvegardes/Backups/opticut_avant_integration_geometrie_[date].db
```
Ne poursuis pas si cette copie n'a pas réussi.

### Étape 1 — Ajouter les deux nouveaux fichiers, isolés, sans rien connecter encore

- Copier `piece_geometry_analyzer.py` et `step_name_extractor.py` dans
  `Moteur/Backend/Services/IA_Engine/`.
- Ne modifie PAS encore `step_parser.py` à ce stade.
- Vérifie juste que les imports fonctionnent : lance dans l'environnement
  conda `opticut_pro` :
  ```
  python -c "from piece_geometry_analyzer import PieceGeometryAnalyzer; from step_name_extractor import extract_named_solids_safe; print('OK imports')"
  ```
- Si `scipy` manque : `pip install scipy --break-system-packages`.

**Ne passe à l'étape suivante que si cette commande affiche `OK imports` sans erreur.**

### Étape 2 — Tester les deux modules en isolation, sur un vrai fichier STEP

Utilise un fichier STEP réel du projet (idéalement un qui contient des
usinages — rainures, perçages — pour bien tester l'échantillonnage
d'épaisseur, ET un qui avait précédemment échoué avec "No solid bodies
found" si tu en as un sous la main).

```
python piece_geometry_analyzer.py chemin/vers/fichier.step
python step_name_extractor.py chemin/vers/fichier.step
```

Rapporte-moi les résultats bruts de ces deux commandes (nombre de solides,
dimensions, `thickness_confidence`, noms récupérés, `names_source`,
`warnings`) avant de continuer. **Ne modifie rien côté `step_parser.py`
tant que ces deux tests isolés ne sont pas concluants.**

### Étape 3 — Intégrer dans `step_parser.py`, en gardant un filet de sécurité

Remplace l'extraction actuelle par un appel à `extract_named_solids_safe()`
(qui gère déjà en interne le repli automatique si la lecture XCAF échoue —
tu n'as pas besoin de dupliquer cette logique de fallback).

Pour chaque solide obtenu, appelle `PieceGeometryAnalyzer().analyze_solid(solid)`
et utilise **exactement** les champs qu'il retourne pour `width`/`height`/
`thickness` — ne recalcule rien toi-même à partir d'une autre méthode
(bounding box manuelle, etc.), pour éviter d'introduire une divergence.

Structure de retour attendue de `parse()` (à adapter aux noms de champs déjà
utilisés ailleurs dans le code si différents, mais garde toutes ces
informations) :

```python
{
    "solids_count": int,
    "names_source": "fusion_xcaf" | "generic_fallback",
    "pieces": [
        {
            "name": str,                          # depuis extract_named_solids_safe
            "width": float,                        # depuis analyze_solid["length"]
            "height": float,                       # depuis analyze_solid["width"]
            "thickness": float,
            "thickness_confidence": float | None,
            "thickness_method": "sample_stat" | "obb",
            "contour_2d": list | None,
            "machining_features": list,
            "warnings": list[str],
        },
        ...
    ],
    "global_warnings": list[str],
}
```

Log chaque warning individuel de pièce via `logger.warning(...)`, mais ne
lève une exception (`ValueError` → 400 Bad Request côté API) que si
**aucun solide du tout** n'a été trouvé — jamais pour un problème sur une
pièce individuelle (nom manquant, contour non extrait, confiance basse).

Teste cette étape en relançant un import complet via l'API (`/docs`
FastAPI ou curl) sur les mêmes fichiers qu'à l'étape 2, et compare : le
nombre de pièces et les dimensions doivent correspondre à ce que tu avais
obtenu en isolation. Rapporte-moi le JSON de réponse complet avant de
continuer.

### Étape 4 — Base de données

Ajoute sur le modèle `Part` (`models/__init__.py`) :
```python
component_name: Mapped[Optional[str]] = mapped_column(String, nullable=True)
names_source: Mapped[Optional[str]] = mapped_column(String, nullable=True)
thickness_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
thickness_method: Mapped[Optional[str]] = mapped_column(String, nullable=True)
contour_2d_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
machining_features_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
extraction_warnings_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
```

**Ne pas ajouter de colonne `shape_type`** — cette notion a été retirée
volontairement du module géométrique (source de bugs dans une itération
précédente), ne la réintroduis pas.

Ajoute une fonction de migration idempotente (vérifie les colonnes
existantes via `PRAGMA table_info(parts)` avant d'ajouter, comme pour les
migrations précédentes de ce projet) appelée au démarrage dans `main.py`,
après `create_all()`.

Teste : relance le backend, vérifie dans les logs que la migration s'est
bien exécutée une fois, puis relance-le une seconde fois et vérifie
qu'aucune erreur "colonne existe déjà" n'apparaît (idempotence).

### Étape 5 — Schémas Pydantic et router `step_import.py`

Étends `PartBase`/`Part`/`ExtractedPartData`/`StepImportResponse` avec les
mêmes champs que la table `Part`. Calcule et expose dans la réponse
`has_low_confidence_pieces` (au moins une pièce avec `thickness_confidence
< 0.6`) et retire tout champ/logique lié à `has_non_convex_pieces` ou
`shape_type` s'il en reste d'une itération précédente.

Mets à jour la route `confirm` pour persister tous ces champs (avec
`json.dumps()` pour les champs `_json`) dans les nouvelles colonnes `Part`.

Teste via `/docs` : import complet suivi d'une confirmation, puis vérifie
directement en base (`sqlite3 opticut.db "SELECT name, component_name,
thickness_confidence FROM parts ORDER BY id DESC LIMIT 5;"`) que les
données sont bien persistées.

### Étape 6 — Frontend

Seulement une fois les étapes 1 à 5 validées. Mets à jour
`services/stepService.ts` avec les nouvelles interfaces TypeScript
(`ExtractedPart`, `MachiningFeature`, `StepImportResponse` — sans champ
`shape_type`).

Dans `StepImport.tsx`, affiche pour chaque pièce détectée :
- le nom du composant, avec une indication visuelle discrète si
  `names_source === "generic_fallback"` (ex: "nom générique, à renommer") ;
- un badge de confiance sur l'épaisseur : vert si `thickness_confidence >
  0.85`, orange entre 0.6 et 0.85, rouge en dessous ou si `null` ;
- si `machining_features` n'est pas vide, une liste dépliable résumant les
  usinages détectés (type, dimensions, position) ;
- une bannière globale en haut de l'écran de confirmation d'import si
  `has_low_confidence_pieces` est vrai ou si `names_source ===
  "generic_fallback"` au niveau global.

Après implémentation : lance `npx tsc --noEmit` et `npm run build`, corrige
toute erreur de compilation, puis fais un test manuel réel dans le
navigateur avec un vrai import STEP — pas seulement une vérification de
compilation. Décris-moi ce qui s'affiche (ou capture d'écran si possible).

## Contraintes générales à respecter pendant toute l'intégration

- **Jamais de régression silencieuse.** Si une étape échoue, arrête-toi et
  rapporte l'erreur complète plutôt que de continuer sur les étapes
  suivantes en espérant que ça passe.
- **Un rapport après chaque étape**, avec les résultats de test demandés
  (pas juste "ça a marché" — les vrais chiffres/JSON/logs).
- **Ne réintroduis pas** la logique de classification `shape_type`
  (`panneau_rectangulaire_avec_usinages_mineurs` vs
  `forme_structurelle_non_convexe`) : elle a été retirée volontairement du
  module fourni, ne la recrée pas ailleurs par erreur de copier-coller
  d'une version précédente du code.
- **N'invente pas de fallback supplémentaire** en dehors de celui déjà
  présent dans `extract_named_solids_safe()` — pas besoin d'ajouter une
  couche de retry ou de logique alternative non demandée.
- Respecte les conventions déjà en place dans le projet (absolute paths
  pour `uvicorn`/conda vu les conflits PATH connus sur cette machine,
  `127.0.0.1` plutôt que `localhost`, `create_all()` plutôt qu'Alembic pour
  la DB).

## Fichiers fournis en pièce jointe à cette conversation

- `piece_geometry_analyzer.py` (v2, dimensions OBB toujours prioritaires)
- `step_name_extractor.py` (extraction noms XCAF + repli automatique)

Commence par l'étape 0, puis rapporte-moi le résultat de chaque étape avant
de passer à la suivante.
