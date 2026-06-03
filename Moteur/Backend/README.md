# OptiCut Pro V4 - Backend Engine

Structure professionnelle "Software Standard" pour une maintenance et une sécurité accrues.

## 📂 Architecture des dossiers

* **LAUNCH_OPTICUT_PRO.bat** : Le lanceur unique de l'application.
* **System/** : Contient tout le "moteur" du logiciel.
  * **Bin/** : Code source de l'API (app) et dépendances.
  * **Runtime/** : Environnement d'exécution Python (venv).
  * **Tools/** : Scripts utilitaires (migrations, sauvegardes forcées).
* **Data/** : Toutes les données utilisateur, isolées du moteur.
  * **Database/** : La base de données `opticut.db`.
  * **Exports/** : Tous vos fichiers générés (PDF, Devis, Étiquettes).
  * **Storage/** : Centre de sauvegarde (Backups quotidiens et Archives sécurisées).

## 🚀 Utilisation

Lancez simplement **`LAUNCH_OPTICUT_PRO.bat`** à la racine pour démarrer le système.
Une sauvegarde de sécurité est automatiquement effectuée à chaque lancement.

---
© 2026 OptiCut Pro - Dossier structuré pour performance maximale.
