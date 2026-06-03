# OptiCut Pro V4 - Bienvenue! 👋

## 🚀 Démarrer

Ce projet contient OptiCut Pro V4 - Application professionnelle d'optimisation pour menuiserie.

### 📁 Structure Principale

```
logiciel_V4/
├── LANCER_LOGICIEL.bat           ← Lance Backend + Frontend
├── package.json                  ← Dépendances
├── Moteur/
│   ├── Data/                     ← 🔥 TOUTE la documentation stockage
│   ├── Backend/                  ← API FastAPI
│   ├── Frontend/                 ← React 18 + Vite
│   ├── Mobile/                   ← App mobile Capacitor
│   └── UserData/                 ← Données utilisateur
└── System_Scripts/               ← Scripts utilitaires
```

---

## 📚 DOCUMENTATION

### 🔴 **NEW: Stockage Avancé PostgreSQL**

Toute la documentation du système de stockage est organisée dans:

### 👉 **[Moteur/Data/MASTER_INDEX.md](Moteur/Data/MASTER_INDEX.md)**

Ce fichier contient:
- ✅ Structure complète Moteur/Data/
- ✅ Tâches courantes (Backup, Recovery, Health Check)
- ✅ Documentation par audience
- ✅ Guides rapides

**→ C'est le point de départ pour tout ce qui concerne le stockage.**

---

### Autres Guides Importants

| Guide | Location | Pour qui |
|-------|----------|----------|
| **Architecture Stockage** | [Moteur/Data/Documentation/Architecture/](Moteur/Data/Documentation/Architecture/) | Architectes, DevOps |
| **Déploiement** | [Moteur/Data/Documentation/Deployment/](Moteur/Data/Documentation/Deployment/) | Administrateurs |
| **Quick Start** | [Moteur/Data/QUICKSTART.md](Moteur/Data/Documentation/Deployment/QUICKSTART.md) | Tout le monde (5 min) |
| **Nettoyage Racine** | [Moteur/Data/CLEANUP_INSTRUCTIONS.md](Moteur/Data/CLEANUP_INSTRUCTIONS.md) | Administrateurs |
| **Organisation** | [Moteur/Data/ORGANIZATION_STATUS.md](Moteur/Data/ORGANIZATION_STATUS.md) | Administrateurs |

---

## 🔧 Lancer le Logiciel

### Option 1: Launcher Unique (Recommandé)

```bash
# Double-cliquez sur:
LANCER_LOGICIEL.bat

# Cela démarre:
# - Backend PostgreSQL + FastAPI (port 8000)
# - Frontend React (port 5173)
```

### Option 2: Lancer Manuellement

```bash
# Terminal 1 - Backend
cd Moteur/Backend/System/Bin
conda activate opticut_pro
uvicorn app.main:app --reload

# Terminal 2 - Frontend
cd Moteur/Frontend
npm run dev
```

---

## 📊 PostgreSQL - Statut

✅ **PostgreSQL 16 sur WSL2**
- Status: ACTIVE
- Database: opticut_pro
- Schema: opticum
- Backup: Validé ✅

Vérifier le statut:
```bash
wsl sudo service postgresql status
```

---

## 🎯 Tâches Courantes

### Backup
```bash
Moteur/Data/Database/Scripts/Backup/BACKUP_ADVANCED.bat
```

### Diagnostic
```bash
Moteur/Data/Database/Scripts/Health/CHECK_HEALTH.bat
```

### Recovery d'Urgence
```bash
Moteur/Data/Database/Scripts/Recovery/RECOVERY_EMERGENCY.bat
```

### Maintenance
```bash
Moteur/Data/Database/Scripts/Maintenance/MAINTENANCE_SCHEDULE.bat
```

---

## 📖 Documentation Complète

### Pour les Développeurs
- [Backend README](Moteur/Backend/README.md)
- [Frontend README](Moteur/Frontend/README.md)
- [API Reference](Documentation/API_REFERENCE.md)

### Pour les Administrateurs
- [Stockage Architecture](Moteur/Data/Documentation/Architecture/STORAGE_ARCHITECTURE_COMPLETE.md)
- [Deployment Guide](Moteur/Data/Documentation/Deployment/DEPLOYMENT_SUMMARY.md)
- [Operations](Moteur/Data/Documentation/Operations/)

### Pour tout le monde
- [Quick Start](Moteur/Data/Documentation/Deployment/QUICKSTART.md)
- [Final Summary](Moteur/Data/Documentation/Reference/FINAL_SUMMARY.md)
- [Livrables](Moteur/Data/Documentation/Reference/LIVRABLES.md)

---

## 🏆 Statut Projet

| Composant | Status |
|-----------|--------|
| **Backend FastAPI** | ✅ Production |
| **Frontend React 18** | ✅ Production |
| **PostgreSQL 16** | ✅ Actif (WSL2) |
| **Backup/Recovery** | ✅ Automatisé |
| **Documentation** | ✅ Complète |
| **Mobile App** | ✅ Capacitor Ready |
| **Stockage Avancé** | ✅ 🔥 **NOUVEAU** |

---

## ⚠️ Important: Nettoyage Racine

La racine contient actuellement beaucoup de fichiers d'organisation qui **devraient être dans `Moteur/Data/`**.

### À faire:
1. Lire: [Moteur/Data/CLEANUP_INSTRUCTIONS.md](Moteur/Data/CLEANUP_INSTRUCTIONS.md)
2. Exécuter les instructions de nettoyage
3. Garder UNIQUEMENT: `LANCER_LOGICIEL.bat` + `package.json` en racine

Voir documentation pour détails complets.

---

## 🆘 Besoin d'Aide?

### Questions sur le Stockage?
→ [Moteur/Data/MASTER_INDEX.md](Moteur/Data/MASTER_INDEX.md)

### Problèmes de Déploiement?
→ [Moteur/Data/Documentation/Deployment/](Moteur/Data/Documentation/Deployment/)

### Troubleshooting?
→ [Moteur/Data/Documentation/Operations/TROUBLESHOOTING.md](Moteur/Data/Documentation/Operations/TROUBLESHOOTING.md)

### Besoin d'un Backup?
→ [Moteur/Data/Database/Scripts/Backup/BACKUP_ADVANCED.bat](Moteur/Data/Database/Scripts/Backup/BACKUP_ADVANCED.bat)

---

## 📞 Support

Pour toute question:
1. Consulter la documentation appropriée
2. Vérifier les logs dans le terminal
3. Exécuter `CHECK_HEALTH.bat` pour diagnostic

---

## 📅 Informations

- **Version**: 4.0
- **Dernière mise à jour**: Février 2026
- **Stack**: React 18 + Vite | FastAPI | PostgreSQL 16
- **Statut**: 🟢 Production Ready

---

**Bienvenue dans OptiCut Pro V4! 🎉**

Pour commencer → **[Moteur/Data/MASTER_INDEX.md](Moteur/Data/MASTER_INDEX.md)**

---

*Créé par GitHub Copilot (Claude Haiku 4.5)*
