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
    vueActive: "exploration",

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
            personnageCharge, historiqueCharge, mondeCharge, quetesChargees, pnjCharges,
            objetsCharges, niveauxCharges, monstresCharges, talentsCharges, classesChargees, competencesChargees, zonesChargees
        ] = await Promise.all([
            chargerJson("data/personnage.json"), chargerJson("data/historique.json"),
            chargerJson("data/monde.json"), chargerJson("data/quetes.json"),
            chargerJson("data/pnj.json"), chargerJson("data/objets.json"),
            chargerJson("data/niveaux.json"), chargerJson("data/monstres.json"),
            chargerJson("data/talents.json"), chargerJson("data/classes.json"),
            chargerJson("data/competences.json"), chargerJson("data/zones.json")
        ]);

        Game.data.personnage = personnageCharge ?? {};
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

        if (typeof window.NV_enregistrerClassesEtCompetences === "function") {
            window.NV_enregistrerClassesEtCompetences();
        }

        Game.data.regionsMonde = zonesChargees.regions_monde ?? [];
        Game.cache.zonesParId = {};
        Game.data.regionsMonde.forEach(region => {
            if (!Array.isArray(region?.zones)) return;
            region.zones.forEach(zone => { Game.cache.zonesParId[zone.id] = zone; });
        });

        const personnage = Game.data.personnage;
        const historique = Game.data.historique;

        personnage.inventaire ??= [];
        personnage.equipement ??= {};
        personnage.quetes ??= [];
        personnage.talents ??= [];
        personnage.pointsTalent ??= 0;
        personnage.pointsCaracteristiques ??= 0;
        personnage.favoris ??= [];
        
        historique.journal ??= [];

        personnage.pvMax ??= 0;
        personnage.manaMax ??= 0;
        personnage.staminaMax ??= 0;
        personnage.pv ??= 0;
        personnage.mana ??= 0;
        personnage.stamina ??= 0;
        personnage.or ??= 0;
        personnage.xp ??= 0;
        personnage.niveau ??= 1;

        personnage.dernierRestockMarchands ??= personnage.jour ?? 1;
        personnage.regionMondeActuelle ??= Game.data.regionsMonde[0]?.id ?? null;
        
        const zonesInitiales = obtenirZonesActuelles();
        personnage.zoneActuelle ??= zonesInitiales[0]?.id ?? null;
        personnage.zonesDebloquees ??= zonesInitiales.filter(z => z?.debloqueeParDefaut).map(z => z.id);
        
        personnage.jour ??= 1;
        personnage.heure ??= 8;
        personnage.minute ??= 0;

        rafraichirInterface();
    } catch (erreur) {
        console.error(erreur);
        const journal = document.getElementById("journal");
        if (journal) {
            journal.innerHTML = `<p class="message-erreur">Impossible de démarrer le jeu : ${erreur.message}</p>`;
        }
    }
}
