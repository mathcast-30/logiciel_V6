# ?? Guide Complet des Nouvelles Fonctionnalités

Vous avez maintenant accès à un système complet de personnalisation et d'accessibilité !

## ?? Table des matières

1. [Présets de Couleurs](#présets-de-couleurs)
2. [Export/Import de Thèmes](#exportimport-de-thèmes)
3. [Animations](#animations)
4. [Vérification du Contraste](#vérification-du-contraste)
5. [Profils Utilisateur](#profils-utilisateur)

---

## ?? Présets de Couleurs

### Utilisation

Accédez à **Paramètres > Présets & Export** pour utiliser les présets intégrés :

### Présets Disponibles

| Preset | Description | Couleurs |
|--------|-------------|----------|
| **Défaut** | Palette standard OptiCut | Bleu/Violet |
| **Océan** | Bleu marine apaisante | Bleu/Cyan |
| **Coucher de soleil** | Palette chaude | Orange/Red |
| **Forêt** | Vert naturel | Vert |
| **Violet mystique** | Couleurs élégantes | Violet/Rose |
| **Minimaliste** | Noir et blanc épuré | B&W |
| **Néon futuriste** | Couleurs vibrantes | Néon |

### Créer un Preset Personnalisé

1. Configurez vos couleurs dans **Personnalisation des Couleurs**
2. Cliquez sur **"Sauvegarder"** dans **Présets & Export**
3. Donnez un nom à votre preset
4. Le preset est maintenant disponible dans "Mes Presets"

---

## ?? Export/Import de Thèmes

### Exporter un Preset

1. Allez dans **Paramètres > Présets & Export**
2. Cliquez sur **"Mes Presets"**
3. Sélectionnez un preset personnalisé
4. Cliquez sur le bouton **"Export"**
5. Un fichier `.json` est téléchargé

### Importer un Preset

1. Allez dans **Paramètres > Présets & Export**
2. Cliquez sur **"Importer"**
3. Sélectionnez un fichier `.json`
4. Le preset est automatiquement ajouté

### Format du Fichier JSON

```json
{
  "name": "Ma Palette",
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#ec4899",
    "background": "#f8fafc",
    "surface": "#ffffff",
    "text": "#1e293b",
    "border": "#e2e8f0",
    "success": "#10b981",
    "warning": "#f59e0b",
    "error": "#ef4444"
  }
}
```

**Partager vos thèmes** : Vous pouvez partager les fichiers `.json` avec d'autres utilisateurs !

---

## ? Animations

### Animations Intégrées

Les changements de couleurs et de thème s'accompagnent maintenant d'animations fluides :

| Animation | Lieu | Durée |
|-----------|------|-------|
| **Theme Fade** | Changement de thème | 300ms |
| **Color Pulse** | Changement de couleur | Variable |
| **Button Hover** | Survol des boutons | 300ms |
| **Slide Down** | Ouverture de menus | 300ms |
| **Bounce In** | Notifications | 500ms |

### Classes CSS Disponibles

```css
/* Utiliser dans votre code */
.animate-color-pulse      /* Scintillement */
.animate-bounce-in        /* Rebond d'entrée */
.animate-slide-down       /* Glissement */
.transition-theme         /* Transition fluide */
```

### Personnaliser les Animations

Modifiez les variables CSS dans `src/styles/themes.css` :

```css
:root {
    --transition-duration: 0.3s;  /* Durée de transition */
    --transition-ease: cubic-bezier(0.4, 0, 0.2, 1);  /* Courbe d'animation */
}
```

---

## ? Vérification du Contraste

### Norme WCAG

L'interface vérifie automatiquement la conformité WCAG 2.1 :

| Niveau | Ratio | Recommandation |
|--------|-------|----------------|
| **AAA** | 7:1+ | Accessible à tous ? |
| **AA** | 4.5:1+ | Conforme légal ? |
| **Fail** | <4.5:1 | À améliorer ? |

### Utiliser le Vérificateur

1. Allez dans **Paramètres > Accessibilité**
2. Visualisez le contraste pour chaque élément
3. Cliquez sur **"Corriger automatiquement"** pour optimiser
4. Tous les éléments doivent être ? conformes

### Vérification Automatique du Contraste

```tsx
import { checkContrast } from './utils/contrastChecker';

const result = checkContrast('#000000', '#ffffff');
// result.level ? 'AAA' | 'AA' | 'fail'
// result.isAccessible ? true/false
```

---

## ?? Profils Utilisateur

### Créer un Profil

1. Allez dans **Paramètres > Profils Utilisateur**
2. Entrez un nom (ex: "Bureau", "Présentation")
3. Cliquez sur **"Créer"**
4. Le profil capture vos paramètres actuels

### Utiliser les Profils

**Cas d'usage :**
- **Bureau** : Thème clair avec accent bleu
- **Présentation** : Thème sombre avec contraste élevé
- **Travail de nuit** : Thème adapté avec luminosité réduite
- **Défaillant visuel** : Thème avec contraste maximum

### Basculer Entre Profils

1. Allez dans **Paramètres > Profils Utilisateur**
2. Cliquez sur **"Mes Presets"**
3. Sélectionnez le profil souhaité
4. Cliquez sur **"Activer"**

### Gérer les Profils

- **Activer** : Appliquer le profil
- **Renommer** : Cliquer sur l'icône d'édition
- **Supprimer** : Cliquer sur la corbeille (profil inactif seulement)
- **Mettre à jour** : Cliquez sur "Enregistrer" pour sauvegarder les modifications

### Stockage

Les profils sont sauvegardés en localStorage avec la clé `opticut-user-profiles`.

---

## ?? Vue d'ensemble des Stockages

| Élément | Clé | Format |
|--------|-----|--------|
| Thème | `opticut-ui-theme` | `'light' \| 'dark' \| 'system'` |
| Couleurs | `opticut-ui-colors` | JSON (ColorPalette) |
| Présets custom | `opticut-custom-presets` | JSON Array |
| Profils | `opticut-user-profiles` | JSON Array |

**Exporter vos paramètres** :
```javascript
// Dans la console
console.log(localStorage.getItem('opticut-ui-colors'));
console.log(localStorage.getItem('opticut-user-profiles'));
```

**Importer sauvegarde** :
```javascript
// Restaurer depuis export
localStorage.setItem('opticut-ui-colors', JSON.stringify(couleurs));
```

---

## ?? Cas d'Usage Avancés

### 1. Créer un Thème Accessible

1. Configurez une palette
2. Vérifiez dans **Accessibilité**
3. Utilisez **"Corriger automatiquement"**
4. Sauvegardez comme preset

### 2. Thème pour Présentation

1. Mode sombre avec fort contraste
2. Couleurs vibrantes
3. Police plus grande
4. Sauvegardez dans un profil "Présentation"

### 3. Configurer pour Équipe

1. Créez un thème d'entreprise
2. Exportez le fichier `.json`
3. Partagez avec votre équipe
4. Chacun importe le fichier

### 4. Défaillance Visuelle

1. Activer mode sombre
2. Vérifier contraste AAA
3. Augmenter contraste
4. Sauvegarder profil "Accessibilité"

---

## ?? Dépannage

### Les présets ne s'affichent pas
- Vérifiez que TypeScript compile correctement
- Vérifiez la console pour les erreurs

### Export ne télécharge pas
- Vérifiez les permissions du navigateur
- Essayez un autre navigateur

### Profil ne se sauvegarde pas
- Vérifiez que localStorage est activé
- Vérifiez la limite de stockage (5-10 MB)

### Animations saccadées
- Modifiez `--transition-duration` (0.1s minimum)
- Vérifiez les performances du navigateur

---

## ?? Compatibilité

- ? Chrome/Edge 90+
- ? Firefox 88+
- ? Safari 14+
- ? Mobile (iOS/Android)

---

## ?? Conseils d'Accessibilité

1. **Toujours vérifier le contraste** (AAA si possible)
2. **Tester en mode clair ET sombre**
3. **Utiliser 3-5 couleurs maximum**
4. **Ne compter que sur la couleur** pour l'information
5. **Tester avec des outils WCAG**

### Outils recommandés
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [WAVE](https://wave.webaim.org/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

---

## ?? Ressources

- [WCAG 2.1 Guide](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Color Contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Understanding_WCAG/Perceivable/Color_contrast)
- [A11y Color Contrast](https://www.a11y-101.com/design/color-contrast)

---

**Besoin d'aide ?** Consultez les sections correspondantes dans les Paramètres ! ??
