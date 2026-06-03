# 🛠️ RÉFÉRENCE TECHNIQUE - OptiCut Pro V4

**Usage :** Documentation destinée à l'IA pour la compréhension, le débogage et l'évolution du logiciel.

---

## 🌍 1. Vision d'Ensemble

**OptiCut Pro V4** est un système expert de menuiserie conçu pour optimiser la découpe de panneaux et de bois brut (massif).  

- **Stack :** React (TS) + FastAPI (Python) + SQLite.
- **Moteurs :** Hybride (Algorithmique + Recherche Opérationnelle + Géométrie Polygonale).

---

## 📂 2. Arborescence Critique

```text
logiciel_V4/
├── Documentation/              # Docs et schémas
├── Moteur/
│   ├── Backend/                # --- LOGIQUE SERVEUR ---
│   │   ├── Services/
│   │   │   └── IA_Engine/      # LE CERVEAU (Moteurs d'optimisation)
│   │   │       ├── advanced_optimizer.py  # Orchestrateur (Guillotine, Skyline)
│   │   │       ├── cpsat_optimizer.py     # Solveur Exact (OR-Tools)
│   │   │       ├── step_parser.py         # Analyseur 3D STEP (pythonOCC)
│   │   │       └── raw_wood_optimizer/    # Nesting Bois Brut (NFP/Shapely)
│   │   └── System/
│   │       ├── Bin/app/        # API (Routers, Models, Monitoring)
│   │       └── Runtime/        # Python VENV isolé
│   ├── Frontend/               # --- INTERFACE ---
│   │   ├── src/pages/          # Vues (Optimisation, Stock, Projets)
│   │   └── src/services/       # Communication API
│   └── UserData/               # --- DONNÉES ---
│       ├── Database/           # opticut.db (SQLite)
│       └── StepFiles/          # Copies des fichiers .stp importés
└── Data/                       # --- RÉSULTATS ---
    ├── Exports/                # Plans de coupe (PNG/PDF)
    └── Storage/                # Backups automatiques
```

---

## 🚀 3. Les Piliers Technologiques (Fonctions Spéciales)

### A. Moteur Hybride (`IA_Engine`)

Combine plusieurs stratégies pour minimiser la chute :

- **Guillotine & Skyline++ :** Algorithmes rapides pour panneaux rectangulaires.
- **CP-SAT (Exact) :** Utilise `Google OR-Tools` pour trouver la solution mathématiquement parfaite sur des petits groupes de pièces.
- **K-Metric :** Calcule l'indice de Kenyon pour évaluer la qualité du résultat par rapport au maximum théorique.

### B. Nesting Bois Brut (`raw_wood_optimizer`)

Gère les planches irrégulières et le bois massif :

- **NFP (No-Fit Polygon) :** Algorithme géométrique pour emboîter des formes complexes (via `libnfporb` ou fallback Bounding Box).
- **Gestion des Défauts :** Évite activement les nœuds ou fissures définis sur la planche.
- **Grain Vector :** Aligne obligatoirement les pièces selon le sens des fibres du bois.

### C. Analyseur 3D (`StepExtractor`)

Transforme un fichier `.stp` en liste de débit :

- **Algorithme OBB :** Trouve les dimensions réelles (L x l x ép) d'une pièce 3D, même pivotée.
- **XDE Metadata :** Récupère les noms des pièces et les couleurs depuis le fichier CAO.

### D. Moteur de Scraping (Veille Tarifaire)

Situé dans `Moteur/Backend/Services/Scraping_Engine/`.

- **Veille Concurrentielle :** Scanne automatiquement les sites des fournisseurs de bois pour extraire les prix, les essences et les dimensions disponibles.
- **Détection d'Anomalies :** Identifie les prix anormalement bas ou élevés pour aider à la décision d'achat.
- **Historisation :** Suit l'évolution des prix du bois sur le marché dans la table `price_history`.

### E. Télémétrie (`Monitoring`)

- **Sidecar Log Server :** Serveur TCP sur le port 9999 qui capture les logs en temps réel, même si le serveur principal crash.

---

## 🧭 4. Guide de Navigation (Où sont les fichiers ?)

| Problème / Besoin | Emplacement Source |
| :--- | :--- |
| **Logique d'Optimisation** | `Moteur/Backend/Services/IA_Engine/advanced_optimizer.py` |
| **Nesting Bois Brut** | `Moteur/Backend/Services/IA_Engine/raw_wood_optimizer/core.py` |
| **Import / Analyse STEP** | `Moteur/Backend/Services/IA_Engine/step_parser.py` |
| **Routes API (Endpoints)** | `Moteur/Backend/System/Bin/app/routers/` |
| **Schémas de Base de Données** | `Moteur/Backend/System/Bin/app/models/` ou `DATABASE_SCHEMA.md` |
| **Styles & Vue UI** | `Moteur/Frontend/src/pages/` |
| **Génération de PDF/Images** | `Moteur/Backend/Services/IA_Engine/exports.py` |

---

## 🛠️ 5. Processus de Mise à Jour (Workflow)

1. **Modification DB :** Modifier `Moteur/Backend/System/Bin/app/models/` et créer un script de migration dans `System/Bin/`.
2. **Nouveau Service :** Créer le fichier dans `Services/IA_Engine/`, l'importer dans un nouveau `router` de l'app.
3. **Vérification :** Utiliser les scripts `test_..._debug.py` à la racine de `Bin/` pour valider hors interface.
4. **UI :** Créer le composant React et le service d'appel API dans `Frontend/src/services/`.

---
*Document généré le 21/02/2026 - Garder ce fichier à jour à chaque modification majeure de structure.*
