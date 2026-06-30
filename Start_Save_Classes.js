/*
NightVenture - Start / Save / Classes
Module maitre du demarrage joueur.
- Aucun personnage n'est cree au boot.
- L'accueil s'affiche seulement apres chargement des donnees.
- La creation de personnage se fait uniquement apres choix de classe + Commencer.
*/

(function () {
    "use strict";

    const NV_START_VERSION = "metin2-classes-v3-start-flow";
    const NV_SAVE_KEY = "NightVenture_Save_v0_9_4";
    const NV_BASE_ACTIONS = ["attaque_simple", "defendre", "fuir", "utiliser_objet"];
    const NV_CLASSE_FALLBACK = "guerrier";

    const NV_EQUIPEMENT_DEPART = {
        guerrier: ["epee_rouillee", "armure_cuir", "potion_soin"],
        ninja: ["dague_assassin", "cape_usee", "potion_soin"],
        sura: ["epee_rouillee", "artefact_ombre", "potion_soin"],
        shaman: ["baton_novice", "anneau_mana", "potion_soin"]
    };

    const NV_ETAT = {
        mode: "menu",
        donneesChargees: false,
        autosaveTimer: null,
        classeCompetencesSelectionnee: null,
        classeNouvellePartieSelectionnee: NV_CLASSE_FALLBACK
    };

    function NV_appliquerModeUI(mode) {
        const modeNormalise = ["menu", "new_game", "playing"].includes(mode) ? mode : "menu";
        NV_ETAT.mode = modeNormalise;
        Game.ui.mode = modeNormalise;

        document.body.classList.remove("nv-mode-menu", "nv-mode-new-game", "nv-mode-playing");
        document.body.classList.add(modeNormalise === "new_game" ? "nv-mode-new-game" : `nv-mode-${modeNormalise}`);
        document.body.classList.toggle("nv-start-mode", modeNormalise !== "playing");
    }

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

    function NV_exigerClassesMetin2() {
        if (!Array.isArray(window.NV_CLASSES_METIN2) || window.NV_CLASSES_METIN2.length !== 4) {
            throw new Error("classes_metin2.js doit declarer exactement 4 classes.");
        }
        window.NV_CLASSES_METIN2.forEach(classe => {
            if (!classe?.id || !Array.isArray(classe.specialisations) || classe.specialisations.length < 1) {
                throw new Error("Chaque classe Metin2 doit declarer des specialisations.");
            }
        });
        return window.NV_CLASSES_METIN2;
    }

    function NV_exigerCompetencesMetin2() {
        if (!Array.isArray(window.NV_COMPETENCES_METIN2) || window.NV_COMPETENCES_METIN2.length < 40) {
            throw new Error("classes_metin2.js doit declarer les competences Metin2 runtime, minimum 40 competences.");
        }

        const ids = new Set();
        window.NV_COMPETENCES_METIN2.forEach(competence => {
            if (!competence?.id) throw new Error("Une competence Metin2 n'a pas d'id.");
            if (ids.has(competence.id)) throw new Error("Competence Metin2 dupliquee : " + competence.id);
            ids.add(competence.id);
        });
        return window.NV_COMPETENCES_METIN2;
    }

    function NV_syncClassesMetin2() {
        if (typeof window.NV_enregistrerClassesEtCompetences === "function") {
            window.NV_enregistrerClassesEtCompetences();
        }

        const classes = NV_cloner(NV_exigerClassesMetin2());
        const competences = NV_cloner(NV_exigerCompetencesMetin2());

        Game.data.classes = classes;
        Game.data.competences = competences;
        Game.cache.classesParId = {};
        Game.cache.competencesParId = {};

        classes.forEach(classe => {
            const specDepart = classe.specialisations.find(s => s.id === classe.specialisationDepart) || classe.specialisations[0];
            classe.specialisationDepart = specDepart?.id || null;
            classe.competencesDepart = Array.isArray(specDepart?.competences) ? [...specDepart.competences] : [];
            Game.cache.classesParId[classe.id] = classe;
        });

        competences.forEach(competence => {
            Game.cache.competencesParId[competence.id] = competence;
        });
    }

    function NV_obtenirClasses() {
        NV_syncClassesMetin2();
        return Game.data.classes.slice().sort((a, b) => Number(a.ordre) - Number(b.ordre));
    }

    function NV_obtenirClasse(classeId) {
        NV_syncClassesMetin2();
        const id = Game.cache.classesParId[classeId] ? classeId : NV_CLASSE_FALLBACK;
        const classe = Game.cache.classesParId[id];
        if (!classe) throw new Error("Classe fallback introuvable : " + id);
        return classe;
    }

    function NV_obtenirCompetence(idCompetence) {
        NV_syncClassesMetin2();
        return Game.cache.competencesParId[idCompetence] || null;
    }

    function NV_specialisationDepartClasse(classe) {
        if (!classe) return null;
        return classe.specialisations?.find(s => s.id === classe.specialisationDepart) || classe.specialisations?.[0] || null;
    }

    function NV_pointsStatsNiveau(niveau) {
        return 8 + (Math.max(1, Number(niveau) || 1) - 1) * 4;
    }

    function NV_repartirPointsStatsSelonClasse(niveau, classeId) {
        const classe = NV_obtenirClasse(classeId);
        const stats = {
            force: Number(classe.base.force) || 0,
            dexterite: Number(classe.base.dexterite) || 0,
            intelligence: Number(classe.base.intelligence) || 0,
            vitalite: Number(classe.base.vitalite) || 0,
            chance: Number(classe.base.chance) || 0,
            vitesse: Number(classe.base.vitesse) || 0
        };

        const poids = classe.poids || {};
        const totalPoids = Object.keys(stats).reduce((total, stat) => total + (Number(poids[stat]) || 0), 0) || 1;
        const points = NV_pointsStatsNiveau(niveau);
        const restes = [];
        let attribues = 0;

        Object.keys(stats).forEach(stat => {
            const exact = points * ((Number(poids[stat]) || 0) / totalPoids);
            const ajout = Math.floor(exact);
            stats[stat] += ajout;
            attribues += ajout;
            restes.push({ stat, reste: exact - ajout });
        });

        let restant = points - attribues;
        restes.sort((a, b) => b.reste - a.reste).forEach(entree => {
            if (restant <= 0) return;
            stats[entree.stat] += 1;
            restant -= 1;
        });

        return { ...stats, pointsDisponibles: points, classeId: classe.id, classeNom: classe.nom, classeDescription: classe.description };
    }

    function NV_calculerPreviewClasse(classeId) {
        const classe = NV_obtenirClasse(classeId);
        const repartition = NV_repartirPointsStatsSelonClasse(1, classe.id);
        const bonus = classe.bonusCombat || {};
        return {
            classe,
            force: repartition.force,
            dexterite: repartition.dexterite,
            intelligence: repartition.intelligence,
            vitalite: repartition.vitalite,
            chance: repartition.chance,
            vitesse: NV_arrondir(repartition.vitesse + (Number(bonus.vitesse) || 0), 1),
            pvMax: Math.round(100 + repartition.vitalite * 10 + (Number(bonus.pvMax) || 0)),
            manaMax: Math.round(50 + repartition.intelligence * 10 + (Number(bonus.manaMax) || 0)),
            staminaMax: Math.round(100 + repartition.dexterite * 5 + (Number(bonus.staminaMax) || 0)),
            attaquePhysique: NV_arrondir(repartition.force * 2 + (Number(bonus.attaquePhysique) || 0), 1),
            defensePhysique: NV_arrondir(repartition.vitalite * 2 + (Number(bonus.defensePhysique) || 0), 1),
            attaqueMagique: NV_arrondir(repartition.intelligence * 2 + (Number(bonus.attaqueMagique) || 0), 1),
            defenseMagique: NV_arrondir(repartition.vitalite * 2 + (Number(bonus.defenseMagique) || 0), 1),
            critique: NV_arrondir(repartition.dexterite * 0.5 + (Number(bonus.critique) || 0), 1),
            esquive: NV_arrondir(repartition.dexterite * 0.5 + (Number(bonus.esquive) || 0), 1)
        };
    }

    function NV_listeCompetencesClasse(classeId, inclureBase = true) {
        const classe = NV_obtenirClasse(classeId);
        const spec = NV_specialisationDepartClasse(classe);
        return [...new Set([...(inclureBase ? NV_BASE_ACTIONS : []), ...(spec?.competences || classe.competencesDepart || [])])];
    }

    function NV_nomActionBase(idAction) {
        const noms = { attaque_simple: "Attaque simple", defendre: "Defendre", fuir: "Fuir", utiliser_objet: "Utiliser un objet" };
        return noms[idAction] || idAction;
    }

    function NV_resumeCompetence(idCompetence) {
        const competence = NV_obtenirCompetence(idCompetence);
        if (!competence) return NV_nomActionBase(idCompetence);
        return competence.nom;
    }

    function NV_obtenirRegionDepart() {
        return Game.data?.regionsMonde?.[0]?.id || "aetheria";
    }

    function NV_obtenirZonesDebloqueesDefaut() {
        const regionId = NV_obtenirRegionDepart();
        const region = (Game.data?.regionsMonde || []).find(entree => entree.id === regionId) || Game.data?.regionsMonde?.[0];
        const zones = Array.isArray(region?.zones) ? region.zones : [];
        const debloquees = zones.filter(zone => zone?.debloqueeParDefaut).map(zone => zone.id);
        return debloquees.length ? debloquees : [zones[0]?.id || "auberge_griffon"].filter(Boolean);
    }

    function NV_obtenirZoneDepart() {
        const regionId = NV_obtenirRegionDepart();
        const region = (Game.data?.regionsMonde || []).find(entree => entree.id === regionId) || Game.data?.regionsMonde?.[0];
        const zones = Array.isArray(region?.zones) ? region.zones : [];
        return zones.find(zone => zone?.debloqueeParDefaut)?.id || zones[0]?.id || "auberge_griffon";
    }

    function NV_creerInventaireDepart(classeId) {
        const ids = NV_EQUIPEMENT_DEPART[classeId] || NV_EQUIPEMENT_DEPART[NV_CLASSE_FALLBACK];
        const quantites = {};
        ids.forEach(id => { quantites[id] = (quantites[id] || 0) + (id === "potion_soin" ? 5 : 1); });
        return Object.entries(quantites).map(([id, quantite]) => ({ id, quantite }));
    }

    function NV_calculerRessourcesDepuisPersonnage(personnage) {
        return {
            pv: Math.max(1, Math.round(100 + (Number(personnage.vitalite) || 0) * 10 + (Number(personnage.pvMax) || 0))),
            mana: Math.max(0, Math.round(50 + (Number(personnage.intelligence) || 0) * 10 + (Number(personnage.manaMax) || 0))),
            stamina: Math.max(1, Math.round(100 + (Number(personnage.dexterite) || 0) * 5 + (Number(personnage.staminaMax) || 0)))
        };
    }

    function NV_creerPersonnageNouveau(classeId, nom) {
        const classe = NV_obtenirClasse(classeId || NV_CLASSE_FALLBACK);
        const spec = NV_specialisationDepartClasse(classe);
        const repartition = NV_repartirPointsStatsSelonClasse(1, classe.id);
        const bonus = classe.bonusCombat || {};
        const previewDepart = NV_calculerPreviewClasse(classe.id);
        const personnage = {
            nom: nom?.trim() || "Nighttug58",
            classe: classe.nom,
            classeId: classe.id,
            classeNom: classe.nom,
            classeIcone: classe.icone,
            classeDescription: classe.description,
            specialisationId: spec?.id || null,
            specialisationNom: spec?.nom || null,
            niveau: 1,
            xp: 0,
            pointsCaracteristiques: 0,
            pointsTalent: 0,
            pointsCompetence: 0,
            force: Number(repartition.force) || 0,
            dexterite: Number(repartition.dexterite) || 0,
            intelligence: Number(repartition.intelligence) || 0,
            vitalite: Number(repartition.vitalite) || 0,
            chance: Number(repartition.chance) || 0,
            vitesse: Number(previewDepart.vitesse) || 0,
            pvMax: Math.round(Number(bonus.pvMax) || 0),
            manaMax: Math.round(Number(bonus.manaMax) || 0),
            staminaMax: Math.round(Number(bonus.staminaMax) || 0),
            attaque: Number(bonus.attaquePhysique) || 0,
            defense: Number(bonus.defensePhysique) || 0,
            attaqueMagique: Number(bonus.attaqueMagique) || 0,
            defenseMagique: Number(bonus.defenseMagique) || 0,
            critique: Number(bonus.critique) || 0,
            esquive: Number(bonus.esquive) || 0,
            bonusLoot: 0,
            bonusOr: 0,
            or: 50,
            jour: 1,
            heure: 8,
            minute: 0,
            dernierRestockMarchands: 1,
            regionMondeActuelle: NV_obtenirRegionDepart(),
            zoneActuelle: NV_obtenirZoneDepart(),
            zonesDebloquees: NV_obtenirZonesDebloqueesDefaut(),
            zonesVisitees: [],
            quetes: [],
            talents: [],
            competences: NV_listeCompetencesClasse(classe.id, true),
            competencesProgression: {},
            competencesNiveaux: {},
            progressionQuetes: { arcsRecompenses: {} },
            progressionCombat: { bossPersistants: {}, miniBossUniques: {} },
            equipement: { arme: null, casque: null, armure: null, gants: null, chaussures: null, collier: null, bague1: null, bague2: null, artefact: null },
            inventaire: NV_creerInventaireDepart(classe.id),
            favoris: [],
            effetsActifs: []
        };
        const ressources = NV_calculerRessourcesDepuisPersonnage(personnage);
        personnage.pv = ressources.pv;
        personnage.mana = ressources.mana;
        personnage.stamina = ressources.stamina;
        return personnage;
    }

    function NV_normaliserInventaire(personnage) {
        const map = new Map();
        (personnage.inventaire || []).forEach(entree => {
            const id = typeof entree === "string" ? entree : entree?.id;
            if (!id) return;
            const quantite = typeof entree === "string" ? 1 : Math.max(1, Number(entree.quantite || 1));
            map.set(id, (map.get(id) || 0) + quantite);
        });
        personnage.inventaire = Array.from(map.entries()).map(([id, quantite]) => ({ id, quantite }));
    }

    function NV_normaliserPersonnage(personnage = Game.data?.personnage) {
        if (!personnage) return null;
        NV_syncClassesMetin2();
        const classeId = Game.cache.classesParId[personnage.classeId] ? personnage.classeId : NV_CLASSE_FALLBACK;
        const classe = NV_obtenirClasse(classeId);
        const spec = classe.specialisations?.find(s => s.id === personnage.specialisationId) || NV_specialisationDepartClasse(classe);
        const ressources = NV_calculerRessourcesDepuisPersonnage(personnage);

        personnage.nom ??= "Nighttug58";
        personnage.classeId = classe.id;
        personnage.classe = classe.nom;
        personnage.classeNom = classe.nom;
        personnage.classeIcone = classe.icone;
        personnage.classeDescription = classe.description;
        personnage.specialisationId = spec?.id || null;
        personnage.specialisationNom = spec?.nom || null;
        personnage.vitesse ??= NV_calculerPreviewClasse(classe.id).vitesse;
        personnage.niveau ??= 1;
        personnage.xp ??= 0;
        personnage.or ??= 0;
        personnage.pointsCaracteristiques ??= 0;
        personnage.pointsTalent ??= 0;
        personnage.pointsCompetence ??= 0;
        personnage.regionMondeActuelle ??= NV_obtenirRegionDepart();
        personnage.zoneActuelle ??= NV_obtenirZoneDepart();
        personnage.zonesDebloquees ??= NV_obtenirZonesDebloqueesDefaut();
        personnage.zonesVisitees ??= [];
        personnage.quetes ??= [];
        personnage.talents ??= [];
        personnage.favoris ??= [];
        personnage.effetsActifs ??= [];
        personnage.progressionQuetes ??= { arcsRecompenses: {} };
        personnage.progressionCombat ??= { bossPersistants: {}, miniBossUniques: {} };
        personnage.equipement ??= { arme: null, casque: null, armure: null, gants: null, chaussures: null, collier: null, bague1: null, bague2: null, artefact: null };
        personnage.competences = [...new Set([...NV_BASE_ACTIONS, ...(spec?.competences || classe.competencesDepart || [])])];
        personnage.competencesProgression ??= {};
        personnage.competencesNiveaux ??= {};
        personnage.pv = NV_clamp(personnage.pv ?? ressources.pv, 1, ressources.pv);
        personnage.mana = NV_clamp(personnage.mana ?? ressources.mana, 0, ressources.mana);
        personnage.stamina = NV_clamp(personnage.stamina ?? ressources.stamina, 0, ressources.stamina);
        NV_normaliserInventaire(personnage);
        return personnage;
    }

    function NV_creerSauvegarde() {
        if (!Game.data?.personnage) return null;
        return {
            versionNightVenture: NV_START_VERSION,
            dateSauvegarde: new Date().toISOString(),
            personnage: NV_normaliserPersonnage(Game.data.personnage),
            historique: Game.data?.historique || { journal: [] },
            monde: Game.data?.monde || {}
        };
    }

    function NV_sauvegarderLocalSilencieux() {
        if (NV_ETAT.mode !== "playing" || !Game.data?.personnage) return false;
        const save = NV_creerSauvegarde();
        if (!save) return false;
        localStorage.setItem(NV_SAVE_KEY, JSON.stringify(save));
        return true;
    }

    function NV_appliquerSauvegarde(save, message = "Sauvegarde chargee.") {
        if (!save?.personnage) {
            alert("Sauvegarde invalide : aucun personnage trouve.");
            NV_ouvrirEcranAccueil();
            return false;
        }

        Game.data.personnage = save.personnage;
        Game.data.historique = save.historique || { journal: [] };
        Game.data.monde = save.monde || {};
        NV_normaliserPersonnage(Game.data.personnage);
        NV_appliquerModeUI("playing");
        Game.ui.vueActive = "exploration";
        if (typeof ajouterJournal === "function") ajouterJournal(message);
        NV_sauvegarderLocalSilencieux();
        NV_originalRafraichirInterface();
        return true;
    }

    function NV_chargerLocal() {
        const texte = localStorage.getItem(NV_SAVE_KEY);
        if (!texte) { alert("Aucune sauvegarde navigateur trouvee."); return false; }
        try {
            return NV_appliquerSauvegarde(JSON.parse(texte), "Sauvegarde navigateur chargee.");
        } catch (erreur) {
            console.error(erreur);
            alert("Sauvegarde navigateur illisible.");
            return false;
        }
    }

    function NV_supprimerSauvegardeLocale() {
        localStorage.removeItem(NV_SAVE_KEY);
        Game.data.personnage = null;
        NV_ouvrirEcranAccueil();
    }

    async function NV_chargerFichier(file) {
        if (!file) return false;
        try {
            const save = JSON.parse(await file.text());
            return NV_appliquerSauvegarde(save, "Sauvegarde fichier chargee.");
        } catch (erreur) {
            console.error(erreur);
            alert("Fichier de sauvegarde invalide.");
            return false;
        }
    }

    function NV_telechargerSauvegarde() {
        const save = NV_creerSauvegarde();
        if (!save) {
            alert("Aucune partie en cours a sauvegarder.");
            return;
        }
        const blob = new Blob([JSON.stringify(save, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const lien = document.createElement("a");
        lien.href = url;
        lien.download = `NightVenture_save_${Game.data.personnage?.nom || "personnage"}.json`;
        lien.click();
        URL.revokeObjectURL(url);
        if (typeof ajouterJournal === "function") ajouterJournal("Partie sauvegardee et exportee.");
    }

    function NV_creerLigneStatClasse(label, valeur) {
        return `<div class="ligne-stat"><span>${NV_escape(label)}</span><strong>${NV_escape(valeur)}</strong></div>`;
    }

    function NV_creerBoutonsClasses(classeSelectionneeId) {
        return NV_obtenirClasses().map(classe => `<button class="nv-class-select-button ${classe.id === classeSelectionneeId ? "active" : ""}" onclick="NV_ouvrirChoixClasse('${classe.id}')">${NV_escape(classe.nom)}</button>`).join("");
    }

    function NV_creerFicheClasseSelectionnee(classeId) {
        const classe = NV_obtenirClasse(classeId || NV_CLASSE_FALLBACK);
        const preview = NV_calculerPreviewClasse(classe.id);
        const spec = NV_specialisationDepartClasse(classe);
        const competences = (spec?.competences || []).map(NV_resumeCompetence).join(" / ") || "Actions de base";
        return `
            <article class="item-card nv-classe-card nv-classe-card--selected">
                <div class="nv-classe-card__header">
                    <div>
                        <h3>${NV_escape(classe.nom)}</h3>
                        <p>${NV_escape(classe.description)}</p>
                        <small>Specialisation de depart : ${NV_escape(spec?.nom || "Aucune")}</small>
                    </div>
                    <button onclick="NV_lancerNouvellePartie('${classe.id}')">Commencer ${NV_escape(classe.nom)}</button>
                </div>
                <div class="nv-class-stats-layout">
                    <section class="fiche-personnage-section">
                        <h3>Caracteristiques</h3>
                        <div class="liste-stats nv-class-stats-two-columns">
                            ${NV_creerLigneStatClasse("FOR", preview.force)}
                            ${NV_creerLigneStatClasse("DEX", preview.dexterite)}
                            ${NV_creerLigneStatClasse("INT", preview.intelligence)}
                            ${NV_creerLigneStatClasse("VIT", preview.vitalite)}
                            ${NV_creerLigneStatClasse("CHA", preview.chance)}
                            ${NV_creerLigneStatClasse("SPE", preview.vitesse)}
                        </div>
                    </section>
                    <section class="fiche-personnage-section">
                        <h3>Combat</h3>
                        <div class="liste-stats nv-class-stats-two-columns">
                            ${NV_creerLigneStatClasse("PV MAX", preview.pvMax)}
                            ${NV_creerLigneStatClasse("MANA MAX", preview.manaMax)}
                            ${NV_creerLigneStatClasse("STAMINA MAX", preview.staminaMax)}
                            ${NV_creerLigneStatClasse("ATK", preview.attaquePhysique)}
                            ${NV_creerLigneStatClasse("MAG", preview.attaqueMagique)}
                            ${NV_creerLigneStatClasse("DEF", preview.defensePhysique)}
                            ${NV_creerLigneStatClasse("RES", preview.defenseMagique)}
                            ${NV_creerLigneStatClasse("CRITIQUE", `${preview.critique}%`)}
                            ${NV_creerLigneStatClasse("ESQUIVE", `${preview.esquive}%`)}
                        </div>
                    </section>
                </div>
                <p class="nv-class-start-skill"><strong>Depart :</strong> ${NV_escape(competences)}</p>
            </article>
        `;
    }

    function NV_ouvrirEcranAccueil() {
        NV_appliquerModeUI("menu");
        Game.ui.vueActive = "menu";
        Game.data.personnage = null;
        NV_syncClassesMetin2();
        const sauvegardeExiste = Boolean(localStorage.getItem(NV_SAVE_KEY));
        const html = `
            <section class="nv-start-screen">
                <div class="nv-start-hero"><h1>NightVenture</h1><p>Choisis une nouvelle partie ou charge une sauvegarde existante.</p></div>
                <div class="nv-start-actions">
                    <button onclick="NV_ouvrirChoixClasse()">Nouvelle partie</button>
                    <button onclick="NV_chargerLocal()" ${sauvegardeExiste ? "" : "disabled"}>Continuer sauvegarde navigateur</button>
                    <label class="nv-start-label">Charger un fichier JSON<input type="file" accept=".json,application/json" onchange="NV_chargerFichierDepuisInputAccueil(event)" hidden></label>
                    ${sauvegardeExiste ? `<button class="nv-btn-danger" onclick="NV_supprimerSauvegardeLocale()">Supprimer sauvegarde navigateur</button>` : ""}
                </div>
                <div class="nv-start-note"><p>Les classes jouables sont Guerrier, Ninja, Sura et Shaman.</p></div>
            </section>
        `;
        afficherVuePrincipale(html);
        const personnage = document.getElementById("personnage");
        if (personnage) personnage.innerHTML = "";
    }

    function NV_ouvrirChoixClasse(classeId = null) {
        const nomActuel = document.getElementById("nvNomPersonnage")?.value || "Nighttug58";
        NV_appliquerModeUI("new_game");
        Game.ui.vueActive = "new_game";
        Game.data.personnage = null;
        NV_syncClassesMetin2();
        const classeSelectionneeId = Game.cache.classesParId[classeId]
            ? classeId
            : (Game.cache.classesParId[NV_ETAT.classeNouvellePartieSelectionnee] ? NV_ETAT.classeNouvellePartieSelectionnee : NV_CLASSE_FALLBACK);
        NV_ETAT.classeNouvellePartieSelectionnee = classeSelectionneeId;
        const html = `
            <section class="nv-start-screen nv-classe-screen">
                <div class="nv-start-hero"><h1>Nouvelle partie</h1><p>Choisis une classe inspiree de Metin2.</p></div>
                <div class="nv-newgame-name">
                    <label>Nom du personnage<input id="nvNomPersonnage" type="text" value="${NV_escape(nomActuel)}" maxlength="32"></label>
                    <button onclick="NV_ouvrirEcranAccueil()">Retour</button>
                </div>
                <div class="nv-class-select-bar">${NV_creerBoutonsClasses(classeSelectionneeId)}</div>
                <div class="nv-selected-class-panel">${NV_creerFicheClasseSelectionnee(classeSelectionneeId)}</div>
            </section>
        `;
        afficherVuePrincipale(html);
        const personnage = document.getElementById("personnage");
        if (personnage) personnage.innerHTML = "";
    }

    function NV_lancerNouvellePartie(classeId) {
        const nom = document.getElementById("nvNomPersonnage")?.value || "Nighttug58";
        const id = Game.cache.classesParId[classeId] ? classeId : NV_CLASSE_FALLBACK;
        Game.data.personnage = NV_creerPersonnageNouveau(id, nom);
        Game.data.historique ??= {};
        Game.data.historique.journal = [];
        NV_normaliserPersonnage(Game.data.personnage);
        NV_appliquerModeUI("playing");
        Game.ui.vueActive = "exploration";
        if (typeof ajouterJournal === "function") ajouterJournal("Nouvelle partie commencee : " + Game.data.personnage.classeNom);
        NV_sauvegarderLocalSilencieux();
        NV_originalRafraichirInterface();
    }

    function NV_ouvrirCompetencesClasses(classeId = null) {
        if (typeof ouvrirCompetencesJoueur === "function" && Game.data?.personnage) {
            ouvrirCompetencesJoueur();
            return;
        }
        changerVue("competences_classes");
        const classes = NV_obtenirClasses();
        const classeSelectionnee = classeId || NV_ETAT.classeCompetencesSelectionnee || Game.data?.personnage?.classeId || NV_CLASSE_FALLBACK;
        NV_ETAT.classeCompetencesSelectionnee = classeSelectionnee;
        const classe = NV_obtenirClasse(classeSelectionnee);
        const competences = NV_listeCompetencesClasse(classe.id, true);
        const html = `
            <div class="item-card"><h2>Competences</h2><p>${NV_escape(classe.nom)} - ${NV_escape(classe.description)}</p><button onclick="ouvrirExploration()">Retour</button></div>
            <div class="nv-tree-class-selector">${classes.map(c => `<button class="${c.id === classe.id ? "active" : ""}" onclick="NV_ouvrirCompetencesClasses('${c.id}')">${NV_escape(c.nom)}</button>`).join("")}</div>
            <div class="item-card">${competences.map(id => `<p><strong>${NV_escape(NV_resumeCompetence(id))}</strong></p>`).join("")}</div>
        `;
        afficherVuePrincipale(html);
    }

    function NV_ajouterBoutonCompetences() {
        const barre = document.getElementById("barreVuePrincipale");
        if (!barre || document.getElementById("btnCompetencesClasses")) return;
        const bouton = document.createElement("button");
        bouton.id = "btnCompetencesClasses";
        bouton.className = "btn-vue";
        bouton.textContent = "Competences";
        bouton.addEventListener("click", () => NV_ouvrirCompetencesClasses());
        barre.appendChild(bouton);
    }

    function NV_originalRafraichirInterface() {
        if (typeof NV_originalRafraichirInterface._fn === "function") return NV_originalRafraichirInterface._fn();
    }

    function NV_patchRafraichirInterface() {
        if (typeof window.rafraichirInterface !== "function" || window.rafraichirInterface.__NV_START_PATCH) return;
        NV_originalRafraichirInterface._fn = window.rafraichirInterface;
        window.rafraichirInterface = function () {
            if (NV_ETAT.mode !== "playing" || !Game.data?.personnage) {
                NV_ouvrirEcranAccueil();
                return;
            }
            NV_syncClassesMetin2();
            NV_normaliserPersonnage(Game.data.personnage);
            NV_appliquerModeUI("playing");
            NV_originalRafraichirInterface();
            NV_demanderAutosave("rafraichirInterface");
        };
        window.rafraichirInterface.__NV_START_PATCH = true;
    }

    function NV_demanderAutosave() {
        if (NV_ETAT.mode !== "playing" || !Game.data?.personnage) return;
        clearTimeout(NV_ETAT.autosaveTimer);
        NV_ETAT.autosaveTimer = setTimeout(() => NV_sauvegarderLocalSilencieux(), 120);
    }

    function NV_injecterStyle() {
        if (document.getElementById("nvStartSaveStyle")) return;
        const style = document.createElement("style");
        style.id = "nvStartSaveStyle";
        style.textContent = `
            .nv-start-screen { max-width: 1180px; margin: 0 auto; padding: 24px; }
            .nv-start-hero, .nv-start-note, .nv-classe-card { padding: 14px; margin-bottom: 12px; background: rgba(0,0,0,0.18); border: 1px solid rgba(245,211,122,0.18); border-radius: 10px; }
            .nv-start-actions, .nv-classes-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; }
            .nv-newgame-name { display: grid; grid-template-columns: minmax(240px, 1fr) auto; gap: 10px; margin-bottom: 14px; }
            .nv-newgame-name label { display: flex; flex-direction: column; gap: 6px; }
            .nv-newgame-name input { padding: 10px; }
            .nv-class-select-bar, .nv-tree-class-selector { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0; }
            .nv-class-select-bar .active, .nv-tree-class-selector .active { box-shadow: 0 0 8px var(--gold-bright, #ffd700); }
            .nv-classe-card__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
            .nv-class-stats-layout { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
        `;
        document.head.appendChild(style);
    }

    function NV_patchSaveButtons() {
        window.sauvegarderJeu = NV_telechargerSauvegarde;
        window.chargerSauvegardeDepuisInput = async function (event) {
            await NV_chargerFichier(event?.target?.files?.[0]);
            if (event?.target) event.target.value = "";
        };
    }

    function NV_apresChargementDonnees() {
        NV_ETAT.donneesChargees = true;
        NV_syncClassesMetin2();
        NV_ajouterBoutonCompetences();

        if (NV_ETAT.mode !== "playing") {
            Game.data.personnage = null;
            NV_ouvrirEcranAccueil();
        }
    }

    function NV_boot() {
        NV_appliquerModeUI("menu");
        NV_injecterStyle();
        NV_patchRafraichirInterface();
        NV_patchSaveButtons();
        window.addEventListener("beforeunload", () => {
            if (NV_ETAT.mode === "playing") NV_sauvegarderLocalSilencieux();
        });

        if (Game.data?.donneesChargees) {
            NV_apresChargementDonnees();
        }
    }

    window.NV_ouvrirEcranAccueil = NV_ouvrirEcranAccueil;
    window.NV_ouvrirChoixClasse = NV_ouvrirChoixClasse;
    window.NV_lancerNouvellePartie = NV_lancerNouvellePartie;
    window.NV_chargerLocal = NV_chargerLocal;
    window.NV_supprimerSauvegardeLocale = NV_supprimerSauvegardeLocale;
    window.NV_chargerFichier = NV_chargerFichier;
    window.NV_chargerFichierDepuisInputAccueil = async function (event) {
        await NV_chargerFichier(event.target.files?.[0]);
        event.target.value = "";
    };
    window.NV_sauvegarderLocalSilencieux = NV_sauvegarderLocalSilencieux;
    window.NV_telechargerSauvegarde = NV_telechargerSauvegarde;
    window.NV_ouvrirCompetencesClasses = NV_ouvrirCompetencesClasses;
    window.ouvrirCompetencesClasses = NV_ouvrirCompetencesClasses;
    window.NV_normaliserPersonnage = NV_normaliserPersonnage;
    window.NV_demanderAutosave = NV_demanderAutosave;
    window.NV_apresChargementDonnees = NV_apresChargementDonnees;
    window.NV_appliquerModeUI = NV_appliquerModeUI;
    window.NV_START_VERSION = NV_START_VERSION;

    NV_boot();
})();
