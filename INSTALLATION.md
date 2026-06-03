# Installation et lancement — OptiCut Pro V4

Bienvenue sur OptiCut Pro V4 ! Ce guide vous explique pas-à-pas comment installer le logiciel sur votre ordinateur Windows et l'utiliser au quotidien. 

Pas besoin d'être un expert en informatique pour y arriver, suivez simplement ces étapes.

## 1. Prérequis (à installer une seule fois)

Avant de pouvoir utiliser OptiCut Pro V4, votre ordinateur a besoin de trois outils de base. Téléchargez et installez-les en utilisant les options par défaut (vous pouvez toujours faire "Suivant" lors de l'installation) :

- **Git** : Permet de télécharger le logiciel depuis internet.
  👉 [Télécharger Git pour Windows](https://git-scm.com/download/win)
- **Node.js** (version LTS) : Le moteur qui fait tourner l'interface visuelle du logiciel.
  👉 [Télécharger Node.js](https://nodejs.org/) *(Choisissez le bouton "LTS" / Recommandé pour la plupart des utilisateurs)*
- **Anaconda** (ou Miniconda) : Le moteur qui gère les calculs d'optimisation et la base de données.
  👉 [Télécharger Anaconda](https://www.anaconda.com/download)

*Note : Après avoir installé ces trois programmes, il est fortement recommandé de **redémarrer votre ordinateur** pour que tout soit bien pris en compte.*

## 2. Télécharger le logiciel

1. Ouvrez l'explorateur de fichiers de Windows et allez dans le dossier où vous souhaitez ranger le logiciel (par exemple, dans `Documents`).
2. Faites un clic-droit dans un espace vide du dossier et choisissez **"Ouvrir dans le Terminal"** (ou "Git Bash Here").
3. Tapez exactement la commande suivante, puis appuyez sur la touche "Entrée" :
   ```
   git clone https://github.com/mathcast-30/logiciel_V4
   ```
4. Un nouveau dossier nommé `logiciel_V4` va apparaître. C'est ici que se trouve tout OptiCut Pro V4.

## 3. Créer votre raccourci sur le Bureau

Pour ne pas avoir à fouiller dans vos dossiers tous les matins, nous allons placer un raccourci direct sur votre Bureau.

1. Rentrez dans le dossier `logiciel_V4` que vous venez de télécharger.
2. Cherchez le fichier nommé **`CREATE_SHORTCUT.vbs`** et faites un **double-clic** dessus.
3. Un petit message apparaîtra pour vous confirmer que c'est fait.
4. Regardez votre Bureau Windows : une nouvelle icône en forme d'engrenage nommée **OptiCut Pro V4** est apparue ! Vous n'aurez plus besoin de refaire cette manipulation.

## 4. Démarrer le logiciel au quotidien

Pour utiliser OptiCut Pro V4, **double-cliquez simplement sur l'icône de votre Bureau**.

### Que va-t-il se passer ?
- **Lors du tout premier lancement** : le logiciel va prendre quelques minutes pour télécharger et installer ses engrenages internes. Laissez-le faire tranquillement.
- **Lors des lancements suivants** : cela ne prendra que quelques secondes.
- Vous verrez apparaître brièvement une petite fenêtre d'information, puis **deux fenêtres noires** s'ouvriront. **Surtout, ne les fermez pas**, ce sont les moteurs du logiciel qui tournent en arrière-plan pendant que vous travaillez.
- Au bout d'environ 4 secondes, **votre navigateur internet s'ouvrira tout seul** et affichera l'interface du logiciel. Vous pouvez commencer à optimiser vos coupes !

## 5. Comment arrêter le logiciel proprement

Pour ne perdre aucune donnée et s'assurer qu'une copie de secours de votre travail est bien créée, il ne faut pas fermer violemment les fenêtres noires à la fin de la journée.

1. Allez dans le dossier de votre projet `logiciel_V4`.
2. Faites un double-clic sur le fichier **`STOP_OPTICUT.bat`**.
3. Laissez le programme faire : il va sauvegarder votre base de données en lieu sûr, créer un fichier ZIP de secours, puis éteindre proprement tous les moteurs en arrière-plan.

## 6. Mises à jour

Le logiciel est régulièrement amélioré. Lorsqu'une nouvelle version est disponible (vous recevrez une notification ou vous pourrez le voir sur la page GitHub) :

1. **Assurez-vous que le logiciel est fermé** : Ne lancez jamais une mise à jour pendant une session de travail active. Si OptiCut est ouvert, fermez-le toujours d'abord avec le fichier `STOP_OPTICUT.bat`.
2. **Lancez la mise à jour** : Allez dans votre dossier `logiciel_V4` et faites simplement un double-clic sur le fichier **`UPDATE_OPTICUT.bat`**.
3. Laissez le script travailler : il téléchargera les nouveautés et installera les nouveaux composants de façon autonome.

**Vos données sont en sécurité** :
- La mise à jour est conçue pour préserver vos paramètres et votre base de données.
- En cas de problème, sachez que le script crée toujours une copie de sécurité datée de votre travail dans le dossier `sauvegardes_avant_maj` avant de modifier quoi que ce soit. Rien n'est jamais perdu !

## 7. Foire Aux Questions (FAQ)

### Que faire si le logiciel ne s'ouvre pas ou indique que les "ports 8000/5173" sont déjà utilisés ?
Les moteurs d'OptiCut utilisent des canaux de communication invisibles (les ports 8000 et 5173). Si un autre logiciel ou un ancien démarrage mal fermé utilise déjà ces canaux, OptiCut bloquera.
👉 **Solution** : Double-cliquez sur le fichier `STOP_OPTICUT.bat` pour forcer la libération de ces canaux, puis relancez le logiciel depuis votre Bureau. Vous pouvez aussi simplement redémarrer votre ordinateur.

### Le navigateur s'est ouvert mais la page est blanche ou indique une erreur ?
Cela signifie simplement que le navigateur s'est ouvert une ou deux secondes trop tôt, avant que les moteurs du logiciel ne soient tout à fait prêts.
👉 **Solution** : Patientez 3 secondes, puis cliquez sur le bouton **"Actualiser"** de votre navigateur (la flèche en forme de boucle en haut de l'écran, ou la touche `F5` de votre clavier). L'interface apparaîtra.
