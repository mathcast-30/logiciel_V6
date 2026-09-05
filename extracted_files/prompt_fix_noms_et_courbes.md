# Prompt de correction — Bugs noms Fusion 360 + pièces courbes manquantes

## Contexte

Suite à l'intégration précédente de `piece_geometry_analyzer.py` et
`step_name_extractor.py` dans OptiCut Pro V6, deux bugs ont été identifiés
en test réel :

1. **Noms de composants incorrects** : toutes les pièces d'un import
   récupèrent le nom du fichier/projet global (ex: "portilllon western
   v4_1", "portilllon western v4_2"...) au lieu de leurs vrais noms de
   corps Fusion 360, alors que `names_source` indique bien `fusion_xcaf`
   (donc pas un problème de repli générique).

2. **Pièces avec géométrie complexe/courbe disparaissent de l'import** :
   dans `step_parser.py`, si `PieceGeometryAnalyzer.analyze_solid()` lève
   une exception sur une pièce (plus fréquent sur une géométrie courbe où
   le calcul de la boîte englobante orientée peut échouer), le code fait
   `continue` et la pièce disparaît **entièrement** du résultat, au lieu de
   garder au minimum ses dimensions rectangulaires (l'encombrement).

Deux fichiers corrigés sont fournis en pièce jointe :
- `piece_geometry_analyzer.py` — le calcul de dimensions (étape 1,
  `analyze_solid()`) est maintenant protégé par un `try/except` avec repli
  sur une AABB simple (`Bnd_Box`) si le calcul OBB précis (`Bnd_OBB`)
  échoue. Ça garantit qu'une pièce ne peut plus disparaître faute de
  dimensions calculables.
- `step_name_extractor.py` — active le paramètre OCCT
  `read.stepcaf.subshapes.name` (nécessaire pour récupérer les noms
  individuels des corps quand plusieurs corps nommés vivent sous un seul
  composant Fusion 360, ce qui semble être votre cas), et ajoute une
  résolution de nom individuel par solide via `shape_tool.FindSubShape()` /
  `FindShape()` en complément.

## Étapes à suivre, DANS L'ORDRE, avec rapport après chaque étape

### Étape 0 — Sauvegarde

Copie `opticut.db` vers
`Moteur/UserData/Sauvegardes/Backups/opticut_avant_fix_noms_courbes_[date].db`
avant toute chose. Ne continue pas si la copie échoue.

### Étape 1 — Remplacer les deux fichiers, test en isolation d'abord

Remplace `Moteur/Backend/Services/IA_Engine/piece_geometry_analyzer.py` et
`step_name_extractor.py` par les versions fournies en pièce jointe.

**Ne touche à rien d'autre pour l'instant.** Teste directement en ligne de
commande, dans l'environnement conda `opticut_pro`, sur le fichier
`portilllon western v4.step` (celui qui posait problème sur les noms) et
sur un fichier contenant des pièces à géométrie courbe si tu en as un sous
la main :

```
python piece_geometry_analyzer.py chemin/vers/fichier.step
python step_name_extractor.py chemin/vers/fichier.step
```

Rapporte-moi texto la sortie de ces deux commandes : les vrais noms
récupérés pièce par pièce, et pour le fichier avec géométrie courbe, la
liste complète des pièces avec leurs `length`/`width`/`thickness` et les
éventuels warnings "Calcul OBB précis impossible" (repli AABB déclenché).

**Critère de réussite avant de passer à l'étape suivante :**
- Les noms affichés doivent être les vrais noms de corps Fusion 360 (plus
  de suffixe `_N` accolé au nom du projet).
- Le nombre de pièces retournées par `piece_geometry_analyzer.py` doit
  être égal au nombre de solides réellement présents dans le fichier
  (aucune pièce manquante), y compris les pièces courbes.

Si l'un des deux critères n'est pas rempli, arrête-toi et rapporte l'erreur
exacte plutôt que de continuer.

### Étape 2 — Vérifier que `step_parser.py` n'a pas besoin d'être modifié

Le fichier `step_parser.py` actuel utilise déjà `extract_named_solids_safe`
et `PieceGeometryAnalyzer.analyze_solid` correctement — le fix se fait
entièrement dans les deux fichiers remplacés à l'étape 1, pas ici.

Ajoute quand même cette amélioration mineure en défense supplémentaire,
dans le bloc `except Exception as exc:` qui suit l'appel à
`self._analyzer.analyze_solid(solid)` : le message de warning ajouté à
`self.global_warnings` doit explicitement mentionner que la pièce est
**absente** du résultat (pas juste "erreur"), pour que ce soit visible et
alarmant si ce chemin est emprunté à l'avenir :

```python
except Exception as exc:
    logger.warning(f"Erreur analyse géométrique sur la pièce '{name}': {exc}")
    self.global_warnings.append(
        f"Pièce '{name}' NON INCLUSE dans le résultat (erreur d'analyse : {exc}) — "
        f"à vérifier manuellement, ce cas ne devrait plus arriver après le fix du {'{date}'}."
    )
    continue
```

Ne modifie rien d'autre dans ce fichier.

### Étape 3 — Test complet du pipeline API

Relance le backend, importe via l'API (`/docs` FastAPI ou l'interface) le
fichier `portilllon western v4.step` en entier. Rapporte-moi :
- le nombre total de pièces retournées,
- les noms de chaque pièce (vérifie qu'ils sont différents et corrects, pas
  juste "v4_1", "v4_2"...),
- `names_source` global,
- la liste des `global_warnings` s'il y en a.

Compare ce nombre de pièces à ce que tu avais obtenu en isolation à
l'étape 1 — ils doivent correspondre exactement.

### Étape 4 — Test avec un fichier à géométrie courbe, si disponible

Si vous avez un fichier STEP avec des pièces courbes/organiques qui
manquaient avant ce fix, réimporte-le et confirme que **toutes** les pièces
apparaissent maintenant, y compris celles avec des courbes — même si
certaines n'ont pas de contour 2D détaillé (`contour_2d: null` est normal
et acceptable pour une pièce sans face plane), elles doivent au minimum
avoir leurs `length`/`width`/`thickness`.

### Étape 5 — Frontend (uniquement si besoin)

Aucune modification frontend n'est requise pour ces deux fixes — les
noms et dimensions remontent déjà par les mêmes champs qu'avant
(`component_name`, `width`, `height`, `thickness`). Ne touche pas à
`StepImport.tsx` ni `stepService.ts` pour cette correction.

## Contraintes générales

- **Ne recolle pas d'ancienne version** de `piece_geometry_analyzer.py` ou
  `step_name_extractor.py` par erreur — utilise bien les fichiers joints à
  ce message, pas une version antérieure de la conversation.
- **Ne réintroduis pas** `shape_type` ni la logique de classification de
  forme (déjà retirée précédemment, doit le rester).
- Si `read.stepcaf.subshapes.name` ou `FindSubShape`/`FindShape` ne
  fonctionnent pas comme attendu sur ta version d'OCCT (erreur à l'import
  ou méthode absente), rapporte l'erreur exacte plutôt que de contourner
  silencieusement — il existe une méthode de repli différente (parsing
  texte direct des `PRODUCT_DEFINITION` du fichier STEP) si celle-ci ne
  fonctionne pas, mais il faut d'abord confirmer qu'elle échoue vraiment.
- Un rapport après chaque étape, avec des chiffres et sorties réelles, pas
  une simple confirmation verbale.

## Fichiers fournis en pièce jointe à cette conversation

- `piece_geometry_analyzer.py` (fix : dimensions jamais bloquantes, repli
  AABB si OBB échoue)
- `step_name_extractor.py` (fix : noms individuels par solide via flag
  OCCT + résolution de sous-shape)

Commence par l'étape 0, puis rapporte le résultat de chaque étape avant de
passer à la suivante.
