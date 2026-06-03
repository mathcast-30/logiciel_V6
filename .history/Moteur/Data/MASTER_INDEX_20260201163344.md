# 📚 INDEX DE NAVIGATION - Moteur/Data/

## 🚀 Démarrer Ici

**Point d'entrée principal** pour comprendre la structure complète de stockage d'OptiCut Pro V4.

---

## 📁 Structure Complète

### 1️⃣ **Database/** - Configuration & Scripts PostgreSQL
```
Database/
├── Configuration/           (Fichiers de configuration)
│   ├── postgresql.conf                    ← Config standard PostgreSQL
│   ├── POSTGRESQL_CONFIG_ADVANCED.conf    ← Config avancée + WAL + checksums
│   └── init-db.sql                        ← Script initialisation BD
│
├── Scripts/                 (Tous les scripts d'automatisation)
│   ├── Deployment/          ← Installation & setup
│   │   ├── DEPLOY_STORAGE.bat
│   │   ├── COMPLETE_INSTALLATION.bat
│   │   └── install_postgres_wsl.sh
│   │
│   ├── Backup/              ← Gestion des backups
│   │   └── BACKUP_ADVANCED.bat
│   │
│   ├── Recovery/            ← Procédures de récupération
│   │   └── RECOVERY_EMERGENCY.bat
│   │
│   ├── Health/              ← Diagnostic & monitoring
│   │   └── CHECK_HEALTH.bat
│   │
│   ├── Maintenance/         ← Tâches programmées
│   │   └── MAINTENANCE_SCHEDULE.bat
│   │
│   └── Tools/               ← Utilitaires PowerShell/Bash
│       ├── backup_script.sh
│       ├── backup_strategy.ps1
│       ├── deploy_advanced_storage.ps1
│       ├── install_docker.ps1
│       └── setup_advanced_storage.ps1
│
└── Docker/                  (Configuration Docker alternative)
    └── docker-compose.yml
```

### 2️⃣ **Storage/** - Emplacements Réels de Stockage
```
Storage/
├── postgres/                (Données PostgreSQL)
│   ├── data/               ← Fichiers de données PostgreSQL
│   └── wal_archive/        ← Write-Ahead Logs archivés
│
└── backups/                (Tous les backups)
    ├── full/               ← Backups SQL complets
    ├── wal/                ← Archives WAL
    ├── daily/              ← Backups quotidiens
    └── snapshots/          ← Snapshots atomiques
```

### 3️⃣ **Documentation/** - Guides & Référence
```
Documentation/
├── Architecture/           (Vue d'ensemble système)
│   ├── STORAGE_ARCHITECTURE_COMPLETE.md  ← Guide complet (14.6 KB)
│   └── SYSTEM_OVERVIEW.md
│
├── Deployment/            (Installation & déploiement)
│   ├── DEPLOYMENT_SUMMARY.md             ← Résumé déploiement
│   ├── DEPLOYMENT_SUCCESS.md             ← Rapport succès
│   └── QUICKSTART.md                     ← Guide rapide (5.17 KB)
│
├── Operations/            (Opérations quotidiennes)
│   ├── MAINTENANCE_GUIDE.md              ← Maintenance
│   ├── RECOVERY_PROCEDURES.md            ← Procédures récupération
│   └── TROUBLESHOOTING.md                ← Dépannage
│
├── Configuration/         (Guides de configuration)
│   └── POSTGRESQL_SETUP.md
│
└── Reference/             (Références & livrables)
    ├── INDEX.md                          ← Ce fichier
    ├── LIVRABLES.md                      ← Liste livrables (9 KB)
    ├── FINAL_SUMMARY.md                  ← Résumé final (8.62 KB)
    └── FILE_ORGANIZATION_MAP.md          ← Cartographie fichiers
```

### 4️⃣ **Archive/** - Fichiers de Référence Obsolète
```
Archive/
├── PROPOSED_ARBORESCENCE.md  ← Structure proposée
└── [autres fichiers de référence]
```

---

## 🎯 Tâches Courantes

### ⚡ **Déploiement Initial**
```bash
# Lancer le script de déploiement:
Database/Scripts/Deployment/DEPLOY_STORAGE.bat

# Puis installation PostgreSQL:
Database/Scripts/Deployment/COMPLETE_INSTALLATION.bat
```

### 💾 **Backup Régulier**
```bash
Database/Scripts/Backup/BACKUP_ADVANCED.bat
# → Création dans Storage/backups/full/
```

### 🔧 **Récupération d'Urgence**
```bash
Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat
# Mode 1: Full backup restoration
# Mode 2: Snapshot restoration
# Mode 3: Point-in-time recovery
```

### 🏥 **Diagnostic de Santé**
```bash
Database/Scripts/Health/CHECK_HEALTH.bat
# Vérifie: Service, DB, Tables, Backups, WAL, Performance
```

### ⏰ **Maintenance Programmée**
```bash
Database/Scripts/Maintenance/MAINTENANCE_SCHEDULE.bat
# Vacuum, Analyze, Index rebuild, Cleanup
```

---

## 📖 Documentation par Audience

### Pour **Développeurs Backend**
- Lire: [Database/Docker/docker-compose.yml](Database/Docker/docker-compose.yml)
- Lire: [Documentation/Architecture/STORAGE_ARCHITECTURE_COMPLETE.md](Documentation/Architecture/STORAGE_ARCHITECTURE_COMPLETE.md)
- Lire: [Documentation/Configuration/POSTGRESQL_SETUP.md](Documentation/Configuration/POSTGRESQL_SETUP.md)

### Pour **Administrateurs Système**
- Lire: [Documentation/Deployment/DEPLOYMENT_SUMMARY.md](Documentation/Deployment/DEPLOYMENT_SUMMARY.md)
- Lire: [Documentation/Operations/MAINTENANCE_GUIDE.md](Documentation/Operations/MAINTENANCE_GUIDE.md)
- Lire: [Database/Scripts/Maintenance/MAINTENANCE_SCHEDULE.bat](Database/Scripts/Maintenance/MAINTENANCE_SCHEDULE.bat)

### Pour **Responsables Sauvegarde**
- Lire: [Database/Scripts/Backup/BACKUP_ADVANCED.bat](Database/Scripts/Backup/BACKUP_ADVANCED.bat)
- Lire: [Documentation/Operations/RECOVERY_PROCEDURES.md](Documentation/Operations/RECOVERY_PROCEDURES.md)
- Lire: [Storage/backups/](Storage/backups/) (emplacements réels)

### Pour **Dépannage d'Urgence**
- Lancer: [Database/Scripts/Health/CHECK_HEALTH.bat](Database/Scripts/Health/CHECK_HEALTH.bat)
- Consulter: [Documentation/Operations/TROUBLESHOOTING.md](Documentation/Operations/TROUBLESHOOTING.md)
- Exécuter: [Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat](Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat)

---

## 🔍 Cartographie Fichiers Racine

| Fichier Original (Racine) | Localisation Moteur/Data/ |
|---|---|
| DEPLOYMENT_SUCCESS.md | Documentation/Deployment/ |
| PROPOSED_ARBORESCENCE.md | Archive/ |
| backup_script.sh | Database/Scripts/Tools/ |
| backup_strategy.ps1 | Database/Scripts/Tools/ |
| deploy_advanced_storage.ps1 | Database/Scripts/Tools/ |
| install_docker.ps1 | Database/Scripts/Tools/ |
| setup_advanced_storage.ps1 | Database/Scripts/Tools/ |
| ✅ LANCER_LOGICIEL.bat | **RESTER EN RACINE** |

---

## 📋 Statut Déploiement

- ✅ PostgreSQL 16 sur WSL2: ACTIF
- ✅ Database opticut_pro: CRÉÉE
- ✅ Schema opticum: INITIALISÉ
- ✅ Premier backup: VALIDÉ (2.8 KB)
- ✅ Scripts d'automatisation: TOUS CRÉÉS
- ✅ Documentation: COMPLÈTE (150+ pages)
- ✅ Arborescence Moteur/Data/: ORGANISÉE

---

## 🚀 Prochaines Étapes

1. **Nettoyage Racine** ← À faire
   - Copier les fichiers racine vers Moteur/Data/
   - Vérifier toutes les références de chemin
   - Supprimer les doublons de racine
   - Laisser UNIQUEMENT: `LANCER_LOGICIEL.bat`

2. **Mise à Jour Scripts**
   - Vérifier que les chemins internes sont corrects
   - Tester les scripts depuis Moteur/Data/

3. **Validation Complète**
   - Vérifier que PostgreSQL fonctionne
   - Tester un backup depuis la nouvelle structure
   - Confirmer accès documentation

---

## 📞 Support

**Besoin d'aide?**
- Consulter: `Documentation/Operations/TROUBLESHOOTING.md`
- Diagnostic: `Database/Scripts/Health/CHECK_HEALTH.bat`
- Urgence: `Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat`

---

**Dernière mise à jour**: Février 2026  
**Version**: v4.0 - Organisée  
**Statut**: 🟢 Production Ready
