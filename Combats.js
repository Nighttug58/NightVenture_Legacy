/*COMBAT v0.7 — jauge d'initiative, actions, effets, IA simple À placer dans script.js à la place du bloc combat actuel.*/

if (!Game.combat) Game.combat = {};
Game.combat.config = {
    seuilInitiative: 100,
    varianceMin: 0.90,
    varianceMax: 1.10,
    multiplicateurCritique: 1.5,
    reductionDefenseFacteur: 3,
    esquiveMin: 2,
    esquiveMax: 35,
    critiqueMin: 0,
    critiqueMax: 50,
    coutInitiativeDefaut: 100,
    regenStaminaAttaqueSimple: 10,
    regenStaminaDefense: 20,
    coutInitiativeMin: 70,
    coutInitiativeMax: 130
};

Game.data.classes ??= [];
Game.data.competences ??= [];
Game.cache.classesParId ??= {};
Game.cache.competencesParId ??= {};

/* --------------------------
   Helpers généraux
   -------------------------- */

function clamp(nombre, min, max) {
    return Math.max(min, Math.min(max, Number(nombre) || 0));
}

function randFloat(min, max) {
    return min + Math.random() * (max - min);
}

function randInt(min, max) {
    return Math.floor(randFloat(min, max + 1));
}

function genererIdCombat() {
    return `combat_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function creerStatsCombatVides() {
    return {
        debutTimestamp: Date.now(),
        finTimestamp: null,
        dureeMs: 0,

        resultat: "en_cours",

        actionsJoueur: 0,
        actionsEnnemi: 0,

        degatsInfliges: 0,
        degatsRecus: 0,

        soinsJoueur: 0,
        soinsEnnemi: 0,

        critiquesJoueur: 0,
        critiquesEnnemi: 0,

        esquivesJoueur: 0,
        esquivesEnnemi: 0,

        defensesJoueur: 0,
        defensesEnnemi: 0,

        potionsUtilisees: 0,

        tentativesFuite: 0,
        fuiteReussie: false,

        actionsParId: {}
    };
}

function enregistrerActionCombat(combattant, action) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats || !combattant || !action) return;

    if (combattant.camp === "joueur") {
        combat.stats.actionsJoueur++;
    } else {
        combat.stats.actionsEnnemi++;
    }

    const idAction =
        action.id || "action_inconnue";

    combat.stats.actionsParId[idAction] =
        (combat.stats.actionsParId[idAction] || 0) + 1;
}

function enregistrerDegatsCombat(source, cible, resultat) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats || !source || !cible || !resultat) return;

    const degats =
        Number(resultat.degats) || 0;

    if (source.camp === "joueur") {
        combat.stats.degatsInfliges +=
            degats;

        if (resultat.critique) {
            combat.stats.critiquesJoueur++;
        }
    } else {
        combat.stats.degatsRecus +=
            degats;

        if (resultat.critique) {
            combat.stats.critiquesEnnemi++;
        }
    }
}

function enregistrerEsquiveCombat(defenseur) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats || !defenseur) return;

    if (defenseur.camp === "joueur") {
        combat.stats.esquivesJoueur++;
    } else {
        combat.stats.esquivesEnnemi++;
    }
}

function enregistrerSoinCombat(cible, valeur) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats || !cible) return;

    const soin =
        Number(valeur) || 0;

    if (cible.camp === "joueur") {
        combat.stats.soinsJoueur +=
            soin;
    } else {
        combat.stats.soinsEnnemi +=
            soin;
    }
}

function enregistrerDefenseCombat(combattant) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats || !combattant) return;

    if (combattant.camp === "joueur") {
        combat.stats.defensesJoueur++;
    } else {
        combat.stats.defensesEnnemi++;
    }
}

function enregistrerTentativeFuiteCombat(reussie) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats) return;

    combat.stats.tentativesFuite++;

    if (reussie) {
        combat.stats.fuiteReussie =
            true;
    }
}

function enregistrerPotionCombat(valeurSoin = 0) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats) return;

    combat.stats.potionsUtilisees++;

    enregistrerSoinCombat(
        combat.joueur,
        valeurSoin
    );
}

function finaliserStatsCombat(resultat) {
    const combat =
        Game.combat.actif;

    if (!combat?.stats) return;

    combat.stats.resultat =
        resultat;

    combat.stats.finTimestamp =
        Date.now();

    combat.stats.dureeMs =
        combat.stats.finTimestamp - combat.stats.debutTimestamp;
}

function formaterDureeCombat(ms) {
    const secondes =
        Math.max(
            1,
            Math.round((Number(ms) || 0) / 1000)
        );

    if (secondes < 60) {
        return `${secondes}s`;
    }

    const minutes =
        Math.floor(secondes / 60);

    const resteSecondes =
        secondes % 60;

    return `${minutes}m ${resteSecondes}s`;
}

/* --------------------------
   Stats combat
   -------------------------- */

function vitesseTotaleJoueur() {
    // Compatible avec l'existant :
    // si Game.data.personnage.vitesse n'existe pas encore,
    // la composante DEX donne déjà une vitesse jouable.
    return (Game.data.personnage.vitesse || 0) + statTotale("dexterite") * 0.5;
}

function vitesseTotaleMonstre(monstre) {
    // Fallback de migration si la stat vitesse n'existe pas encore.
    if (Number.isFinite(monstre?.vitesse)) return monstre.vitesse;
    return clamp(
        8 + (Number(monstre?.esquive) || 0) * 1.5 - (Number(monstre?.defense) || 0) * 0.2,
        4,
        20
    );
}

function creerSnapshotCombatJoueur() {
    const personnage = Game.data.personnage;

    return {
        id: "joueur",
        camp: "joueur",
        type: "joueur",
        nom: personnage.nom || "Aventurier",
        niveau: personnage.niveau || 1,

        pv: personnage.pv,
        pvMax: pvMaxTotal(),
        mana: personnage.mana,
        manaMax: manaMaxTotal(),
        stamina: personnage.stamina ?? staminaMaxTotal(),
        staminaMax: staminaMaxTotal(),

        initiative: 0,
        defenseActive: false,

        baseStats: {
            attaquePhysique: attaqueTotale(),
            defensePhysique: defenseTotale(),
            attaqueMagique: attaqueMagiqueTotale(),
            defenseMagique: defenseMagiqueTotale(),
            critique: critiqueTotal(),
            esquive: esquiveTotale(),
            vitesse: vitesseTotaleJoueur(),

            force: statTotale("force"),
            dexterite: statTotale("dexterite"),
            intelligence: statTotale("intelligence"),
            vitalite: statTotale("vitalite"),
            chance: statTotale("chance")
        },

        effets: [],
        competences: obtenirCompetencesCombatJoueur()
    };
}

function creerSnapshotCombatMonstre(monstre) {
    return {
        id: monstre.id,
        camp: "ennemi",
        type: "monstre",
        nom: monstre.nom || "Monstre",
        niveau: monstre.niveau || 1,
        image: monstre.image || "",

        pv: monstre.pv ?? 1,
        pvMax: monstre.pvMax ?? monstre.pv ?? 1,
        mana: monstre.mana ?? 0,
        manaMax: monstre.manaMax ?? monstre.mana ?? 0,
        stamina: monstre.stamina ?? 0,
        staminaMax: monstre.staminaMax ?? monstre.stamina ?? 0,

        initiative: 0,
        defenseActive: false,

        baseStats: {
            attaquePhysique: monstre.attaque || 0,
            defensePhysique: monstre.defense || 0,
            attaqueMagique: monstre.attaqueMagique || 0,
            defenseMagique: monstre.defenseMagique || 0,
            critique: monstre.critique || 0,
            esquive: monstre.esquive || 0,
            vitesse: vitesseTotaleMonstre(monstre)
        },

        effets: [],
        competences: obtenirCompetencesCombatMonstre(monstre),
        ia: monstre.ia || { profil: "agressif" }
    };
}

function obtenirCompetencesCombatJoueur() {
    const personnage = Game.data.personnage;
    const classeId = normaliserIdClasse(personnage.classeId || personnage.classe || "aventurier");
    const classe = Game.cache.classesParId?.[classeId] || null;

    const base = ["attaque_simple", "defendre", "fuir", "utiliser_objet"];
    const competencesClasse = Array.isArray(classe?.competencesDepart) ? classe.competencesDepart : [];

    return [...new Set([...base, ...competencesClasse])].filter(Boolean);
}

function obtenirCompetencesCombatMonstre(monstre) {
    const liste = Array.isArray(monstre?.competences) ? monstre.competences : [];
    if (liste.length > 0) return liste.map(entree => typeof entree === "string" ? entree : entree.id).filter(Boolean);

    return ["attaque_simple_monstre"];
}

function normaliserIdClasse(valeur) {
    return String(valeur || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function obtenirStatCombat(combattant, nomStat) {
    let total = Number(combattant?.baseStats?.[nomStat]) || 0;

    for (const effet of (combattant?.effets || [])) {
        if ((effet.type === "buff_stat" || effet.type === "debuff_stat") && effet.stat === nomStat) {
            total += Number(effet.valeur) || 0;
        }
    }

    return total;
}

function estMort(combattant) {
    return (combattant?.pv ?? 0) <= 0;
}

/* --------------------------
   Initialisation / fin combat
   -------------------------- */

function demarrerCombatV2(monstre) {
    if (!monstre) return;
    if (Game.combat.actif) {
        ajouterJournal("⚠ Un combat est déjà en cours.");
        return;
    }

    Game.combat.actif = {
    id: genererIdCombat(),
    tour: 1,
    phase: "initialisation",
    statut: "en_cours",
    acteurCourant: null,

    joueur: creerSnapshotCombatJoueur(),
    ennemi: creerSnapshotCombatMonstre(monstre),

    journal: [
        `⚔ ${monstre.nom} apparaît !`
    ],

    derniereAction: null,
    recompenses: null,

    stats: creerStatsCombatVides()
};

    changerVue("combat");
    avancerInitiativeCombat();
    ouvrirCombatV2();
}

function synchroniserJoueurDepuisCombat() {
    const combat = Game.combat.actif;
    if (!combat) return;

    Game.data.personnage.pv = clamp(combat.joueur.pv, 0, combat.joueur.pvMax);
    Game.data.personnage.mana = clamp(combat.joueur.mana, 0, combat.joueur.manaMax);
    Game.data.personnage.stamina = clamp(combat.joueur.stamina, 0, combat.joueur.staminaMax);
}

function terminerCombat(resultat) {
    const combat = Game.combat.actif;
    if (!combat) return;

    combat.statut = resultat;
    combat.phase = "termine";
    synchroniserJoueurDepuisCombat();
	finaliserStatsCombat(resultat);

    if (resultat === "victoire") {
        const monstre = Game.cache.monstresParId[combat.ennemi.id];
        const xp = monstre?.xp || 0;
        const or = monstre?.or || 0;
        const loot = genererLootMonstre(monstre);

        Game.data.personnage.xp += xp;
        Game.data.personnage.or += or;

        loot.forEach(item => ajouterObjetInventaire(item.id, item.quantite));

        combat.recompenses = { xp, or, loot };

        ajouterJournal(`🏆 ${combat.ennemi.nom} vaincu`);
        if (xp > 0) ajouterJournal(`⭐ +${xp} XP`);
        if (or > 0) ajouterJournal(`🟡 +${or} or`);

        loot.forEach(item => {
            const objet = trouverObjet(item.id);
            ajouterJournal(`📦 ${objet?.nom || item.id} x${item.quantite}`);
        });

        if (typeof verifierNiveau === "function") verifierNiveau();
    }

    if (resultat === "defaite") {
        ajouterJournal("☠ Vous avez été vaincu.");
    }

    if (resultat === "fuite") {
        ajouterJournal("🏃 Vous parvenez à fuir.");
    }

    ouvrirCombatV2();
}

function quitterCombatV2() {
    Game.combat.actif = null;
    ouvrirExploration();
}

/* --------------------------
   Initiative
   -------------------------- */

function coutInitiativeAction(action) {
    const valeur = Number(action?.coutInitiative);
    if (!Number.isFinite(valeur)) return Game.combat.config.coutInitiativeDefaut;
    return clamp(valeur, Game.combat.config.coutInitiativeMin, Game.combat.config.coutInitiativeMax);
}

function vitesseEffective(combattant) {
    return Math.max(1, Math.round(obtenirStatCombat(combattant, "vitesse")));
}

function choisirActeurPret(combat) {
    const pret = [];

    if (combat.joueur.initiative >= Game.combat.config.seuilInitiative) {
        pret.push(combat.joueur);
    }
    if (combat.ennemi.initiative >= Game.combat.config.seuilInitiative) {
        pret.push(combat.ennemi);
    }

    if (pret.length === 0) return null;
    if (pret.length === 1) return pret[0];

    // Tie-break : initiative la plus haute, puis vitesse, puis joueur.
    pret.sort((a, b) => {
        const diffInit = b.initiative - a.initiative;
        if (diffInit !== 0) return diffInit;

        const diffVit = vitesseEffective(b) - vitesseEffective(a);
        if (diffVit !== 0) return diffVit;

        return a.camp === "joueur" ? -1 : 1;
    });

    return pret[0];
}

function ajouterLigneCombat(message) {
    const combat = Game.combat.actif;
    if (!combat) return;
    combat.journal.push(message);

    if (combat.journal.length > 40) {
        combat.journal.shift();
    }
}

function avancerInitiativeCombat() {
    const combat = Game.combat.actif;
    if (!combat || combat.statut !== "en_cours") return;

    while (combat.statut === "en_cours") {
        const acteurPret = choisirActeurPret(combat);

        if (!acteurPret) {
            combat.joueur.initiative += vitesseEffective(combat.joueur);
            combat.ennemi.initiative += vitesseEffective(combat.ennemi);
            continue;
        }

        combat.acteurCourant = acteurPret.id;
        combat.phase = acteurPret.camp;

        appliquerEffetsDebutTour(acteurPret);
        if (combat.statut !== "en_cours") break;

        if (estMort(acteurPret)) {
            if (acteurPret.camp === "joueur") terminerCombat("defaite");
            else terminerCombat("victoire");
            return;
        }

        if (acteurPret.camp === "joueur") {
            ouvrirCombatV2();
            return;
        }

        const actionIA = choisirActionIA();
        resoudreActionCombat(actionIA);
        if (combat.statut !== "en_cours") return;
    }

    ouvrirCombatV2();
}

/* --------------------------
   Dégâts / soins
   -------------------------- */

function calculerDegatsCombat({
    attaquant,
    defenseur,
    nature = "physique",
    puissance = 0,
    multiplicateur = 1,
    bonusCritique = 0,
    bonusEsquive = 0,
    peutCritiquer = true,
    peutEsquiver = true,
    ignoreDefense = false
}) {
    const offense = nature === "magique"
        ? obtenirStatCombat(attaquant, "attaqueMagique")
        : obtenirStatCombat(attaquant, "attaquePhysique");

    const defense = nature === "magique"
        ? obtenirStatCombat(defenseur, "defenseMagique")
        : obtenirStatCombat(defenseur, "defensePhysique");

    const chanceEsquive = peutEsquiver
        ? clamp(
            obtenirStatCombat(defenseur, "esquive") + bonusEsquive,
            Game.combat.config.esquiveMin,
            Game.combat.config.esquiveMax
        )
        : 0;

    if (chanceEsquive > 0 && Math.random() * 100 < chanceEsquive) {
        return {
            degats: 0,
            critique: false,
            esquive: true,
            nature
        };
    }

    const degatsBruts = Number(puissance || 0) + offense * Number(multiplicateur || 1);
    const variance = randFloat(Game.combat.config.varianceMin, Game.combat.config.varianceMax);

    const reductionDefense = ignoreDefense
        ? 1
        : 100 / (100 + Math.max(0, defense) * Game.combat.config.reductionDefenseFacteur);

    let degats = degatsBruts * reductionDefense * variance;

    const chanceCritique = peutCritiquer
        ? clamp(
            obtenirStatCombat(attaquant, "critique") + bonusCritique,
            Game.combat.config.critiqueMin,
            Game.combat.config.critiqueMax
        )
        : 0;

    const critique = chanceCritique > 0 && Math.random() * 100 < chanceCritique;

    if (critique) {
        degats *= Game.combat.config.multiplicateurCritique;
    }

    if (defenseur.defenseActive) {
        degats *= 0.5;
        defenseur.defenseActive = false;
    }

    degats = Math.max(1, Math.round(degats));

    return {
        degats,
        critique,
        esquive: false,
        nature
    };
}

function calculerSoinCombat({
    lanceur,
    puissance = 0,
    multiplicateur = 1,
    nature = "magique"
}) {
    const score = nature === "magique"
        ? obtenirStatCombat(lanceur, "attaqueMagique")
        : obtenirStatCombat(lanceur, "attaquePhysique");

    const soinBrut = Number(puissance || 0) + score * Number(multiplicateur || 1);
    const variance = randFloat(0.95, 1.05);

    return Math.max(1, Math.round(soinBrut * variance));
}

/* --------------------------
   Effets temporaires
   -------------------------- */

function clonerEffet(effet) {
    return {
        id: effet.id || `effet_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        nom: effet.nom || effet.id || "Effet",
        type: effet.type || "buff_stat",
        stat: effet.stat || null,
        valeur: Number(effet.valeur) || 0,
        dureeTours: Number(effet.dureeTours) || 1,
        timing: effet.timing || "fin_tour",
        modeCumul: effet.modeCumul || "refresh",
        nature: effet.nature || "physique",
        sourceId: effet.sourceId || null
    };
}

function appliquerEffetSurCombattant(cible, effetBrut) {
    const effet = clonerEffet(effetBrut);
    const existant = cible.effets.find(e => e.id === effet.id);

    if (!existant) {
        cible.effets.push(effet);
        return;
    }

    switch (effet.modeCumul) {
        case "stack_duration":
            existant.dureeTours += effet.dureeTours;
            break;

        case "stack_intensity_max":
            existant.valeur = Math.max(existant.valeur, effet.valeur);
            existant.dureeTours = Math.max(existant.dureeTours, effet.dureeTours);
            break;

        case "refresh":
        default:
            existant.valeur = effet.valeur;
            existant.dureeTours = effet.dureeTours;
            break;
    }
}

function appliquerEffetsDebutTour(combattant) {
    const combat = Game.combat.actif;
    if (!combat) return;

    for (const effet of [...combattant.effets]) {
        if (effet.timing !== "debut_tour") continue;

        if (effet.type === "dot") {
            const degats = Math.max(1, Math.round(effet.valeur));
            combattant.pv = Math.max(0, combattant.pv - degats);
            ajouterLigneCombat(`☠ ${combattant.nom} subit ${degats} dégâts de ${effet.nom}.`);
        }

        if (effet.type === "hot") {
            const soin = Math.max(1, Math.round(effet.valeur));
            combattant.pv = Math.min(combattant.pvMax, combattant.pv + soin);
            ajouterLigneCombat(`💚 ${combattant.nom} récupère ${soin} PV grâce à ${effet.nom}.`);
        }
    }

    if (combat.joueur.pv <= 0 && combat.ennemi.pv <= 0) {
        terminerCombat(combat.acteurCourant === "joueur" ? "victoire" : "defaite");
        return;
    }

    if (combat.joueur.pv <= 0) {
        terminerCombat("defaite");
        return;
    }

    if (combat.ennemi.pv <= 0) {
        terminerCombat("victoire");
    }
}

function appliquerEffetsFinTour(combattant) {
    const restant = [];

    for (const effet of combattant.effets) {
        if (effet.timing === "permanent") {
            restant.push(effet);
            continue;
        }

        effet.dureeTours -= 1;

        if (effet.dureeTours > 0) {
            restant.push(effet);
        } else {
            ajouterLigneCombat(`⌛ ${effet.nom} expire sur ${combattant.nom}.`);
        }
    }

    combattant.effets = restant;
}

/* --------------------------
   Résolution d'actions
   -------------------------- */

function actionParDefaut(id) {
    if (id === "attaque_simple") {
        return {
            id: "attaque_simple",
            nom: "Attaque",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100,
            puissance: 5,
            multiplicateur: 1
        };
    }

    if (id === "attaque_simple_monstre") {
        return {
            id: "attaque_simple_monstre",
            nom: "Attaque",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100,
            puissance: 4,
            multiplicateur: 1
        };
    }

    if (id === "defendre") {
        return {
            id: "defendre",
            nom: "Défendre",
            typeAction: "defense",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 90
        };
    }

    if (id === "fuir") {
        return {
            id: "fuir",
            nom: "Fuir",
            typeAction: "fuite",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100
        };
    }

    if (id === "utiliser_objet") {
        return {
            id: "utiliser_objet",
            nom: "Objet",
            typeAction: "objet",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 90
        };
    }

    return null;
}

function trouverCompetenceCombat(idCompetence) {
    return Game.cache.competencesParId?.[idCompetence] || actionParDefaut(idCompetence);
}

function payerCoutsAction(combattant, action) {
    const mana = Number(action?.couts?.mana) || 0;
    const stamina = Number(action?.couts?.stamina) || 0;

    if (combattant.mana < mana) return false;
    if (combattant.stamina < stamina) return false;

    combattant.mana -= mana;
    combattant.stamina -= stamina;
    return true;
}

function resoudreActionCombat(action) {
    const combat = Game.combat.actif;
    if (!combat || combat.statut !== "en_cours") return;

    const source = combat.acteurCourant === "joueur" ? combat.joueur : combat.ennemi;
    const cible = source.camp === "joueur" ? combat.ennemi : combat.joueur;

    if (!action) {
        action = trouverCompetenceCombat("attaque_simple");
    }

    if (!payerCoutsAction(source, action)) {
        ajouterLigneCombat(`⚠ ${source.nom} manque de ressources pour ${action.nom}.`);
        action = actionParDefaut(source.camp === "joueur" ? "attaque_simple" : "attaque_simple_monstre");
        payerCoutsAction(source, action);
    }
	
	enregistrerActionCombat(
    source,
    action
);

    let ligne = "";

    switch (action.typeAction) {
        case "attaque": {
            const resultat = calculerDegatsCombat({
                attaquant: source,
                defenseur: cible,
                nature: action.nature || "physique",
                puissance: action.puissance || 0,
                multiplicateur: action.multiplicateur || 1,
                bonusCritique: action.bonusCritique || 0,
                bonusEsquive: action.bonusEsquive || 0,
                peutCritiquer: action.peutCritiquer !== false,
                peutEsquiver: action.peutEsquiver !== false,
                ignoreDefense: action.ignoreDefense === true
            });

            if (resultat.esquive) {
    enregistrerEsquiveCombat(cible);

    ligne =
        `💨 ${cible.nom} esquive ${action.nom}.`;
} else {
    cible.pv =
        Math.max(
            0,
            cible.pv - resultat.degats
        );

    enregistrerDegatsCombat(
        source,
        cible,
        resultat
    );

    ligne =
        `${source.camp === "joueur" ? "⚔ Vous utilisez" : "⚔ " + source.nom + " utilise"} ${action.nom} et inflige ${resultat.degats} dégâts à ${cible.nom}${resultat.critique ? " (critique)" : ""}.`;
}

            if (Array.isArray(action.effets)) {
                action.effets.forEach(effet => {
                    const cibleEffet = effet.cible === "self" ? source : cible;
                    appliquerEffetSurCombattant(cibleEffet, {
                        ...effet,
                        sourceId: source.id
                    });
                });
            }

            source.stamina = Math.min(
                source.staminaMax,
                source.stamina + Game.combat.config.regenStaminaAttaqueSimple
            );
            break;
        }

        case "soin": {
            const soin = calculerSoinCombat({
                lanceur: source,
                puissance: action.puissance || 0,
                multiplicateur: action.multiplicateur || 1,
                nature: action.nature || "magique"
            });

            source.pv =
    Math.min(
        source.pvMax,
        source.pv + soin
    );

enregistrerSoinCombat(
    source,
    soin
);

ligne =
    `💚 ${source.nom} récupère ${soin} PV avec ${action.nom}.`;

break;
        }

        case "defense": {
            source.defenseActive =
    true;

source.stamina =
    Math.min(
        source.staminaMax,
        source.stamina + Game.combat.config.regenStaminaDefense
    );

enregistrerDefenseCombat(source);

ligne =
    `🛡 ${source.nom} se met en garde.`;

break;
        }

        case "fuite": {
            if (source.camp !== "joueur") {
                ligne = `⚠ Action de fuite ignorée.`;
                break;
            }

            const chance = clamp(
                50 + (vitesseEffective(combat.joueur) - vitesseEffective(combat.ennemi)) * 2,
                20,
                90
            );

            if (Math.random() * 100 < chance) {
    enregistrerTentativeFuiteCombat(true);

    ajouterLigneCombat(
        `🏃 Vous fuyez le combat (${chance}% de chance).`
    );

    terminerCombat("fuite");
    return;
} else {
    enregistrerTentativeFuiteCombat(false);

    ligne =
        `❌ Vous échouez à fuir (${chance}% de chance).`;
}
            break;
        }

        default: {
            ligne = `⚠ Action inconnue : ${action.id || "?"}`;
            break;
        }
    }

    ajouterLigneCombat(ligne);

    source.initiative = Math.max(0, source.initiative - coutInitiativeAction(action));
    appliquerEffetsFinTour(source);
    synchroniserJoueurDepuisCombat();

    if (combat.ennemi.pv <= 0 && combat.joueur.pv <= 0) {
        terminerCombat(source.camp === "joueur" ? "victoire" : "defaite");
        return;
    }

    if (combat.ennemi.pv <= 0) {
        terminerCombat("victoire");
        return;
    }

    if (combat.joueur.pv <= 0) {
        terminerCombat("defaite");
        return;
    }

    if (source.camp === "ennemi") {
        combat.tour += 1;
    }

    combat.acteurCourant = null;
    combat.phase = "attente";
    avancerInitiativeCombat();
}

/* --------------------------
   IA simple
   -------------------------- */

function choisirActionIA() {
    const combat = Game.combat.actif;
    if (!combat) return actionParDefaut("attaque_simple_monstre");

    const ennemi = combat.ennemi;

    // Règle 1 : si faible PV et compétence de soin connue, tenter soin.
    if (ennemi.pv / ennemi.pvMax <= 0.35) {
        const competenceSoin = ennemi.competences
            .map(id => trouverCompetenceCombat(id))
            .find(c => c?.typeAction === "soin");

        if (competenceSoin && payerCoutsAction({ ...ennemi }, competenceSoin)) {
            return competenceSoin;
        }
    }

    // Règle 2 : si faible stamina, défendre parfois.
    if (ennemi.stamina / Math.max(1, ennemi.staminaMax) <= 0.20 && Math.random() < 0.35) {
        return actionParDefaut("defendre");
    }

    // Règle 3 : utiliser une compétence offensive si disponible, sinon attaque simple.
    const offensives = ennemi.competences
        .map(id => trouverCompetenceCombat(id))
        .filter(c => c && c.typeAction === "attaque");

    if (offensives.length > 1 && Math.random() < 0.35) {
        return offensives[randInt(0, offensives.length - 1)];
    }

    return offensives[0] || actionParDefaut("attaque_simple_monstre");
}

/* --------------------------
   Wrappers UI combat
   -------------------------- */

function utiliserCompetenceCombat(idCompetence) {
    const combat = Game.combat.actif;
    if (!combat || combat.phase !== "joueur" || combat.statut !== "en_cours") return;

    const action = trouverCompetenceCombat(idCompetence);
    if (!action) return;

    resoudreActionCombat(action);
    ouvrirCombatV2();
}

function attaquerMonstreV2() {
    utiliserCompetenceCombat("attaque_simple");
}

function defendreCombatV2() {
    utiliserCompetenceCombat("defendre");
}

function fuirCombatV2() {
    utiliserCompetenceCombat("fuir");
}

function utiliserPotionCombat(idObjet) {
    const combat = Game.combat.actif;
    if (!combat || combat.phase !== "joueur") return;

    const objet = trouverObjet(idObjet);
    if (!objet || objet.type !== "consommable") return;

    const item = Game.data.personnage.inventaire.find(x => x.id === idObjet && x.quantite > 0);
    if (!item) {
        ajouterLigneCombat(`⚠ Vous n'avez pas ${objet.nom}.`);
        ouvrirCombatV2();
        return;
    }

    if (objet.soin) {
    enregistrerActionCombat(
        combat.joueur,
        {
            id: `potion_${objet.id}`,
            nom: objet.nom
        }
    );

    combat.joueur.pv =
        Math.min(
            combat.joueur.pvMax,
            combat.joueur.pv + objet.soin
        );

    retirerObjetInventaire(
        idObjet,
        1
    );

    enregistrerPotionCombat(
        objet.soin
    );

    ajouterLigneCombat(
        `🧪 Vous utilisez ${objet.nom} et récupérez ${objet.soin} PV.`
    );

    combat.joueur.initiative =
        Math.max(
            0,
            combat.joueur.initiative - 90
        );

    appliquerEffetsFinTour(
        combat.joueur
    );

    synchroniserJoueurDepuisCombat();
    avancerInitiativeCombat();
    ouvrirCombatV2();

    return;
}

    ajouterLigneCombat(`⚠ ${objet.nom} n'a pas encore d'effet utilisable en combat.`);
    ouvrirCombatV2();
}

/* --------------------------
   UI combat
   -------------------------- */

function creerMiniJournalCombat(combat) {
    const lignes = [...combat.journal].slice(-8).reverse();

    return `
        <div class="item-card">
            <h3>📜 Journal de combat</h3>
            <div class="journal-combat-mini">
                ${lignes.map(ligne => `<p>${ligne}</p>`).join("")}
            </div>
        </div>
    `;
}

function creerBarreInitiativeCombat(libelle, combattant) {
    return creerBarreRessource(
        "barre-xp",
        calculerPourcentage(combattant.initiative, Game.combat.config.seuilInitiative),
        Math.round(combattant.initiative),
        Game.combat.config.seuilInitiative,
        `⚡ ${libelle}`
    );
}

function creerResumeCombat(combat) {
    if (!combat || combat.statut === "en_cours" || !combat.stats) {
        return "";
    }

    const stats =
        combat.stats;

    const recompenses =
        combat.recompenses;

    const titreResultat = {
        victoire: "🏆 Victoire",
        defaite: "☠ Défaite",
        fuite: "🏃 Fuite"
    }[combat.statut] || combat.statut;

    const lootHtml =
        recompenses?.loot?.length
            ? `
                <div class="resume-combat__section">
                    <h4>📦 Butin</h4>

                    ${recompenses.loot.map(item => {
                        const objet =
                            trouverObjet(item.id);

                        return `
                            <div class="resume-combat__ligne">
                                <span>${objet?.nom || item.id}</span>
                                <strong>x${item.quantite}</strong>
                            </div>
                        `;
                    }).join("")}
                </div>
            `
            : "";

    return `
        <div class="item-card resume-combat">
            <h3>${titreResultat} — Résumé du combat</h3>

            <div class="resume-combat__grille">

                <div class="resume-combat__section">
                    <h4>⏱ Général</h4>

                    <div class="resume-combat__ligne">
                        <span>Durée</span>
                        <strong>${formaterDureeCombat(stats.dureeMs)}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Tours</span>
                        <strong>${combat.tour}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Actions joueur</span>
                        <strong>${stats.actionsJoueur}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Actions ennemi</span>
                        <strong>${stats.actionsEnnemi}</strong>
                    </div>
                </div>

                <div class="resume-combat__section">
                    <h4>⚔ Dégâts</h4>

                    <div class="resume-combat__ligne">
                        <span>Dégâts infligés</span>
                        <strong>${stats.degatsInfliges}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Dégâts reçus</span>
                        <strong>${stats.degatsRecus}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Critiques joueur</span>
                        <strong>${stats.critiquesJoueur}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Critiques ennemi</span>
                        <strong>${stats.critiquesEnnemi}</strong>
                    </div>
                </div>

                <div class="resume-combat__section">
                    <h4>🛡 Défense / survie</h4>

                    <div class="resume-combat__ligne">
                        <span>Défenses joueur</span>
                        <strong>${stats.defensesJoueur}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Défenses ennemi</span>
                        <strong>${stats.defensesEnnemi}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Esquives joueur</span>
                        <strong>${stats.esquivesJoueur}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Esquives ennemi</span>
                        <strong>${stats.esquivesEnnemi}</strong>
                    </div>
                </div>

                <div class="resume-combat__section">
                    <h4>🧪 Ressources</h4>

                    <div class="resume-combat__ligne">
                        <span>Soins joueur</span>
                        <strong>${stats.soinsJoueur}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Potions utilisées</span>
                        <strong>${stats.potionsUtilisees}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Tentatives fuite</span>
                        <strong>${stats.tentativesFuite}</strong>
                    </div>

                    <div class="resume-combat__ligne">
                        <span>Fuite réussie</span>
                        <strong>${stats.fuiteReussie ? "Oui" : "Non"}</strong>
                    </div>
                </div>

                ${
                    recompenses
                        ? `
                            <div class="resume-combat__section">
                                <h4>🎁 Récompenses</h4>

                                <div class="resume-combat__ligne">
                                    <span>XP</span>
                                    <strong>${recompenses.xp || 0}</strong>
                                </div>

                                <div class="resume-combat__ligne">
                                    <span>Or</span>
                                    <strong>${recompenses.or || 0}</strong>
                                </div>
                            </div>
                        `
                        : ""
                }

                ${lootHtml}

            </div>
        </div>
    `;
}

function ouvrirCombatV2() {
    const combat =
        Game.combat.actif;

    if (!combat) {
        ouvrirExploration();
        return;
    }

    changerVue("combat");

    /*
        Si le combat est terminé, on n'affiche plus :
        - la carte du joueur
        - la carte du monstre
        - les boutons d'action
        - le journal de combat

        On affiche uniquement le résumé final.
    */
    if (combat.statut !== "en_cours") {
        let html = `
            <div class="item-card">
                <h2>📊 Résultat du combat</h2>

                <p>
                    Le combat contre
                    <strong>${combat.ennemi.nom}</strong>
                    est terminé.
                </p>
            </div>
        `;

        html +=
            creerResumeCombat(combat);

        html += `
            <div class="item-card">
                <button onclick="quitterCombatV2()">
                    ⬅ Retour à l'exploration
                </button>
            </div>
        `;

        afficherVuePrincipale(html);
        return;
    }

    const joueur =
        combat.joueur;

    const ennemi =
        combat.ennemi;

    const peutAgir =
        combat.phase === "joueur" &&
        combat.statut === "en_cours";

    let html = `
        <div class="item-card">
            <h2>⚔ Combat</h2>

            <p>
                Tour ${combat.tour} —
                ${
                    combat.phase === "joueur"
                        ? "À vous d'agir"
                        : "Tour ennemi"
                }
            </p>
        </div>

        <div class="item-card">
            <h3>🧙 ${joueur.nom}</h3>

            ${creerBarreRessource(
                "barre-pv",
                calculerPourcentage(joueur.pv, joueur.pvMax),
                joueur.pv,
                joueur.pvMax,
                "❤️ PV"
            )}

            ${creerBarreRessource(
                "barre-mana",
                calculerPourcentage(joueur.mana, joueur.manaMax),
                joueur.mana,
                joueur.manaMax,
                "🔵 Mana"
            )}

            ${creerBarreRessource(
                "barre-stamina",
                calculerPourcentage(joueur.stamina, joueur.staminaMax),
                joueur.stamina,
                joueur.staminaMax,
                "🟢 Stamina"
            )}

            ${creerBarreInitiativeCombat(
                "Initiative joueur",
                joueur
            )}
        </div>

        <div class="item-card">
            ${
                ennemi.image
                    ? `<img src="${ennemi.image}" class="portrait-monstre">`
                    : ""
            }

            <h3>👹 ${ennemi.nom}</h3>

            ${creerBarreRessource(
                "barre-pv",
                calculerPourcentage(ennemi.pv, ennemi.pvMax),
                ennemi.pv,
                ennemi.pvMax,
                "❤️ PV"
            )}

            ${creerBarreRessource(
                "barre-mana",
                calculerPourcentage(ennemi.mana, ennemi.manaMax),
                ennemi.mana,
                ennemi.manaMax,
                "🔵 Mana"
            )}

            ${creerBarreRessource(
                "barre-stamina",
                calculerPourcentage(ennemi.stamina, ennemi.staminaMax),
                ennemi.stamina,
                ennemi.staminaMax,
                "🟢 Stamina"
            )}

            ${creerBarreInitiativeCombat(
                "Initiative ennemi",
                ennemi
            )}
        </div>

        <div class="item-card">
            <h3>🎮 Actions</h3>

            <div class="combat-actions">
                <button
                    ${peutAgir ? "" : "disabled"}
                    onclick="attaquerMonstreV2()"
                >
                    ⚔ Attaquer
                </button>

                <button
                    ${peutAgir ? "" : "disabled"}
                    onclick="defendreCombatV2()"
                >
                    🛡 Défendre
                </button>

                <button
                    ${peutAgir ? "" : "disabled"}
                    onclick="fuirCombatV2()"
                >
                    🏃 Fuir
                </button>

                <button
                    ${peutAgir ? "" : "disabled"}
                    onclick="utiliserPotionCombat('potion_soin')"
                >
                    🧪 Potion
                </button>
            </div>
        </div>
    `;

    html +=
        creerMiniJournalCombat(combat);

    afficherVuePrincipale(html);
}

/*ALIAS TEMPORAIRES — BRANCHEMENT COMBAT V2 SUR LE MOTEUR EXISTANT*/

/*Ces alias permettent au vieux moteur d'appeler le nouveau combat sans devoir modifier tout le script.js d'un coup.*/

function demarrerCombat(monstre) {
    demarrerCombatV2(monstre);
}

function ouvrirCombat() {
    ouvrirCombatV2();
}

function attaquerMonstre() {
    attaquerMonstreV2();
}

function quitterCombat() {
    quitterCombatV2();
}

/* ==========================================================================
   SIMULATEUR DE COMBAT — OUTIL D'ÉQUILIBRAGE v0.7
   ========================================================================== */

Game.simulateurCombat ??= {
    dernierRapport: null
};

function clonerObjetSimulationCombat(objet) {
    return JSON.parse(
        JSON.stringify(objet)
    );
}

function echapperHTMLSimulationCombat(valeur) {
    const div =
        document.createElement("div");

    div.textContent =
        String(valeur ?? "");

    return div.innerHTML;
}

function obtenirListeMonstresSimulationCombat() {
    return Game.data.monstres || [];
}

function obtenirMonstreSimulationCombat(idMonstre) {
    return Game.cache.monstresParId?.[idMonstre] || null;
}

function obtenirSoinPotionSimulationCombat(idPotion) {
    const objet =
        trouverObjet(idPotion);

    if (!objet) return 30;

    return Number(objet.soin || objet.pv || objet.valeur || 30);
}

function ouvrirSimulateurCombat() {
    changerVue("simulateur_combat");

    const monstres =
        obtenirListeMonstresSimulationCombat();

    const optionsMonstres =
        monstres
            .map(monstre => {
                return `
                    <option value="${echapperHTMLSimulationCombat(monstre.id)}">
                        ${echapperHTMLSimulationCombat(monstre.id)} — ${echapperHTMLSimulationCombat(monstre.nom || "Monstre")}
                    </option>
                `;
            })
            .join("");

    const dernierRapport =
        Game.simulateurCombat.dernierRapport;

    let html = `
        <div class="item-card">
            <h2>🧪 Simulateur de combat</h2>

            <p>
                Outil de test automatique pour équilibrer les monstres,
                la vitesse, les dégâts, la défense, l'esquive et les potions.
            </p>

            <p class="texte-muted">
                Les simulations ne modifient pas la vraie partie :
                pas d'XP, pas d'or, pas de loot et aucune potion réelle consommée.
            </p>
        </div>

        <div class="item-card simulateur-combat-formulaire">
            <h3>⚙ Réglages</h3>

            <label>
                Monstre à simuler
                <select id="simulateurMonstreId">
                    ${optionsMonstres}
                </select>
            </label>

            <label>
                Nombre de combats
                <input
                    id="simulateurNombreCombats"
                    type="number"
                    min="1"
                    max="50000"
                    value="1000"
                >
            </label>

            <label>
                Stratégie joueur
                <select id="simulateurStrategieJoueur">
                    <option value="agressif">Agressif — attaque presque toujours</option>
                    <option value="prudent" selected>Prudent — potion et défense si danger</option>
                    <option value="defensif">Défensif — utilise souvent défense</option>
                </select>
            </label>

            <label>
                Potions simulées par combat
                <input
                    id="simulateurPotionsMax"
                    type="number"
                    min="0"
                    max="20"
                    value="3"
                >
            </label>

            <label>
                Potion utilisée
                <input
                    id="simulateurPotionId"
                    type="text"
                    value="potion_soin"
                >
            </label>

            <label class="simulateur-combat-checkbox">
                <input
                    id="simulateurLogsComplets"
                    type="checkbox"
                >
                Inclure les logs détaillés dans le JSON
            </label>

            <p class="texte-muted">
                Conseil : garde cette option désactivée pour les grosses simulations.
                Le fichier TXT téléchargé sera toujours un rapport synthèse compact.
            </p>

            <div class="simulateur-combat-actions">
                <button onclick="lancerSimulationCombatDepuisUI()">
                    ▶ Lancer la simulation
                </button>

                <button onclick="telechargerRapportSimulationCombatJSON()">
                    💾 Télécharger JSON complet
                </button>

                <button onclick="telechargerRapportSimulationCombatTXT()">
                    📄 Télécharger TXT synthèse
                </button>
            </div>
        </div>

        <div id="simulateurCombatResultats">
            ${
                dernierRapport
                    ? creerAffichageRapportSimulationCombat(dernierRapport)
                    : `
                        <div class="item-card">
                            <p>
                                Aucun rapport pour le moment.
                                Lance une simulation pour afficher les résultats.
                            </p>
                        </div>
                    `
            }
        </div>
    `;

    afficherVuePrincipale(html);
}

function lireOptionsSimulationCombatDepuisUI() {
    const idMonstre =
        document.getElementById("simulateurMonstreId")?.value;

    const nombreCombats =
        Math.max(
            1,
            Math.min(
                5000,
                Number(document.getElementById("simulateurNombreCombats")?.value) || 1
            )
        );

    const strategieJoueur =
        document.getElementById("simulateurStrategieJoueur")?.value || "prudent";

    const potionsMax =
        Math.max(
            0,
            Math.min(
                20,
                Number(document.getElementById("simulateurPotionsMax")?.value) || 0
            )
        );

    const idPotion =
        document.getElementById("simulateurPotionId")?.value || "potion_soin";

    const logsComplets =
        document.getElementById("simulateurLogsComplets")?.checked === true;

    return {
        idMonstre,
        nombreCombats,
        strategieJoueur,
        potionsMax,
        idPotion,
        logsComplets
    };
}

function lancerSimulationCombatDepuisUI() {
    const options =
        lireOptionsSimulationCombatDepuisUI();

    const monstre =
        obtenirMonstreSimulationCombat(options.idMonstre);

    if (!monstre) {
        ajouterJournal(
            `⚠ Simulateur : monstre introuvable (${options.idMonstre}).`
        );
        return;
    }

    const rapport =
        lancerSimulationCombatAutomatisee(
            monstre,
            options
        );

    Game.simulateurCombat.dernierRapport =
        rapport;

    const conteneur =
        document.getElementById("simulateurCombatResultats");

    if (conteneur) {
        conteneur.innerHTML =
            creerAffichageRapportSimulationCombat(rapport);
    }

    ajouterJournal(
        `🧪 Simulation terminée : ${options.nombreCombats} combats contre ${monstre.nom}.`
    );
}

function lancerSimulationCombatAutomatisee(monstre, options = {}) {
    const debut =
        Date.now();

    const nombreCombats =
        Math.max(
            1,
            Number(options.nombreCombats) || 1
        );

    const resultats =
        [];

    for (let index = 0; index < nombreCombats; index++) {
        const resultat =
            simulerUnCombatAutomatise(
                monstre,
                {
                    ...options,
                    indexCombat: index + 1
                }
            );

        resultats.push(resultat);
    }

    const rapport = {
        date: new Date().toISOString(),
        monstre: {
            id: monstre.id,
            nom: monstre.nom,
            niveau: monstre.niveau,
            pvMax: monstre.pvMax ?? monstre.pv,
            attaque: monstre.attaque,
            defense: monstre.defense,
            attaqueMagique: monstre.attaqueMagique,
            defenseMagique: monstre.defenseMagique,
            critique: monstre.critique,
            esquive: monstre.esquive,
            vitesse: monstre.vitesse ?? vitesseTotaleMonstre(monstre)
        },
        joueur: {
            nom: Game.data.personnage.nom,
            niveau: Game.data.personnage.niveau,
            pvMax: pvMaxTotal(),
            manaMax: manaMaxTotal(),
            staminaMax: staminaMaxTotal(),
            attaquePhysique: attaqueTotale(),
            defensePhysique: defenseTotale(),
            attaqueMagique: attaqueMagiqueTotale(),
            defenseMagique: defenseMagiqueTotale(),
            critique: critiqueTotal(),
            esquive: esquiveTotale(),
            vitesse: vitesseTotaleJoueur()
        },
        options,
        resume: calculerResumeSimulationCombat(resultats),
        resultats,
        dureeSimulationMs: Date.now() - debut
    };

    return rapport;
}

function simulerUnCombatAutomatise(monstre, options = {}) {
    const joueur =
        clonerObjetSimulationCombat(
            creerSnapshotCombatJoueur()
        );

    const ennemi =
        clonerObjetSimulationCombat(
            creerSnapshotCombatMonstre(monstre)
        );

    joueur.pv =
        joueur.pvMax;

    joueur.mana =
        joueur.manaMax;

    joueur.stamina =
        joueur.staminaMax;

    joueur.initiative =
        0;

    joueur.defenseActive =
        false;

    ennemi.pv =
        ennemi.pvMax;

    ennemi.mana =
        ennemi.manaMax;

    ennemi.stamina =
        ennemi.staminaMax;

    ennemi.initiative =
        0;

    ennemi.defenseActive =
        false;

    const stats =
        creerStatsSimulationCombatVides();

    const logs =
        [];

    const combatSimulation = {
        indexCombat: options.indexCombat || 1,
        tour: 1,
        joueur,
        ennemi,
        stats,
        logs,
        statut: "en_cours",
        potionsRestantes: Number(options.potionsMax) || 0,
        idPotion: options.idPotion || "potion_soin",
        strategieJoueur: options.strategieJoueur || "prudent"
    };

    ajouterLogSimulationCombat(
        combatSimulation,
        `⚔ Combat ${combatSimulation.indexCombat} : ${ennemi.nom} apparaît.`
    );

    const limiteActions =
        500;

    let compteurActions =
        0;

    while (
        combatSimulation.statut === "en_cours" &&
        compteurActions < limiteActions
    ) {
        const acteur =
            obtenirActeurPretSimulationCombat(combatSimulation);

        if (!acteur) {
            joueur.initiative +=
                vitesseEffective(joueur);

            ennemi.initiative +=
                vitesseEffective(ennemi);

            continue;
        }

        const cible =
            acteur.camp === "joueur"
                ? ennemi
                : joueur;

        const action =
            acteur.camp === "joueur"
                ? choisirActionSimulationJoueur(combatSimulation)
                : choisirActionSimulationEnnemi(combatSimulation);

        appliquerActionSimulationCombat(
            combatSimulation,
            acteur,
            cible,
            action
        );

        compteurActions++;

        if (ennemi.pv <= 0 && joueur.pv <= 0) {
            combatSimulation.statut =
                acteur.camp === "joueur"
                    ? "victoire"
                    : "defaite";
            break;
        }

        if (ennemi.pv <= 0) {
            combatSimulation.statut =
                "victoire";
            break;
        }

        if (joueur.pv <= 0) {
            combatSimulation.statut =
                "defaite";
            break;
        }

        if (acteur.camp === "ennemi") {
            combatSimulation.tour++;
        }
    }

    if (combatSimulation.statut === "en_cours") {
        combatSimulation.statut =
            "limite_actions";
    }

    stats.resultat =
        combatSimulation.statut;

    stats.pvJoueurRestants =
        Math.max(0, joueur.pv);

    stats.pvEnnemiRestants =
        Math.max(0, ennemi.pv);

    stats.tours =
        combatSimulation.tour;

    ajouterLogSimulationCombat(
        combatSimulation,
        `🏁 Résultat : ${combatSimulation.statut}. PV joueur : ${stats.pvJoueurRestants}/${joueur.pvMax}. PV ennemi : ${stats.pvEnnemiRestants}/${ennemi.pvMax}.`
    );

    return {
        index: combatSimulation.indexCombat,
        resultat: combatSimulation.statut,
        stats,
        logs: options.logsComplets ? logs : []
    };
}

function creerStatsSimulationCombatVides() {
    return {
        resultat: "en_cours",

        tours: 0,

        actionsJoueur: 0,
        actionsEnnemi: 0,

        degatsInfliges: 0,
        degatsRecus: 0,

        soinsJoueur: 0,

        critiquesJoueur: 0,
        critiquesEnnemi: 0,

        esquivesJoueur: 0,
        esquivesEnnemi: 0,

        defensesJoueur: 0,
        defensesEnnemi: 0,

        potionsUtilisees: 0,

        pvJoueurRestants: 0,
        pvEnnemiRestants: 0
    };
}

function ajouterLogSimulationCombat(combatSimulation, message) {
    combatSimulation.logs.push(message);
}

function obtenirActeurPretSimulationCombat(combatSimulation) {
    const pret =
        [];

    if (combatSimulation.joueur.initiative >= Game.combat.config.seuilInitiative) {
        pret.push(combatSimulation.joueur);
    }

    if (combatSimulation.ennemi.initiative >= Game.combat.config.seuilInitiative) {
        pret.push(combatSimulation.ennemi);
    }

    if (pret.length === 0) return null;

    if (pret.length === 1) return pret[0];

    pret.sort((a, b) => {
        const differenceInitiative =
            b.initiative - a.initiative;

        if (differenceInitiative !== 0) {
            return differenceInitiative;
        }

        const differenceVitesse =
            vitesseEffective(b) - vitesseEffective(a);

        if (differenceVitesse !== 0) {
            return differenceVitesse;
        }

        return a.camp === "joueur" ? -1 : 1;
    });

    return pret[0];
}

function choisirActionSimulationJoueur(combatSimulation) {
    const joueur =
        combatSimulation.joueur;

    const ratioPv =
        joueur.pv / Math.max(1, joueur.pvMax);

    const strategie =
        combatSimulation.strategieJoueur;

    if (
        combatSimulation.potionsRestantes > 0 &&
        ratioPv <= 0.45
    ) {
        const soin =
            obtenirSoinPotionSimulationCombat(
                combatSimulation.idPotion
            );

        return {
            id: `simulation_potion_${combatSimulation.idPotion}`,
            nom: `Potion (${combatSimulation.idPotion})`,
            typeAction: "potion",
            soin,
            coutInitiative: 90
        };
    }

    if (
        strategie === "defensif" &&
        ratioPv <= 0.75 &&
        Math.random() < 0.35
    ) {
        return actionParDefaut("defendre");
    }

    if (
        strategie === "prudent" &&
        ratioPv <= 0.35 &&
        Math.random() < 0.25
    ) {
        return actionParDefaut("defendre");
    }

    return actionParDefaut("attaque_simple");
}

function choisirActionSimulationEnnemi(combatSimulation) {
    const ennemi =
        combatSimulation.ennemi;

    const ratioStamina =
        ennemi.stamina / Math.max(1, ennemi.staminaMax);

    if (
        ratioStamina <= 0.15 &&
        Math.random() < 0.25
    ) {
        return actionParDefaut("defendre");
    }

    return actionParDefaut("attaque_simple_monstre");
}

function appliquerActionSimulationCombat(combatSimulation, source, cible, action) {
    if (!action) {
        action =
            actionParDefaut(
                source.camp === "joueur"
                    ? "attaque_simple"
                    : "attaque_simple_monstre"
            );
    }

    if (source.camp === "joueur") {
        combatSimulation.stats.actionsJoueur++;
    } else {
        combatSimulation.stats.actionsEnnemi++;
    }

    switch (action.typeAction) {
        case "potion": {
            combatSimulation.potionsRestantes =
                Math.max(
                    0,
                    combatSimulation.potionsRestantes - 1
                );

            source.pv =
                Math.min(
                    source.pvMax,
                    source.pv + action.soin
                );

            combatSimulation.stats.potionsUtilisees++;
            combatSimulation.stats.soinsJoueur +=
                action.soin;

            ajouterLogSimulationCombat(
                combatSimulation,
                `🧪 ${source.nom} utilise ${action.nom} et récupère ${action.soin} PV.`
            );

            source.initiative =
                Math.max(
                    0,
                    source.initiative - coutInitiativeAction(action)
                );

            return;
        }

        case "defense": {
            source.defenseActive =
                true;

            source.stamina =
                Math.min(
                    source.staminaMax,
                    source.stamina + Game.combat.config.regenStaminaDefense
                );

            if (source.camp === "joueur") {
                combatSimulation.stats.defensesJoueur++;
            } else {
                combatSimulation.stats.defensesEnnemi++;
            }

            ajouterLogSimulationCombat(
                combatSimulation,
                `🛡 ${source.nom} se met en garde.`
            );

            source.initiative =
                Math.max(
                    0,
                    source.initiative - coutInitiativeAction(action)
                );

            return;
        }

        case "attaque":
        default: {
            const resultat =
                calculerDegatsCombat({
                    attaquant: source,
                    defenseur: cible,
                    nature: action.nature || "physique",
                    puissance: action.puissance || 0,
                    multiplicateur: action.multiplicateur || 1,
                    bonusCritique: action.bonusCritique || 0,
                    bonusEsquive: action.bonusEsquive || 0,
                    peutCritiquer: action.peutCritiquer !== false,
                    peutEsquiver: action.peutEsquiver !== false,
                    ignoreDefense: action.ignoreDefense === true
                });

            if (resultat.esquive) {
                if (cible.camp === "joueur") {
                    combatSimulation.stats.esquivesJoueur++;
                } else {
                    combatSimulation.stats.esquivesEnnemi++;
                }

                ajouterLogSimulationCombat(
                    combatSimulation,
                    `💨 ${cible.nom} esquive ${action.nom}.`
                );
            } else {
                cible.pv =
                    Math.max(
                        0,
                        cible.pv - resultat.degats
                    );

                if (source.camp === "joueur") {
                    combatSimulation.stats.degatsInfliges +=
                        resultat.degats;

                    if (resultat.critique) {
                        combatSimulation.stats.critiquesJoueur++;
                    }
                } else {
                    combatSimulation.stats.degatsRecus +=
                        resultat.degats;

                    if (resultat.critique) {
                        combatSimulation.stats.critiquesEnnemi++;
                    }
                }

                ajouterLogSimulationCombat(
                    combatSimulation,
                    `${source.camp === "joueur" ? "⚔ Joueur" : "⚔ " + source.nom} utilise ${action.nom} et inflige ${resultat.degats} dégâts à ${cible.nom}${resultat.critique ? " (critique)" : ""}.`
                );
            }

            source.stamina =
                Math.min(
                    source.staminaMax,
                    source.stamina + Game.combat.config.regenStaminaAttaqueSimple
                );

            source.initiative =
                Math.max(
                    0,
                    source.initiative - coutInitiativeAction(action)
                );

            return;
        }
    }
}

function calculerResumeSimulationCombat(resultats) {
    const total =
        resultats.length;

    const victoires =
        resultats.filter(resultat => resultat.resultat === "victoire").length;

    const defaites =
        resultats.filter(resultat => resultat.resultat === "defaite").length;

    const limites =
        resultats.filter(resultat => resultat.resultat === "limite_actions").length;

    function moyenne(champ) {
        if (total <= 0) return 0;

        const somme =
            resultats.reduce((acc, resultat) => {
                return acc + (Number(resultat.stats[champ]) || 0);
            }, 0);

        return somme / total;
    }

    return {
        total,
        victoires,
        defaites,
        limites,

        tauxVictoire: total > 0
            ? victoires / total * 100
            : 0,

        moyenneTours: moyenne("tours"),
        moyenneActionsJoueur: moyenne("actionsJoueur"),
        moyenneActionsEnnemi: moyenne("actionsEnnemi"),
        moyenneDegatsInfliges: moyenne("degatsInfliges"),
        moyenneDegatsRecus: moyenne("degatsRecus"),
        moyenneSoinsJoueur: moyenne("soinsJoueur"),
        moyennePotions: moyenne("potionsUtilisees"),
        moyennePvJoueurRestants: moyenne("pvJoueurRestants"),
        moyennePvEnnemiRestants: moyenne("pvEnnemiRestants"),
        moyenneCritiquesJoueur: moyenne("critiquesJoueur"),
        moyenneCritiquesEnnemi: moyenne("critiquesEnnemi"),
        moyenneEsquivesJoueur: moyenne("esquivesJoueur"),
        moyenneEsquivesEnnemi: moyenne("esquivesEnnemi")
    };
}

function formaterNombreSimulationCombat(nombre, decimales = 1) {
    return Number(nombre || 0).toFixed(decimales);
}

function creerAffichageRapportSimulationCombat(rapport) {
    const resume =
        rapport.resume;

    return `
        <div class="item-card simulateur-combat-rapport">
            <h3>📊 Résultat de simulation</h3>

            <p>
                Monstre :
                <strong>${echapperHTMLSimulationCombat(rapport.monstre.nom)}</strong>
                —
                ID :
                <code>${echapperHTMLSimulationCombat(rapport.monstre.id)}</code>
            </p>

            <p>
                Combats simulés :
                <strong>${resume.total}</strong>
                —
                Durée calcul :
                <strong>${rapport.dureeSimulationMs} ms</strong>
            </p>

            <div class="simulateur-combat-grille">
                <div class="simulateur-combat-stat">
                    <span>Victoires</span>
                    <strong>${resume.victoires}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Défaites</span>
                    <strong>${resume.defaites}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Taux victoire</span>
                    <strong>${formaterNombreSimulationCombat(resume.tauxVictoire)}%</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Limites actions</span>
                    <strong>${resume.limites}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Tours moyens</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneTours)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Actions joueur</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneActionsJoueur)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Actions ennemi</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneActionsEnnemi)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Dégâts infligés</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneDegatsInfliges)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Dégâts reçus</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneDegatsRecus)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Soins joueur</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneSoinsJoueur)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Potions moyennes</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyennePotions)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>PV joueur restants</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyennePvJoueurRestants)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Critiques joueur</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneCritiquesJoueur)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Critiques ennemi</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneCritiquesEnnemi)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Esquives joueur</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneEsquivesJoueur)}</strong>
                </div>

                <div class="simulateur-combat-stat">
                    <span>Esquives ennemi</span>
                    <strong>${formaterNombreSimulationCombat(resume.moyenneEsquivesEnnemi)}</strong>
                </div>
            </div>
        </div>
    `;
}

function obtenirValeursStatsSimulationCombat(rapport, champ) {
    if (!rapport?.resultats) return [];

    return rapport.resultats
        .map(resultat => Number(resultat?.stats?.[champ]))
        .filter(valeur => Number.isFinite(valeur));
}

function calculerSyntheseValeursSimulationCombat(valeurs) {
    if (!valeurs || valeurs.length === 0) {
        return {
            moyenne: 0,
            mediane: 0,
            min: 0,
            max: 0,
            p10: 0,
            p90: 0
        };
    }

    const valeursTriees =
        [...valeurs].sort((a, b) => a - b);

    const total =
        valeursTriees.length;

    const somme =
        valeursTriees.reduce((acc, valeur) => acc + valeur, 0);

    function percentile(pourcentage) {
        const index =
            Math.round(
                (pourcentage / 100) * (total - 1)
            );

        return valeursTriees[
            Math.max(
                0,
                Math.min(total - 1, index)
            )
        ];
    }

    return {
        moyenne: somme / total,
        mediane: percentile(50),
        min: valeursTriees[0],
        max: valeursTriees[total - 1],
        p10: percentile(10),
        p90: percentile(90)
    };
}

function calculerSyntheseChampSimulationCombat(rapport, champ) {
    const valeurs =
        obtenirValeursStatsSimulationCombat(
            rapport,
            champ
        );

    return calculerSyntheseValeursSimulationCombat(
        valeurs
    );
}

function formaterValeurSyntheseSimulationCombat(valeur, decimales = 1) {
    return Number(valeur || 0).toFixed(decimales);
}

function creerLigneSyntheseSimulationCombat(rapport, libelle, champ, decimales = 1) {
    const synthese =
        calculerSyntheseChampSimulationCombat(
            rapport,
            champ
        );

    return `${libelle} : moyenne ${formaterValeurSyntheseSimulationCombat(synthese.moyenne, decimales)} | médiane ${formaterValeurSyntheseSimulationCombat(synthese.mediane, decimales)} | min ${formaterValeurSyntheseSimulationCombat(synthese.min, decimales)} | max ${formaterValeurSyntheseSimulationCombat(synthese.max, decimales)} | P10 ${formaterValeurSyntheseSimulationCombat(synthese.p10, decimales)} | P90 ${formaterValeurSyntheseSimulationCombat(synthese.p90, decimales)}`;
}

function calculerRepartitionResultatsSimulationCombat(rapport) {
    const repartition =
        {};

    for (const resultat of (rapport?.resultats || [])) {
        const cle =
            resultat.resultat || "inconnu";

        repartition[cle] =
            (repartition[cle] || 0) + 1;
    }

    return repartition;
}

function calculerTauxSimulationCombat(nombre, total) {
    if (!total) return "0.0%";

    return `${((nombre / total) * 100).toFixed(1)}%`;
}

function telechargerRapportSimulationCombatJSON() {
    const rapport =
        Game.simulateurCombat.dernierRapport;

    if (!rapport) {
        ajouterJournal("⚠ Aucun rapport de simulation à télécharger.");
        return;
    }

    const contenu =
        JSON.stringify(
            rapport,
            null,
            2
        );

    telechargerFichierSimulationCombat(
        contenu,
        `simulation_combat_${rapport.monstre.id}_${Date.now()}.json`,
        "application/json"
    );
}


function telechargerRapportSimulationCombatTXT() {
    const rapport =
        Game.simulateurCombat.dernierRapport;

    if (!rapport) {
        ajouterJournal("⚠ Aucun rapport de simulation à télécharger.");
        return;
    }

    const resume =
        rapport.resume;

    const repartition =
        calculerRepartitionResultatsSimulationCombat(
            rapport
        );

    const total =
        resume.total || 0;

    const lignes =
        [];

    lignes.push("SIMULATION DE COMBAT — NIGHTVENTURE");
    lignes.push("RAPPORT SYNTHÈSE COMPACT");
    lignes.push("====================================");
    lignes.push("");

    lignes.push("INFORMATIONS GÉNÉRALES");
    lignes.push("----------------------");
    lignes.push(`Date : ${rapport.date}`);
    lignes.push(`Combats simulés : ${total}`);
    lignes.push(`Durée calcul : ${rapport.dureeSimulationMs} ms`);
    lignes.push("");

    lignes.push("MONSTRE TESTÉ");
    lignes.push("-------------");
    lignes.push(`Nom : ${rapport.monstre.nom}`);
    lignes.push(`ID : ${rapport.monstre.id}`);
    lignes.push(`Niveau : ${rapport.monstre.niveau}`);
    lignes.push(`PV max : ${rapport.monstre.pvMax}`);
    lignes.push(`Attaque : ${rapport.monstre.attaque}`);
    lignes.push(`Défense : ${rapport.monstre.defense}`);
    lignes.push(`Attaque magique : ${rapport.monstre.attaqueMagique}`);
    lignes.push(`Défense magique : ${rapport.monstre.defenseMagique}`);
    lignes.push(`Critique : ${rapport.monstre.critique}`);
    lignes.push(`Esquive : ${rapport.monstre.esquive}`);
    lignes.push(`Vitesse : ${rapport.monstre.vitesse}`);
    lignes.push("");

    lignes.push("JOUEUR UTILISÉ POUR LA SIMULATION");
    lignes.push("---------------------------------");
    lignes.push(`Nom : ${rapport.joueur.nom}`);
    lignes.push(`Niveau : ${rapport.joueur.niveau}`);
    lignes.push(`PV max : ${rapport.joueur.pvMax}`);
    lignes.push(`Mana max : ${rapport.joueur.manaMax}`);
    lignes.push(`Stamina max : ${rapport.joueur.staminaMax}`);
    lignes.push(`Attaque physique : ${rapport.joueur.attaquePhysique}`);
    lignes.push(`Défense physique : ${rapport.joueur.defensePhysique}`);
    lignes.push(`Attaque magique : ${rapport.joueur.attaqueMagique}`);
    lignes.push(`Défense magique : ${rapport.joueur.defenseMagique}`);
    lignes.push(`Critique : ${rapport.joueur.critique}`);
    lignes.push(`Esquive : ${rapport.joueur.esquive}`);
    lignes.push(`Vitesse : ${rapport.joueur.vitesse}`);
    lignes.push("");

    lignes.push("OPTIONS DE SIMULATION");
    lignes.push("---------------------");
    lignes.push(`Stratégie joueur : ${rapport.options.strategieJoueur}`);
    lignes.push(`Potions max par combat : ${rapport.options.potionsMax}`);
    lignes.push(`Potion utilisée : ${rapport.options.idPotion}`);
    lignes.push(`Logs complets enregistrés dans JSON : ${rapport.options.logsComplets ? "oui" : "non"}`);
    lignes.push("");

    lignes.push("RÉSULTATS GLOBAUX");
    lignes.push("-----------------");
    lignes.push(`Victoires : ${resume.victoires} (${calculerTauxSimulationCombat(resume.victoires, total)})`);
    lignes.push(`Défaites : ${resume.defaites} (${calculerTauxSimulationCombat(resume.defaites, total)})`);
    lignes.push(`Limites actions : ${resume.limites} (${calculerTauxSimulationCombat(resume.limites, total)})`);
    lignes.push(`Taux de victoire : ${formaterNombreSimulationCombat(resume.tauxVictoire)}%`);
    lignes.push("");

    lignes.push("RÉPARTITION DES RÉSULTATS");
    lignes.push("-------------------------");

    Object.entries(repartition).forEach(([resultat, nombre]) => {
        lignes.push(`${resultat} : ${nombre} (${calculerTauxSimulationCombat(nombre, total)})`);
    });

    lignes.push("");

    lignes.push("MOYENNES PRINCIPALES");
    lignes.push("--------------------");
    lignes.push(`Tours moyens : ${formaterNombreSimulationCombat(resume.moyenneTours)}`);
    lignes.push(`Actions joueur moyennes : ${formaterNombreSimulationCombat(resume.moyenneActionsJoueur)}`);
    lignes.push(`Actions ennemi moyennes : ${formaterNombreSimulationCombat(resume.moyenneActionsEnnemi)}`);
    lignes.push(`Dégâts infligés moyens : ${formaterNombreSimulationCombat(resume.moyenneDegatsInfliges)}`);
    lignes.push(`Dégâts reçus moyens : ${formaterNombreSimulationCombat(resume.moyenneDegatsRecus)}`);
    lignes.push(`Soins joueur moyens : ${formaterNombreSimulationCombat(resume.moyenneSoinsJoueur)}`);
    lignes.push(`Potions moyennes : ${formaterNombreSimulationCombat(resume.moyennePotions)}`);
    lignes.push(`PV joueur restants moyens : ${formaterNombreSimulationCombat(resume.moyennePvJoueurRestants)}`);
    lignes.push(`PV ennemi restants moyens : ${formaterNombreSimulationCombat(resume.moyennePvEnnemiRestants)}`);
    lignes.push(`Critiques joueur moyens : ${formaterNombreSimulationCombat(resume.moyenneCritiquesJoueur)}`);
    lignes.push(`Critiques ennemi moyens : ${formaterNombreSimulationCombat(resume.moyenneCritiquesEnnemi)}`);
    lignes.push(`Esquives joueur moyennes : ${formaterNombreSimulationCombat(resume.moyenneEsquivesJoueur)}`);
    lignes.push(`Esquives ennemi moyennes : ${formaterNombreSimulationCombat(resume.moyenneEsquivesEnnemi)}`);
    lignes.push("");

    lignes.push("SYNTHÈSES AVANCÉES");
    lignes.push("------------------");
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Tours", "tours"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Actions joueur", "actionsJoueur"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Actions ennemi", "actionsEnnemi"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Dégâts infligés", "degatsInfliges"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Dégâts reçus", "degatsRecus"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Soins joueur", "soinsJoueur"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Potions utilisées", "potionsUtilisees"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "PV joueur restants", "pvJoueurRestants"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "PV ennemi restants", "pvEnnemiRestants"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Critiques joueur", "critiquesJoueur"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Critiques ennemi", "critiquesEnnemi"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Esquives joueur", "esquivesJoueur"));
    lignes.push(creerLigneSyntheseSimulationCombat(rapport, "Esquives ennemi", "esquivesEnnemi"));
    lignes.push("");

    lignes.push("LECTURE RAPIDE");
    lignes.push("--------------");

    if (resume.tauxVictoire >= 90) {
        lignes.push("Difficulté estimée : facile pour le joueur.");
    } else if (resume.tauxVictoire >= 75) {
        lignes.push("Difficulté estimée : équilibrée / accessible.");
    } else if (resume.tauxVictoire >= 55) {
        lignes.push("Difficulté estimée : dangereuse mais jouable.");
    } else if (resume.tauxVictoire >= 35) {
        lignes.push("Difficulté estimée : très difficile.");
    } else {
        lignes.push("Difficulté estimée : trop punitive pour une zone de départ.");
    }

    if (resume.moyennePotions >= 2) {
        lignes.push("Observation : le joueur dépend fortement des potions.");
    } else if (resume.moyennePotions >= 1) {
        lignes.push("Observation : les potions sont utiles sans être obligatoires à chaque combat.");
    } else {
        lignes.push("Observation : le joueur utilise peu ou pas de potions.");
    }

    if (resume.moyenneActionsEnnemi > resume.moyenneActionsJoueur * 1.25) {
        lignes.push("Observation : l'ennemi agit nettement plus souvent que le joueur. Vérifier la vitesse.");
    }

    if (resume.moyenneDegatsRecus > rapport.joueur.pvMax * 0.65) {
        lignes.push("Observation : les dégâts reçus moyens sont élevés par rapport aux PV du joueur.");
    }

    lignes.push("");
    lignes.push("NOTE");
    lignes.push("----");
    lignes.push("Ce rapport ne contient pas les logs action par action.");
    lignes.push("Il est conçu pour les simulations massives et l'équilibrage global.");

    telechargerFichierSimulationCombat(
        lignes.join("\n"),
        `simulation_synthese_${rapport.monstre.id}_${Date.now()}.txt`,
        "text/plain"
    );
}

function telechargerFichierSimulationCombat(contenu, nomFichier, typeMime) {
    const blob =
        new Blob(
            [contenu],
            {
                type: typeMime
            }
        );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href =
        url;

    lien.download =
        nomFichier;

    document.body.appendChild(lien);

    lien.click();

    document.body.removeChild(lien);

    URL.revokeObjectURL(url);
}