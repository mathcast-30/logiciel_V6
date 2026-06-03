# 🏗️ MANUEL D'INGÉNIERIE SYSTÈME : OptiCut Pro V4

**Version :** 4.1.0-STABLE  
**Classification :** Documentation Technique de Référence (Architecture & Algorithmes)  
**Date :** 21 Février 2026

---

## 💎 1. PHILOSOPHIE DU SYSTÈME

OptiCut Pro V4 n'est pas un simple logiciel de calepinage, mais un **moteur de recherche opérationnelle hybride** conçu pour résoudre le problème du *2D Bin Packing* sous contraintes physiques (sens du fil, trait de scie) et géométriques (bois massif). Le système privilégie la **déterminisme** et la **performance temps-réel**.

---

## 🏰 2. ARCHITECTURE LOGICIELLE (Niveau Système)

Le logiciel est structuré selon un modèle **SaaS Local** découplé :

- **Client (Frontend)** : Interface React 18 utilisant TypeScript pour la sécurité de type, gérant les calculs géométriques côté client pour la prévisualisation rapide.
- **Serveur (Backend)** : Micro-service FastAPI (Asynchrone) pilotant les moteurs de calcul C++ et Python.
- **Sidecar (Monitoring)** : Un processus de monitoring TCP indépendant assurant l'audit-log permanent.

### 2.1 Hiérarchie des Dépendances

```text
[Interface Utilisateur] <---> [FastAPI REST Gateway] <---> [Service Orchestrator]
                                      |                         |
                                      |                 [Strategy Manager]
                                      |                 /       |       \
                                      |      [Heuristics]   [CP-SAT]   [Nesting]
                                      |           |             |          |
                                      |      (Rectpack)    (OR-Tools)  (Shapely)
                                      |                                    |
                                      |                          [libnfporb C++]
```

---

## 🧠 3. MOTEUR D'OPTIMISATION : ANALYSE ALGORITHMIQUE

Le fichier `advanced_optimizer.py` implémente un "Pattern Strategy" qui choisit entre plusieurs approches selon la complexité du problème.

### 3.1 Algorithmes Panneaux (Orthogonaux)

1. **Guillotine (Split Strategy ADAPTIVE)** :
    - **Logic :** Divise le panneau en rectangles. À chaque placement, il génère deux nouveaux rectangles vides.
    - **SAS (Shorter Axis Split) :** Minimise la fragmentation à long terme.
    - **LAS (Longer Axis Split) :** Favorise le placement de pièces larges ultérieures.
2. **Skyline++ (Waste Map)** :
    - **Logic :** Maintient une silhouette de l'occupation actuelle (une enveloppe supérieure).
    - **Optimisation :** Réduit la complexité temporelle par rapport au MaxRects pour les listes de pièces standard.
3. **CP-SAT (Constraint Programming)** :
    - **Framework :** Google OR-Tools.
    - **Technique :** Modélisation sous forme de contraintes SAT. Pour chaque pièce $i$, on définit des variables $(x_i, y_i, w_i, h_i)$ et on impose $\forall i, j : i \text{ non-chevauchement } j$.
    - **Usage :** Activé uniquement pour les "Critical Subsets" car la complexité est NP-Hard.

### 3.2 Nesting Bois Brut (Géométrique)

Situé dans `raw_wood_optimizer/`, ce module s'éloigne des rectangles pour utiliser la **Géométrie Euclidienne Polygonale**.

- **NFP (No-Fit Polygon)** : Algorithme complexe qui calcule l'espace où une forme peut "glisser" autour d'une autre sans collision.
- **Orientation Vectorielle** : Contrairement au mode panneau, ici le système gère des angles de rotation libres (par pas de 1° ou 5°) tout en respectant le vecteur de fibre de bois déclaré.

---

## 🛠️ 4. EXTRACTION 3D : LE MOTEUR `STEP_PARSER`

Le système utilise la bibliothèque industrielle `XDE (eXtended Data Exchange)` via OpenCASCADE.

- **Analyse Topologique** : Le parser identifie les entités `TopoDS_Solid`.
- **OBB (Oriented Bounding Box)** : Calcule l'inertie de la forme pour trouver son orientation naturelle.
  - Calcul du centre de masse $G$.
  - Calcul de la matrice de covariance des points de surface.
  - Eigendecomposition pour trouver les axes principaux.
- **Extraction sémantique** : Récupère les métadonnées injectées dans le STEP par le logiciel CAO (noms de couches, matériaux).

---

## 🛰️ 5. TÉLÉMÉTRIE ET RÉSILIENCE

Le `monitoring_client.py` implémente un client TCP robuste :

- **File d'attente asynchrone** : Les logs ne ralentissent jamais le calcul métier.
- **Buffer circulaire** : En cas de perte de connexion avec le serveur de log, les données sont stockées temporairement en RAM.
- **Health Check** : Le port 9999 fournit un battement de cœur thermique et de charge CPU.

---

## 📊 6. SPÉCIFICATIONS DES DONNÉES (SCHEMA SQL)

### Table `Optimization_Results`

| Colonne | Type | Description |
| :--- | :--- | :--- |
| `id` | PK | Identifiant unique du calcul |
| `k_metric` | FLOAT | Indice de performance (0.0 à 1.0) |
| `result_json` | BLOB | Stockage de la géométrie complète des placements |
| `kerf` | FLOAT | Épaisseur du trait de scie utilisé |

---

## 🔍 7. GUIDE DE DIAGNOSTIC DYNAMIQUE

### Si le rendement est faible (< 85%)

1. Vérifier `kerf` (épaisseur lame) dans `advanced_optimizer.py`.
2. Vérifier `grain_strict` : si activé, le logiciel ne peut pas tourner les pièces de 90°, ce qui augmente la perte.
3. Tester la stratégie `Hybrid-Parallel` pour forcer le passage de tous les algorithmes.

### Si le temps de calcul explose

1. Le module `CP-SAT` est peut-être activé sur trop de pièces (> 50).
2. Vérifier `time_limit_seconds` dans la config de l'optimiseur.

---

## 🚩 8. NOTES POUR LES ÉVOLUTIONS FUTURES (PHASE 6)

- **Intégration ML** : Utiliser un réseau de neurones pour prédire quel algorithme (Guillotine vs Skyline) sera le plus performant dès la lecture de la liste de pièces.
- **Vision par Ordinateur** : Possibilité d'utiliser une caméra pour photographier les planches de bois brut et détourer les nœuds automatiquement.

---
**FIN DU DOCUMENT - PROPRIÉTÉ DE OPTICUT PRO**
*(Ce document doit être considéré comme la source de vérité absolue pour toute intervention technique).*
