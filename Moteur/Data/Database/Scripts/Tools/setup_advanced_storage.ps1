# Setup Advanced Storage - Reference Script

> Ce fichier est une COPY REFERENCE archivée.  
> **Usage**: Voir Database/Scripts/Deployment/ pour les scripts actifs.

## Contenu Original

Script PowerShell pour configuration avancée du stockage PostgreSQL avec:

- Création structures répertoires
- Vérification Docker
- Configuration docker-compose.yml
- WAL archiving setup
- Backup strategy configuration

## Fonctionnalités

- ✅ Détection Docker
- ✅ Configuration WSL PostgreSQL
- ✅ WAL Advanced Configuration
- ✅ Backup automation setup
- ✅ Health checks

## Utilisation

```powershell
.\setup_advanced_storage.ps1
# ou
.\setup_advanced_storage.ps1 -DataPath "C:\Path" -BackupPath "C:\Backup"
```

---

**Location**: Database/Scripts/Tools/setup_advanced_storage.ps1  
**Actual Usage**: Database/Scripts/Deployment/DEPLOY_STORAGE.bat
