# Guide de Personnalisation de l'Interface

## ?? Système de Thème et de Couleurs

Votre application dispose maintenant d'un système complet de personnalisation permettant de configurer tous les aspects visuels de l'interface.

### Fonctionnalités

#### 1. **Sélection du Thème** 
Trois options disponibles dans les **Paramètres > Apparence** :

- **Clair** : Interface en mode clair
- **Sombre** : Interface en mode sombre
- **Système** : Adapté aux préférences du système d'exploitation

#### 2. **Personnalisation des Couleurs**
Accédez à **Paramètres > Personnalisation des Couleurs** pour configurer :

- **Primaire** : Couleur principale (boutons, accents)
- **Secondaire** : Couleur secondaire
- **Accent** : Couleur d'accent pour les éléments clés
- **Arrière-plan** : Couleur de fond principale
- **Surface** : Couleur des surfaces/cartes
- **Texte** : Couleur du texte principal
- **Bordure** : Couleur des bordures
- **Succès** : Indicateur de succès (vert)
- **Avertissement** : Indicateur d'avertissement (orange)
- **Erreur** : Indicateur d'erreur (rouge)

### Utilisation des Couleurs en CSS

#### Variables CSS disponibles :
```css
var(--color-primary)
var(--color-secondary)
var(--color-accent)
var(--color-background)
var(--color-surface)
var(--color-text)
var(--color-border)
var(--color-success)
var(--color-warning)
var(--color-error)
```

#### Classes utilitaires :
```css
.bg-primary          /* Fond de la couleur primaire */
.text-primary        /* Texte en couleur primaire */
.border-primary      /* Bordure en couleur primaire */
.btn-primary-custom  /* Bouton avec couleur primaire */
```

### Utilisation en React

#### Accéder aux couleurs :
```tsx
import { useTheme } from './context/ThemeContext';

function MonComposant() {
  const { colors, setColors } = useTheme();

  return (
    <div style={{ backgroundColor: colors.primary }}>
      Ma boîte personnalisée
    </div>
  );
}
```

#### Modifier les couleurs :
```tsx
const { colors, setColors } = useTheme();

const newColors = {
  ...colors,
  primary: '#FF0000'
};

setColors(newColors);
```

#### Réinitialiser les couleurs :
```tsx
const { resetColors } = useTheme();

resetColors(); // Retour aux couleurs par défaut
```

### Stockage Persistant

- Les préférences de **thème** sont sauvegardées dans `localStorage` avec la clé `opticut-ui-theme`
- Les **couleurs personnalisées** sont sauvegardées dans `localStorage` avec la clé `opticut-ui-colors`
- Les données sont automatiquement restaurées au prochain chargement de l'application

### Palettes par Défaut

#### Mode Clair
| Élément | Couleur |
|---------|---------|
| Primaire | #3b82f6 (Bleu) |
| Secondaire | #8b5cf6 (Violet) |
| Accent | #ec4899 (Rose) |
| Arrière-plan | #f8fafc (Blanc cassé) |
| Surface | #ffffff (Blanc) |
| Texte | #1e293b (Noir) |
| Bordure | #e2e8f0 (Gris clair) |
| Succès | #10b981 (Vert) |
| Avertissement | #f59e0b (Orange) |
| Erreur | #ef4444 (Rouge) |

#### Mode Sombre
| Élément | Couleur |
|---------|---------|
| Primaire | #60a5fa (Bleu clair) |
| Secondaire | #a78bfa (Violet clair) |
| Accent | #f472b6 (Rose clair) |
| Arrière-plan | #0f172a (Noir) |
| Surface | #1e293b (Gris foncé) |
| Texte | #f1f5f9 (Blanc) |
| Bordure | #334155 (Gris) |
| Succès | #34d399 (Vert clair) |
| Avertissement | #fbbf24 (Orange clair) |
| Erreur | #f87171 (Rouge clair) |

### Créer des Présets de Couleurs

Vous pouvez créer des présets sauvegardés (à venir) :

```tsx
const PRESET_OCEAN = {
  primary: '#0369a1',
  secondary: '#06b6d4',
  accent: '#0891b2',
  // ... autres couleurs
};

const PRESET_SUNSET = {
  primary: '#ea580c',
  secondary: '#f97316',
  accent: '#fb923c',
  // ... autres couleurs
};
```

### Conseils d'Ergonomie

1. **Contraste** : Assurez-vous que le texte a un bon contraste avec l'arrière-plan
2. **Cohérence** : Utilisez une palette cohérente de 3-5 couleurs max
3. **Accessibilité** : Testez avec des outils de contraste (WCAG AA/AAA)
4. **Tests** : Testez votre palette en mode clair ET sombre

### Fichiers Concernés

- `src/context/ThemeContext.tsx` : Logique du thème et des couleurs
- `src/components/Settings/ThemeSelector.tsx` : Sélecteur de thème
- `src/components/Settings/ColorCustomizer.tsx` : Personnalisation des couleurs
- `src/pages/Settings.tsx` : Page de paramètres
- `src/styles/themes.css` : Variables et classes CSS
- `src/main.tsx` : Import des styles

### Dépannage

**Les couleurs ne s'appliquent pas ?**
- Vérifiez que le fichier `themes.css` est bien importé
- Assurez-vous d'utiliser les variables CSS correctes

**Les couleurs se réinitialisent au rechargement ?**
- Vérifiez que `localStorage` n'est pas désactivé
- Vérifiez la console pour les erreurs

---

Pour toute question ou amélioration, n'hésitez pas ! ??
