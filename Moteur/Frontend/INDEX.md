# ?? Index de la Documentation - Système de Personnalisation

## ?? Démarrage Rapide

Si vous êtes nouveau, **commencez par ici** :

1. **[COMPLETE_SYSTEM.md](./COMPLETE_SYSTEM.md)** ? START HERE ??
   - Vue d'ensemble du système
   - Toutes les fonctionnalités en un coup d'œil
   - Emplacements dans l'interface

## ?? Documentation par Thème

### ?? Personnalisation des Couleurs

| Document | Contenu | Pour qui |
|----------|---------|---------|
| [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md) | Guide de base des couleurs | Utilisateurs finaux |
| [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md) | Guide complet | Utilisateurs avancés |
| [src/styles/themes.css](./src/styles/themes.css) | Variables CSS | Développeurs |

### ?? Présets et Thèmes

| Document | Contenu |
|----------|---------|
| [ADVANCED_FEATURES.md#présets](./ADVANCED_FEATURES.md) | Comment utiliser les présets |
| [ADVANCED_FEATURES.md#export](./ADVANCED_FEATURES.md) | Export/Import de thèmes |
| [src/types/presets.ts](./src/types/presets.ts) | Définition des présets |

### ? Accessibilité et Contraste

| Document | Contenu |
|----------|---------|
| [ADVANCED_FEATURES.md#contraste](./ADVANCED_FEATURES.md) | Vérification WCAG |
| [src/utils/contrastChecker.ts](./src/utils/contrastChecker.ts) | Formule WCAG |
| [WCAG 2.1 Guide](https://www.w3.org/WAI/WCAG21/quickref/) | Norme officielle |

### ?? Profils Utilisateur

| Document | Contenu |
|----------|---------|
| [ADVANCED_FEATURES.md#profils](./ADVANCED_FEATURES.md) | Créer et gérer les profils |
| [src/components/Settings/UserProfiles.tsx](./src/components/Settings/UserProfiles.tsx) | Code du composant |

### ? Animations

| Document | Contenu |
|----------|---------|
| [ADVANCED_FEATURES.md#animations](./ADVANCED_FEATURES.md) | Liste des animations |
| [src/styles/themes.css](./src/styles/themes.css) | Définitions CSS |

---

## ?? Tests et Vérification

| Document | Contenu | Priorité |
|----------|---------|----------|
| [TEST_GUIDE.md](./TEST_GUIDE.md) | Guide complet de test (35+) | ?? CRITIQUE |
| [COMPATIBILITY_CHECKLIST.md](./COMPATIBILITY_CHECKLIST.md) | Vérification compatibilité | ?? IMPORTANT |
| [CHANGELOG.md](./CHANGELOG.md) | Historique des modifications | ?? Référence |

---

## ??? Pour les Développeurs

### Comprendre l'Architecture

1. **[src/context/ThemeContext.tsx](./src/context/ThemeContext.tsx)**
   - Context API React
   - Gestion des couleurs et thèmes
   - localStorage integration

2. **[src/styles/themes.css](./src/styles/themes.css)**
   - Variables CSS
   - Animations
   - Classes utilitaires

### Ajouter des Couleurs Personnalisées

```tsx
import { useTheme, ColorPalette } from './context/ThemeContext';

const { colors, setColors } = useTheme();

// Utiliser les couleurs
<div style={{ backgroundColor: colors.primary }}>
```

### Créer un Preset Personnalisé

Voir [src/types/presets.ts](./src/types/presets.ts) pour la structure.

---

## ?? Structure des Fichiers

```
src/
??? context/
?   ??? ThemeContext.tsx              # ?? Logique principale
??? components/Settings/
?   ??? ThemeSelector.tsx             # Sélection thème
?   ??? ColorCustomizer.tsx           # Personnalisation couleurs
?   ??? PresetSelector.tsx            # Gestion présets
?   ??? ContrastChecker.tsx           # Vérification WCAG
?   ??? UserProfiles.tsx              # Gestion profils
??? utils/
?   ??? contrastChecker.ts            # Formule WCAG
??? types/
?   ??? presets.ts                    # Définition des présets
??? styles/
    ??? themes.css                    # Variables CSS & animations

docs/
??? CUSTOMIZATION_GUIDE.md            # Guide de base
??? ADVANCED_FEATURES.md              # Guide avancé
??? COMPLETE_SYSTEM.md                # Vue d'ensemble
??? COMPATIBILITY_CHECKLIST.md        # Vérification
??? TEST_GUIDE.md                     # Tests
??? CHANGELOG.md                      # Historique
??? IMPLEMENTATION_SUMMARY.sh         # Résumé
??? INDEX.md                          # Ce fichier
```

---

## ?? Guides par Cas d'Usage

### Je veux personnaliser les couleurs
? [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md)

### Je veux utiliser un preset
? [ADVANCED_FEATURES.md#présets](./ADVANCED_FEATURES.md)

### Je veux créer un profil pour une équipe
? [ADVANCED_FEATURES.md#profils](./ADVANCED_FEATURES.md)

### Je veux vérifier l'accessibilité
? [ADVANCED_FEATURES.md#contraste](./ADVANCED_FEATURES.md)

### Je veux exporter mon thème
? [ADVANCED_FEATURES.md#export](./ADVANCED_FEATURES.md)

### Je veux tester le système
? [TEST_GUIDE.md](./TEST_GUIDE.md)

### Je veux comprendre le code
? [src/context/ThemeContext.tsx](./src/context/ThemeContext.tsx)

### Je veux vérifier la compatibilité
? [COMPATIBILITY_CHECKLIST.md](./COMPATIBILITY_CHECKLIST.md)

---

## ?? Ressources Externes

### Accessibilité
- [WCAG 2.1 Official](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Axe DevTools](https://www.deque.com/axe/devtools/)

### Design
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Color Theory](https://www.color-theory.com/)

### React
- [React Context API](https://react.dev/reference/react/useContext)
- [React Hooks](https://react.dev/reference/react/hooks)

---

## ?? FAQ Rapide

**Q: Où sont mes paramètres?**
A: ? Sidebar ? Cliquer ?? Paramètres

**Q: Comment changer le thème?**
A: ? Sidebar ? Sun/Moon/Monitor buttons

**Q: Puis-je créer un preset?**
A: ? Paramètres ? Présets & Export ? Sauvegarder

**Q: Comment partager mon thème?**
A: ? Paramètres ? Présets & Export ? Export JSON

**Q: Comment créer un profil?**
A: ? Paramètres ? Profils Utilisateur ? Créer

**Q: Est-ce que c'est accessible?**
A: ? Paramètres ? Accessibilité ? Voir résultats WCAG

**Q: Mes données sont-elles sauvegardées?**
A: ? Oui, dans localStorage (localement)

**Q: Puis-je restaurer les paramètres par défaut?**
A: ? Paramètres ? Personnalisation des Couleurs ? Réinitialiser

---

## ?? Dépannage

**Problème:** Les couleurs ne changent pas
? Vérifiez que localStorage est activé

**Problème:** Les animations saccadées
? Réduisez `--transition-duration` dans themes.css

**Problème:** Impossible de créer un profil
? Vérifiez que localStorage n'est pas plein

**Problème:** L'import de preset échoue
? Vérifiez que le fichier est en JSON valide

---

## ?? Support

Consultez les documents appropriés selon votre question:

1. **Question utilisateur** ? [CUSTOMIZATION_GUIDE.md](./CUSTOMIZATION_GUIDE.md)
2. **Question technique** ? [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md)
3. **Question de test** ? [TEST_GUIDE.md](./TEST_GUIDE.md)
4. **Question développeur** ? [src/context/ThemeContext.tsx](./src/context/ThemeContext.tsx)

---

## ?? Vue d'ensemble Quick Links

| Élément | Fichier |
|--------|---------|
| Guide complet | [COMPLETE_SYSTEM.md](./COMPLETE_SYSTEM.md) |
| Start here | [ADVANCED_FEATURES.md](./ADVANCED_FEATURES.md) |
| Tests | [TEST_GUIDE.md](./TEST_GUIDE.md) |
| Code | [src/context/ThemeContext.tsx](./src/context/ThemeContext.tsx) |
| CSS | [src/styles/themes.css](./src/styles/themes.css) |

---

## ? Checklist pour Démarrer

- [ ] Lire [COMPLETE_SYSTEM.md](./COMPLETE_SYSTEM.md)
- [ ] Essayer les présets dans Paramètres
- [ ] Créer un profil utilisateur
- [ ] Vérifier l'accessibilité
- [ ] Exporter un thème en JSON
- [ ] Lire la documentation pertinente

---

## ?? Vous êtes Prêt!

Vous avez accès à:
? Documentation complète
? Guides pour chaque cas d'usage
? Tests de vérification
? Code source documenté
? Ressources externes

**Bon développement! ??**

---

*Dernière mise à jour: 2024*
*Système: v2.0.0*
*Status: Production-ready ?*
