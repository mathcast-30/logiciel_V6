# Plan d'Amélioration - Interface Optimisateur OptiCut Pro

**Objectif**: Ajouter sélection de projets, pièces, matériaux et planches avec source de matériau  
**Date**: 2026-02-01

---

## 📋 Vue d'ensemble du flux attendu

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUX D'OPTIMISATION                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Sélectionner PROJETS CLIENT                              │
│    └─ Affiche: nom client, nombre pièces, matériaux         │
│                                                              │
│ 2. Sélectionner PIÈCES (par projet ou une par une)          │
│    └─ Groupé par: Projet / Matériau / Dimension            │
│    └─ Stats: Quantité totale / Surface estimée              │
│                                                              │
│ 3. ANALYSE MATÉRIAUX IDENTIFIÉS                             │
│    └─ Tableau: Matériau | Quantité pièces | Surface         │
│    └─ Pour chaque matériau: Choisir SOURCE (↓)              │
│                                                              │
│ 4. Choisir SOURCE DE MATÉRIAU (par matériau)                │
│    ├─ [✓] STOCK (planches existantes)                       │
│    └─ [✓] CATALOGUE FOURNISSEUR (commander)                 │
│                                                              │
│ 5. Sélectionner PLANCHES (si Stock)                         │
│    └─ Affiche: Dimensions | Quantité | Prix                │
│    └─ Auto-sélection ou manuel                              │
│                                                              │
│ 6. Configurer PARAMÈTRES DÉCOUPE                            │
│    └─ Kerf, Marges, Sécurité, Algorithme, etc.             │
│                                                              │
│ 7. LANCER OPTIMISATION                                      │
│    └─ Résultats: Panneaux, Pièces placées, Chutes          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Composants à créer/modifier

### 1. **EnhancedProjectSelector** (NEW)
**Fichier**: `src/components/Optimize/EnhancedProjectSelector.tsx`

```typescript
interface EnhancedProjectSelectorProps {
  projects: Project[];
  selectedProjectIds: number[];
  onSelectionChange: (projectIds: number[]) => void;
}

Affiche:
- Checkbox projet + client name
- Sous-info: "5 pièces | 3 matériaux"
- Statistiques temps réel
```

### 2. **MaterialBreakdown** (NEW)
**Fichier**: `src/components/Optimize/MaterialBreakdown.tsx`

```typescript
interface MaterialBreakdownProps {
  selectedPieceIds: number[];
  projectIds: number[];
}

Affiche tableau:
┌─────────────────────────────────────────────┐
│ Matériau       │ Quantité │ Surface │ Source │
├─────────────────────────────────────────────┤
│ Chêne Massif   │    8     │ 2.4 m²  │ Stock  │
│ MDF 18mm       │   12     │ 3.8 m²  │ [    ] │
│ Hêtre Plaqué   │    4     │ 1.2 m²  │ Fourni │
└─────────────────────────────────────────────┘

Calcule automatiquement les matériaux impliqués
```

### 3. **MaterialSourceSelector** (NEW)
**Fichier**: `src/components/Optimize/MaterialSourceSelector.tsx`

```typescript
interface MaterialSourceSelectorProps {
  materials: IdentifiedMaterial[];
  materialSources: { [materialId: number]: 'stock' | 'supplier' };
  onSourceChange: (materialId: number, source: 'stock' | 'supplier') => void;
}

Pour chaque matériau:
- Radio button: [•] Stock  [ ] Fournisseur
- Affiche disponibilité (ex: "8 planches, 24 m²")
```

### 4. **Améliorer PieceSelector**
**Fichier**: `src/components/Optimize/PieceSelector.tsx`

```typescript
Nouvelles fonctionnalités:
✓ Grouper par Projet / Matériau
✓ Ajouter filtres avancés:
  - Dimension min/max
  - Rotation autorisée
  - Par grain
✓ "Sélectionner tout par projet"
✓ Afficher:
  - Quantité totale sélectionnée
  - Surface estimée m²
  - Poids approximatif
```

### 5. **Améliorer StockSelector**
**Fichier**: `src/components/Optimize/StockSelector.tsx`

```typescript
Nouvelles fonctionnalités:
✓ Filtrer par: Espèce, Grain, Qualité
✓ Afficher:
  - Prix unitaire
  - Stock disponible
  - Estimé perte (%)
✓ Suggestions auto-sélection (meilleur yield)
✓ Grouper: Planches neuves / Chutes
```

---

## 🔄 Flux React State (Optimize.tsx)

**Avant** (simplifié):
```typescript
selectedProjectIds: number[]        // Projets sélectionnés
selectedPieceIds: number[]          // Pièces sélectionnées
selectedStockIds: number[]          // Planches sélectionnées
currentMaterial: string | null      // Matériau courant
material_source: 'stock' | 'supplier' // Source globale (PROBLÈME!)
```

**Après** (amélioré):
```typescript
selectedProjectIds: number[]                    // Projets
selectedPieceIds: number[]                      // Pièces
identifiedMaterials: IdentifiedMaterial[]       // [NEW] Matériaux détectés
materialSources: Map<number, 'stock'|'supplier'> // [NEW] Source par matériau
selectedStockIds: Map<number, number[]>         // [NEW] Stock par matériau
```

---

## 📡 Modifications Backend

### Endpoint: `POST /api/optimize`

**Nouvelle structure request**:
```python
{
    "piece_ids": [1, 2, 3],
    "material_sources": {
        "1": "stock",      # Chêne: utiliser stock
        "2": "supplier",   # MDF: commander
        "3": "stock"       # Hêtre: stock
    },
    "stock_ids": {
        "1": [10, 11, 12],  # Matériau 1: planches 10, 11, 12
        "3": [25]           # Matériau 3: planche 25
    },
    "kerf": 3.0,
    "algorithm": "guillotine"
}
```

**Logique backend**:
1. Pour chaque `material_id` avec source='stock' → chercher dans `stock_ids`
2. Pour chaque `material_id` avec source='supplier' → récupérer du catalogue + appliquer markup
3. Optimiser séparément par matériau

---

## 🎨 Layout Optimize.tsx (NEW)

```jsx
<div className="space-y-8">
  {/* 1. Sélection Projets */}
  <Card>
    <h2>Étape 1: Projets</h2>
    <EnhancedProjectSelector {...} />
  </Card>

  {/* 2. Sélection Pièces */}
  <Card>
    <h2>Étape 2: Pièces ({selectedPieceIds.length} sélectionnées)</h2>
    <PieceSelector {...} />
  </Card>

  {/* 3. Analyse Matériaux */}
  <Card>
    <h2>Étape 3: Matériaux Identifiés</h2>
    <MaterialBreakdown {...} />
  </Card>

  {/* 4. Source Matériau */}
  <Card>
    <h2>Étape 4: Source Matériau</h2>
    <MaterialSourceSelector {...} />
  </Card>

  {/* 5. Stock (si stock sélectionné) */}
  {hasMaterialsWithStock && (
    <Card>
      <h2>Étape 5: Sélectionner Planches</h2>
      <StockSelector {...} />
    </Card>
  )}

  {/* 6. Paramètres */}
  <Card>
    <h2>Étape 6: Paramètres Découpe</h2>
    <SettingsPanel {...} />
  </Card>

  {/* 7. Bouton Optimiser */}
  <button onClick={handleOptimize} disabled={!isReadyToOptimize}>
    🚀 Lancer Optimisation
  </button>
</div>
```

---

## ✅ Checklist d'implémentation

**Phase 1: Composants**
- [ ] EnhancedProjectSelector
- [ ] MaterialBreakdown
- [ ] MaterialSourceSelector
- [ ] Améliorer PieceSelector (groupement, filtres)
- [ ] Améliorer StockSelector (source, prix)

**Phase 2: État React**
- [ ] Ajouter `identifiedMaterials` state
- [ ] Ajouter `materialSources` state
- [ ] Restructurer `selectedStockIds` (Map par matériau)
- [ ] Créer helper functions pour détecter matériaux

**Phase 3: API**
- [ ] Mettre à jour endpoint `/optimize` pour accepter `material_sources`
- [ ] Créer endpoint helper: `/api/pieces/materials` (détecter matériaux d'une liste de pièces)
- [ ] Modifier logique stock matching

**Phase 4: Tests**
- [ ] Tester mono-projet + mono-matériau
- [ ] Tester multi-projets + multi-matériaux
- [ ] Tester source=stock + source=supplier
- [ ] Vérifier coûts + estimations

---

## 🎯 Priorités

1. **CRITIQUE**: EnhancedProjectSelector + MaterialBreakdown
   - Sans cela, l'utilisateur ne sait pas quels matériaux vont être optimisés

2. **IMPORTANT**: MaterialSourceSelector + backend `/optimize` update
   - Permet sélection stock vs fournisseur

3. **OPTIONNEL (futur)**: Améliorations cosmétiques UI

---

## 📝 Notes

- Intégrer avec le système de `ThemeContext` pour cohérence visuelle
- Utiliser TailwindCSS classes existantes du projet
- Persister sélection en localStorage (optionnel)
- Afficher warnings si aucun stock disponible pour une sélection
