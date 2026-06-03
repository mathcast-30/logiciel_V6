# 📂 FILE ORGANIZATION MAP - Ranger les Fichiers de Racine

## 🗂️ Plan d'Organisation des Fichiers en Racine

Tous les fichiers éparpillés en racine doivent être **rangés dans Moteur/Data/** selon cette hiérarchie :

---

## ✅ Fichiers à Ranger

### 📜 Documentation (→ Documentation/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `STORAGE_ARCHITECTURE_COMPLETE.md` | Documentation/Architecture/ | ✅ |
| `DEPLOYMENT_SUMMARY.md` | Documentation/Deployment/ | ✅ |
| `DEPLOYMENT_SUCCESS.md` | Documentation/Deployment/ | → À créer |
| `QUICKSTART.md` | Documentation/Operations/ | ✅ |
| `FINAL_SUMMARY.md` | Documentation/Reference/ | ✅ |
| `LIVRABLES.md` | Documentation/Reference/ | ✅ |
| `PROPOSED_ARBORESCENCE.md` | Archive/ | → À archiver |
| `INDEX.md` | Moteur/Data/ | ✅ |

### ⚙️ Configuration (→ Database/Configuration/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `postgresql.conf` | Database/Configuration/ | ✅ |
| `POSTGRESQL_CONFIG_ADVANCED.conf` | Database/Configuration/ | ✅ |
| `init-db.sql` | Database/Configuration/ | ✅ |
| `docker-compose.yml` | Database/Docker/ | ✅ |

### 🚀 Scripts Batch (→ Database/Scripts/Deployment/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `DEPLOY_STORAGE.bat` | Database/Scripts/Deployment/ | ✅ |
| `COMPLETE_INSTALLATION.bat` | Database/Scripts/Deployment/ | ✅ |

### 💾 Scripts Backup (→ Database/Scripts/Backup/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `BACKUP_ADVANCED.bat` | Database/Scripts/Backup/ | ✅ |

### 🔄 Scripts Recovery (→ Database/Scripts/Recovery/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `RECOVERY_EMERGENCY.bat` | Database/Scripts/Recovery/ | ✅ |

### 🔍 Scripts Health (→ Database/Scripts/Health/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `CHECK_HEALTH.bat` | Database/Scripts/Health/ | ✅ |

### 🛠️ Scripts Maintenance (→ Database/Scripts/Maintenance/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `MAINTENANCE_SCHEDULE.bat` | Database/Scripts/Maintenance/ | ✅ |

### 📋 Scripts Installation (→ Database/Scripts/Deployment/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `install_postgres_wsl.sh` | Database/Scripts/Deployment/ | ✅ |

### 🧰 Scripts PowerShell Utilities (→ Database/Scripts/Tools/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `backup_script.sh` | Database/Scripts/Tools/ | → À ranger |
| `backup_strategy.ps1` | Database/Scripts/Tools/ | → À ranger |
| `deploy_advanced_storage.ps1` | Database/Scripts/Tools/ | → À ranger |
| `install_docker.ps1` | Database/Scripts/Tools/ | → À ranger |
| `setup_advanced_storage.ps1` | Database/Scripts/Tools/ | → À ranger |

### 📄 Autres (→ Archive/)
| Fichier Racine | Destination | Status |
|---|---|---|
| `PROPOSED_ARBORESCENCE.md` | Archive/ | → À archiver |

---

## 🎯 À Garder en Racine

```
✅ LANCER_LOGICIEL.bat    ← Point d'entrée principal
✅ package.json           ← Configuration Node.js
✅ Documentation/         ← Répertoires existants
✅ Moteur/               ← Répertoires existants
✅ System_Scripts/       ← Répertoires existants
✅ Tools/                ← Répertoires existants
```

---

## 📊 Arborescence Finale Améliorée

```
logiciel_V4/
│
├── LANCER_LOGICIEL.bat        ← POINT D'ENTRÉE (À GARDER)
├── package.json               ← Configuration
│
├── Moteur/
│   ├── Data/                  ← NOUVEAU : Toute la config
│   │   ├── Database/
│   │   │   ├── Configuration/
│   │   │   ├── Scripts/
│   │   │   │   ├── Deployment/
│   │   │   │   ├── Backup/
│   │   │   │   ├── Recovery/
│   │   │   │   ├── Health/
│   │   │   │   ├── Maintenance/
│   │   │   │   └── Tools/        ← NOUVEAU : Scripts PS1
│   │   │   └── Docker/
│   │   ├── Storage/
│   │   ├── Documentation/
│   │   └── Archive/             ← NOUVEAU : Fichiers anciens
│   ├── Frontend/
│   ├── Backend/
│   └── ...
│
├── Documentation/  ← Anciens (À archiver après)
├── System_Scripts/
├── Tools/
└── ...
```

---

## ✨ Améliorations Apportées

### ✅ Nouveau : `Database/Scripts/Tools/`
Pour les scripts PowerShell et Bash utilitaires non directement liés à une opération spécifique.

### ✅ Nouveau : `Archive/`
Pour les fichiers obsolètes ou de référence (PROPOSED_ARBORESCENCE.md, etc.)

### ✅ Résultat Final
- Tous les fichiers ont leur place logique
- Racine nettoyée (juste LANCER_LOGICIEL.bat)
- Structure extensible et maintenable
- Documentation complète intégrée

---

## 🚀 Prochaines Étapes

1. ✅ Tous les fichiers sont CRÉÉS et ORGANISÉS dans Moteur/Data/
2. **À FAIRE** : Supprimer les anciens fichiers de racine
3. **À FAIRE** : Mettre à jour LANCER_LOGICIEL.bat pour pointer vers Moteur/Data/

---

## 📝 Fichiers à Supprimer de Racine (Après Vérification)

```
À SUPPRIMER:
- BACKUP_ADVANCED.bat
- backup_script.sh
- backup_strategy.ps1
- CHECK_HEALTH.bat
- COMPLETE_INSTALLATION.bat
- deploy_advanced_storage.ps1
- DEPLOY_STORAGE.bat
- DEPLOYMENT_SUCCESS.md
- DEPLOYMENT_SUMMARY.md
- docker-compose.yml
- FINAL_SUMMARY.md
- INDEX.md
- init-db.sql
- install_docker.ps1
- install_postgres_wsl.sh
- LIVRABLES.md
- MAINTENANCE_SCHEDULE.bat
- postgresql.conf
- POSTGRESQL_CONFIG_ADVANCED.conf
- PROPOSED_ARBORESCENCE.md
- QUICKSTART.md
- RECOVERY_EMERGENCY.bat
- setup_advanced_storage.ps1
- STORAGE_ARCHITECTURE_COMPLETE.md
```

---

**Organisation Complète** ✅
