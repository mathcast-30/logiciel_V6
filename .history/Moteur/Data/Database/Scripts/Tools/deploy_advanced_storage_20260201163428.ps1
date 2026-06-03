# Deploy Advanced Storage - PowerShell Script

> Ce fichier est une COPY REFERENCE archivée.  
> **Usage**: Voir Database/Scripts/Deployment/DEPLOY_STORAGE.bat à la place.

Ce script PowerShell automatise le déploiement complet de PostgreSQL et de la structure de stockage avancée sur Windows via WSL2.

## Fonctionnalités

- ✅ Création automatique des répertoires
- ✅ Installation PostgreSQL sur WSL
- ✅ Configuration WAL avancée
- ✅ Création des backups initiaux
- ✅ Validation complète

## Utilisation

```powershell
.\deploy_advanced_storage.ps1
# ou
.\deploy_advanced_storage.ps1 -DataPath "C:\CustomPath" -BackupPath "C:\CustomBackup"
```

---

**Location**: Database/Scripts/Tools/deploy_advanced_storage.ps1  
**Status**: ✅ Archived reference | Voir Database/Scripts/ pour les scripts actifs
