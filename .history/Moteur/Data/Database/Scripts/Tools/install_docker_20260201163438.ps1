# Install Docker - Reference Script

> Ce fichier est une REFERENCE ARCHIVÉE.  
> **Status**: PowerShell utility script pour installation Docker
> **Location**: Database/Scripts/Tools/install_docker.ps1

## Contenu Original

Script d'installation automatisée de Docker Desktop sur Windows.

## Fonctionnalités

- ✅ Détection Winget
- ✅ Téléchargement automatique
- ✅ Installation silencieuse
- ✅ Messages de progression

## Alternatives

1. **Recommandé**: Installer Docker Desktop manuellement depuis https://docker.com
2. **CLI**: Utiliser Chocolatey si disponible: `choco install docker-desktop`
3. **WSL2**: Utiliser PostgreSQL natif sur WSL au lieu de Docker

---

**Note**: Docker n'est pas obligatoire car PostgreSQL fonctionne via WSL2.  
Voir [Database/Docker/docker-compose.yml](../Docker/docker-compose.yml) pour alternative containerisée.
