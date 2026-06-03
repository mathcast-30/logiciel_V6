# 🚀 QUICK START - OptiCut Pro V4 Advanced Storage

## Démarrage Rapide en 5 Étapes

### ✅ Étape 1: Vérifier l'Installation WSL/Ubuntu
```powershell
# Vérifier que Ubuntu est installé
wsl --list -v

# Si aucune distribution n'est affichée, installer Ubuntu:
wsl --install -d Ubuntu

# Après l'installation, vérifier:
wsl uname -a
```

### ✅ Étape 2: Démarrer PostgreSQL
```powershell
# Démarrer le service PostgreSQL
wsl sudo service postgresql start

# Vérifier le statut
wsl sudo service postgresql status
```

### ✅ Étape 3: Tester la Connexion
```powershell
# Se connecter à la base de test
wsl sudo -u postgres psql -d opticut_pro -U opticut_user -c "SELECT version();"

# Résultat attendu: affiche la version PostgreSQL
```

### ✅ Étape 4: Vérifier la Structure de Données
```powershell
# Vérifier le schéma opticum
wsl sudo -u postgres psql -d opticut_pro -c "SELECT * FROM opticum.metadata;"

# Résultat attendu: affiche les métadonnées
```

### ✅ Étape 5: Créer une Sauvegarde de Test
```powershell
# Créer un backup complet
wsl sudo -u postgres pg_dump -d opticut_pro > C:\OptiCut_Backup\test_backup.sql

# Vérifier le fichier
dir C:\OptiCut_Backup\test_backup.sql
```

---

## 📊 Vérification de Santé Complète

```powershell
# 1. PostgreSQL actif ?
wsl sudo service postgresql status

# 2. Base accessible ?
wsl sudo -u postgres psql -c "SELECT 1;" opticut_pro

# 3. WAL actif ?
wsl ls -la /var/lib/postgresql/wal_archive/ | head

# 4. Checksums OK ?
wsl sudo -u postgres pg_verify_checksums -D /var/lib/postgresql/data

# 5. Espace disque ?
wsl df -h /var/lib/postgresql/
```

---

## 🔗 Connection String pour Applications

### Python (psycopg2)
```python
import psycopg2
conn = psycopg2.connect(
    host="localhost", port=5432, database="opticut_pro",
    user="opticut_user", password="SecureOpticut2024!#"
)
```

### Node.js (pg)
```javascript
const { Client } = require('pg');
const client = new Client({
  host: 'localhost', port: 5432, database: 'opticut_pro',
  user: 'opticut_user', password: 'SecureOpticut2024!#',
});
```

### URI
```
postgresql://opticut_user:SecureOpticut2024!#@localhost:5432/opticut_pro
```

---

## 🛠️ Scripts Disponibles

```powershell
# 1. Vérifier la santé
.\CHECK_HEALTH.bat

# 2. Exécuter une sauvegarde
.\BACKUP_ADVANCED.bat

# 3. Restaurer en cas d'urgence
.\RECOVERY_EMERGENCY.bat

# 4. Maintenance programmée
.\MAINTENANCE_SCHEDULE.bat
```

---

## ⚡ Commandes WSL Utiles

```powershell
# Démarrer PostgreSQL
wsl sudo service postgresql start

# Arrêter PostgreSQL
wsl sudo service postgresql stop

# Voir les logs
wsl sudo tail -50 /var/log/postgresql/postgresql.log

# Entrer dans le shell PostgreSQL
wsl sudo -u postgres psql opticut_pro

# Sauvegarder une base
wsl sudo -u postgres pg_dump opticut_pro > backup.sql

# Restaurer une base
wsl sudo -u postgres psql opticut_pro < backup.sql
```

---

## ✅ Checklist de Validation

- [ ] WSL/Ubuntu installé et actif
- [ ] PostgreSQL service démarré
- [ ] Connexion à la base réussie
- [ ] WAL actif et archivant
- [ ] Checksums validés
- [ ] Répertoires de backup créés
- [ ] Premier backup exécuté
- [ ] Logs consultables

---

**Prêt pour la production!** ✅
