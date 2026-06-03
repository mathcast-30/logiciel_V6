# 📚 Moteur/Data - Architecture de Stockage OptiCut Pro V4

## 🗂️ Structure Hiérarchique

```
Moteur/Data/
│
├── Database/                    ← Configuration & Scripts
│   ├── Configuration/           (Fichiers de config PostgreSQL)
│   ├── Scripts/                 (Scripts d'automatisation)
│   │   ├── Deployment/         (Installation et déploiement)
│   │   ├── Backup/             (Sauvegardes)
│   │   ├── Recovery/           (Restauration)
│   │   ├── Health/             (Diagnostic)
│   │   └── Maintenance/        (Maintenance programmée)
│   └── Docker/                  (Configuration Docker alternative)
│
├── Storage/                     ← Données et Sauvegardes
│   ├── postgres/               (PostgreSQL Data)
│   │   ├── data/              (Base de données)
│   │   └── wal_archive/       (Write-Ahead Logs)
│   ├── backups/               (Sauvegardes)
│   │   ├── full/              (Backups complets)
│   │   ├── wal/               (Archives WAL)
│   │   ├── daily/             (Backups quotidiens)
│   │   └── snapshots/         (Snapshots sauvegardés)
│   └── exports/               (Exports de données)
│
└── Documentation/              ← Guides & Documentation
    ├── Architecture/          (Architecture complète)
    ├── Deployment/            (Guide de déploiement)
    ├── Operations/            (Guide opérationnel)
    ├── Configuration/         (Configuration détaillée)
    └── Reference/             (Référence & Résumés)
```

---

## 📂 Guide de Navigation

### 🔧 Pour Déployer
**Aller à**: `Database/Scripts/Deployment/`
- `DEPLOY_STORAGE.bat` - Création des répertoires
- `COMPLETE_INSTALLATION.bat` - Installation PostgreSQL
- `install_postgres_wsl.sh` - Script Bash pour WSL

**Voir aussi**: `Documentation/Deployment/DEPLOYMENT_SUMMARY.md`

---

### 💾 Pour Sauvegarder
**Aller à**: `Database/Scripts/Backup/`
- `BACKUP_ADVANCED.bat` - Exécuter une sauvegarde

**Emplacements**:
- Backups complets: `Storage/backups/full/`
- WAL archives: `Storage/backups/wal/`
- Backups quotidiens: `Storage/backups/daily/`

---

### 🔄 Pour Restaurer
**Aller à**: `Database/Scripts/Recovery/`
- `RECOVERY_EMERGENCY.bat` - 3 modes de récupération
  1. Full Backup Restore
  2. Snapshot Restore
  3. Point-in-Time Recovery (PITR)

**Données sources**: `Storage/backups/`

---

### 🔍 Pour Diagnostiquer
**Aller à**: `Database/Scripts/Health/`
- `CHECK_HEALTH.bat` - Vérifier la santé du système

**Métriques vérifiées**:
- PostgreSQL actif
- Connectivité base
- Espace disque
- État WAL
- Validité checksums
- Derniers backups

---

### 🛠️ Pour Maintenance
**Aller à**: `Database/Scripts/Maintenance/`
- `MAINTENANCE_SCHEDULE.bat` - Tâches programmées

**Tâches incluses**:
- Vacuum quotidien (08:00)
- Backup tous les 3 jours (19:00)
- Vérification checksums hebdo (dimanche 02:00)
- Nettoyage mensuel (1er jour 03:00)

---

### 📖 Pour Apprendre

#### Démarrage Rapide (5 minutes)
→ `Documentation/Operations/QUICKSTART.md`

#### Résumé de Déploiement
→ `Documentation/Deployment/DEPLOYMENT_SUMMARY.md`

#### Architecture Complète (90+ pages)
→ `Documentation/Architecture/STORAGE_ARCHITECTURE_COMPLETE.md`

#### Résumé Final
→ `Documentation/Reference/FINAL_SUMMARY.md`

#### Inventaire des Livrables
→ `Documentation/Reference/LIVRABLES.md`

---

### ⚙️ Pour Configurer

#### Configuration PostgreSQL Standard
→ `Database/Configuration/postgresql.conf`

#### Configuration PostgreSQL Avancée (Commentée)
→ `Database/Configuration/POSTGRESQL_CONFIG_ADVANCED.conf`

#### Initialisation de la Base
→ `Database/Configuration/init-db.sql`

#### Docker Alternative
→ `Database/Docker/docker-compose.yml`

---

## 🚀 Démarrage Rapide

### 1️⃣ Installer
```powershell
cd Database/Scripts/Deployment
.\DEPLOY_STORAGE.bat
wsl --install -d Ubuntu
.\COMPLETE_INSTALLATION.bat
```

### 2️⃣ Vérifier
```powershell
cd Database/Scripts/Health
.\CHECK_HEALTH.bat
```

### 3️⃣ Sauvegarder
```powershell
cd Database/Scripts/Backup
.\BACKUP_ADVANCED.bat
```

### 4️⃣ Lire Documentation
- Débuter: `Documentation/Operations/QUICKSTART.md`
- Approfondir: `Documentation/Architecture/STORAGE_ARCHITECTURE_COMPLETE.md`

---

## 📊 Connexion à PostgreSQL

```
Host: localhost (WSL)
Port: 5432
Database: opticut_pro
Schema: opticum
User: opticut_user
Password: SecureOpticut2024!#

Connection String:
postgresql://opticut_user:SecureOpticut2024!#@localhost:5432/opticut_pro
```

---

## 🛡️ Points de Sécurité

- ✅ **Checksums**: Détection corruption au niveau disque
- ✅ **WAL**: Zéro perte de transactions
- ✅ **Snapshots**: Cohérence garantie
- ✅ **Backups**: Multiples couches de redondance

---

## 📈 Métriques Clés

| Métrique | Valeur |
|----------|--------|
| **RTO** (Temps Récup) | < 1 heure |
| **RPO** (Perte Max) | < 1 minute |
| **Uptime** | 99.9% attendu |
| **Capacité** | ~100 GB extensible |

---

## ✅ Checklist d'Utilisation

Pour une utilisation optimale :

- [ ] Lire `QUICKSTART.md` (5 min)
- [ ] Exécuter `CHECK_HEALTH.bat` (2 min)
- [ ] Créer un backup test (5 min)
- [ ] Lire `STORAGE_ARCHITECTURE_COMPLETE.md` (30 min)
- [ ] Programmer les backups automatiques
- [ ] Configurer les alertes d'espace disque
- [ ] Tester une restauration

---

## 📞 Aide Rapide

### PostgreSQL ne démarre pas
→ `CHECK_HEALTH.bat` ou `RECOVERY_EMERGENCY.bat`

### Impossible de se connecter
→ `Documentation/Operations/QUICKSTART.md` (Étape 3)

### Créer une sauvegarde
→ `Database/Scripts/Backup/BACKUP_ADVANCED.bat`

### Restaurer une sauvegarde
→ `Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat`

### Vérifier la santé
→ `Database/Scripts/Health/CHECK_HEALTH.bat`

---

## 🎯 Statut du Système

- ✅ PostgreSQL 16 : ACTIF (WSL2 Ubuntu)
- ✅ Database opticut_pro : INITIALISÉE
- ✅ WAL archiving : ACTIF
- ✅ Checksums : ACTIVÉS
- ✅ Premier backup : CRÉÉ
- ✅ Architecture : DÉPLOYÉE ET VALIDÉE

---

**Architecture de Stockage OptiCut Pro V4 - Prête pour la Production** ✅

*Dernière mise à jour: 1er Février 2024*
