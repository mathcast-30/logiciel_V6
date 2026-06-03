# Module de Sauvegarde et Restauration "Grade Industriel"

## 📋 Vue d'ensemble

Ce module implémente un système complet de sauvegarde et restauration pour le logiciel OptiCut, conforme aux spécifications énoncées dans votre demande.

## ✨ Fonctionnalités Implémentées

### 1. **Format de Nommage ISO Strict**

- ✅ Format: `backup_YYYY-MM-DD_HH-mm.zip`
- ✅ Exemples:
  - `backup_2026-02-10_11-42.zip`
  - `backup_2026-02-09_15-30.zip`
- ✅ Compatible avec le tri chronologique automatique

### 2. **Compression Optimale**

- ✅ Utilise `zipfile` avec compression maximale (`ZIP_DEFLATED`, niveau 9)
- ✅ Contient:
  - Base de données SQLite (`opticut.db`)
  - Documents et exports
  - Fichier `metadata.json` avec informations de version et intégrité (hash SHA256)

### 3. **Sauvegarde Automatique à la Fermeture**

- ✅ Module `auto_backup_shutdown.py` activé automatiquement
- ✅ Déclenche une sauvegarde lors de:
  - Fermeture normale du logiciel (`atexit`)
  - Interruption (Ctrl+C - `SIGINT`)
  - Terminaison du processus (`SIGTERM`)

### 4. **Logique de Rétention "Grade Industriel"**

#### Règle n°1: Conservation des 5 Dernières Sauvegardes

- ✅ Les 5 sauvegardes les plus récentes sont **TOUJOURS** conservées
- ✅ Indépendamment de leur date de création

#### Règle n°2: Archivage Mensuel Intelligent

- ✅ Pour chaque mois précédent, seule la **dernière sauvegarde** est conservée
- ✅ Toutes les autres sauvegardes du mois sont automatiquement supprimées
- ✅ Optimisation automatique de l'espace disque

#### Exemple de Rétention

**Scénario**: Nous sommes le 10 février 2026 à 11h42

```text
Sauvegardes conservées:
✅ backup_2026-02-10_11-42.zip  <- 1ère plus récente
✅ backup_2026-02-10_08-30.zip  <- 2ème plus récente
✅ backup_2026-02-09_18-15.zip  <- 3ème plus récente
✅ backup_2026-02-09_10-00.zip  <- 4ème plus récente
✅ backup_2026-02-08_22-45.zip  <- 5ème plus récente
✅ backup_2026-01-31_23-59.zip  <- Dernière de janvier
✅ backup_2025-12-31_23-50.zip  <- Dernière de décembre
✅ backup_2025-11-30_20-00.zip  <- Dernière de novembre

Sauvegardes supprimées automatiquement:
❌ backup_2026-02-07_16-00.zip  (6ème, pas dernière du mois)
❌ backup_2026-01-15_12-00.zip  (pas la dernière de janvier)
❌ backup_2025-12-20_10-00.zip  (pas la dernière de décembre)
```

### 5. **Interface Utilisateur Complète**

#### Page Paramètres (`/settings`)

- ✅ Tableau récapitulatif avec colonnes:
  - **Date**: Date et heure de création
  - **Type**: Auto / Manual / Legacy
  - **Taille**: Taille du fichier (formatée en Ko, Mo, Go)
  - **Fichier**: Nom du fichier au format ISO
  - **Actions**: Télécharger / Restaurer

#### Boutons d'Action

- ✅ **"Sauvegarder Maintenant"**: Crée une sauvegarde manuelle immédiate
- ✅ **"Importateur ZIP / BAK"**: Permet l'upload de fichiers externes
  - Renomme automatiquement au format ISO
  - Accepte `.zip` et `.bak`

#### Indicateurs Visuels

- ✅ Badge de type (Auto/Manual) avec code couleur
- ✅ Icône de chargement pendant les opérations
- ✅ Messages de confirmation/erreur

### 6. **Sécurité de Restauration**

- ✅ **Point de Sauvegarde Automatique**: Avant toute restauration, une sauvegarde de sécurité est créée automatiquement
- ✅ **Confirmation Utilisateur**: Double confirmation avant restauration
- ✅ **Message d'Avertissement**: Indique qu'un redémarrage est requis après restauration

## 📂 Structure des Fichiers

### Backend (Python/FastAPI)

```text
Moteur/Backend/
├── Services/IA_Engine/
│   ├── backup.py                    # Classe BackupManager principale
│   └── auto_backup_shutdown.py      # Module de sauvegarde automatique
└── System/Bin/app/
    ├── main.py                      # Active auto_backup_shutdown au démarrage
    └── routers/
        └── backups.py               # API REST pour sauvegardes
```

### Frontend (React/TypeScript)

```text
Moteur/Frontend/src/
├── services/
│   └── backupService.ts             # Service API pour sauvegardes
└── pages/
    └── Settings.tsx                 # Interface utilisateur complète
```

### Données Utilisateur

```text
Moteur/UserData/
└── Sauvegardes/
    ├── Backups/                     # Dossier principal des sauvegardes
    │   ├── backup_2026-02-10_11-42.zip
    │   ├── backup_2026-02-09_18-15.zip
    │   └── .temp/                   # Dossier temporaire
    └── (anciennes sauvegardes supprimées automatiquement)
```

## 🔌 API Endpoints

### `GET /api/backups`

Liste toutes les sauvegardes disponibles.

**Réponse:**

```json
[
  {
    "filename": "backup_2026-02-10_11-42.zip",
    "size_bytes": 2048576,
    "created_at": "2026-02-10T11:42:00",
    "type": "manual"
  }
]
```

### `GET /api/backups/stats`

Retourne des statistiques globales.

**Réponse:**

```json
{
  "total_backups": 8,
  "total_size_bytes": 16384000,
  "oldest_backup": "2025-11-30T20:00:00",
  "newest_backup": "2026-02-10T11:42:00",
  "auto_count": 6,
  "manual_count": 2
}
```

### `POST /api/backups`

Crée une nouvelle sauvegarde manuelle.

**Réponse:**

```json
{
  "filename": "backup_2026-02-10_11-45.zip",
  "status": "success",
  "message": "Sauvegarde créée avec succès"
}
```

### `POST /api/backups/{filename}/restore`

Restaure une sauvegarde spécifique.

**Réponse:**

```json
{
  "status": "success",
  "message": "Système restauré avec succès. Un point de sauvegarde de sécurité a été créé.",
  "warning": "Redémarrez l'application pour appliquer les changements."
}
```

### `DELETE /api/backups/{filename}`

Supprime une sauvegarde spécifique.

**Réponse:**

```json
{
  "status": "success",
  "message": "Sauvegarde backup_2026-02-10_11-42.zip supprimée"
}
```

### `GET /api/backups/{filename}/download`

Télécharge une sauvegarde.

**Réponse:** Fichier ZIP

### `POST /api/backups/upload`

Importe un fichier de sauvegarde externe.

**Body:** `multipart/form-data` avec fichier `.zip` ou `.bak`

**Réponse:**

```json
{
  "filename": "backup_2026-02-10_11-50.zip",
  "status": "uploaded",
  "message": "Fichier importé et renommé en backup_2026-02-10_11-50.zip"
}
```

## 🎯 Utilisation

### Sauvegarde Automatique

Rien à faire ! Le système se charge de tout automatiquement à chaque fermeture du logiciel.

### Sauvegarde Manuelle

1. Allez dans **Paramètres** → **Sauvegarde & Restauration**
2. Cliquez sur **"Sauvegarder Maintenant"**
3. Une notification confirme la création de la sauvegarde

### Restauration

1. Allez dans **Paramètres** → **Sauvegarde & Restauration**
2. Trouvez la sauvegarde souhaitée dans le tableau
3. Cliquez sur l'icône **🔄 Restaurer**
4. Confirmez l'opération (un point de sécurité sera créé automatiquement)
5. **Redémarrez l'application** après la restauration

### Import de Sauvegarde Externe

1. Cliquez sur **"Importateur ZIP / BAK"**
2. Sélectionnez un fichier `.zip` ou `.bak`
3. Le fichier est automatiquement renommé au format ISO et ajouté au système

## 🛡️ Sécurité et Fiabilité

### Intégrité des Données

- ✅ Hash SHA256 de la base de données stocké dans les métadonnées
- ✅ Vérification d'intégrité lors de la création
- ✅ Format ZIP standardisé avec compression sans perte

### Protection Contre les Erreurs

- ✅ Point de sauvegarde automatique avant chaque restauration
- ✅ Gestion des erreurs avec messages explicites
- ✅ Nettoyage automatique des fichiers temporaires en cas d'échec

### Traçabilité

- ✅ Logs détaillés de chaque opération (création, restauration, suppression)
- ✅ Métadonnées enrichies dans chaque sauvegarde
- ✅ Type de sauvegarde clairement identifié (Auto/Manual)

## 📊 Gestion de l'Espace Disque

Le système optimise automatiquement l'espace disque grâce à:

1. **Compression maximale** (niveau 9)
2. **Rétention intelligente** (5 dernières + 1 par mois)
3. **Suppression automatique** des anciennes sauvegardes
4. **Affichage de l'espace libéré** dans les logs

### Exemple de Logs

```text
[BACKUP] ✓ Sauvegarde créée: backup_2026-02-10_11-42.zip (1.8 Mo)
[RETENTION] ✓ 3 sauvegarde(s) supprimée(s), 5.4 Mo libéré(s)
```

## ✅ Résumé des Spécifications Respectées

| Spécification | Status | Détails |
| :--- | :--- | :--- |
| Format ISO strict | ✅ | `backup_YYYY-MM-DD_HH-mm.zip` |
| Compression ZIP | ✅ | `zipfile.ZIP_DEFLATED` niveau 9 |
| Sauvegarde auto fermeture | ✅ | `atexit` + signal handlers |
| Conservation 5 dernières | ✅ | Algorithme de rétention |
| 1 par mois précédent | ✅ | Groupement mensuel automatique |
| Tableau UI complet | ✅ | Date, Type, Taille, Fichier, Actions |
| Point de sécurité | ✅ | Avant chaque restauration |
| Import manuel | ✅ | `.zip` et `.bak` supportés |

## 🚀 Prochaines Étapes

Pour tester le système:

1. **Démarrez le backend** (si pas déjà fait):

   ```bash
   cd Moteur/Backend
   python -m uvicorn System.Bin.app.main:app --reload --port 8000
   ```

2. **Démarrez le frontend**:

   ```bash
   cd Moteur/Frontend
   npm run dev
   ```

3. **Accédez à l'interface**:
   - Ouvrez `http://localhost:5173`
   - Allez dans **Paramètres**
   - Testez les fonctionnalités de sauvegarde

4. **Test de sauvegarde automatique**:
   - Fermez le backend (Ctrl+C)
   - Vérifiez qu'une nouvelle sauvegarde a été créée dans `Moteur/UserData/Sauvegardes/Backups/`

---

**Module développé par:** Antigravity AI Assistant
**Date:** 10 février 2026
**Version:** 3.0 "Grade Industriel"
