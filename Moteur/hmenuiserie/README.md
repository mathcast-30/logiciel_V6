# H Menuiserie - PWA Atelier

Application mobile PWA professionnelle pour atelier de menuiserie.  
Fonctionne hors-ligne et se synchronise avec le logiciel PC.

## 🚀 Installation Rapide

### 1. Installer les certificats HTTPS (une seule fois)

```powershell
# Installer mkcert
winget install FiloSottile.mkcert

# Installer le certificat root
mkcert -install

# Générer les certificats (adapter l'IP si besoin)
cd hmenuiserie
mkcert -key-file key.pem -cert-file cert.pem localhost 192.168.1.46
```

### 2. Démarrer les serveurs

```powershell
# Terminal 1: Backend (depuis logiciel_V4)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 2: PWA (depuis hmenuiserie)
cd hmenuiserie
node server.js
```

### 3. Installer sur téléphone Android

1. Connecter le téléphone au même WiFi que le PC
2. Ouvrir Chrome → `https://192.168.1.46:4443`
3. Accepter le certificat auto-signé
4. Attendre le bandeau "Ajouter à l'écran d'accueil"
5. Installer ✓

## 📱 Fonctionnalités

- **Projets** : Liste des projets en cours
- **Scanner QR** : Scan des planches avec caméra
- **Stock** : Consultation et filtrage du stock
- **Découpes** : Visualisation des optimisations
- **Clients** : Liste des clients

## 🔌 Mode Hors-Ligne

L'application fonctionne **sans connexion** :

- Données mises en cache automatiquement
- Actions enregistrées localement
- Synchronisation automatique à la reconnexion
- Aucune perte de données

## 📁 Structure

```
hmenuiserie/
├── index.html          # Interface
├── style.css           # Styles
├── app.js              # Logique principale
├── manifest.json       # PWA manifest
├── service-worker.js   # Cache offline
├── server.js           # Serveur HTTPS
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── js/
    ├── api.js          # Communication API
    ├── syncQueue.js    # File d'attente offline
    └── qrScanner.js    # Scanner QR
```

## ⚙️ Configuration

Modifier `js/api.js` pour changer l'IP du serveur :

```javascript
// Ligne 4 - adapter l'IP de votre PC
baseURL: 'https://192.168.1.46:8000/api'
```

## 🔧 Dépannage

### Certificat refusé sur téléphone

- Aller dans Paramètres > Sécurité > Installer depuis stockage
- Installer le certificat root mkcert

### Caméra non accessible

- Vérifier les permissions dans Chrome
- HTTPS obligatoire pour la caméra

### Pas de sync avec PC

- Vérifier que les deux appareils sont sur le même réseau
- Vérifier que le backend tourne sur le PC
