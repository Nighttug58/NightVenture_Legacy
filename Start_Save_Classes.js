/* ============================================================================
   NIGHTVENTURE — START / SAVE / CLASSES / COMPÉTENCES v0.9.9-json
   --------------------------------------------------------------------------
   À charger après :
   - script.js
   - Combats.js
   - Profils_Equipements_Simulateur.js
   - Gameplay_Integration.js
   - Quetes_Extension.js

   Objectif :
   - écran d'accueil New Game / Load Game ;
   - sauvegarde locale navigateur + sauvegarde fichier JSON ;
   - création de personnage depuis data/classes.json ;
   - page compétences par classes depuis data/competences.json ;
   - normalisation de sauvegarde pour éviter les champs undefined.
   ============================================================================ */

(function () {
    "use strict";

    const NV_START_VERSION =
        "v0.9.9-json-classes-competences";

    const NV_SAVE_KEY =
        "NightVenture_Save_v0_9_4";

    const NV_BASE_ACTIONS =
        ["attaque_simple", "defendre", "fuir", "utiliser_objet"];

    const NV_ORDRE_CLASSES =
        ["aventurier", "guerrier", "mage", "voleur", "rodeur", "paladin", "berserker", "assassin", "necromancien", "gardien"];

    const NV_CLASSES_TESTEES = {
        aventurier: {
            id: "aventurier",
            nom: "Aventurier",
            icone: "🧍",
            description: "Profil de secours utilisé uniquement si data/classes.json n'est pas chargé.",
            base: { force: 4, dexterite: 4, intelligence: 4, vitalite: 4, chance: 4 },
            poids: { force: 1, dexterite: 1, intelligence: 1, vitalite: 1, chance: 0.75 },
            bonusCombat: { pvMax: 0, manaMax: 0, staminaMax: 0, attaquePhysique: 0, attaqueMagique: 0, defensePhysique: 0, defenseMagique: 0, critique: 0, esquive: 0, vitesse: 0 },
            competencesDepart: []
        }
    };

    const NV_COMPETENCES_TESTEES = {};

    const NV_COMPETENCES_PAR_CLASSE = {
        aventurier: []
    };

    const NV_EQUIPEMENT_DEPART = {
        aventurier: ["epee_rouillee", "potion_soin"],
        guerrier: ["epee_rouillee", "casque_acier", "armure_cuir", "potion_soin"],
        mage: ["baton_novice", "cape_usee", "anneau_mana", "potion_soin"],
        voleur: ["dague_assassin", "cape_usee", "potion_soin"],
        rodeur: ["anneau_archer", "epee_rouillee", "potion_soin"],
        paladin: ["epee_rouillee", "armure_chevalier", "collier_vie", "potion_soin"],
        berserker: ["hache_bucheron", "potion_soin"],
        assassin: ["dague_assassin", "cape_usee", "potion_soin"],
        necromancien: ["baton_novice", "artefact_ombre", "potion_soin"],
        gardien: ["casque_acier", "armure_chevalier", "potion_soin"]
    };

    const NV_ETAT = {
        mode: "menu",
        donneesChargees: false,
        premiereInterface: true,
        autosaveTimer: null,
        autosaveEnCours: false,
        classeCompetencesSelectionnee: null
    };

    function NV_escape(texte) {
        return String(texte ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function NV_cloner(objet) {
        return JSON.parse(JSON.stringify(objet));
    }

    function NV_clamp(nombre, min, max) {
        return Math.max(min, Math.min(max, Number(nombre) || 0));
    }

    function NV_arrondir(nombre, decimales = 0) {
        const facteur = Math.pow(10, decimales);
        return Math.round((Number(nombre) || 0) * facteur) / facteur;
    }

    function NV_indexerListeParId(liste) {
        if (!Array.isArray(liste)) return {};

        return liste.reduce((accumulateur, entree) => {
            if (entree?.id) {
                accumulateur[entree.id] = entree;
            }

            return accumulateur;
        }, {});
    }

    function NV_obtenirClasses() {
        const classesDepuisJson =
            NV_indexerListeParId(Game.data?.classes);

        const sourcePrincipale =
            Object.keys(classesDepuisJson).length
                ? classesDepuisJson
                : NV_CLASSES_TESTEES;

        if (window.PEQ_CLASSES && typeof window.PEQ_CLASSES === "object") {
            return {
                ...sourcePrincipale,
                ...window.PEQ_CLASSES
            };
        }

        return sourcePrincipale;
    }

    function NV_obtenirClasse(classeId) {
        const classes =
            NV_obtenirClasses();

        return classes[classeId] || classes.aventurier || NV_CLASSES_TESTEES.aventurier;
    }

    function NV_calculerPointsStatsDisponibles(niveau) {
        const niveauCorrige =
            Math.max(1, Number(niveau) || 1);

        return 8 + (niveauCorrige - 1) * 4;
    }

    function NV_repartirPointsStatsSelonClasse(niveau, classeId = "aventurier") {
        if (typeof window.PEQ_repartirPointsStatsSelonClasse === "function") {
            try {
                return window.PEQ_repartirPointsStatsSelonClasse(niveau, classeId);
            } catch (erreur) {
                console.warn("Fallback répartition classe utilisé :", erreur);
            }
        }

        const classe =
            NV_obtenirClasse(classeId);

        const stats = {
            force: Number(classe.base.force) || 0,
            dexterite: Number(classe.base.dexterite) || 0,
            intelligence: Number(classe.base.intelligence) || 0,
            vitalite: Number(classe.base.vitalite) || 0,
            chance: Number(classe.base.chance) || 0
        };

        const poids =
            classe.poids || NV_obtenirClasse("aventurier").poids || NV_CLASSES_TESTEES.aventurier.poids;

        const pointsDisponibles =
            NV_calculerPointsStatsDisponibles(niveau);

        const totalPoids =
            Object.values(poids)
                .reduce((total, valeur) => total + (Number(valeur) || 0), 0);

        const restes = [];
        let pointsAttribues = 0;

        Object.keys(stats).forEach(stat => {
            const partExacte =
                pointsDisponibles * ((Number(poids[stat]) || 0) / totalPoids);

            const points =
                Math.floor(partExacte);

            stats[stat] += points;
            pointsAttribues += points;

            restes.push({
                stat,
                reste: partExacte - points
            });
        });

        let pointsRestants =
            pointsDisponibles - pointsAttribues;

        restes
            .sort((a, b) => b.reste - a.reste)
            .forEach(entree => {
                if (pointsRestants <= 0) return;

                stats[entree.stat] += 1;
                pointsRestants -= 1;
            });

        return {
            ...stats,
            pointsDisponibles,
            classeId: classe.id,
            classeNom: classe.nom,
            classeDescription: classe.description
        };
    }

    function NV_calculerPreviewClasse(classeId) {
        const classe =
            NV_obtenirClasse(classeId);

        const repartition =
            NV_repartirPointsStatsSelonClasse(1, classe.id);

        const bonus =
            classe.bonusCombat || {};

        const force =
            Number(repartition.force) || 0;

        const dexterite =
            Number(repartition.dexterite) || 0;

        const intelligence =
            Number(repartition.intelligence) || 0;

        const vitalite =
            Number(repartition.vitalite) || 0;

        const chance =
            Number(repartition.chance) || 0;

        return {
            classe,
            force,
            dexterite,
            intelligence,
            vitalite,
            chance,

            pvMax:
                Math.round(100 + vitalite * 10 + (Number(bonus.pvMax) || 0)),

            manaMax:
                Math.round(50 + intelligence * 10 + (Number(bonus.manaMax) || 0)),

            staminaMax:
                Math.round(100 + dexterite * 5 + (Number(bonus.staminaMax) || 0)),

            attaquePhysique:
                NV_arrondir(force * 2 + (Number(bonus.attaquePhysique) || 0), 1),

            defensePhysique:
                NV_arrondir(vitalite * 2 + (Number(bonus.defensePhysique) || 0), 1),

            attaqueMagique:
                NV_arrondir(intelligence * 2 + (Number(bonus.attaqueMagique) || 0), 1),

            defenseMagique:
                NV_arrondir(vitalite * 2 + (Number(bonus.defenseMagique) || 0), 1),

            critique:
                NV_arrondir(dexterite * 0.5 + (Number(bonus.critique) || 0), 1),

            esquive:
                NV_arrondir(dexterite * 0.5 + (Number(bonus.esquive) || 0), 1),

            vitesse:
                NV_arrondir(dexterite * 0.5 + (Number(bonus.vitesse) || 0), 1)
        };
    }

    function NV_listeCompetencesClasse(classeId, inclureBase = true) {
        const classe =
            NV_obtenirClasse(classeId);

        const speciales =
            Array.isArray(classe?.competencesDepart)
                ? classe.competencesDepart
                : NV_COMPETENCES_PAR_CLASSE[classeId] || [];

        return [
            ...(inclureBase ? NV_BASE_ACTIONS : []),
            ...speciales
        ].filter((id, index, tableau) => tableau.indexOf(id) === index);
    }

    function NV_nomActionBase(idAction) {
        const noms = {
            attaque_simple: "Attaque simple",
            defendre: "Défendre",
            fuir: "Fuir",
            utiliser_objet: "Utiliser un objet"
        };

        return noms[idAction] || idAction;
    }

    function NV_obtenirCompetence(idCompetence) {
        const competenceDepuisJson =
            Array.isArray(Game.data?.competences)
                ? Game.data.competences.find(competence => competence?.id === idCompetence)
                : null;

        return (
            Game.cache?.competencesParId?.[idCompetence] ||
            competenceDepuisJson ||
            NV_COMPETENCES_TESTEES[idCompetence] ||
            {
                id: idCompetence,
                nom: NV_nomActionBase(idCompetence),
                typeAction: "action",
                nature: "base",
                couts: {},
                coutInitiative: 100,
                puissance: 0,
                multiplicateur: 1,
                description: "Action de base."
            }
        );
    }

    function NV_normaliserClasseCombat(classe) {
        const competencesDepart =
            Array.isArray(classe?.competencesDepart)
                ? classe.competencesDepart
                : NV_listeCompetencesClasse(classe?.id, false);

        return {
            id: classe.id,
            nom: classe.nom,
            icone: classe.icone,
            description: classe.description,
            base: classe.base || classe.statsDepart || {},
            statsDepart: classe.statsDepart || classe.base || {},
            ressourcesDepart: classe.ressourcesDepart,
            poids: classe.poids || {},
            bonusCombat: classe.bonusCombat || {},
            ordre: classe.ordre,
            competencesDepart
        };
    }

    function NV_enregistrerClassesEtCompetences() {
        if (!window.Game) return;

        Game.data ??= {};
        Game.cache ??= {};

        Game.data.classes ??= [];
        Game.data.competences ??= [];
        Game.cache.classesParId = {};
        Game.cache.competencesParId = {};

        const competencesSource =
            Array.isArray(Game.data.competences) && Game.data.competences.length
                ? Game.data.competences
                : Object.values(NV_COMPETENCES_TESTEES);

        Game.data.competences =
            competencesSource
                .filter(competence => competence?.id)
                .map(competence => ({ ...competence }));

        Game.data.competences.forEach(competence => {
            Game.cache.competencesParId[competence.id] = competence;
        });

        const classesSource =
            Object.values(NV_obtenirClasses())
                .filter(classe => classe?.id)
                .map(classe => NV_normaliserClasseCombat(classe));

        Game.data.classes =
            classesSource;

        Game.data.classes.forEach(classe => {
            Game.cache.classesParId[classe.id] = classe;
        });
    }

    function NV_obtenirZonesDebloqueesDefaut() {
        const zones =
            typeof obtenirZonesActuelles === "function"
                ? obtenirZonesActuelles()
                : [];

        const debloquees =
            zones
                .filter(zone => zone?.debloqueeParDefaut)
                .map(zone => zone.id);

        return debloquees.length
            ? debloquees
            : ["auberge_griffon", "place_marche", "foret_brumes", "tour_mage"];
    }

    function NV_obtenirZoneDepart() {
        const zones =
            typeof obtenirZonesActuelles === "function"
                ? obtenirZonesActuelles()
                : [];

        return (
            zones.find(zone => zone?.debloqueeParDefaut)?.id ||
            zones[0]?.id ||
            "auberge_griffon"
        );
    }

    function NV_creerInventaireDepart(classeId) {
        const ids =
            NV_EQUIPEMENT_DEPART[classeId] || NV_EQUIPEMENT_DEPART.aventurier;

        const quantites = {};

        ids.forEach(id => {
            quantites[id] =
                (quantites[id] || 0) + (id === "potion_soin" ? 5 : 1);
        });

        return Object.entries(quantites).map(([id, quantite]) => ({
            id,
            quantite
        }));
    }

    function NV_calculerRessourcesDepuisPersonnage(personnage) {
        const pv =
            100 + (Number(personnage.vitalite) || 0) * 10 + (Number(personnage.pvMax) || 0);

        const mana =
            50 + (Number(personnage.intelligence) || 0) * 10 + (Number(personnage.manaMax) || 0);

        const stamina =
            100 + (Number(personnage.dexterite) || 0) * 5 + (Number(personnage.staminaMax) || 0);

        return {
            pv: Math.max(1, Math.round(pv)),
            mana: Math.max(0, Math.round(mana)),
            stamina: Math.max(1, Math.round(stamina))
        };
    }

    function NV_creerPersonnageNouveau(classeId, nom) {
        const classe =
            NV_obtenirClasse(classeId);

        const repartition =
            NV_repartirPointsStatsSelonClasse(1, classe.id);

        const bonus =
            classe.bonusCombat || {};

        const personnage = {
            nom: nom?.trim() || "Nighttug58",

            classe: classe.nom,
            classeId: classe.id,
            classeNom: classe.nom,
            classeIcone: classe.icone,
            classeDescription: classe.description,

            niveau: 1,
            xp: 0,

            pointsCaracteristiques: 0,
            pointsTalent: 0,

            force: Number(repartition.force) || 4,
            dexterite: Number(repartition.dexterite) || 4,
            intelligence: Number(repartition.intelligence) || 4,
            vitalite: Number(repartition.vitalite) || 4,
            chance: Number(repartition.chance) || 4,

            pvMax: Math.round(Number(bonus.pvMax) || 0),
            manaMax: Math.round(Number(bonus.manaMax) || 0),
            staminaMax: Math.round(Number(bonus.staminaMax) || 0),

            attaque: Number(bonus.attaquePhysique) || 0,
            defense: Number(bonus.defensePhysique) || 0,
            attaqueMagique: Number(bonus.attaqueMagique) || 0,
            defenseMagique: Number(bonus.defenseMagique) || 0,
            critique: Number(bonus.critique) || 0,
            esquive: Number(bonus.esquive) || 0,
            vitesse: Number(bonus.vitesse) || 0,

            bonusLoot: 0,
            bonusOr: 0,

            or: 50,

            jour: 1,
            heure: 8,
            minute: 0,
            dernierRestockMarchands: 1,

            regionMondeActuelle:
                Game.data?.regionsMonde?.[0]?.id || "aetheria",

            zoneActuelle:
                NV_obtenirZoneDepart(),

            zonesDebloquees:
                NV_obtenirZonesDebloqueesDefaut(),

            zonesVisitees: [],

            quetes: [],
            talents: [],
            competences:
                NV_listeCompetencesClasse(classe.id, true),

            progressionQuetes: {
                arcsRecompenses: {}
            },

            progressionCombat: {
                bossPersistants: {},
                miniBossUniques: {}
            },

            equipement: {
                arme: null,
                casque: null,
                armure: null,
                gants: null,
                chaussures: null,
                collier: null,
                bague1: null,
                bague2: null,
                artefact: null
            },

            inventaire:
                NV_creerInventaireDepart(classe.id),

            favoris: [],
            effetsActifs: []
        };

        const ressources =
            NV_calculerRessourcesDepuisPersonnage(personnage);

        personnage.pv =
            ressources.pv;

        personnage.mana =
            ressources.mana;

        personnage.stamina =
            ressources.stamina;

        return personnage;
    }

    function NV_normaliserInventaire(personnage) {
        const inventaire =
            Array.isArray(personnage.inventaire)
                ? personnage.inventaire
                : [];

        const map =
            new Map();

        inventaire.forEach(entree => {
            if (!entree) return;

            const id =
                typeof entree === "string"
                    ? entree
                    : entree.id;

            if (!id) return;

            const quantite =
                typeof entree === "string"
                    ? 1
                    : Math.max(1, Number(entree.quantite || 1));

            map.set(id, (map.get(id) || 0) + quantite);
        });

        personnage.inventaire =
            Array.from(map.entries()).map(([id, quantite]) => ({
                id,
                quantite
            }));
    }

    function NV_normaliserQuetes(personnage) {
        personnage.quetes =
            Array.isArray(personnage.quetes)
                ? personnage.quetes
                : [];

        personnage.quetes =
            personnage.quetes
                .filter(q => q && q.id)
                .map(q => ({
                    id: q.id,
                    progression: Number(q.progression || 0),
                    etat: q.etat || "en_cours",
                    details: q.details || {},
                    ...q
                }));
    }

    function NV_normaliserPersonnage(personnage = Game.data?.personnage) {
        if (!personnage) return null;

        personnage.nom ??= "Nighttug58";
        personnage.classeId ??= String(personnage.classe || "aventurier")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");

        const classe =
            NV_obtenirClasse(personnage.classeId);

        personnage.classeId =
            classe.id;

        personnage.classe =
            personnage.classe || classe.nom;

        personnage.classeNom ??=
            classe.nom;

        personnage.classeIcone ??=
            classe.icone;

        personnage.classeDescription ??=
            classe.description;

        personnage.niveau ??= 1;
        personnage.xp ??= 0;
        personnage.or ??= 0;

        const repartition =
            NV_repartirPointsStatsSelonClasse(personnage.niveau || 1, classe.id);

        personnage.force ??= repartition.force;
        personnage.dexterite ??= repartition.dexterite;
        personnage.intelligence ??= repartition.intelligence;
        personnage.vitalite ??= repartition.vitalite;
        personnage.chance ??= repartition.chance;

        personnage.pointsCaracteristiques ??= 0;
        personnage.pointsTalent ??= 0;

        personnage.pvMax ??= 0;
        personnage.manaMax ??= 0;
        personnage.staminaMax ??= 0;

        personnage.attaque ??= 0;
        personnage.defense ??= 0;
        personnage.attaqueMagique ??= 0;
        personnage.defenseMagique ??= 0;
        personnage.critique ??= 0;
        personnage.esquive ??= 0;
        personnage.vitesse ??= 0;
        personnage.bonusLoot ??= 0;
        personnage.bonusOr ??= 0;

        personnage.regionMondeActuelle ??=
            Game.data?.regionsMonde?.[0]?.id || "aetheria";

        personnage.zoneActuelle ??=
            NV_obtenirZoneDepart();

        personnage.zonesDebloquees ??=
            NV_obtenirZonesDebloqueesDefaut();

        personnage.zonesVisitees ??= [];
        personnage.favoris ??= [];
        personnage.talents ??= [];
        personnage.effetsActifs ??= [];

        personnage.jour ??= 1;
        personnage.heure ??= 8;
        personnage.minute ??= 0;
        personnage.dernierRestockMarchands ??= personnage.jour ?? 1;

        personnage.progressionQuetes ??= {};
        personnage.progressionQuetes.arcsRecompenses ??= {};

        personnage.progressionCombat ??= {};
        personnage.progressionCombat.bossPersistants ??= {};
        personnage.progressionCombat.miniBossUniques ??= {};

        personnage.competences ??=
            NV_listeCompetencesClasse(classe.id, true);

        personnage.equipement ??= {};
        personnage.equipement.arme ??= null;
        personnage.equipement.casque ??= null;
        personnage.equipement.armure ??= null;
        personnage.equipement.gants ??= null;
        personnage.equipement.chaussures ??= null;
        personnage.equipement.collier ??= null;
        personnage.equipement.bague1 ??= null;
        personnage.equipement.bague2 ??= null;
        personnage.equipement.artefact ??= null;

        NV_normaliserInventaire(personnage);
        NV_normaliserQuetes(personnage);

        const ressources =
            NV_calculerRessourcesDepuisPersonnage(personnage);

        personnage.pv =
            NV_clamp(personnage.pv ?? ressources.pv, 1, ressources.pv);

        personnage.mana =
            NV_clamp(personnage.mana ?? ressources.mana, 0, ressources.mana);

        personnage.stamina =
            NV_clamp(personnage.stamina ?? ressources.stamina, 0, ressources.stamina);

        return personnage;
    }

    function NV_normaliserSauvegarde(save) {
        const sauvegarde =
            save || {};

        sauvegarde.personnage ??=
            NV_creerPersonnageNouveau("aventurier", "Nighttug58");

        sauvegarde.historique ??= {};
        sauvegarde.historique.journal ??= [];

        sauvegarde.monde ??= Game.data?.monde ?? {};

        sauvegarde.versionNightVenture ??=
            NV_START_VERSION;

        NV_normaliserPersonnage(sauvegarde.personnage);

        return sauvegarde;
    }

    function NV_appliquerSauvegarde(save, message = "📂 Sauvegarde chargée.") {
        const sauvegarde =
            NV_normaliserSauvegarde(save);

        Game.data.personnage =
            sauvegarde.personnage;

        Game.data.historique =
            sauvegarde.historique;

        Game.data.monde =
            sauvegarde.monde ?? {};

        Game.ui.pnjSelectionne =
            null;

        NV_ETAT.mode =
            "playing";

        document.body.classList.remove("nv-start-mode");

        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        }

        if (typeof ouvrirExploration === "function") {
            Game.ui.vueActive =
                "exploration";
        }

        NV_sauvegarderLocalSilencieux();

        NV_originalRafraichirInterface();
    }

    function NV_creerSauvegarde() {
        const baseSave =
            typeof creerSauvegarde === "function"
                ? creerSauvegarde()
                : {
                    personnage: Game.data?.personnage,
                    historique: Game.data?.historique,
                    monde: Game.data?.monde
                };

        return NV_normaliserSauvegarde({
            ...baseSave,
            versionNightVenture: NV_START_VERSION,
            dateSauvegarde: new Date().toISOString()
        });
    }

    function NV_sauvegardeLocaleExiste() {
        try {
            return Boolean(localStorage.getItem(NV_SAVE_KEY));
        } catch (erreur) {
            return false;
        }
    }

    function NV_sauvegarderLocalSilencieux() {
        try {
            const save =
                NV_creerSauvegarde();

            localStorage.setItem(
                NV_SAVE_KEY,
                JSON.stringify(save)
            );

            return true;
        } catch (erreur) {
            console.warn("Sauvegarde locale impossible :", erreur);
            return false;
        }
    }

    function NV_chargerLocal() {
        try {
            const texte =
                localStorage.getItem(NV_SAVE_KEY);

            if (!texte) {
                alert("Aucune sauvegarde navigateur trouvée.");
                return;
            }

            NV_appliquerSauvegarde(
                JSON.parse(texte),
                "📂 Sauvegarde navigateur chargée."
            );
        } catch (erreur) {
            console.error(erreur);
            alert("Impossible de charger la sauvegarde navigateur.");
        }
    }

    function NV_supprimerSauvegardeLocale() {
        try {
            localStorage.removeItem(NV_SAVE_KEY);
            NV_ouvrirEcranAccueil();
        } catch (erreur) {
            console.warn(erreur);
        }
    }

    function NV_telechargerSauvegarde() {
        const saveData =
            NV_creerSauvegarde();

        NV_sauvegarderLocalSilencieux();

        const json =
            JSON.stringify(saveData, null, 2);

        const blob =
            new Blob([json], { type: "application/json" });

        const url =
            URL.createObjectURL(blob);

        const a =
            document.createElement("a");

        a.href =
            url;

        a.download =
            `NightVenture_save_${Game.data.personnage?.nom || "personnage"}.json`;

        a.click();

        URL.revokeObjectURL(url);

        if (typeof ajouterJournal === "function") {
            ajouterJournal("💾 Partie sauvegardée localement et exportée.");
        }
    }

    async function NV_chargerFichier(file) {
        if (!file) return;

        try {
            const text =
                await file.text();

            const save =
                JSON.parse(text);

            NV_appliquerSauvegarde(
                save,
                "📂 Sauvegarde fichier chargée."
            );
        } catch (erreur) {
            console.error(erreur);
            alert("Impossible de lire cette sauvegarde JSON.");
        }
    }

    function NV_roleClasse(classeId) {
        const roles = {
            aventurier: "Polyvalent",
            guerrier: "Offensive physique",
            mage: "Magie offensive",
            voleur: "Critique / esquive",
            rodeur: "Mobilité / précision",
            paladin: "Tank sacré hybride",
            berserker: "Dégâts bruts",
            assassin: "Burst critique",
            necromancien: "Magie sombre durable",
            gardien: "Défense extrême"
        };

        return roles[classeId] || "Spécialisation";
    }

    function NV_statsMajeuresClasse(classe) {
        const stats = [
            ["FOR", Number(classe.base?.force || 0) + Number(classe.poids?.force || 0) * 2],
            ["DEX", Number(classe.base?.dexterite || 0) + Number(classe.poids?.dexterite || 0) * 2],
            ["INT", Number(classe.base?.intelligence || 0) + Number(classe.poids?.intelligence || 0) * 2],
            ["VIT", Number(classe.base?.vitalite || 0) + Number(classe.poids?.vitalite || 0) * 2],
            ["LUCK", Number(classe.base?.chance || 0) + Number(classe.poids?.chance || 0) * 2]
        ];

        return stats
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(entree => entree[0]);
    }

    function NV_resumeCoutsCompetence(competence) {
        const coutMana =
            Number(competence.couts?.mana || 0);

        const coutStamina =
            Number(competence.couts?.stamina || 0);

        return [
            coutMana ? `Mana ${coutMana}` : "",
            coutStamina ? `Stamina ${coutStamina}` : ""
        ].filter(Boolean).join(" · ") || "Aucun coût";
    }

    function NV_resumePuissanceCompetence(competence) {
        return [
            competence.nature ? NV_escape(competence.nature) : "base",
            competence.puissance ? `Puissance ${NV_escape(competence.puissance)}` : "",
            competence.multiplicateur ? `x${NV_escape(competence.multiplicateur)}` : "",
            `Init. ${Number(competence.coutInitiative || 100)}`
        ].filter(Boolean).join(" · ");
    }

    function NV_nomEvolutionClasse(classeId, index) {
        const evolutions = {
            aventurier: ["Adaptation avancée", "Maîtrise hybride", "Explorateur légendaire"],
            guerrier: ["Garde brisée", "Enchaînement lourd", "Maître d’armes"],
            mage: ["Surcharge arcanique", "Barrière runique", "Archimage"],
            voleur: ["Pas fantôme", "Lame opportuniste", "Ombre insaisissable"],
            rodeur: ["Tir d’ouverture", "Instinct sauvage", "Traqueur royal"],
            paladin: ["Aura protectrice", "Châtiment sacré", "Champion lumineux"],
            berserker: ["Rage montante", "Blessure ouverte", "Avatar de guerre"],
            assassin: ["Ouverture mortelle", "Disparition", "Exécuteur"],
            necromancien: ["Drain vital", "Marque funeste", "Seigneur des ombres"],
            gardien: ["Mur vivant", "Provocation", "Forteresse immortelle"]
        };

        return (evolutions[classeId] || evolutions.aventurier)[index] || "Évolution future";
    }

    function NV_creerNoeudArbreCompetence(options) {
        const etat =
            options.etat || "locked";

        const classeEtat =
            etat === "unlocked"
                ? "nv-skill-node--unlocked"
                : etat === "root"
                    ? "nv-skill-node--root"
                    : "nv-skill-node--locked";

        return `
            <article class="nv-skill-node ${classeEtat}">
                <div class="nv-skill-node__top">
                    <span class="nv-skill-node__icon">${NV_escape(options.icone || "◇")}</span>
                    <strong>${NV_escape(options.titre || "Compétence")}</strong>
                </div>

                <p>${NV_escape(options.description || "")}</p>

                <div class="nv-skill-node__tags">
                    ${(options.tags || []).map(tag => `<span>${NV_escape(tag)}</span>`).join("")}
                </div>
            </article>
        `;
    }

    function NV_creerArbreCompetenceClasse(classeId, options = {}) {
        const classe =
            NV_obtenirClasse(classeId);

        const preview =
            NV_calculerPreviewClasse(classe.id);

        const statsMajeures =
            NV_statsMajeuresClasse(classe);

        const speciales =
            NV_listeCompetencesClasse(classe.id, false)
                .map(id => NV_obtenirCompetence(id));

        const base =
            NV_BASE_ACTIONS.map(id => NV_obtenirCompetence(id));

        const specialNodes =
            speciales.length
                ? speciales.map(competence => NV_creerNoeudArbreCompetence({
                    etat: "unlocked",
                    icone: "⚔",
                    titre: competence.nom,
                    description: competence.description || "Compétence de classe.",
                    tags: [
                        competence.nature || "classe",
                        NV_resumeCoutsCompetence(competence),
                        NV_resumePuissanceCompetence(competence)
                    ]
                })).join("")
                : NV_creerNoeudArbreCompetence({
                    etat: "unlocked",
                    icone: "🧭",
                    titre: "Adaptabilité",
                    description: "Aucune compétence spécialisée au départ : le profil reste libre et polyvalent.",
                    tags: ["polyvalent", "actions de base", "départ"]
                });

        const compactClass =
            options.compact ? "nv-skill-tree--compact" : "";

        return `
            <div class="nv-skill-tree ${compactClass}" data-classe-id="${NV_escape(classe.id)}">

                <div class="nv-skill-tree__lane nv-skill-tree__lane--root">
                    ${NV_creerNoeudArbreCompetence({
                        etat: "root",
                        icone: classe.icone || "🧍",
                        titre: classe.nom,
                        description: classe.description || "Classe jouable.",
                        tags: [
                            NV_roleClasse(classe.id),
                            `Priorité ${statsMajeures.join("/")}`,
                            `PV ${preview.pvMax}`,
                            `Mana ${preview.manaMax}`,
                            `Stamina ${preview.staminaMax}`
                        ]
                    })}
                </div>

                <div class="nv-skill-tree__connector"></div>

                <div class="nv-skill-tree__lane">
                    <h4>Fondations</h4>
                    <div class="nv-skill-tree__nodes">
                        ${base.map(competence => NV_creerNoeudArbreCompetence({
                            etat: "unlocked",
                            icone: "◆",
                            titre: competence.nom,
                            description: competence.description || "Action de base disponible pour toutes les classes.",
                            tags: ["base", NV_resumeCoutsCompetence(competence)]
                        })).join("")}
                    </div>
                </div>

                <div class="nv-skill-tree__connector"></div>

                <div class="nv-skill-tree__lane">
                    <h4>Style de classe</h4>
                    <div class="nv-skill-tree__nodes">
                        ${NV_creerNoeudArbreCompetence({
                            etat: "unlocked",
                            icone: "📊",
                            titre: `Orientation ${statsMajeures.join(" / ")}`,
                            description: "Ces statistiques guident la progression automatique et le profil de combat.",
                            tags: [
                                `FOR ${preview.force}`,
                                `DEX ${preview.dexterite}`,
                                `INT ${preview.intelligence}`,
                                `VIT ${preview.vitalite}`,
                                `LUCK ${preview.chance}`
                            ]
                        })}

                        ${NV_creerNoeudArbreCompetence({
                            etat: "unlocked",
                            icone: "🧬",
                            titre: NV_roleClasse(classe.id),
                            description: "Identité principale de la classe dans le système de combat actuel.",
                            tags: [
                                `ATK ${preview.attaquePhysique}`,
                                `MAG ${preview.attaqueMagique}`,
                                `DEF ${preview.defensePhysique}`,
                                `RES ${preview.defenseMagique}`,
                                `Crit ${preview.critique}%`,
                                `Esq ${preview.esquive}%`
                            ]
                        })}
                    </div>
                </div>

                <div class="nv-skill-tree__connector"></div>

                <div class="nv-skill-tree__lane">
                    <h4>Compétence(s) de classe</h4>
                    <div class="nv-skill-tree__nodes">
                        ${specialNodes}
                    </div>
                </div>

                <div class="nv-skill-tree__connector nv-skill-tree__connector--future"></div>

                <div class="nv-skill-tree__lane nv-skill-tree__lane--future">
                    <h4>Évolutions prévues</h4>
                    <div class="nv-skill-tree__nodes">
                        ${[0, 1, 2].map(index => NV_creerNoeudArbreCompetence({
                            etat: "locked",
                            icone: "🔒",
                            titre: NV_nomEvolutionClasse(classe.id, index),
                            description: "Emplacement réservé pour la future progression active des compétences.",
                            tags: ["à venir", index === 0 ? "tier 2" : index === 1 ? "tier 3" : "maîtrise"]
                        })).join("")}
                    </div>
                </div>

            </div>
        `;
    }

    function NV_creerMiniArbreClasse(classeId) {
        const classe =
            NV_obtenirClasse(classeId);

        const stats =
            NV_statsMajeuresClasse(classe).join("/");

        const speciales =
            NV_listeCompetencesClasse(classe.id, false)
                .map(id => NV_obtenirCompetence(id));

        const competencePrincipale =
            speciales[0]?.nom || "Adaptabilité";

        return `
            <div class="nv-mini-tree">
                <div class="nv-mini-node nv-mini-node--root">${NV_escape(classe.icone || "🧍")} ${NV_escape(stats)}</div>
                <div class="nv-mini-tree__line"></div>
                <div class="nv-mini-node">${NV_escape(competencePrincipale)}</div>
                <div class="nv-mini-tree__line"></div>
                <div class="nv-mini-node nv-mini-node--future">Évolutions futures</div>
            </div>
        `;
    }

    function NV_creerCarteClasse(classeId) {
        const preview =
            NV_calculerPreviewClasse(classeId);

        const classe =
            preview.classe;

        const statsMajeures =
            NV_statsMajeuresClasse(classe);

        const competences =
            NV_listeCompetencesClasse(classe.id, false)
                .map(id => NV_obtenirCompetence(id));

        const specialesHTML =
            competences.length
                ? competences.map(competence => `
                    <li>
                        <strong>${NV_escape(competence.nom)}</strong>
                        <span>${NV_escape(NV_resumeCoutsCompetence(competence))}</span>
                    </li>
                `).join("")
                : `<li><strong>Adaptabilité</strong><span>actions de base</span></li>`;

        return `
            <article class="nv-classe-card nv-classe-card--tree-ready">
                <div class="nv-classe-card__header">
                    <div>
                        <h3>${NV_escape(classe.icone || "🧍")} ${NV_escape(classe.nom)}</h3>
                        <p>${NV_escape(classe.description)}</p>
                    </div>
                </div>

                <div class="nv-classe-role">
                    <span>${NV_escape(NV_roleClasse(classe.id))}</span>
                    <span>Priorité ${NV_escape(statsMajeures.join("/"))}</span>
                </div>

                <div class="nv-stats-primaires">
                    <span>FOR <strong>${preview.force}</strong></span>
                    <span>DEX <strong>${preview.dexterite}</strong></span>
                    <span>INT <strong>${preview.intelligence}</strong></span>
                    <span>VIT <strong>${preview.vitalite}</strong></span>
                    <span>LUCK <strong>${preview.chance}</strong></span>
                </div>

                <div class="nv-stats-combat">
                    <span>PV <strong>${preview.pvMax}</strong></span>
                    <span>Mana <strong>${preview.manaMax}</strong></span>
                    <span>Stamina <strong>${preview.staminaMax}</strong></span>
                    <span>ATK <strong>${preview.attaquePhysique}</strong></span>
                    <span>DEF <strong>${preview.defensePhysique}</strong></span>
                    <span>MAG <strong>${preview.attaqueMagique}</strong></span>
                    <span>RES <strong>${preview.defenseMagique}</strong></span>
                    <span>Crit <strong>${preview.critique}%</strong></span>
                    <span>Esq <strong>${preview.esquive}%</strong></span>
                    <span>Vit <strong>${preview.vitesse}</strong></span>
                </div>

                ${NV_creerMiniArbreClasse(classe.id)}

                <div class="nv-competences-mini">
                    <strong>Départ dans l’arbre</strong>
                    <ul>${specialesHTML}</ul>
                </div>

                <div class="nv-classe-card__actions">
                    <button onclick="NV_lancerNouvellePartie('${classe.id}')">
                        Commencer ${NV_escape(classe.nom)}
                    </button>

                    <button class="nv-btn-secondary" onclick="NV_ouvrirCompetencesClasses('${classe.id}')">
                        Voir l’arbre
                    </button>
                </div>
            </article>
        `;
    }

    function NV_ouvrirEcranAccueil() {
        NV_ETAT.mode =
            "menu";

        document.body.classList.add("nv-start-mode");

        NV_enregistrerClassesEtCompetences();

        const sauvegardeExiste =
            NV_sauvegardeLocaleExiste();

        const html = `
            <section class="nv-start-screen">
                <div class="nv-start-hero">
                    <h1>🌙 NightVenture</h1>
                    <p>
                        Choisis une nouvelle partie ou charge une sauvegarde existante.
                    </p>
                </div>

                <div class="nv-start-actions">
                    <button onclick="NV_ouvrirChoixClasse()">
                        ✨ Nouvelle partie
                    </button>

                    <button onclick="NV_chargerLocal()" ${sauvegardeExiste ? "" : "disabled"}>
                        📂 Continuer sauvegarde navigateur
                    </button>

                    <label class="nv-start-label">
                        📁 Charger un fichier JSON
                        <input
                            type="file"
                            accept=".json,application/json"
                            onchange="NV_chargerFichierDepuisInputAccueil(event)"
                            hidden
                        >
                    </label>

                    ${sauvegardeExiste ? `
                        <button class="nv-btn-danger" onclick="NV_supprimerSauvegardeLocale()">
                            🗑 Supprimer sauvegarde navigateur
                        </button>
                    ` : ""}
                </div>

                <div class="nv-start-note">
                    <p>
                        Les classes proposées viennent des profils de simulation déjà équilibrés.
                        La sauvegarde navigateur est pratique pour les tests rapides ; l’export JSON reste disponible ensuite.
                    </p>
                </div>
            </section>
        `;

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(html);
        }

        const personnage =
            document.getElementById("personnage");

        if (personnage) {
            personnage.innerHTML =
                `<div class="nv-start-side"><strong>NightVenture</strong><br>En attente de partie.</div>`;
        }

        const journal =
            document.getElementById("journal");

        if (journal) {
            journal.innerHTML =
                `<p>Nouvelle partie ou chargement de sauvegarde.</p>`;
        }
    }

    function NV_listerClassesAffichables() {
        return Object.values(NV_obtenirClasses())
            .filter(classe => classe?.id)
            .sort((a, b) => {
                const ordreA =
                    Number.isFinite(Number(a.ordre))
                        ? Number(a.ordre)
                        : NV_ORDRE_CLASSES.indexOf(a.id) >= 0
                            ? NV_ORDRE_CLASSES.indexOf(a.id) + 1
                            : 999;

                const ordreB =
                    Number.isFinite(Number(b.ordre))
                        ? Number(b.ordre)
                        : NV_ORDRE_CLASSES.indexOf(b.id) >= 0
                            ? NV_ORDRE_CLASSES.indexOf(b.id) + 1
                            : 999;

                return ordreA - ordreB || String(a.nom || a.id).localeCompare(String(b.nom || b.id));
            });
    }

    function NV_ouvrirChoixClasse() {
        NV_ETAT.mode =
            "new_game";

        document.body.classList.add("nv-start-mode");

        NV_enregistrerClassesEtCompetences();

        const classes =
            NV_listerClassesAffichables();

        const html = `
            <section class="nv-start-screen nv-classe-screen nv-classe-screen--tree">
                <div class="nv-start-hero">
                    <h1>✨ Nouvelle partie</h1>
                    <p>
                        Choisis une classe. Chaque carte affiche maintenant son identité, ses statistiques
                        de départ et un aperçu de son arbre de compétences.
                    </p>
                </div>

                <div class="nv-newgame-name">
                    <label>
                        Nom du personnage
                        <input id="nvNomPersonnage" type="text" value="Nighttug58" maxlength="32">
                    </label>

                    <button onclick="NV_ouvrirCompetencesClasses()">
                        🌳 Voir l’arbre complet
                    </button>

                    <button onclick="NV_ouvrirEcranAccueil()">
                        ⬅ Retour
                    </button>
                </div>

                <div class="nv-newgame-tip">
                    <strong>Lecture rapide :</strong>
                    les nœuds lumineux sont disponibles dès le départ ; les nœuds verrouillés préparent
                    la future progression active des compétences.
                </div>

                <div class="nv-classes-grid nv-classes-grid--tree">
                    ${classes.map(classe => NV_creerCarteClasse(classe.id)).join("")}
                </div>
            </section>
        `;

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(html);
        }
    }

    function NV_lancerNouvellePartie(classeId) {
        const inputNom =
            document.getElementById("nvNomPersonnage");

        const personnage =
            NV_creerPersonnageNouveau(
                classeId,
                inputNom?.value || "Nighttug58"
            );

        Game.data.personnage =
            personnage;

        Game.data.historique ??= {};
        Game.data.historique.journal =
            [];

        NV_ETAT.mode =
            "playing";

        document.body.classList.remove("nv-start-mode");

        if (typeof ajouterJournal === "function") {
            ajouterJournal(`✨ Nouvelle partie commencée : ${personnage.classeIcone || ""} ${personnage.classeNom || personnage.classe}`);
        }

        NV_sauvegarderLocalSilencieux();

        Game.ui.vueActive =
            "exploration";

        NV_originalRafraichirInterface();
    }

    function NV_creerCarteCompetence(competence) {
        return NV_creerNoeudArbreCompetence({
            etat: "unlocked",
            icone: competence.nature === "magique" ? "🔮" : competence.nature === "physique" ? "⚔" : "◆",
            titre: competence.nom,
            description: competence.description || "Compétence.",
            tags: [
                competence.nature || "base",
                NV_resumeCoutsCompetence(competence),
                NV_resumePuissanceCompetence(competence)
            ]
        });
    }

    function NV_creerBoutonsSelectionClasseArbre(classes, classeSelectionnee) {
        return `
            <div class="nv-tree-class-selector">
                ${classes.map(classe => `
                    <button
                        class="${classe.id === classeSelectionnee ? "active" : ""}"
                        onclick="NV_ouvrirCompetencesClasses('${classe.id}')"
                    >
                        ${NV_escape(classe.icone || "🧍")} ${NV_escape(classe.nom)}
                    </button>
                `).join("")}
            </div>
        `;
    }

    function NV_ouvrirCompetencesClasses(classeId = null) {
        if (typeof changerVue === "function") {
            changerVue("competences_classes");
        }

        NV_enregistrerClassesEtCompetences();

        const classes =
            NV_listerClassesAffichables();

        const classeCourante =
            classeId ||
            NV_ETAT.classeCompetencesSelectionnee ||
            Game.data?.personnage?.classeId ||
            classes[0]?.id ||
            "aventurier";

        const classeExiste =
            classes.some(classe => classe.id === classeCourante);

        const classeSelectionnee =
            classeExiste ? classeCourante : classes[0]?.id || "aventurier";

        NV_ETAT.classeCompetencesSelectionnee =
            classeSelectionnee;

        const classe =
            NV_obtenirClasse(classeSelectionnee);

        const preview =
            NV_calculerPreviewClasse(classeSelectionnee);

        const retour =
            NV_ETAT.mode === "new_game"
                ? "NV_ouvrirChoixClasse()"
                : "ouvrirExploration()";

        const html = `
            <div class="nv-skill-tree-page">
                <div class="item-card nv-skill-tree-header">
                    <div>
                        <h2>🌳 Arbre de compétences</h2>
                        <p>
                            Visualisation de l’identité de classe, des actions de base,
                            des compétences disponibles au départ et des emplacements d’évolution future.
                        </p>
                    </div>

                    <button onclick="${retour}">
                        ⬅ Retour
                    </button>
                </div>

                ${NV_creerBoutonsSelectionClasseArbre(classes, classeSelectionnee)}

                <section class="nv-skill-tree-summary item-card">
                    <div>
                        <h3>${NV_escape(classe.icone || "🧍")} ${NV_escape(classe.nom)}</h3>
                        <p>${NV_escape(classe.description || "")}</p>
                    </div>

                    <div class="nv-stats-primaires">
                        <span>FOR <strong>${preview.force}</strong></span>
                        <span>DEX <strong>${preview.dexterite}</strong></span>
                        <span>INT <strong>${preview.intelligence}</strong></span>
                        <span>VIT <strong>${preview.vitalite}</strong></span>
                        <span>LUCK <strong>${preview.chance}</strong></span>
                    </div>
                </section>

                ${NV_creerArbreCompetenceClasse(classeSelectionnee)}
            </div>
        `;

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(html);
        }
    }

    function NV_ajouterBoutonCompetences() {
        const barre =
            document.getElementById("barreVuePrincipale");

        if (!barre || document.getElementById("btnCompetencesClasses")) return;

        const bouton =
            document.createElement("button");

        bouton.id =
            "btnCompetencesClasses";

        bouton.className =
            "btn-vue";

        bouton.textContent =
            "⚔ Compétences";

        bouton.addEventListener("click", () => {
            NV_ouvrirCompetencesClasses();
        });

        barre.appendChild(bouton);
    }

    function NV_patchBarreVueActive() {
        if (typeof mettreAJourBarreVue !== "function" || mettreAJourBarreVue.__NV_START_PATCH) return;

        const original =
            mettreAJourBarreVue;

        mettreAJourBarreVue = function () {
            original();

            const bouton =
                document.getElementById("btnCompetencesClasses");

            if (bouton) {
                bouton.classList.toggle(
                    "vue-active",
                    Game.ui?.vueActive === "competences_classes"
                );
            }
        };

        mettreAJourBarreVue.__NV_START_PATCH =
            true;
    }

    function NV_patchSaveButtons() {
        const boutonSave =
            document.getElementById("saveButton");

        if (boutonSave && !boutonSave.__NV_START_PATCH) {
            boutonSave.addEventListener(
                "click",
                event => {
                    if (NV_ETAT.mode !== "playing") return;

                    event.preventDefault();
                    event.stopImmediatePropagation();

                    NV_telechargerSauvegarde();
                },
                true
            );

            boutonSave.__NV_START_PATCH =
                true;
        }

        const inputLoad =
            document.getElementById("loadFile");

        if (inputLoad && !inputLoad.__NV_START_PATCH) {
            inputLoad.addEventListener(
                "change",
                async event => {
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    const file =
                        event.target.files?.[0];

                    await NV_chargerFichier(file);

                    event.target.value =
                        "";
                },
                true
            );

            inputLoad.__NV_START_PATCH =
                true;
        }
    }

    function NV_patchSauvegarderJeu() {
        if (typeof sauvegarderJeu === "function" && !sauvegarderJeu.__NV_START_PATCH) {
            sauvegarderJeu = function () {
                NV_telechargerSauvegarde();
            };

            sauvegarderJeu.__NV_START_PATCH =
                true;
        }

        if (typeof chargerSauvegardeDepuisInput === "function" && !chargerSauvegardeDepuisInput.__NV_START_PATCH) {
            chargerSauvegardeDepuisInput = async function (event) {
                const file =
                    event?.target?.files?.[0];

                await NV_chargerFichier(file);

                if (event?.target) {
                    event.target.value =
                        "";
                }
            };

            chargerSauvegardeDepuisInput.__NV_START_PATCH =
                true;
        }
    }


    /* --------------------------
       v0.9.4.1 — Autosave + Inventaire
       -------------------------- */

    function NV_demanderAutosave(raison = "changement") {
        if (NV_ETAT.mode !== "playing") return;
        if (!Game.data?.personnage) return;

        clearTimeout(NV_ETAT.autosaveTimer);

        NV_ETAT.autosaveTimer =
            setTimeout(() => {
                NV_sauvegarderLocalSilencieux();
            }, 120);
    }

    function NV_sauvegarderAvantF5() {
        if (NV_ETAT.mode !== "playing") return;

        try {
            NV_sauvegarderLocalSilencieux();
        } catch (erreur) {
            console.warn("Autosave beforeunload impossible :", erreur);
        }
    }

    function NV_ouvrirPopupSuppressionObjet(idObjet) {
        Game.ui.objetSuppressionEnAttente =
            Game.ui.objetSuppressionEnAttente === idObjet
                ? null
                : idObjet;

        if (typeof ouvrirInventaire === "function") {
            ouvrirInventaire();
        }
    }

    function NV_annulerSuppressionObjetUI() {
        Game.ui.objetSuppressionEnAttente =
            null;

        if (typeof ouvrirInventaire === "function") {
            ouvrirInventaire();
        }
    }

    function NV_confirmerSuppressionObjetUI(idObjet) {
        const personnage =
            Game.data?.personnage;

        if (!personnage) return;

        const item =
            personnage.inventaire?.find(entree => entree.id === idObjet);

        if (!item) {
            Game.ui.objetSuppressionEnAttente =
                null;

            if (typeof ouvrirInventaire === "function") {
                ouvrirInventaire();
            }

            return;
        }

        const objet =
            typeof trouverObjet === "function"
                ? trouverObjet(idObjet)
                : null;

        const nom =
            objet?.nom || idObjet;

        const quantite =
            Number(item.quantite || 1);

        personnage.inventaire =
            personnage.inventaire.filter(entree => entree.id !== idObjet);

        if (Array.isArray(personnage.favoris)) {
            personnage.favoris =
                personnage.favoris.filter(id => id !== idObjet);
        }

        Game.ui.objetSuppressionEnAttente =
            null;

        if (typeof ajouterJournal === "function") {
            ajouterJournal(`🗑 ${nom}${quantite > 1 ? " x" + quantite : ""} supprimé de l'inventaire.`);
        }

        NV_demanderAutosave("suppression inventaire");

        if (typeof ouvrirInventaire === "function") {
            ouvrirInventaire();
        } else if (typeof rafraichirInterface === "function") {
            rafraichirInterface();
        }
    }

    function NV_creerPopupSuppressionObjet(objet, quantite) {
        if (Game.ui.objetSuppressionEnAttente !== objet.id) {
            return "";
        }

        return `
            <div
                class="nv-delete-popover zone-suppression-objet"
                onclick="event.stopPropagation()"
            >
                <p>
                    Supprimer ?
                    <br>
                    <strong class="${typeof classeRarete === "function" ? classeRarete(objet) : ""}">
                        ${objet.nom}${quantite > 1 ? ` x${quantite}` : ""}
                    </strong>
                </p>

                <div class="nv-delete-popover__actions">
                    <button
                        class="nv-delete-popover__confirm"
                        onclick="event.stopPropagation(); NV_confirmerSuppressionObjetUI('${objet.id}')"
                    >
                        Oui
                    </button>

                    <button
                        class="nv-delete-popover__cancel"
                        onclick="event.stopPropagation(); NV_annulerSuppressionObjetUI()"
                    >
                        Non
                    </button>
                </div>
            </div>
        `;
    }

    function NV_patchInventaireDeleteButton() {
        if (typeof ouvrirInventaire !== "function" || ouvrirInventaire.__NV_START_0941_DELETE_PATCH) return;

        ouvrirInventaire = function () {
            if (typeof changerVue === "function") {
                changerVue("inventaire");
            }

            let html = `
                <div class="item-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                        <h2 style="margin:0;">🎒 Inventaire</h2>
                        <button onclick="ouvrirExploration()">⬅ Retour</button>
                    </div>
                </div>
                <div class="item-card">
                    ${typeof creerRechercheInventaire === "function" ? creerRechercheInventaire() : ""}
                    ${typeof creerBoutonsFiltresInventaire === "function" ? creerBoutonsFiltresInventaire() : ""}
                    <br><br>
                    ${typeof creerSelectTriInventaire === "function" ? creerSelectTriInventaire() : ""}
                </div>
            `;

            const inventaire =
                Game.data?.personnage?.inventaire || [];

            const items =
                typeof trierObjetsInventaire === "function"
                    ? trierObjetsInventaire(inventaire)
                    : inventaire;

            items.forEach(item => {
                const objet =
                    typeof trouverObjet === "function"
                        ? trouverObjet(item.id)
                        : null;

                if (!objet) return;

                if (typeof objetPasseFiltre === "function" && !objetPasseFiltre(objet)) return;
                if (typeof objetPasseRecherche === "function" && !objetPasseRecherche(objet)) return;

                const quantite =
                    item.quantite || 1;

                const detailsHtml =
                    typeof creerDetailsObjetComparatif === "function"
                        ? creerDetailsObjetComparatif(objet)
                        : "";

                html += `
                    <div class="item-card nv-inventory-card">
                        <button
                            class="nv-inventory-delete"
                            title="Supprimer de l'inventaire"
                            onclick="event.stopPropagation(); NV_ouvrirPopupSuppressionObjet('${objet.id}');"
                        >
                            🗑
                        </button>

                        ${NV_creerPopupSuppressionObjet(objet, quantite)}

                        ${typeof creerEnteteObjet === "function" ? creerEnteteObjet(objet, quantite, detailsHtml) : ""}
                        ${typeof creerBoutonObjet === "function" ? creerBoutonObjet(objet) : ""}
                    </div>
                `;
            });

            if (typeof afficherVuePrincipale === "function") {
                afficherVuePrincipale(html);
            }
        };

        ouvrirInventaire.__NV_START_0941_DELETE_PATCH =
            true;
    }

    function NV_patchAutosaveActions() {
        const nomsFonctions = [
            "equiperObjet",
            "equiperObjetInterface",
            "desequiperObjet",
            "utiliserObjet",
            "ajouterObjetInventaire",
            "retirerObjetInventaire",
            "basculerFavori",
            "accepterQuete",
            "remettreQuete",
            "voyagerVersZone"
        ];

        nomsFonctions.forEach(nom => {
            const fn =
                window[nom];

            if (typeof fn !== "function" || fn.__NV_START_0941_AUTOSAVE_PATCH) return;

            window[nom] = function (...args) {
                const resultat =
                    fn.apply(this, args);

                NV_demanderAutosave(nom);

                return resultat;
            };

            window[nom].__NV_START_0941_AUTOSAVE_PATCH =
                true;
        });
    }

    function NV_injecterStyle() {
        if (document.getElementById("nvStartSaveStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvStartSaveStyle";

        style.textContent = `
            body.nv-start-mode #sidebar,
            body.nv-start-mode #barreVuePrincipale,
            body.nv-start-mode #journalSection,
            body.nv-start-mode #saveControls {
                display: none !important;
            }

            body.nv-start-mode #container {
                grid-template-columns: 1fr !important;
            }

            body.nv-start-mode #main {
                width: 100%;
            }

            .nv-start-screen {
                max-width: 1180px;
                margin: 0 auto;
                padding: 24px;
            }

            .nv-start-hero {
                padding: 28px;
                margin-bottom: 18px;
                text-align: center;
                background:
                    radial-gradient(circle at top, rgba(245, 211, 122, 0.14), transparent 58%),
                    rgba(0, 0, 0, 0.22);
                border: 1px solid rgba(245, 211, 122, 0.25);
                border-radius: var(--radius-lg, 12px);
                box-shadow: 0 0 20px rgba(0, 0, 0, 0.22);
            }

            .nv-start-hero h1 {
                margin: 0 0 8px;
                color: var(--gold, #f5d37a);
                font-size: clamp(2rem, 5vw, 4rem);
            }

            .nv-start-hero p {
                margin: 0;
                color: var(--text-muted, #bcbcbc);
            }

            .nv-start-actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 12px;
                margin-bottom: 14px;
            }

            .nv-start-actions button,
            .nv-start-label,
            .nv-newgame-name button,
            .nv-classe-card button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-height: 44px;
                padding: 10px 14px;
                cursor: pointer;
                color: var(--text, #e8dcc2);
                background: rgba(0, 0, 0, 0.28);
                border: 1px solid rgba(245, 211, 122, 0.28);
                border-radius: var(--radius-md, 8px);
                font-weight: bold;
            }

            .nv-start-actions button:disabled {
                opacity: 0.45;
                cursor: not-allowed;
            }

            .nv-btn-danger {
                border-color: rgba(255, 80, 80, 0.35) !important;
            }

            .nv-start-note,
            .nv-start-side {
                padding: 12px;
                color: var(--text-muted, #bcbcbc);
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: var(--radius-md, 8px);
            }

            .nv-newgame-name {
                display: grid;
                grid-template-columns: minmax(240px, 1fr) auto auto;
                gap: 10px;
                align-items: end;
                margin-bottom: 16px;
                padding: 12px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.16);
                border-radius: var(--radius-md, 8px);
            }

            .nv-newgame-name label {
                display: flex;
                flex-direction: column;
                gap: 6px;
                color: var(--gold, #f5d37a);
                font-weight: bold;
            }

            .nv-newgame-name input {
                padding: 10px;
                color: var(--text, #e8dcc2);
                background: rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(245, 211, 122, 0.22);
                border-radius: var(--radius-md, 8px);
            }

            .nv-classes-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
                gap: 12px;
            }

            .nv-classe-card,
            .nv-classe-competences {
                padding: 14px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.18);
                border-radius: var(--radius-lg, 12px);
            }

            .nv-classe-card h3,
            .nv-classe-competences h3 {
                margin: 0 0 6px;
                color: var(--gold, #f5d37a);
            }

            .nv-classe-card p,
            .nv-classe-competences p {
                color: var(--text-muted, #bcbcbc);
            }

            .nv-stats-primaires,
            .nv-stats-combat,
            .nv-competence-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 10px 0;
            }

            .nv-stats-primaires span,
            .nv-stats-combat span,
            .nv-competence-tags span {
                padding: 4px 7px;
                background: rgba(0, 0, 0, 0.22);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: 999px;
                color: var(--text-muted, #bcbcbc);
                font-size: 0.82rem;
            }

            .nv-stats-primaires strong,
            .nv-stats-combat strong {
                color: var(--gold, #f5d37a);
            }

            .nv-competences-mini {
                margin: 10px 0;
                padding: 10px;
                background: rgba(0, 0, 0, 0.16);
                border-radius: var(--radius-md, 8px);
            }

            .nv-competences-mini strong {
                color: var(--gold, #f5d37a);
            }

            .nv-competences-mini ul {
                margin: 8px 0 0;
                padding-left: 18px;
            }

            .nv-competences-mini li {
                margin-bottom: 4px;
            }

            .nv-competences-mini li span {
                margin-left: 6px;
                color: var(--text-muted, #bcbcbc);
                font-size: 0.85rem;
            }

            .nv-competences-classes {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
                gap: 12px;
            }

            .nv-competence-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 10px;
            }

            .nv-competence-card {
                padding: 10px;
                background: rgba(0, 0, 0, 0.20);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: var(--radius-md, 8px);
            }

            .nv-competence-card h4 {
                margin: 0 0 5px;
                color: var(--gold, #f5d37a);
            }

            .nv-classe-competences details {
                margin-top: 10px;
                padding: 8px;
                background: rgba(0, 0, 0, 0.14);
                border-radius: var(--radius-md, 8px);
            }

            .nv-classe-competences summary {
                cursor: pointer;
                color: var(--gold, #f5d37a);
                font-weight: bold;
            }


            .nv-newgame-tip {
                margin: 0 0 14px;
                padding: 10px 12px;
                color: var(--text-muted, #bcbcbc);
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.14);
                border-radius: var(--radius-md, 8px);
                line-height: 1.35;
            }

            .nv-classe-role {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin: 10px 0;
            }

            .nv-classe-role span {
                padding: 5px 9px;
                color: #f5d37a;
                background: rgba(245, 211, 122, 0.10);
                border: 1px solid rgba(245, 211, 122, 0.18);
                border-radius: 999px;
                font-size: 0.82rem;
                font-weight: bold;
            }

            .nv-classe-card--tree-ready {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .nv-classe-card__actions {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 8px;
                margin-top: auto;
            }

            .nv-btn-secondary {
                border-color: rgba(120, 190, 255, 0.28) !important;
                background: rgba(45, 95, 145, 0.20) !important;
            }

            .nv-mini-tree {
                display: grid;
                grid-template-columns: 1fr auto 1fr auto 1fr;
                align-items: center;
                gap: 6px;
                margin: 10px 0;
                padding: 9px;
                background: rgba(0, 0, 0, 0.16);
                border: 1px solid rgba(245, 211, 122, 0.10);
                border-radius: var(--radius-md, 8px);
            }

            .nv-mini-node {
                min-height: 34px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 5px 7px;
                color: var(--text, #e8dcc2);
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(80, 220, 130, 0.20);
                border-radius: 10px;
                font-size: 0.76rem;
                font-weight: bold;
                text-align: center;
            }

            .nv-mini-node--root {
                color: var(--gold, #f5d37a);
                border-color: rgba(245, 211, 122, 0.24);
            }

            .nv-mini-node--future {
                color: var(--text-muted, #bcbcbc);
                border-color: rgba(255, 255, 255, 0.10);
                opacity: 0.75;
            }

            .nv-mini-tree__line {
                width: 18px;
                height: 2px;
                background: linear-gradient(90deg, rgba(245, 211, 122, 0.45), rgba(80, 220, 130, 0.35));
                border-radius: 999px;
            }

            .nv-skill-tree-page {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .nv-skill-tree-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 15px;
                flex-wrap: wrap;
            }

            .nv-skill-tree-header h2,
            .nv-skill-tree-summary h3 {
                margin: 0 0 6px;
                color: var(--gold, #f5d37a);
            }

            .nv-skill-tree-header p,
            .nv-skill-tree-summary p {
                margin: 0;
                color: var(--text-muted, #bcbcbc);
                line-height: 1.35;
            }

            .nv-tree-class-selector {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                padding: 10px;
                background: rgba(0, 0, 0, 0.16);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: var(--radius-lg, 12px);
            }

            .nv-tree-class-selector button {
                padding: 8px 10px;
                color: var(--text, #e8dcc2);
                background: rgba(0, 0, 0, 0.24);
                border: 1px solid rgba(245, 211, 122, 0.16);
                border-radius: 999px;
                cursor: pointer;
                font-weight: bold;
            }

            .nv-tree-class-selector button.active {
                color: #101010;
                background: var(--gold, #f5d37a);
                border-color: var(--gold, #f5d37a);
            }

            .nv-skill-tree-summary {
                display: grid;
                grid-template-columns: minmax(240px, 1fr) minmax(220px, 1fr);
                gap: 12px;
                align-items: center;
            }

            .nv-skill-tree {
                display: flex;
                flex-direction: column;
                gap: 0;
                padding: 14px;
                background:
                    radial-gradient(circle at top, rgba(245, 211, 122, 0.07), transparent 42%),
                    rgba(0, 0, 0, 0.16);
                border: 1px solid rgba(245, 211, 122, 0.14);
                border-radius: var(--radius-lg, 12px);
                overflow: hidden;
            }

            .nv-skill-tree__lane {
                position: relative;
                padding: 10px;
                background: rgba(0, 0, 0, 0.10);
                border: 1px solid rgba(255, 255, 255, 0.045);
                border-radius: var(--radius-lg, 12px);
            }

            .nv-skill-tree__lane h4 {
                margin: 0 0 10px;
                color: var(--gold, #f5d37a);
                letter-spacing: 0.02em;
            }

            .nv-skill-tree__lane--root {
                max-width: 760px;
                margin: 0 auto;
                width: 100%;
            }

            .nv-skill-tree__lane--future {
                opacity: 0.9;
            }

            .nv-skill-tree__nodes {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 10px;
            }

            .nv-skill-tree__connector {
                width: 2px;
                height: 24px;
                margin: 0 auto;
                background: linear-gradient(180deg, rgba(245, 211, 122, 0.65), rgba(80, 220, 130, 0.45));
                box-shadow: 0 0 8px rgba(245, 211, 122, 0.18);
            }

            .nv-skill-tree__connector--future {
                background: linear-gradient(180deg, rgba(245, 211, 122, 0.35), rgba(255, 255, 255, 0.12));
                box-shadow: none;
            }

            .nv-skill-node {
                position: relative;
                min-height: 132px;
                padding: 12px;
                background: rgba(0, 0, 0, 0.25);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: var(--radius-md, 8px);
                box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
            }

            .nv-skill-node--root {
                border-color: rgba(245, 211, 122, 0.35);
                background:
                    radial-gradient(circle at top left, rgba(245, 211, 122, 0.10), transparent 45%),
                    rgba(0, 0, 0, 0.25);
            }

            .nv-skill-node--unlocked {
                border-color: rgba(80, 220, 130, 0.22);
                background:
                    radial-gradient(circle at top left, rgba(80, 220, 130, 0.075), transparent 45%),
                    rgba(0, 0, 0, 0.24);
            }

            .nv-skill-node--locked {
                opacity: 0.66;
                border-style: dashed;
                border-color: rgba(255, 255, 255, 0.12);
                filter: grayscale(0.15);
            }

            .nv-skill-node__top {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 7px;
            }

            .nv-skill-node__icon {
                width: 30px;
                height: 30px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: 999px;
                background: rgba(245, 211, 122, 0.10);
                border: 1px solid rgba(245, 211, 122, 0.18);
            }

            .nv-skill-node strong {
                color: var(--gold, #f5d37a);
            }

            .nv-skill-node p {
                margin: 0 0 9px;
                color: var(--text-muted, #bcbcbc);
                font-size: 0.86rem;
                line-height: 1.35;
            }

            .nv-skill-node__tags {
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                margin-top: auto;
            }

            .nv-skill-node__tags span {
                padding: 3px 7px;
                color: var(--text-muted, #bcbcbc);
                background: rgba(0, 0, 0, 0.20);
                border: 1px solid rgba(255, 255, 255, 0.06);
                border-radius: 999px;
                font-size: 0.74rem;
            }

            .nv-skill-tree--compact .nv-skill-tree__lane:not(.nv-skill-tree__lane--root),
            .nv-skill-tree--compact .nv-skill-tree__connector {
                display: none;
            }

            @media (max-width: 820px) {
                .nv-newgame-name,
                .nv-skill-tree-summary,
                .nv-classe-card__actions {
                    grid-template-columns: 1fr;
                }

                .nv-mini-tree {
                    grid-template-columns: 1fr;
                }

                .nv-mini-tree__line {
                    width: 2px;
                    height: 14px;
                    justify-self: center;
                }
            }

            .nv-inventory-card {
                position: relative;
                padding-left: 52px;
            }

            .nv-inventory-delete {
                position: absolute;
                top: 10px;
                left: 10px;
                width: 32px;
                height: 32px;
                min-height: 32px;
                padding: 0;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                background: rgba(90, 35, 35, 0.85);
                border: 1px solid rgba(255, 110, 110, 0.35);
                border-radius: 8px;
                font-size: 0.95rem;
                z-index: 2;
            }

            .nv-inventory-delete:hover {
                background: rgba(130, 45, 45, 0.95);
            }

            .nv-delete-popover {
                position: absolute;
                top: 8px;
                left: 50px;
                z-index: 12;
                width: min(250px, calc(100% - 62px));
                padding: 10px;
                background:
                    radial-gradient(circle at top left, rgba(245, 211, 122, 0.10), transparent 45%),
                    rgba(18, 16, 14, 0.96);
                border: 1px solid rgba(245, 211, 122, 0.26);
                border-radius: 12px;
                box-shadow: 0 12px 28px rgba(0, 0, 0, 0.42);
                color: var(--text, #e8dcc2);
            }

            .nv-delete-popover::before {
                content: "";
                position: absolute;
                left: -7px;
                top: 13px;
                width: 12px;
                height: 12px;
                transform: rotate(45deg);
                background: rgba(18, 16, 14, 0.96);
                border-left: 1px solid rgba(245, 211, 122, 0.26);
                border-bottom: 1px solid rgba(245, 211, 122, 0.26);
            }

            .nv-delete-popover p {
                margin: 0 0 8px;
                font-size: 0.88rem;
                line-height: 1.35;
            }

            .nv-delete-popover__actions {
                display: flex;
                gap: 8px;
            }

            .nv-delete-popover__actions button {
                min-height: 30px;
                padding: 5px 10px;
                flex: 1;
            }

            .nv-delete-popover__confirm {
                border-color: rgba(255, 110, 110, 0.42) !important;
                background: rgba(100, 35, 35, 0.74) !important;
            }

            .nv-delete-popover__cancel {
                background: rgba(0, 0, 0, 0.22) !important;
            }

            @media (max-width: 800px) {
                .nv-newgame-name {
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function NV_originalRafraichirInterface() {
        if (typeof NV_originalRafraichirInterface._fn === "function") {
            return NV_originalRafraichirInterface._fn();
        }
    }

    function NV_patchRafraichirInterface() {
        if (typeof rafraichirInterface !== "function" || rafraichirInterface.__NV_START_PATCH) return;

        NV_originalRafraichirInterface._fn =
            rafraichirInterface;

        rafraichirInterface = function () {
            NV_enregistrerClassesEtCompetences();
            NV_normaliserPersonnage(Game.data?.personnage);

            if (NV_ETAT.mode !== "playing") {
                NV_ouvrirEcranAccueilQuandDonneesPretes();
                return;
            }

            document.body.classList.remove("nv-start-mode");
            NV_originalRafraichirInterface();

            NV_demanderAutosave("rafraichirInterface");
        };

        rafraichirInterface.__NV_START_PATCH =
            true;
    }

    function NV_classesJsonPretes() {
        return (
            Array.isArray(Game.data?.classes) &&
            Game.data.classes.length > 1 &&
            Array.isArray(Game.data?.competences) &&
            Game.data.competences.length > 0
        );
    }

    function NV_ouvrirEcranAccueilQuandDonneesPretes(tentative = 0) {
        if (NV_ETAT.mode === "playing") return;

        NV_enregistrerClassesEtCompetences();

        if (NV_classesJsonPretes() || tentative >= 30) {
            NV_ouvrirEcranAccueil();
            return;
        }

        setTimeout(() => {
            NV_ouvrirEcranAccueilQuandDonneesPretes(tentative + 1);
        }, 100);
    }

    function NV_boot() {
        NV_injecterStyle();
        NV_enregistrerClassesEtCompetences();
        NV_patchBarreVueActive();
        NV_patchRafraichirInterface();
        NV_patchSauvegarderJeu();
        NV_patchSaveButtons();
        NV_patchInventaireDeleteButton();
        NV_patchAutosaveActions();

        window.removeEventListener("beforeunload", NV_sauvegarderAvantF5);
        window.addEventListener("beforeunload", NV_sauvegarderAvantF5);

        NV_ajouterBoutonCompetences();

        // Si le patch est chargé après le premier rafraîchissement, on force l'écran d'accueil
        // seulement lorsque les classes/compétences JSON sont disponibles.
        setTimeout(() => {
            if (NV_ETAT.mode !== "playing") {
                NV_ouvrirEcranAccueilQuandDonneesPretes();
            }

            NV_patchInventaireDeleteButton();
            NV_patchAutosaveActions();
            NV_ajouterBoutonCompetences();
            NV_enregistrerClassesEtCompetences();
        }, 150);
    }

    window.NV_CLASSES_TESTEES =
        NV_CLASSES_TESTEES;

    window.NV_COMPETENCES_TESTEES =
        NV_COMPETENCES_TESTEES;

    window.NV_enregistrerClassesEtCompetences =
        NV_enregistrerClassesEtCompetences;

    window.NV_ouvrirEcranAccueil =
        NV_ouvrirEcranAccueil;

    window.NV_ouvrirChoixClasse =
        NV_ouvrirChoixClasse;

    window.NV_lancerNouvellePartie =
        NV_lancerNouvellePartie;

    window.NV_chargerLocal =
        NV_chargerLocal;

    window.NV_supprimerSauvegardeLocale =
        NV_supprimerSauvegardeLocale;

    window.NV_chargerFichier =
        NV_chargerFichier;

    window.NV_chargerFichierDepuisInputAccueil =
        async function (event) {
            await NV_chargerFichier(event.target.files?.[0]);
            event.target.value = "";
        };

    window.NV_sauvegarderLocalSilencieux =
        NV_sauvegarderLocalSilencieux;

    window.NV_telechargerSauvegarde =
        NV_telechargerSauvegarde;

    window.NV_ouvrirCompetencesClasses =
        NV_ouvrirCompetencesClasses;

    window.ouvrirCompetencesClasses =
        NV_ouvrirCompetencesClasses;

    window.NV_normaliserPersonnage =
        NV_normaliserPersonnage;

    window.NV_demanderAutosave =
        NV_demanderAutosave;

    window.NV_ouvrirPopupSuppressionObjet =
        NV_ouvrirPopupSuppressionObjet;

    window.NV_confirmerSuppressionObjetUI =
        NV_confirmerSuppressionObjetUI;

    window.NV_annulerSuppressionObjetUI =
        NV_annulerSuppressionObjetUI;

    window.NV_START_VERSION =
        NV_START_VERSION;

    NV_boot();

    console.log("✅ Start_Save_Classes.js chargé — " + NV_START_VERSION);
})();
