NightVenture — Patch découpage script.js

Ce patch contient uniquement les fichiers concernés par la première extraction de script.js.

Fichiers modifiés :
- index.html
- script.js

Nouveaux fichiers :
- Core_UI.js
- PNJ_Exploration.js
- Inventaire_Marchands.js
- Stats_Niveaux.js
- Quetes_Core.js
- Combat_Legacy.js
- Monde_Exploration.js
- Talents_Core.js
- Personnage_Temps_UI.js
- Journal_Sauvegarde.js
- NightVenture_Boot.js

Important :
- Remplacer index.html et script.js par ceux de ce patch.
- Copier tous les nouveaux fichiers JS à la racine du projet, au même niveau que script.js.
- Le lancement chargerDonnees() a été déplacé dans NightVenture_Boot.js, chargé à la fin de index.html.
- Les fonctions restent globales, sans import/export, pour rester compatible avec ton moteur actuel.

Contrôles effectués :
- Tous les scripts référencés par index.html existent.
- Tous les fichiers JS passent node --check.
