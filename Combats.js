/* ============================================================================
   NIGHTVENTURE — COMBAT
   Moteur unique de combat : initiative, animations, actions, effets, IA, equipement.
   ============================================================================ */

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
    coutInitiativeMax: 130,
    animationWindupMs: 420,
    animationImpactMs: 720
};

Game.data.classes ??= [];
Game.data.competences ??= [];
Game.cache.classesParId ??= {};
Game.cache.competencesParId ??= {};

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
    return `combat_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;
}

function echapperHTMLCombat(valeur) {
    const div = document.createElement("div");
    div.textContent = String(valeur ?? "");
    return div.innerHTML;
}

function combatEstEnCours() {
    return Boolean(Game.combat?.actif && Game.combat.actif.statut === "en_cours");
}

function synchroniserVerrouillageInterfaceCombat() {
    if (typeof document === "undefined") return;

    const actif = combatEstEnCours();
    document.documentElement.classList.toggle("nv-combat-locked", actif);

    [
        document.getElementById("topCharacterBar"),
        document.getElementById("navigationPrincipale"),
        document.getElementById("zonesModal"),
        document.getElementById("regionsModal"),
        document.getElementById("nvFullscreenToggle")
    ].filter(Boolean).forEach(element => {
        element.inert = actif;
        element.setAttribute("aria-disabled", actif ? "true" : "false");
    });
}

if (typeof document !== "undefined" && !window.__NV_COMBAT_GLOBAL_LOCK_INSTALLED) {
    window.__NV_COMBAT_GLOBAL_LOCK_INSTALLED = true;
    document.addEventListener("click", event => {
        if (!combatEstEnCours()) return;
        if (event.target?.closest?.("#vuePrincipale .combat-shell")) return;
        event.preventDefault();
        event.stopImmediatePropagation();
    }, true);
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
    const combat = Game.combat.actif;
    if (!combat?.stats || !combattant || !action) return;

    if (combattant.camp === "joueur") combat.stats.actionsJoueur++;
    else combat.stats.actionsEnnemi++;

    const idAction = action.id || "action_inconnue";
    combat.stats.actionsParId[idAction] = (combat.stats.actionsParId[idAction] || 0) + 1;
}

function enregistrerDegatsCombat(source, cible, resultat) {
    const combat = Game.combat.actif;
    if (!combat?.stats || !source || !cible || !resultat) return;

    const degats = Number(resultat.degats) || 0;
    if (source.camp === "joueur") {
        combat.stats.degatsInfliges += degats;
        if (resultat.critique) combat.stats.critiquesJoueur++;
    } else {
        combat.stats.degatsRecus += degats;
        if (resultat.critique) combat.stats.critiquesEnnemi++;
    }
}

function enregistrerEsquiveCombat(defenseur) {
    const combat = Game.combat.actif;
    if (!combat?.stats || !defenseur) return;
    if (defenseur.camp === "joueur") combat.stats.esquivesJoueur++;
    else combat.stats.esquivesEnnemi++;
}

function enregistrerSoinCombat(cible, valeur) {
    const combat = Game.combat.actif;
    if (!combat?.stats || !cible) return;
    const soin = Number(valeur) || 0;
    if (cible.camp === "joueur") combat.stats.soinsJoueur += soin;
    else combat.stats.soinsEnnemi += soin;
}

function enregistrerDefenseCombat(combattant) {
    const combat = Game.combat.actif;
    if (!combat?.stats || !combattant) return;
    if (combattant.camp === "joueur") combat.stats.defensesJoueur++;
    else combat.stats.defensesEnnemi++;
}

function enregistrerTentativeFuiteCombat(reussie) {
    const combat = Game.combat.actif;
    if (!combat?.stats) return;
    combat.stats.tentativesFuite++;
    if (reussie) combat.stats.fuiteReussie = true;
}

function enregistrerPotionCombat(valeurSoin = 0) {
    const combat = Game.combat.actif;
    if (!combat?.stats) return;
    combat.stats.potionsUtilisees++;
    enregistrerSoinCombat(combat.joueur, valeurSoin);
}

function finaliserStatsCombat(resultat) {
    const combat = Game.combat.actif;
    if (!combat?.stats) return;
    combat.stats.resultat = resultat;
    combat.stats.finTimestamp = Date.now();
    combat.stats.dureeMs = combat.stats.finTimestamp - combat.stats.debutTimestamp;
}

function formaterDureeCombat(ms) {
    const secondes = Math.max(1, Math.round((Number(ms) || 0) / 1000));
    if (secondes < 60) return `${secondes}s`;
    return `${Math.floor(secondes / 60)}m ${secondes % 60}s`;
}

function vitesseTotaleJoueur() {
    return statTotale("vitesse");
}

function vitesseTotaleMonstre(monstre) {
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
        nom: personnage.nom || "Heros",
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
        baseId: monstre.baseId || monstre.sourceId || monstre.id,
        sourceId: monstre.sourceId || monstre.baseId || monstre.id,
        zoneId: monstre.zoneId || Game.data.personnage?.zoneActuelle || null,
        typeMenace: monstre.typeMenace || null,
        integrationType: monstre.integrationType || null,
        integrationCle: monstre.integrationCle || null,
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

function normaliserIdClasse(valeur) {
    return String(valeur || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function obtenirCompetencesCombatJoueur() {
    const personnage = Game.data.personnage;
    const classeId = normaliserIdClasse(personnage.classeId || personnage.classe || "guerrier");
    const classe = Game.cache.classesParId?.[classeId] || null;
    const base = ["attaque_simple", "defendre", "fuir", "utiliser_objet"];
    const competencesClasse = Array.isArray(classe?.competencesDepart) ? classe.competencesDepart : [];
    return [...new Set([...base, ...competencesClasse])].filter(Boolean);
}

function obtenirCompetencesCombatMonstre(monstre) {
    const liste = Array.isArray(monstre?.competences) ? monstre.competences : [];
    if (liste.length > 0) {
        return liste.map(entree => typeof entree === "string" ? entree : entree.id).filter(Boolean);
    }
    return ["attaque_simple_monstre"];
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

function demarrerCombat(monstre) {
    if (!monstre) return;
    if (Game.combat.actif) {
        ajouterJournal("Un combat est deja en cours.");
        return;
    }

    Game.combat.actif = {
        id: genererIdCombat(),
        tour: 1,
        phase: "initialisation",
        statut: "en_cours",
        acteurCourant: null,
        verrouAction: false,
        animation: null,
        equipmentMenuOpen: false,
        sourceMonstre: { ...monstre },
        contexteGameplay: typeof window !== "undefined" && window.NVGameplay?.getPendingCombatContext
            ? window.NVGameplay.getPendingCombatContext()
            : null,
        joueur: creerSnapshotCombatJoueur(),
        ennemi: creerSnapshotCombatMonstre(monstre),
        journal: [`${monstre.nom} apparait !`],
        derniereAction: null,
        recompenses: null,
        stats: creerStatsCombatVides()
    };

    window.NVCodex?.recordEncounter?.(monstre);
    synchroniserVerrouillageInterfaceCombat();
    changerVue("combat");
    avancerInitiativeCombat();
    ouvrirCombat();
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
    combat.verrouAction = true;
    combat.animation = null;
    synchroniserJoueurDepuisCombat();
    finaliserStatsCombat(resultat);

    if (typeof window !== "undefined" && window.NVGameplay?.resolveCombat) {
        combat.recompenses = window.NVGameplay.resolveCombat(combat, resultat) || null;
    } else if (resultat === "victoire") {
        const monstre = Game.cache.monstresParId?.[combat.ennemi.id] || combat.sourceMonstre || combat.ennemi;
        const xp = monstre?.xp || 0;
        const or = monstre?.or || 0;
        const loot = typeof genererLootMonstre === "function" ? genererLootMonstre(monstre) : [];
        Game.data.personnage.xp += xp;
        Game.data.personnage.or += or;
        loot.forEach(item => ajouterObjetInventaire(item.id, item.quantite));
        combat.recompenses = { xp, or, loot };
        ajouterJournal(`${combat.ennemi.nom} vaincu`);
        if (xp > 0) ajouterJournal(`+${xp} XP`);
        if (or > 0) ajouterJournal(`+${or} or`);
        loot.forEach(item => {
            const objet = trouverObjet(item.id);
            ajouterJournal(`${objet?.nom || item.id} x${item.quantite}`);
        });
        if (typeof verifierNiveau === "function") verifierNiveau();
    }

    if (resultat === "defaite") ajouterJournal("Vous avez ete vaincu.");
    if (resultat === "fuite") ajouterJournal("Vous parvenez a fuir.");

    synchroniserVerrouillageInterfaceCombat();
    ouvrirCombat();
}

function quitterCombat() {
    const combatTermine = Game.combat.actif;
    Game.combat.actif = null;
    synchroniserVerrouillageInterfaceCombat();
    if (window.NVGameplay?.afterCombatExit?.(combatTermine)) return;
    ouvrirExploration();
}

function coutInitiativeAction(action) {
    const valeur = Number(action?.coutInitiative);
    if (!Number.isFinite(valeur)) return Game.combat.config.coutInitiativeDefaut;
    return clamp(valeur, Game.combat.config.coutInitiativeMin, Game.combat.config.coutInitiativeMax);
}

function vitesseEffective(combattant) {
    return Math.max(1, Math.round(obtenirStatCombat(combattant, "vitesse")));
}

function calculerChanceFuiteCombat(combat = Game.combat.actif) {
    if (!combat?.joueur || !combat?.ennemi) return 0;
    return Math.round(clamp(
        50 + (vitesseEffective(combat.joueur) - vitesseEffective(combat.ennemi)) * 2,
        20,
        90
    ));
}

function choisirActeurPret(combat) {
    const pret = [];
    if (combat.joueur.initiative >= Game.combat.config.seuilInitiative) pret.push(combat.joueur);
    if (combat.ennemi.initiative >= Game.combat.config.seuilInitiative) pret.push(combat.ennemi);
    if (pret.length === 0) return null;
    if (pret.length === 1) return pret[0];

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
    if (combat.journal.length > 40) combat.journal.shift();
}

function snapshotRessourcesCombat(combat) {
    return {
        joueur: {
            pv: combat.joueur.pv,
            mana: combat.joueur.mana,
            stamina: combat.joueur.stamina,
            initiative: combat.joueur.initiative
        },
        ennemi: {
            pv: combat.ennemi.pv,
            mana: combat.ennemi.mana,
            stamina: combat.ennemi.stamina,
            initiative: combat.ennemi.initiative
        }
    };
}

function programmerActionCombat(action) {
    const combat = Game.combat.actif;
    if (!combat || combat.statut !== "en_cours" || combat.verrouAction) return false;

    const source = combat.acteurCourant === "joueur" ? combat.joueur : combat.ennemi;
    if (!source || !action) return false;

    combat.verrouAction = true;
    combat.animation = {
        active: true,
        stage: "windup",
        actorCamp: source.camp,
        targetCamp: source.camp === "joueur" ? "ennemi" : "joueur",
        type: action.typeAction || "attaque",
        actionId: action.id,
        actionName: action.nom || action.id,
        previous: snapshotRessourcesCombat(combat),
        result: null
    };

    ouvrirCombat();

    window.setTimeout(() => {
        const courant = Game.combat.actif;
        if (!courant || courant.id !== combat.id || courant.statut !== "en_cours") return;

        courant.animation.stage = "impact";
        resoudreActionCombat(action, { deferInitiative: true });

        if (courant.statut !== "en_cours") {
            ouvrirCombat();
            return;
        }

        ouvrirCombat();

        window.setTimeout(() => {
            const apres = Game.combat.actif;
            if (!apres || apres.id !== combat.id || apres.statut !== "en_cours") return;
            apres.animation = null;
            apres.verrouAction = false;
            apres.acteurCourant = null;
            apres.phase = "attente";
            avancerInitiativeCombat();
        }, Game.combat.config.animationImpactMs);
    }, Game.combat.config.animationWindupMs);

    return true;
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
            terminerCombat(acteurPret.camp === "joueur" ? "defaite" : "victoire");
            return;
        }

        if (acteurPret.camp === "joueur") {
            ouvrirCombat();
            return;
        }

        const actionIA = choisirActionIA();
        programmerActionCombat(actionIA);
        return;
    }

    ouvrirCombat();
}

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
        ? clamp(obtenirStatCombat(defenseur, "esquive") + bonusEsquive, Game.combat.config.esquiveMin, Game.combat.config.esquiveMax)
        : 0;

    if (chanceEsquive > 0 && Math.random() * 100 < chanceEsquive) {
        return { degats: 0, critique: false, esquive: true, nature };
    }

    const degatsBruts = Number(puissance || 0) + offense * Number(multiplicateur || 1);
    const variance = randFloat(Game.combat.config.varianceMin, Game.combat.config.varianceMax);
    const reductionDefense = ignoreDefense
        ? 1
        : 100 / (100 + Math.max(0, defense) * Game.combat.config.reductionDefenseFacteur);

    let degats = degatsBruts * reductionDefense * variance;
    const chanceCritique = peutCritiquer
        ? clamp(obtenirStatCombat(attaquant, "critique") + bonusCritique, Game.combat.config.critiqueMin, Game.combat.config.critiqueMax)
        : 0;
    const critique = chanceCritique > 0 && Math.random() * 100 < chanceCritique;

    if (critique) degats *= Game.combat.config.multiplicateurCritique;
    if (defenseur.defenseActive) {
        degats *= 0.5;
        defenseur.defenseActive = false;
    }

    return { degats: Math.max(1, Math.round(degats)), critique, esquive: false, nature };
}

function calculerSoinCombat({ lanceur, puissance = 0, multiplicateur = 1, nature = "magique" }) {
    const score = nature === "magique"
        ? obtenirStatCombat(lanceur, "attaqueMagique")
        : obtenirStatCombat(lanceur, "attaquePhysique");
    const soinBrut = Number(puissance || 0) + score * Number(multiplicateur || 1);
    return Math.max(1, Math.round(soinBrut * randFloat(0.95, 1.05)));
}

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
            ajouterLigneCombat(`${combattant.nom} subit ${degats} degats de ${effet.nom}.`);
        }
        if (effet.type === "hot") {
            const soin = Math.max(1, Math.round(effet.valeur));
            combattant.pv = Math.min(combattant.pvMax, combattant.pv + soin);
            ajouterLigneCombat(`${combattant.nom} recupere ${soin} PV grace a ${effet.nom}.`);
        }
    }

    if (combat.joueur.pv <= 0 && combat.ennemi.pv <= 0) terminerCombat(combat.acteurCourant === "joueur" ? "victoire" : "defaite");
    else if (combat.joueur.pv <= 0) terminerCombat("defaite");
    else if (combat.ennemi.pv <= 0) terminerCombat("victoire");
}

function appliquerEffetsFinTour(combattant) {
    const restant = [];
    for (const effet of combattant.effets) {
        if (effet.timing === "permanent") {
            restant.push(effet);
            continue;
        }
        effet.dureeTours -= 1;
        if (effet.dureeTours > 0) restant.push(effet);
        else ajouterLigneCombat(`${effet.nom} expire sur ${combattant.nom}.`);
    }
    combattant.effets = restant;
}

function actionParDefaut(id) {
    const actions = {
        attaque_simple: {
            id: "attaque_simple",
            nom: "Attaque",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100,
            puissance: 5,
            multiplicateur: 1
        },
        attaque_simple_monstre: {
            id: "attaque_simple_monstre",
            nom: "Attaque",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100,
            puissance: 4,
            multiplicateur: 1
        },
        defendre: {
            id: "defendre",
            nom: "Defendre",
            typeAction: "defense",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 90
        },
        fuir: {
            id: "fuir",
            nom: "Fuir",
            typeAction: "fuite",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 100
        },
        utiliser_objet: {
            id: "utiliser_objet",
            nom: "Objet",
            typeAction: "objet",
            cible: "self",
            couts: { mana: 0, stamina: 0 },
            coutInitiative: 90
        }
    };
    return actions[id] || null;
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

function resoudreActionCombat(action, options = {}) {
    const combat = Game.combat.actif;
    if (!combat || combat.statut !== "en_cours") return;

    const source = combat.acteurCourant === "joueur" ? combat.joueur : combat.ennemi;
    const cible = source.camp === "joueur" ? combat.ennemi : combat.joueur;

    if (!action) action = actionParDefaut(source.camp === "joueur" ? "attaque_simple" : "attaque_simple_monstre");

    if (!payerCoutsAction(source, action)) {
        ajouterLigneCombat(`${source.nom} manque de ressources pour ${action.nom}.`);
        action = actionParDefaut(source.camp === "joueur" ? "attaque_simple" : "attaque_simple_monstre");
        payerCoutsAction(source, action);
    }

    enregistrerActionCombat(source, action);
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
                ligne = `${cible.nom} esquive ${action.nom}.`;
            } else {
                cible.pv = Math.max(0, cible.pv - resultat.degats);
                enregistrerDegatsCombat(source, cible, resultat);
                ligne = `${source.camp === "joueur" ? "Vous utilisez" : source.nom + " utilise"} ${action.nom} et inflige ${resultat.degats} degats a ${cible.nom}${resultat.critique ? " (critique)" : ""}.`;
            }

            if (Array.isArray(action.effets)) {
                action.effets.forEach(effet => {
                    const cibleEffet = effet.cible === "self" ? source : cible;
                    appliquerEffetSurCombattant(cibleEffet, { ...effet, sourceId: source.id });
                });
            }

            source.stamina = Math.min(source.staminaMax, source.stamina + Game.combat.config.regenStaminaAttaqueSimple);
            break;
        }

        case "soin": {
            const soin = calculerSoinCombat({
                lanceur: source,
                puissance: action.puissance || 0,
                multiplicateur: action.multiplicateur || 1,
                nature: action.nature || "magique"
            });
            const avant = source.pv;
            source.pv = Math.min(source.pvMax, source.pv + soin);
            enregistrerSoinCombat(source, source.pv - avant);
            ligne = `${source.nom} recupere ${source.pv - avant} PV avec ${action.nom}.`;
            break;
        }

        case "defense": {
            source.defenseActive = true;
            source.stamina = Math.min(source.staminaMax, source.stamina + Game.combat.config.regenStaminaDefense);
            enregistrerDefenseCombat(source);
            if (Array.isArray(action.effets)) {
                action.effets.forEach(effet => {
                    const cibleEffet = effet.cible === "ennemi" ? cible : source;
                    appliquerEffetSurCombattant(cibleEffet, { ...effet, sourceId: source.id });
                });
            }
            ligne = `${source.nom} se met en garde.`;
            break;
        }

        case "fuite": {
            if (source.camp !== "joueur") {
                ligne = "Action de fuite ignoree.";
                break;
            }
            const chance = calculerChanceFuiteCombat(combat);
            if (Math.random() * 100 < chance) {
                enregistrerTentativeFuiteCombat(true);
                ajouterLigneCombat(`Vous fuyez le combat (${chance}% de chance).`);
                terminerCombat("fuite");
                return;
            }
            enregistrerTentativeFuiteCombat(false);
            ligne = `Vous echouez a fuir (${chance}% de chance).`;
            break;
        }

        case "objet": {
            const objet = trouverObjet(action.objetId);
            const item = Game.data.personnage.inventaire.find(entree => entree.id === action.objetId && entree.quantite > 0);
            if (!objet || !item || objet.type !== "consommable") {
                ligne = "Action impossible : objet indisponible.";
                break;
            }
            const avant = source.pv;
            const soin = Math.max(0, Number(objet.soin) || 0);
            source.pv = Math.min(source.pvMax, source.pv + soin);
            const soinReel = source.pv - avant;
            retirerObjetInventaire(action.objetId, 1);
            enregistrerPotionCombat(soinReel);
            ligne = `${source.nom} utilise ${objet.nom} et recupere ${soinReel} PV.`;
            break;
        }

        default:
            ligne = `Action inconnue : ${action.id || "?"}`;
            break;
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

    if (source.camp === "ennemi") combat.tour += 1;
    if (options.deferInitiative) return;

    combat.acteurCourant = null;
    combat.phase = "attente";
    avancerInitiativeCombat();
}

function choisirActionIA() {
    const combat = Game.combat.actif;
    if (!combat) return actionParDefaut("attaque_simple_monstre");

    const ennemi = combat.ennemi;
    if (ennemi.pv / ennemi.pvMax <= 0.35) {
        const competenceSoin = ennemi.competences
            .map(id => trouverCompetenceCombat(id))
            .find(c => c?.typeAction === "soin");
        if (competenceSoin && payerCoutsAction({ ...ennemi }, competenceSoin)) return competenceSoin;
    }

    if (ennemi.stamina / Math.max(1, ennemi.staminaMax) <= 0.20 && Math.random() < 0.35) {
        return actionParDefaut("defendre");
    }

    const offensives = ennemi.competences
        .map(id => trouverCompetenceCombat(id))
        .filter(c => c && c.typeAction === "attaque");

    if (offensives.length > 1 && Math.random() < 0.35) return offensives[randInt(0, offensives.length - 1)];
    return offensives[0] || actionParDefaut("attaque_simple_monstre");
}

function utiliserCompetenceCombat(idCompetence) {
    const combat = Game.combat.actif;
    if (!combat || combat.phase !== "joueur" || combat.statut !== "en_cours" || combat.verrouAction) return;
    const action = trouverCompetenceCombat(idCompetence);
    if (!action) return;
    programmerActionCombat(action);
}

function attaquerMonstre() {
    utiliserCompetenceCombat("attaque_simple");
}

function defendreCombat() {
    utiliserCompetenceCombat("defendre");
}

function fuirCombat() {
    utiliserCompetenceCombat("fuir");
}

function utiliserPotionCombat(idObjet) {
    const combat = Game.combat.actif;
    if (!combat || combat.phase !== "joueur" || combat.statut !== "en_cours" || combat.verrouAction) return;

    const objet = trouverObjet(idObjet);
    const item = Game.data.personnage.inventaire.find(entree => entree.id === idObjet && entree.quantite > 0);
    if (!objet || !item || objet.type !== "consommable" || !objet.soin) {
        ajouterLigneCombat("Objet de soin indisponible.");
        ouvrirCombat();
        return;
    }

    programmerActionCombat({
        id: `objet_${idObjet}`,
        nom: objet.nom,
        typeAction: "objet",
        objetId: idObjet,
        cible: "self",
        couts: { mana: 0, stamina: 0 },
        coutInitiative: 90
    });
}

function creerMiniJournalCombat(combat) {
    const lignes = [...combat.journal].slice(-8).reverse();
    return `
        <div class="item-card">
            <h3>Journal de combat</h3>
            <div class="journal-combat-mini">
                ${lignes.map(ligne => `<p>${echapperHTMLCombat(ligne)}</p>`).join("")}
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
        libelle
    );
}

function creerResumeCombat(combat) {
    if (!combat || combat.statut === "en_cours" || !combat.stats) return "";

    const stats = combat.stats;
    const recompenses = combat.recompenses;
    const titreResultat = { victoire: "Victoire", defaite: "Defaite", fuite: "Fuite" }[combat.statut] || combat.statut;
    const lootHtml = recompenses?.loot?.length
        ? `
            <div class="resume-combat__section">
                <h4>Butin</h4>
                ${recompenses.loot.map(item => {
                    const objet = trouverObjet(item.id);
                    return `<div class="resume-combat__ligne"><span>${echapperHTMLCombat(objet?.nom || item.id)}</span><strong>x${item.quantite}</strong></div>`;
                }).join("")}
            </div>
        `
        : "";

    return `
        <div class="item-card resume-combat">
            <h3>${titreResultat} — Resume du combat</h3>
            <div class="resume-combat__grille">
                <div class="resume-combat__section">
                    <h4>General</h4>
                    <div class="resume-combat__ligne"><span>Duree</span><strong>${formaterDureeCombat(stats.dureeMs)}</strong></div>
                    <div class="resume-combat__ligne"><span>Tours</span><strong>${combat.tour}</strong></div>
                    <div class="resume-combat__ligne"><span>Actions joueur</span><strong>${stats.actionsJoueur}</strong></div>
                    <div class="resume-combat__ligne"><span>Actions ennemi</span><strong>${stats.actionsEnnemi}</strong></div>
                </div>
                <div class="resume-combat__section">
                    <h4>Degats</h4>
                    <div class="resume-combat__ligne"><span>Degats infliges</span><strong>${stats.degatsInfliges}</strong></div>
                    <div class="resume-combat__ligne"><span>Degats recus</span><strong>${stats.degatsRecus}</strong></div>
                    <div class="resume-combat__ligne"><span>Critiques joueur</span><strong>${stats.critiquesJoueur}</strong></div>
                    <div class="resume-combat__ligne"><span>Critiques ennemi</span><strong>${stats.critiquesEnnemi}</strong></div>
                </div>
                <div class="resume-combat__section">
                    <h4>Defense / survie</h4>
                    <div class="resume-combat__ligne"><span>Defenses joueur</span><strong>${stats.defensesJoueur}</strong></div>
                    <div class="resume-combat__ligne"><span>Defenses ennemi</span><strong>${stats.defensesEnnemi}</strong></div>
                    <div class="resume-combat__ligne"><span>Esquives joueur</span><strong>${stats.esquivesJoueur}</strong></div>
                    <div class="resume-combat__ligne"><span>Esquives ennemi</span><strong>${stats.esquivesEnnemi}</strong></div>
                </div>
                <div class="resume-combat__section">
                    <h4>Ressources</h4>
                    <div class="resume-combat__ligne"><span>Soins joueur</span><strong>${stats.soinsJoueur}</strong></div>
                    <div class="resume-combat__ligne"><span>Potions utilisees</span><strong>${stats.potionsUtilisees}</strong></div>
                    <div class="resume-combat__ligne"><span>Tentatives fuite</span><strong>${stats.tentativesFuite}</strong></div>
                    <div class="resume-combat__ligne"><span>Fuite reussie</span><strong>${stats.fuiteReussie ? "Oui" : "Non"}</strong></div>
                </div>
                ${recompenses ? `
                    <div class="resume-combat__section">
                        <h4>Recompenses</h4>
                        <div class="resume-combat__ligne"><span>XP</span><strong>${recompenses.xp || 0}</strong></div>
                        <div class="resume-combat__ligne"><span>Or</span><strong>${recompenses.or || 0}</strong></div>
                    </div>
                ` : ""}
                ${lootHtml}
            </div>
        </div>
    `;
}

function creerBarreCombatEtat(combat, camp, cle, classe, libelle) {
    const combattant = combat[camp];
    const maximum = cle === "initiative" ? Game.combat.config.seuilInitiative : combattant[`${cle}Max`];
    const actuelle = Number(combattant[cle]) || 0;
    const precedente = Number(combat.animation?.previous?.[camp]?.[cle] ?? actuelle);
    const pourcentage = calculerPourcentage(actuelle, maximum);
    const pourcentageAvant = calculerPourcentage(precedente, maximum);
    const animee = combat.animation?.stage === "impact" && precedente !== actuelle;

    return `
        <div class="barre barre--combat" data-resource="${camp}-${cle}">
            <div class="${classe} ${animee ? "combat-bar-fill--animated" : ""}" style="--bar-from:${pourcentageAvant}%; --bar-to:${pourcentage}%; width:${pourcentage}%;"></div>
            <div class="barre__texte">
                <span class="barre__libelle">${libelle}</span>
                <span class="barre__valeur">${Math.round(actuelle)} / ${Math.round(maximum)} (${Math.round(pourcentage)}%)</span>
            </div>
        </div>
    `;
}

function classeAnimationCombattant(combat, camp) {
    const animation = combat.animation;
    if (!animation?.active) return "";
    const classes = [];
    if (animation.actorCamp === camp) classes.push("combatant-card--acting", `combatant-card--${animation.type}`);
    if (animation.targetCamp === camp && animation.stage === "impact") classes.push("combatant-card--targeted");
    return classes.join(" ");
}

function creerFeedbackActionCombat(combat, camp) {
    const animation = combat.animation;
    if (!animation?.active || animation.stage !== "impact") return "";
    const avant = Number(animation.previous?.[camp]?.pv ?? combat[camp].pv);
    const apres = Number(combat[camp].pv);
    const delta = apres - avant;
    if (delta < 0) return `<span class="combat-float combat-float--damage">-${Math.abs(Math.round(delta))}</span>`;
    if (delta > 0) return `<span class="combat-float combat-float--heal">+${Math.round(delta)}</span>`;
    if (animation.type === "defense" && animation.actorCamp === camp) return `<span class="combat-float combat-float--guard">GARDE</span>`;
    return "";
}

function creerBoutonsActionsCombat(combat) {
    const joueur = combat.joueur;
    const ids = [...new Set(joueur.competences || [])].filter(id => !["defendre", "fuir", "utiliser_objet"].includes(id));

    Game.data.personnage.combatPreferences ??= {};
    const unlockedIds = ids.filter(id => Number(trouverCompetenceCombat(id)?.niveauRequis || 1) <= Number(joueur.niveau || 1));
    const savedId = Game.data.personnage.combatPreferences.selectedSkillId;
    const selectedId = unlockedIds.includes(savedId) ? savedId : unlockedIds[0];
    Game.data.personnage.combatPreferences.selectedSkillId = selectedId || null;

    const boutonsCompetences = ids.map(id => {
        const action = trouverCompetenceCombat(id);
        if (!action) return "";
        const mana = Number(action.couts?.mana) || 0;
        const stamina = Number(action.couts?.stamina) || 0;
        const niveauRequis = Number(action.niveauRequis || 1);
        const disponible = joueur.niveau >= niveauRequis && joueur.mana >= mana && joueur.stamina >= stamina;
        const icone = action.typeAction === "soin" ? "Soin" : action.nature === "magique" ? "Mag" : "Atk";
        const cout = [mana ? `${mana} mana` : "", stamina ? `${stamina} stamina` : ""].filter(Boolean).join(" · ");
        return `
            <button ${disponible ? "" : "disabled"} onclick="utiliserCompetenceCombat('${id}')">
                <span>${icone} ${echapperHTMLCombat(action.nom || id)}</span>
                ${cout ? `<small>${cout}${joueur.niveau < niveauRequis ? ` · niveau ${niveauRequis}` : ""}</small>` : joueur.niveau < niveauRequis ? `<small>Niveau ${niveauRequis}</small>` : ""}
            </button>
        `;
    }).join("");

    const selectedAction = trouverCompetenceCombat(selectedId);
    const selectedAvailable = selectedAction && joueur.niveau >= Number(selectedAction.niveauRequis || 1) && joueur.mana >= Number(selectedAction.couts?.mana || 0) && joueur.stamina >= Number(selectedAction.couts?.stamina || 0);
    const selector = ids.length ? `
        <label class="combat-skill-selector">
            <span>Competence memorisee</span>
            <select onchange="selectionnerCompetenceCombat(this.value)">
                ${ids.map(id => {
                    const action = trouverCompetenceCombat(id);
                    const locked = joueur.niveau < Number(action?.niveauRequis || 1);
                    return `<option value="${id}" ${id === selectedId ? "selected" : ""} ${locked ? "disabled" : ""}>${echapperHTMLCombat(action?.nom || id)}${locked ? ` — niv. ${action.niveauRequis}` : ""}</option>`;
                }).join("")}
            </select>
            <button ${selectedAvailable ? "" : "disabled"} onclick="utiliserCompetenceSelectionneeCombat()">Utiliser</button>
        </label>
    ` : "";

    return `
        ${selector}
        ${boutonsCompetences}
        <button onclick="defendreCombat()"><span>Defendre</span><small>Reduit les prochains degats</small></button>
        <button onclick="utiliserPotionCombat('potion_soin')"><span>Potion</span><small>Consomme votre tour</small></button>
        <button class="combat-action--equipment" onclick="ouvrirObjetsCombat()"><span>Objets</span><small>Equipement gratuit</small></button>
        <button class="combat-action--flee" onclick="fuirCombat()"><span>Fuir</span><small>Chance : ${calculerChanceFuiteCombat(combat)}%</small></button>
    `;
}

function selectionnerCompetenceCombat(idCompetence) {
    const action = trouverCompetenceCombat(idCompetence);
    const combat = Game.combat.actif;
    if (!action || !combat || combat.joueur.niveau < Number(action.niveauRequis || 1)) return;
    Game.data.personnage.combatPreferences ??= {};
    Game.data.personnage.combatPreferences.selectedSkillId = idCompetence;
    if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("combat skill preference");
    ouvrirCombat();
}

function utiliserCompetenceSelectionneeCombat() {
    const id = Game.data.personnage.combatPreferences?.selectedSkillId;
    if (id) utiliserCompetenceCombat(id);
}

function synchroniserEquipementCombat() {
    const combat = Game.combat.actif;
    if (!combat || combat.statut !== "en_cours") return;
    const snapshot = creerSnapshotCombatJoueur();
    combat.joueur.baseStats = snapshot.baseStats;
    combat.joueur.competences = snapshot.competences;
    combat.joueur.pvMax = snapshot.pvMax;
    combat.joueur.manaMax = snapshot.manaMax;
    combat.joueur.staminaMax = snapshot.staminaMax;
    combat.joueur.pv = Math.min(combat.joueur.pv, snapshot.pvMax);
    combat.joueur.mana = Math.min(combat.joueur.mana, snapshot.manaMax);
    combat.joueur.stamina = Math.min(combat.joueur.stamina, snapshot.staminaMax);
}

function peutGererEquipementCombat() {
    const combat = Game.combat.actif;
    return Boolean(combat && combat.statut === "en_cours" && combat.phase === "joueur" && !combat.verrouAction);
}

function ouvrirObjetsCombat() {
    if (!peutGererEquipementCombat()) return;
    Game.combat.actif.equipmentMenuOpen = !Game.combat.actif.equipmentMenuOpen;
    ouvrirCombat();
}

function fermerObjetsCombat() {
    const combat = Game.combat.actif;
    if (!combat) return;
    combat.equipmentMenuOpen = false;
    ouvrirCombat();
}

function equiperObjetCombat(idObjet, emplacement = null) {
    if (!peutGererEquipementCombat()) return;
    const combat = Game.combat.actif;
    const staminaAvant = combat.joueur.stamina;
    const equipementAvant = JSON.stringify(Game.data.personnage.equipement);
    equiperObjet(idObjet, emplacement || null);
    synchroniserEquipementCombat();
    combat.joueur.stamina = Math.min(staminaAvant, combat.joueur.staminaMax);
    if (JSON.stringify(Game.data.personnage.equipement) !== equipementAvant) combat.journal.unshift("Equipement modifie sans consommer de stamina ni de tour.");
    ouvrirCombat();
}

function desequiperObjetCombat(idObjet) {
    if (!peutGererEquipementCombat()) return;
    const combat = Game.combat.actif;
    const staminaAvant = combat.joueur.stamina;
    const equipementAvant = JSON.stringify(Game.data.personnage.equipement);
    desequiperObjet(idObjet);
    synchroniserEquipementCombat();
    combat.joueur.stamina = Math.min(staminaAvant, combat.joueur.staminaMax);
    if (JSON.stringify(Game.data.personnage.equipement) !== equipementAvant) combat.journal.unshift("Equipement retire sans consommer de stamina ni de tour.");
    ouvrirCombat();
}

function creerMenuEquipementCombat(combat, peutAgir) {
    const personnage = Game.data.personnage;
    const slots = Object.entries(personnage.equipement || {});
    const typesEquipables = new Set(["arme", "casque", "armure", "gants", "chaussures", "collier", "bague", "artefact"]);
    const inventaire = (personnage.inventaire || [])
        .map(entree => ({ entree, objet: trouverObjet(entree.id) }))
        .filter(({ entree, objet }) => entree.quantite > 0 && objet && typesEquipables.has(objet.type));

    const objetsDisponibles = inventaire.map(({ objet }) => {
        const slot = objet.type === "bague" ? "bague1" : objet.type;
        const boutons = objet.type === "bague"
            ? `<button onclick="equiperObjetCombat('${objet.id}', 'bague1')">Bague 1</button><button onclick="equiperObjetCombat('${objet.id}', 'bague2')">Bague 2</button>`
            : `<button onclick="equiperObjetCombat('${objet.id}', '${slot}')">Equiper</button>`;
        const comparaison = window.NVGameplay?.equipmentDetailsHTML?.(objet) || objet.description || "";
        return `<article class="combat-equipment-item"><img class="combat-equipment-item__icon" src="${objet.image || "assets/ui/inventory.png"}" alt=""><strong>${echapperHTMLCombat(objet.nom)}</strong><div>${comparaison}</div>${window.NVMajor?.socketsHTML?.(objet) || ""}<div class="combat-equipment-item__actions">${boutons}</div></article>`;
    }).join("") || `<p class="combat-equipment-empty">Aucun equipement disponible dans le sac.</p>`;

    const equipe = slots.map(([slot, id]) => {
        const objet = id ? trouverObjet(id) : null;
        return `<div class="combat-equipment-slot"><span>${echapperHTMLCombat(slot)}</span><strong>${echapperHTMLCombat(objet?.nom || "Vide")}</strong>${objet ? `<button onclick="desequiperObjetCombat('${objet.id}')">Retirer</button>` : ""}</div>`;
    }).join("");

    return `
        <section class="item-card combat-equipment-panel" aria-label="Equipement de combat">
            <div class="combat-command-panel__title"><div><small>Action gratuite</small><h3>Objets et equipement</h3></div><button onclick="fermerObjetsCombat()">Fermer</button></div>
            <p>Changer ou retirer une piece ne consomme ni stamina, ni tour.</p>
            <fieldset ${peutAgir ? "" : "disabled"}>
                <div class="combat-equipment-slots">${equipe}</div>
                <div class="combat-equipment-inventory">${objetsDisponibles}</div>
            </fieldset>
        </section>
    `;
}

function ouvrirCombatTermine(combat) {
    const html = `
        <div class="item-card">
            <h2>Resultat du combat</h2>
            <p>Le combat contre <strong>${echapperHTMLCombat(combat.ennemi.nom)}</strong> est termine.</p>
        </div>
        ${creerResumeCombat(combat)}
        <div class="item-card">
            <button onclick="quitterCombat()">Retour a l'exploration</button>
        </div>
    `;
    afficherVuePrincipale(html);
}

function ouvrirCombat() {
    const combat = Game.combat.actif;
    if (!combat) {
        ouvrirExploration();
        return;
    }

    changerVue("combat");

    if (combat.statut !== "en_cours") {
        ouvrirCombatTermine(combat);
        return;
    }

    const joueur = combat.joueur;
    const ennemi = combat.ennemi;
    const peutAgir = combat.phase === "joueur" && combat.statut === "en_cours" && !combat.verrouAction;
    const animation = combat.animation;
    const menaceLabel = {
        faible: "Menace faible",
        normal: "Menace normale",
        fort: "Menace forte",
        elite: "Elite",
        mini_boss: "Mini-boss",
        boss: "Boss"
    }[ennemi.typeMenace] || "Rencontre";

    const statutTour = animation?.active
        ? `${animation.actorCamp === "joueur" ? joueur.nom : ennemi.nom} prepare ${animation.actionName}`
        : peutAgir
            ? "A vous de choisir une action"
            : "L'adversaire prepare son tour";

    const effetsHTML = combattant => (combattant.effets || []).length
        ? `<div class="combat-effects">${combattant.effets.map(effet => `<span>${echapperHTMLCombat(effet.nom)} · ${effet.dureeTours} tour(s)</span>`).join("")}</div>`
        : `<div class="combat-effects combat-effects--empty">Aucun effet actif</div>`;

    const equipementHTML = combat.equipmentMenuOpen ? creerMenuEquipementCombat(combat, peutAgir) : "";

    const html = `
        <section class="combat-shell ${animation?.active ? `combat-shell--${animation.stage}` : ""}">
            <header class="combat-turn-banner item-card">
                <div>
                    <span class="combat-turn-banner__eyebrow">Tour ${combat.tour}</span>
                    <h2>Affrontement</h2>
                </div>
                <strong>${echapperHTMLCombat(statutTour)}</strong>
            </header>

            <div class="combat-arena">
                <article class="item-card combatant-card combatant-card--player ${classeAnimationCombattant(combat, "joueur")}">
                    ${creerFeedbackActionCombat(combat, "joueur")}
                    <div class="combatant-card__identity">
                        <span class="combatant-card__portrait">Hero</span>
                        <div><small>Niveau ${joueur.niveau}</small><h3>${echapperHTMLCombat(joueur.nom)}</h3></div>
                    </div>
                    ${creerBarreCombatEtat(combat, "joueur", "pv", "barre-pv", "PV")}
                    ${creerBarreCombatEtat(combat, "joueur", "mana", "barre-mana", "Mana")}
                    ${creerBarreCombatEtat(combat, "joueur", "stamina", "barre-stamina", "Stamina")}
                    ${creerBarreCombatEtat(combat, "joueur", "initiative", "barre-xp", "Initiative")}
                    ${effetsHTML(joueur)}
                </article>

                <div class="combat-arena__versus">VS</div>

                <article class="item-card combatant-card combatant-card--enemy combatant-card--threat-${ennemi.typeMenace || "normal"} ${classeAnimationCombattant(combat, "ennemi")}">
                    ${creerFeedbackActionCombat(combat, "ennemi")}
                    <div class="combatant-card__identity combatant-card__identity--enemy">
                        <span class="combatant-card__portrait combatant-card__portrait--monster">
                            <span aria-hidden="true">Monstre</span>
                            ${ennemi.image ? `<img src="${ennemi.image}" alt="" onerror="this.remove()">` : ""}
                            <b class="combat-threat-badge" aria-label="${menaceLabel}">${ennemi.typeMenace === "elite" ? "◆" : ennemi.typeMenace === "fort" ? "▲" : ennemi.typeMenace === "faible" ? "·" : "●"}</b>
                        </span>
                        <div><small>Niveau ${ennemi.niveau} · ${menaceLabel}</small><h3>${echapperHTMLCombat(ennemi.nom)}</h3></div>
                    </div>
                    ${creerBarreCombatEtat(combat, "ennemi", "pv", "barre-pv", "PV")}
                    ${creerBarreCombatEtat(combat, "ennemi", "mana", "barre-mana", "Mana")}
                    ${creerBarreCombatEtat(combat, "ennemi", "stamina", "barre-stamina", "Stamina")}
                    ${creerBarreCombatEtat(combat, "ennemi", "initiative", "barre-xp", "Initiative")}
                    ${effetsHTML(ennemi)}
                </article>
            </div>

            <section class="item-card combat-command-panel">
                <div class="combat-command-panel__title">
                    <div><small>Ordres</small><h3>Choisissez votre action</h3></div>
                    <span>${peutAgir ? "Pret" : "Resolution en cours..."}</span>
                </div>
                <fieldset class="combat-actions combat-actions--grid" ${peutAgir ? "" : "disabled"}>
                    ${creerBoutonsActionsCombat(combat)}
                </fieldset>
            </section>

            ${equipementHTML}
            ${creerMiniJournalCombat(combat)}
        </section>
    `;

    afficherVuePrincipale(html);
}
