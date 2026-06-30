/*
NightVenture — Noyau minimal
- État global Game
- Chargement JSON
- Initialisation des caches

Les fonctions métier ont été extraites dans des fichiers JS séparés.
*/

const Game = {
    data: {
        personnage: null,
        historique: null,
        monde: null,
        objets: [],
        pnj: [],
        quetes: [],
        monstres: [],
        talents: [],
        niveaux: [],
        classes: [],
        competences: [],
        ameliorationsCompetences: {},
        regionsMonde: []
    },
    cache: {
        objetsParId: {},
        pnjParId: {},
        quetesParId: {},
        monstresParId: {},
        talentsParId: {},
        classesParId: {},
        competencesParId: {},
        zonesParId: {}
    },
    ui: {
        vueActive: "menu",

        filtreInventaire: "tous",

        etatFiltresInventaire: {
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
        },

        triInventaire: "nom",
        ordreTriInventaire: "asc",
        rechercheInventaire: "",

        objetSuppressionEnAttente: null,

        itemSelectionneInventaire: null,
        itemSelectionneMarchand: null,

        modeMarchand: "achat",
        marchandActuel: null,

        pnjSelectionne: null,
        zoneSelectionnee: null,
        regionSelectionnee: null
    },
    combat: {
        actif: null
    },
    constants: {
        ordreTriParCritere: {
            nom: "asc", type: "asc", rarete: "desc", niveau: "desc",
            prix: "desc", atk: "desc", atkMagique: "desc", def: "desc", defMagique: "desc"
        },
        filtresInventaire: [
            { id: "tous", nom: "Tous", categorie: "systeme" },
            { id: "favoris", nom: "⭐ Favoris", categorie: "modificateur" },

            { id: "arme", nom: "Armes", categorie: "type" },
            { id: "armure", nom: "Armures", categorie: "type" },
            { id: "accessoire", nom: "Accessoires", categorie: "type" },
            { id: "consommable", nom: "Consommables", categorie: "type" },

            { id: "materiau", nom: "Matériaux", categorie: "type" },
            { id: "quete", nom: "Objets de quête", categorie: "type" },
            { id: "divers", nom: "Divers", categorie: "type" }
        ],
        trisInventaire: [
            { id: "nom", nom: "Nom" }, { id: "type", nom: "Type" }, { id: "rarete", nom: "Rareté" },
            { id: "niveau", nom: "Niveau requis" }, { id: "prix", nom: "Prix" },
            { id: "atk", nom: "ATK" }, { id: "atkMagique", nom: "ATK Magique" },
            { id: "def", nom: "DEF" }, { id: "defMagique", nom: "DEF Magique" }
        ]
    },
    config: {
        JOURS_RESTOCK_MARCHAND: 1
    }
};

window.Game = Game;

/* CHARGEMENT DES DONNÉES */
async function chargerDonnees() {
    const chargerJson = async chemin => {
        const reponse = await fetch(chemin);
        const texte = await reponse.text();
        try {
            return JSON.parse(texte);
        } catch (erreur) {
            console.error("Erreur JSON dans :", chemin);
            throw erreur;
        }
    };

    try {
        const [
            historiqueCharge, mondeCharge, quetesChargees, pnjCharges,
            objetsCharges, niveauxCharges, monstresCharges, talentsCharges, classesChargees,
            competencesChargees, ameliorationsCompetencesChargees, zonesChargees
        ] = await Promise.all([
            chargerJson("data/historique.json"), chargerJson("data/monde.json"),
            chargerJson("data/quetes.json"), chargerJson("data/pnj.json"),
            chargerJson("data/objets.json"), chargerJson("data/niveaux.json"),
            chargerJson("data/monstres.json"), chargerJson("data/talents.json"),
            chargerJson("data/classes.json"), chargerJson("data/competences.json"),
            chargerJson("data/ameliorations_competences.json"), chargerJson("data/zones.json")
        ]);

        // Important : aucun personnage n'est instancie au boot.
        // Le personnage est cree uniquement via New Game ou via chargement de sauvegarde.
        Game.data.personnage = null;
        Game.data.historique = historiqueCharge ?? {};
        Game.data.monde = mondeCharge ?? {};

        Game.data.quetes = quetesChargees.quetes ?? quetesChargees ?? [];
        Game.cache.quetesParId = {};
        Game.data.quetes.forEach(quete => { Game.cache.quetesParId[quete.id] = quete; });

        Game.data.pnj = pnjCharges.pnj ?? pnjCharges ?? [];
        Game.cache.pnjParId = {};
        Game.data.pnj.forEach(personnagePnj => {
            Game.cache.pnjParId[personnagePnj.id] = personnagePnj;
            if (Array.isArray(personnagePnj.inventaire)) {
                personnagePnj.stockInitial = JSON.parse(JSON.stringify(personnagePnj.inventaire));
            }
        });

        Game.data.objets = objetsCharges.objets ?? objetsCharges ?? [];
        Game.cache.objetsParId = {};
        Game.data.objets.forEach(objet => { Game.cache.objetsParId[objet.id] = objet; });

        Game.data.niveaux = niveauxCharges.niveaux ?? niveauxCharges ?? [];

        Game.data.monstres = monstresCharges.monstres ?? monstresCharges ?? [];
        Game.cache.monstresParId = {};
        Game.data.monstres.forEach(monstre => { Game.cache.monstresParId[monstre.id] = monstre; });

        Game.data.talents = talentsCharges.talents ?? talentsCharges ?? [];
        Game.cache.talentsParId = {};
        Game.data.talents.forEach(talent => { Game.cache.talentsParId[talent.id] = talent; });

        Game.data.classes = classesChargees.classes ?? classesChargees ?? [];
        Game.cache.classesParId = {};
        Game.data.classes.forEach(classe => {
            if (!classe?.id) return;
            Game.cache.classesParId[classe.id] = classe;
        });

        Game.data.competences = competencesChargees.competences ?? competencesChargees ?? [];
        Game.cache.competencesParId = {};
        Game.data.competences.forEach(competence => {
            if (!competence?.id) return;
            Game.cache.competencesParId[competence.id] = competence;
        });

        Game.data.ameliorationsCompetences = ameliorationsCompetencesChargees ?? {};

        if (typeof window.NV_enregistrerClassesEtCompetences === "function") {
            window.NV_enregistrerClassesEtCompetences();
        }

        if (typeof window.NV_genererItemsAmeliorationCompetences === "function") {
            window.NV_genererItemsAmeliorationCompetences();
        }

        Game.data.regionsMonde = zonesChargees.regions_monde ?? [];
        Game.cache.zonesParId = {};
        Game.data.regionsMonde.forEach(region => {
            if (!Array.isArray(region?.zones)) return;
            region.zones.forEach(zone => { Game.cache.zonesParId[zone.id] = zone; });
        });

        const historique = Game.data.historique;
        historique.journal ??= [];

        Game.data.donneesChargees = true;
        console.log("✅ Donnees NightVenture chargees — aucun personnage instancie au boot.");

        if (typeof window.NV_apresChargementDonnees === "function") {
            window.NV_apresChargementDonnees();
        }
    } catch (erreur) {
        console.error(erreur);
        const vuePrincipale = document.getElementById("vuePrincipale");
        if (vuePrincipale) {
            vuePrincipale.innerHTML = `<p class="message-erreur">Impossible de démarrer le jeu : ${erreur.message}</p>`;
        }
    }
}
