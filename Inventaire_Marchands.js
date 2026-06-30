/*
NightVenture — Inventaire et marchands
- Recherche objets
- Effets objets
- Équipement / déséquipement
- Filtres et tris inventaire
- Marchands achat / vente / restock
*/

function trouverObjet(id) {
    return Game.cache.objetsParId[id] ?? null;
}

function normaliserTexte(texte) {
    return (texte || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function objetPasseRecherche(objet) {
    if (!Game.ui.rechercheInventaire) return true;
    return normaliserTexte(objet.nom + " " + (objet.description || "") + " " + (objet.type || "") + " " + (objet.rarete || "")).includes(Game.ui.rechercheInventaire);
}

function classeRarete(objet) {
    return objet?.rarete || "commun";
}

function corrigerQuantite(quantite, maximum) {
    if (maximum <= 0) return 0;
    if (isNaN(quantite) || quantite <= 0) return 1;
    return Math.min(quantite, maximum);
}

/* Logique Système : Gestion de l'Inventaire & Équipement OBJETS ET INVENTAIRE */
function ajouterObjetInventaire(idObjet, quantite = 1) {
    const item = Game.data.personnage.inventaire.find(o => o.id === idObjet);
    if (item) {
        item.quantite += quantite;
    } else {
        Game.data.personnage.inventaire.push({ id: idObjet, quantite: quantite });
    }
}

function retirerObjetInventaire(idObjet, quantite = 1) {
    const item = Game.data.personnage.inventaire.find(o => o.id === idObjet);
    if (!item) return false;

    item.quantite -= quantite;
    if (item.quantite <= 0) {
        Game.data.personnage.inventaire = Game.data.personnage.inventaire.filter(o => o.id !== idObjet);
    }
    return true;
}

/*
INVENTAIRE — Suppression d'objet
Remplacé par Start_Save_Classes.js.
Le core ne garde plus l'ancien popup inline.
*/

function possedeObjet(idObjet) {
    return Game.data.personnage.inventaire.some(item => item.id === idObjet && item.quantite > 0);
}

function estFavori(idObjet) {
    Game.data.personnage.favoris ??= [];
    return Game.data.personnage.favoris.includes(idObjet);
}

function appliquerEffetObjet(objet) {
    const personnage =
        Game.data.personnage;

    let effetApplique =
        false;

    /*
        RESSOURCES DIRECTES
        Ces effets restaurent une ressource existante.
    */

    if (objet.soin) {
        if (personnage.pv < pvMaxTotal()) {
            const avant =
                personnage.pv;

            personnage.pv =
                Math.min(
                    personnage.pv + objet.soin,
                    pvMaxTotal()
                );

            const gainReel =
                personnage.pv - avant;

            ajouterJournal(`${objet.nom} utilisée.`);
            ajouterJournal(`❤️ +${gainReel} PV`);

            effetApplique =
                true;
        } else {
            ajouterJournal("Vos PV sont au maximum.");
        }
    }

    if (objet.mana) {
        if (personnage.mana < manaMaxTotal()) {
            const avant =
                personnage.mana;

            personnage.mana =
                Math.min(
                    personnage.mana + objet.mana,
                    manaMaxTotal()
                );

            const gainReel =
                personnage.mana - avant;

            ajouterJournal(`${objet.nom} utilisée.`);
            ajouterJournal(`🔵 +${gainReel} Mana`);

            effetApplique =
                true;
        } else {
            ajouterJournal("Votre mana est au maximum.");
        }
    }

    if (objet.stamina) {
        const staminaActuelle =
            personnage.stamina ?? staminaMaxTotal();

        if (staminaActuelle < staminaMaxTotal()) {
            const avant =
                staminaActuelle;

            personnage.stamina =
                Math.min(
                    staminaActuelle + objet.stamina,
                    staminaMaxTotal()
                );

            const gainReel =
                personnage.stamina - avant;

            ajouterJournal(`${objet.nom} utilisée.`);
            ajouterJournal(`🟢 +${gainReel} Stamina`);

            effetApplique =
                true;
        } else {
            ajouterJournal("Votre stamina est au maximum.");
        }
    }

    /*
        PROGRESSION ET RICHESSE
    */

    if (objet.xp) {
        personnage.xp +=
            objet.xp;

        ajouterJournal(`${objet.nom} utilisée.`);
        ajouterJournal(`⭐ +${objet.xp} XP`);

        verifierMonteeNiveau();

        effetApplique =
            true;
    }

    if (objet.or) {
        personnage.or +=
            objet.or;

        ajouterJournal(`${objet.nom} utilisée.`);
        ajouterJournal(`🟡 +${objet.or} or`);

        effetApplique =
            true;
    }

    /*
        BONUS PERMANENTS DE STATS
        Attention : si un consommable possède ces champs,
        ils seront ajoutés directement au personnage.
    */

    const bonusPermanents = [
        ["force", "FOR"],
        ["dexterite", "DEX"],
        ["intelligence", "INT"],
        ["vitalite", "VIT"],
        ["chance", "LUCK"],

        ["attaque", "ATK"],
        ["defense", "DEF"],
        ["attaqueMagique", "ATK MAGIC"],
        ["defenseMagique", "DEF MAGIC"],

        ["pvMax", "PV MAX"],
        ["manaMax", "MANA MAX"],
        ["staminaMax", "STAMINA MAX"],

        ["critique", "CRITIQUE"],
        ["esquive", "ESQUIVE"],
        ["bonusLoot", "BONUS LOOT"],
        ["bonusOr", "BONUS OR"]
    ];

    bonusPermanents.forEach(([cle, nom]) => {
        const valeur =
            objet[cle];

        if (!valeur) return;

        personnage[cle] =
            (personnage[cle] || 0) + valeur;

        ajouterJournal(`${objet.nom} utilisée.`);
        ajouterJournal(`📈 ${nom} +${valeur}`);

        effetApplique =
            true;
    });

    /*
        Après bonus de stats, on sécurise les ressources.
        Exemple : si VIT ou PV MAX change, les PV restent cohérents.
    */

    corrigerRessources();

    return effetApplique;
}

function utiliserObjet(idObjet) {
    if (!possedeObjet(idObjet)) {
        ajouterJournal("Vous ne possédez pas cet objet.");
        return;
    }

    const objet =
        trouverObjet(idObjet);

    if (!objet) {
        ajouterJournal("Objet introuvable.");
        return;
    }

    if (objet.type !== "consommable") {
        ajouterJournal("Cet objet ne peut pas être utilisé.");
        return;
    }

    const effetApplique =
        appliquerEffetObjet(objet);

    if (!effetApplique) {
        afficherJournal();
        return;
    }

    retirerObjetInventaire(idObjet, 1);

    corrigerRessources();

    rafraichirInterface();
}

function equiperObjet(idObjet, emplacementForce = null) {
    const personnage = Game.data.personnage;
    const objet = trouverObjet(idObjet);
    if (!objet) return;

    if (personnage.niveau < (objet.niveauRequis || 1)) {
        ajouterJournal(`${objet.nom} nécessite le niveau ${objet.niveauRequis}.`);
        return;
    }

    if (!possedeObjet(idObjet)) {
        ajouterJournal("Vous ne possédez pas cet objet.");
        return;
    }

    if (objet.type !== "bague" && Object.values(personnage.equipement).includes(idObjet)) {
        ajouterJournal(`${objet.nom} est déjà équipé.`);
        return;
    }

    let emplacement = objet.type;
    if (objet.type === "bague") emplacement = emplacementForce ?? "bague1";

    if (!personnage.equipement.hasOwnProperty(emplacement)) {
        ajouterJournal("Cet objet ne peut pas être équipé.");
        return;
    }

    const ancienObjet = personnage.equipement[emplacement];
    if (ancienObjet) {
        transfererObjetVersInventaire(ancienObjet);
        const objetRetire = trouverObjet(ancienObjet);
        if (objetRetire) ajouterJournal(`${objetRetire.nom} retiré.`);
    }

    retirerObjetInventaire(idObjet, 1);
    personnage.equipement[emplacement] = idObjet;
    ajouterJournal(`${objet.nom} équipé.`);
}

function desequiperObjet(idObjet) {
    const personnage = Game.data.personnage;
    for (const emplacement in personnage.equipement) {
        if (personnage.equipement[emplacement] === idObjet) {
            personnage.equipement[emplacement] = null;
            ajouterObjetInventaire(idObjet, 1);
            const objet = trouverObjet(idObjet);
            if (objet) ajouterJournal(`${objet.nom} déséquipé.`);
            corrigerRessources();
            rafraichirInterface();
            return;
        }
    }
}

function transfererObjetVersInventaire(idObjet) {
    ajouterObjetInventaire(idObjet, 1);
}

function corrigerRessources() {
    const personnage = Game.data.personnage;
    personnage.pv = Math.max(0, Math.min(personnage.pv, pvMaxTotal()));
    personnage.mana = Math.max(0, Math.min(personnage.mana, manaMaxTotal()));
    personnage.stamina = Math.max(0, Math.min(personnage.stamina ?? staminaMaxTotal(), staminaMaxTotal()));
}

/* Logique Système : Tri, Filtres & Comparaisons OBJETS ET INVENTAIRE */
function creerEtatFiltresInventaireParDefaut() {
    return {
        favoris: false,
        types: {
            arme: "neutre",
            armure: "neutre",
            accessoire: "neutre",
            consommable: "neutre",
            materiau: "neutre",
            quete: "neutre",
            divers: "neutre"
        }
    };
}

function obtenirIdsFiltresTypeInventaire() {
    return Game.constants.filtresInventaire
        .filter(filtre => filtre.categorie === "type")
        .map(filtre => filtre.id);
}

function obtenirTypesActifsInventaire() {
    const etats = Game.ui.etatFiltresInventaire.types;
    return obtenirIdsFiltresTypeInventaire()
        .filter(id => etats[id] === "actif");
}

function obtenirTypesExclusInventaire() {
    const etats = Game.ui.etatFiltresInventaire.types;
    return obtenirIdsFiltresTypeInventaire()
        .filter(id => etats[id] === "exclu");
}

function synchroniserFiltreInventaireLegacy() {
    const actifs = obtenirTypesActifsInventaire();
    const exclus = obtenirTypesExclusInventaire();

    if (Game.ui.etatFiltresInventaire.favoris && actifs.length === 0 && exclus.length === 0) {
        Game.ui.filtreInventaire = "favoris";
        return;
    }

    if (actifs.length === 1 && exclus.length === 0) {
        Game.ui.filtreInventaire = actifs[0];
        return;
    }

    if (actifs.length === 0 && exclus.length === 0 && !Game.ui.etatFiltresInventaire.favoris) {
        Game.ui.filtreInventaire = "tous";
        return;
    }

    Game.ui.filtreInventaire = "personnalise";
}

function reinitialiserFiltresInventaire() {
    Game.ui.etatFiltresInventaire = creerEtatFiltresInventaireParDefaut();
    synchroniserFiltreInventaireLegacy();
}

function rafraichirVueFiltresInventaire() {
    if (Game.ui.vueActive === "marchand" && Game.ui.marchandActuel) {
        ouvrirMarchand(Game.ui.marchandActuel.id);
        return;
    }

    ouvrirInventaire();
}

function cycleEtatFiltre(etatActuel) {
    if (etatActuel === "neutre") return "actif";
    if (etatActuel === "actif") return "exclu";
    return "neutre";
}

function obtenirTypeFiltreObjet(objet) {
    const type = normaliserTexte(objet?.type || "");

    if (type === "arme") return "arme";

    if (["casque", "armure", "gants", "chaussures", "bouclier"].includes(type)) {
        return "armure";
    }

    if (["bague", "collier", "artefact", "accessoire"].includes(type)) {
        return "accessoire";
    }

    if (["consommable", "potion", "nourriture", "parchemin"].includes(type)) {
        return "consommable";
    }

    if ([
        "materiau", "materiaux", "matériau", "matériaux",
        "ressource", "ressources", "composant", "composants"
    ].includes(type)) {
        return "materiau";
    }

    if ([
        "quete", "quête",
        "objet de quete", "objet de quête",
        "objet_quete", "objet quête",
        "quest"
    ].includes(type)) {
        return "quete";
    }

    return "divers";
}

function obtenirEtatBoutonFiltreInventaire(idFiltre) {
    if (idFiltre === "tous") {
        const actifs = obtenirTypesActifsInventaire().length;
        const exclus = obtenirTypesExclusInventaire().length;
        return actifs === 0 && exclus === 0 && !Game.ui.etatFiltresInventaire.favoris
            ? "actif"
            : "neutre";
    }

    if (idFiltre === "favoris") {
        return Game.ui.etatFiltresInventaire.favoris ? "actif" : "neutre";
    }

    return Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
}

function idBoutonFiltreInventaire(idFiltre) {
    return `btnFiltre${idFiltre.charAt(0).toUpperCase()}${idFiltre.slice(1)}`;
}

function creerLibelleEtatFiltre(idFiltre, etat) {
    if (idFiltre === "tous") return "Réinitialiser les filtres";
    if (idFiltre === "favoris") return etat === "actif" ? "Favoris actifs" : "Favoris inactifs";

    if (etat === "actif") return "Filtre actif";
    if (etat === "exclu") return "Filtre exclu";
    return "Filtre neutre";
}

function obtenirItemsFiltresInventaire(items) {
    return trierObjetsInventaire(items).filter(item => {
        const objet = trouverObjet(item.id);
        if (!objet) return false;
        if (!objetPasseFiltre(objet)) return false;
        if (!objetPasseRecherche(objet)) return false;
        return true;
    });
}

function creerBlocAucunResultatInventaire() {
    const nbActifs = obtenirTypesActifsInventaire().length;
    const nbExclus = obtenirTypesExclusInventaire().length;
    const nbTypes = obtenirIdsFiltresTypeInventaire().length;

    let message = "Aucun objet ne correspond aux filtres actuels.";

    if (nbExclus === nbTypes && nbActifs === 0) {
        message = "Tous les types sont exclus. Cliquez sur « Tous » pour réinitialiser les filtres.";
    }

    return `
        <div class="item-card">
            <p class="palette-vide">${message}</p>
        </div>
    `;
}

function objetPasseFiltre(objet) {
    const typeFiltreObjet = obtenirTypeFiltreObjet(objet);
    const etatType = Game.ui.etatFiltresInventaire.types[typeFiltreObjet] || "neutre";

    if (etatType === "exclu") {
        return false;
    }

    const typesActifs = obtenirTypesActifsInventaire();
    if (typesActifs.length > 0 && !typesActifs.includes(typeFiltreObjet)) {
        return false;
    }

    if (Game.ui.etatFiltresInventaire.favoris && !estFavori(objet.id)) {
        return false;
    }

    return true;
}

function trierObjetsInventaire(items) {
    const resultat = [...items].sort((a, b) => {
        const objetA = trouverObjet(a.id);
        const objetB = trouverObjet(b.id);
        if (!objetA || !objetB) return 0;

        switch (Game.ui.triInventaire) {
            case "nom": return objetA.nom.localeCompare(objetB.nom);
            case "type": return objetA.type.localeCompare(objetB.type);
            case "rarete": {
                const ordreRarete = { commun: 1, "peu-commun": 2, rare: 3, epique: 4, legendaire: 5, mythique: 6 };
                return (ordreRarete[objetB.rarete] || 0) - (ordreRarete[objetA.rarete] || 0);
            }
            case "niveau": return (objetB.niveauRequis || 1) - (objetA.niveauRequis || 1);
            case "prix": return (objetB.prix || 0) - (objetA.prix || 0);
            case "atk": return (objetB.attaque || 0) - (objetA.attaque || 0);
            case "atkMagique": return (objetB.attaqueMagique || 0) - (objetA.attaqueMagique || 0);
            case "def": return (objetB.defense || 0) - (objetA.defense || 0);
            case "defMagique": return (objetB.defenseMagique || 0) - (objetA.defenseMagique || 0);
            default: return 0;
        }
    });

    if (Game.ui.ordreTriInventaire === "desc") resultat.reverse();
    return resultat;
}

function valeurObjetComparaison(objet) {
    if (!objet) return 0;
    return (
        (objet.attaque || 0) + (objet.defense || 0) + (objet.attaqueMagique || 0) + (objet.defenseMagique || 0) +
        (objet.pvMax || 0) + (objet.manaMax || 0) + (objet.staminaMax || 0) +
        (objet.force || 0) + (objet.dexterite || 0) + (objet.intelligence || 0) + (objet.vitalite || 0) + (objet.chance || 0)
    );
}

function objetEquipeComparable(objet) {
    const personnage = Game.data.personnage;
    if (!objet) return null;

    if (objet.type === "bague") {
        const bague1 = trouverObjet(personnage.equipement.bague1);
        const bague2 = trouverObjet(personnage.equipement.bague2);

        if (!bague1) return bague2;
        if (!bague2) return bague1;

        const scoreBague1 = valeurObjetComparaison(bague1);
        const scoreBague2 = valeurObjetComparaison(bague2);

        return scoreBague1 >= scoreBague2 ? bague1 : bague2;
    }
    return trouverObjet(personnage.equipement[objet.type]);
}

/* INVENTAIRE — Compatibilité core minimale
Le rendu Inventaire/Marchand est maintenant fourni par :
Inventory_Grid_Metin2.js

Le core garde seulement :
- les fonctions métier : ajouter/retirer/utiliser/équiper/vendre/acheter ;
- les filtres et tris utilisés par le module ;
- des wrappers de secours si le module grille n'est pas chargé.
*/

function equiperObjetInterface(idObjet, emplacement = null) {
    equiperObjet(idObjet, emplacement);
    corrigerRessources();
    rafraichirInterface();
}

function changerFiltreInventaire(filtre) {
    if (filtre === "tous") {
        reinitialiserFiltresInventaire();
        rafraichirVueFiltresInventaire();
        return;
    }

    if (filtre === "favoris") {
        Game.ui.etatFiltresInventaire.favoris =
            !Game.ui.etatFiltresInventaire.favoris;

        synchroniserFiltreInventaireLegacy();
        rafraichirVueFiltresInventaire();
        return;
    }

    const etatActuel =
        Game.ui.etatFiltresInventaire.types[filtre] || "neutre";

    Game.ui.etatFiltresInventaire.types[filtre] =
        cycleEtatFiltre(etatActuel);

    synchroniserFiltreInventaireLegacy();
    rafraichirVueFiltresInventaire();
}

function changerTriInventaire(tri) {
    Game.ui.triInventaire =
        tri;

    Game.ui.ordreTriInventaire =
        Game.constants.ordreTriParCritere[tri] ?? "desc";

    rafraichirVueFiltresInventaire();
}

function inverserOrdreTri() {
    Game.ui.ordreTriInventaire =
        Game.ui.ordreTriInventaire === "asc"
            ? "desc"
            : "asc";

    Game.constants.ordreTriParCritere[Game.ui.triInventaire] =
        Game.ui.ordreTriInventaire;

    rafraichirVueFiltresInventaire();
}

function changerModeMarchand(mode) {
    Game.ui.modeMarchand =
        mode;

    Game.ui.itemSelectionneMarchand =
        null;

    if (Game.ui.vueActive === "marchand" && Game.ui.marchandActuel) {
        ouvrirMarchand(Game.ui.marchandActuel.id);
    }
}

function changerRechercheInventaire(texte) {
    Game.ui.rechercheInventaire =
        normaliserTexte(texte);

    rafraichirVueFiltresInventaire();
}

function basculerFavori(idObjet) {
    Game.data.personnage.favoris ??= [];

    if (estFavori(idObjet)) {
        Game.data.personnage.favoris =
            Game.data.personnage.favoris.filter(id => id !== idObjet);
    } else {
        Game.data.personnage.favoris.push(idObjet);
    }

    rafraichirVueFiltresInventaire();
}

function initialiserSelectionItemsVuePrincipale() {
    /*
        Ancien système de sélection de cartes inventaire supprimé.
        La sélection est maintenant gérée par Inventory_Grid_Metin2.
        Cette fonction reste volontairement en no-op car afficherVuePrincipale()
        l'appelle encore comme point d'extension générique.
    */
}

function ouvrirInventaire() {
    changerVue("inventaire");

    if (typeof window !== "undefined" && typeof window.NVI_ouvrirInventaire === "function") {
        return window.NVI_ouvrirInventaire();
    }

    afficherVuePrincipale(`
        <div class="item-card">
            <h2>🎒 Inventaire</h2>
            <p>
                Le nouveau module d'inventaire en grille n'est pas encore chargé.
            </p>
            <p>
                Vérifie que <strong>Inventory_Grid_Metin2.js</strong>
                est bien ajouté après <strong>script.js</strong>.
            </p>
            <button onclick="ouvrirExploration()">⬅ Retour</button>
        </div>
    `);
}

/* MARCHANDS Logique Système : Transactions & États du Marchand */
function ouvrirMarchand(idPnj) {
    changerVue("marchand");

    if (idPnj) {
        Game.ui.marchandActuel =
            Game.cache.pnjParId[idPnj] ?? null;
    }

    if (!Game.ui.marchandActuel) {
        ajouterJournal("Marchand introuvable.");
        return;
    }

    if (typeof window !== "undefined" && typeof window.NVI_ouvrirMarchand === "function") {
        return window.NVI_ouvrirMarchand(Game.ui.marchandActuel.id);
    }

    afficherVuePrincipale(`
        <div class="item-card">
            <h2>🛒 Marchand</h2>
            <p>
                Le nouveau module d'inventaire/marchand en grille n'est pas encore chargé.
            </p>
            <p>
                Vérifie que <strong>Inventory_Grid_Metin2.js</strong>
                est bien ajouté après <strong>script.js</strong>.
            </p>
            <button onclick="ouvrirExploration()">⬅ Retour</button>
        </div>
    `);
}

function actualiserMarchand() {
    verifierProgressionQuetes();
    if (Game.ui.marchandActuel) ouvrirMarchand(Game.ui.marchandActuel.id);
}

function acheterObjet(idObjet, quantite = 1) {
    if (!Game.ui.marchandActuel) return;
    const objet = trouverObjet(idObjet);
    if (!objet) return;

    const itemMarchand = Game.ui.marchandActuel.inventaire.find(item => item.id === idObjet);
    if (!itemMarchand) return;

    quantite = corrigerQuantite(quantite, itemMarchand.quantite);
    const cout = (objet.prix || 0) * quantite;

    if (Game.data.personnage.or < cout) {
        ajouterJournal("Pas assez d'or.");
        return;
    }

    Game.data.personnage.or -= cout;
    ajouterObjetInventaire(idObjet, quantite);
    itemMarchand.quantite -= quantite;

    if (itemMarchand.quantite <= 0) {
        Game.ui.marchandActuel.inventaire = Game.ui.marchandActuel.inventaire.filter(item => item.id !== idObjet);
    }

    ajouterJournal(`🛒 Achat : ${objet.nom} x${quantite}`);
    actualiserMarchand();
}

function vendreObjet(idObjet, quantite = 1) {
    if (!Game.ui.marchandActuel) {
        ajouterJournal("Aucun marchand sélectionné.");
        return;
    }

    const objet = trouverObjet(idObjet);
    if (!objet) return;

    const itemJoueur = Game.data.personnage.inventaire.find(item => item.id === idObjet);
    if (!itemJoueur) return;

    quantite = corrigerQuantite(quantite, itemJoueur.quantite);
    const gain = Math.floor((objet.prix || 0) / 2) * quantite;
    Game.data.personnage.or += gain;

    retirerObjetInventaire(idObjet, quantite);

    let itemMarchand = Game.ui.marchandActuel.inventaire.find(item => item.id === idObjet);
    if (itemMarchand) itemMarchand.quantite += quantite;
    else Game.ui.marchandActuel.inventaire.push({ id: idObjet, quantite: quantite });

    ajouterJournal(`💰 Vente : ${objet.nom} x${quantite}`);
    actualiserMarchand();
}

function restockerMarchands() {
    Game.data.pnj.forEach(personnagePnj => {
        if (!Array.isArray(personnagePnj.stockInitial)) return;
        personnagePnj.inventaire = JSON.parse(JSON.stringify(personnagePnj.stockInitial));
    });
    ajouterJournal("🛒 Les marchands ont renouvelé leurs stocks.");
}
