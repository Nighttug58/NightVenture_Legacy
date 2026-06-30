/*
NightVenture — Gameplay Integration v0.9.4 no emoji direct
- Boss persistants
- Mini-boss uniques
- Combats de zone
- Récompenses uniques
- Auberge gratuite
- Progression combat

Version directe sans wrapper ni module runtime.
*/

(function () {
    "use strict";

    const GI_VERSION = "v0.9.4-no-emoji-direct";

    const GI_CONFIG = {
        utiliserCombatV2: true,
        bossConservePVEntreTentatives: true,
        miniBossConservePVEntreTentatives: false,
        chanceMiniBossDepuisCombat: 6,
        menaceCombatStandard: [
            { id: "faible", poids: 35 },
            { id: "normal", poids: 48 },
            { id: "fort", poids: 15 },
            { id: "elite", poids: 2 }
        ],
        niveauCombat: { offsetBas: -1, offsetHaut: 1 },
        niveauMiniBoss: { offsetBas: 0, offsetHaut: 1 },
        niveauBoss: { offsetBas: 1, offsetHaut: 2 }
    };

    function GI_hasGame() {
        return typeof Game !== "undefined" && Boolean(Game?.data?.personnage);
    }

    function GI_obtenirPersonnage() {
        return GI_hasGame() ? Game.data.personnage : null;
    }

    function GI_ajouterJournal(message) {
        const texte = String(message ?? "").trim();
        if (!texte) return;

        if (typeof ajouterJournal === "function") {
            ajouterJournal(texte);
            return;
        }

        if (GI_hasGame()) {
            Game.data.historique ??= {};
            Game.data.historique.journal ??= [];
            Game.data.historique.journal.push(texte);
        }

        console.log(texte);
    }

    function GI_echapper(valeur) {
        if (typeof echapperHTML === "function") return echapperHTML(valeur);
        return String(valeur ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function GI_cloner(objet) {
        return typeof structuredClone === "function" ? structuredClone(objet) : JSON.parse(JSON.stringify(objet));
    }

    function GI_initialiserEtat() {
        const personnage = GI_obtenirPersonnage();
        if (!personnage) return null;

        personnage.progressionCombat ??= {};
        const etat = personnage.progressionCombat;

        etat.version = GI_VERSION;
        etat.bossPersistants ??= {};
        etat.miniBossUniques ??= {};
        etat.recompensesUniques ??= {};
        etat.definitionsObjetsUniques ??= {};
        etat.zonesDebloqueesParBoss ??= {};
        etat.stats ??= {};

        etat.stats.combatsStandards = Number(etat.stats.combatsStandards ?? etat.stats.combatsProceduraux ?? 0);
        delete etat.stats.combatsProceduraux;
        etat.stats.bossRencontres = Number(etat.stats.bossRencontres || 0);
        etat.stats.bossVaincus = Number(etat.stats.bossVaincus || 0);
        etat.stats.miniBossRencontres = Number(etat.stats.miniBossRencontres || 0);
        etat.stats.miniBossVaincus = Number(etat.stats.miniBossVaincus || 0);

        GI_rehydraterObjetsUniques(etat);
        return etat;
    }

    function GI_obtenirZoneActuelle() {
        if (typeof obtenirZoneActuelle === "function") return obtenirZoneActuelle();
        const personnage = GI_obtenirPersonnage();
        if (!personnage) return null;
        return Game.cache?.zonesParId?.[personnage.zoneActuelle] ?? null;
    }

    function GI_obtenirZoneParId(idZone) {
        if (!idZone) return null;
        if (Game.cache?.zonesParId?.[idZone]) return Game.cache.zonesParId[idZone];
        if (typeof obtenirZonesActuelles === "function") {
            const zone = obtenirZonesActuelles().find(element => element.id === idZone);
            if (zone) return zone;
        }
        return (Game.data?.zones || Game.data?.monde?.zones || []).find(zone => zone.id === idZone) || null;
    }

    function GI_idZone(zone) {
        return zone?.id || GI_obtenirPersonnage()?.zoneActuelle || "zone_inconnue";
    }

    function GI_nomZone(zone) {
        return zone?.nom || GI_idZone(zone);
    }

    function GI_choisirPondere(table) {
        const total = table.reduce((somme, entree) => somme + (Number(entree.poids) || 0), 0);
        if (total <= 0) return table[0];

        const tirage = Math.random() * total;
        let cumul = 0;

        for (const entree of table) {
            cumul += Number(entree.poids) || 0;
            if (tirage <= cumul) return entree;
        }

        return table[table.length - 1];
    }

    function GI_enregistrerMonstreDansCache(monstre) {
        if (!monstre?.id) return monstre;
        Game.cache ??= {};
        Game.cache.monstresParId ??= {};
        Game.cache.monstresParId[monstre.id] = monstre;
        return monstre;
    }

    function GI_creerMonstreZone(typeMenace, zone) {
        const niveauJoueur = Math.max(1, Number(GI_obtenirPersonnage()?.niveau) || 1);

        const multiplicateurs = {
            faible: 0.75,
            normal: 1,
            fort: 1.25,
            elite: 1.55,
            mini_boss: 1.9,
            boss: 2.8
        };

        const noms = {
            faible: "Créature affaiblie",
            normal: "Créature",
            fort: "Prédateur",
            elite: "Élite",
            mini_boss: "Champion",
            boss: "Seigneur"
        };

        const mult = multiplicateurs[typeMenace] || 1;
        const fenetre = typeMenace === "boss"
            ? GI_CONFIG.niveauBoss
            : typeMenace === "mini_boss"
                ? GI_CONFIG.niveauMiniBoss
                : GI_CONFIG.niveauCombat;

        const offset = Math.floor(Math.random() * (Number(fenetre.offsetHaut) - Number(fenetre.offsetBas) + 1)) + Number(fenetre.offsetBas);
        const niveau = Math.max(1, niveauJoueur + offset);
        const pv = Math.round((35 + niveau * 12) * mult);
        const zoneNom = GI_nomZone(zone);

        return {
            id: `gi_${typeMenace}_${GI_idZone(zone)}_${Date.now()}_${Math.floor(Math.random() * 9999)}`,
            nom: typeMenace === "boss"
                ? `Seigneur de ${zoneNom}`
                : typeMenace === "mini_boss"
                    ? `Champion de ${zoneNom}`
                    : `${noms[typeMenace] || "Créature"} de ${zoneNom}`,
            niveau,
            pv,
            pvMax: pv,
            mana: Math.round((10 + niveau * 4) * mult),
            manaMax: Math.round((10 + niveau * 4) * mult),
            stamina: Math.round((30 + niveau * 5) * mult),
            staminaMax: Math.round((30 + niveau * 5) * mult),
            attaque: Math.round((7 + niveau * 2.5) * mult),
            defense: Math.round((3 + niveau * 1.4) * mult),
            attaqueMagique: Math.round((6 + niveau * 2.2) * mult),
            defenseMagique: Math.round((3 + niveau * 1.2) * mult),
            critique: Math.min(30, Math.round(4 + niveau * 0.5)),
            esquive: Math.min(18, Math.round(3 + niveau * 0.3)),
            vitesse: Math.round(8 + niveau * 0.4),
            xp: Math.round((20 + niveau * 7) * mult),
            or: Math.round((5 + niveau * 2) * mult),
            loot: [],
            typeMenace,
            nomMenace: typeMenace,
            sourceIntegration: "gameplay_integration",
            ia: { profil: typeMenace === "boss" || typeMenace === "mini_boss" ? "prudent" : "agressif" }
        };
    }

    function GI_genererMonstre(typeMenace, zone) {
        const monstre = GI_creerMonstreZone(typeMenace, zone);
        monstre.integrationGameplay = true;
        monstre.zoneId = GI_idZone(zone);
        monstre.zoneNom = GI_nomZone(zone);
        monstre.typeMenace = monstre.typeMenace || typeMenace;
        return GI_enregistrerMonstreDansCache(monstre);
    }

    function GI_demarrerCombat(monstre) {
        if (!monstre) return;
        GI_enregistrerMonstreDansCache(monstre);

        if (GI_CONFIG.utiliserCombatV2 && typeof demarrerCombatV2 === "function") {
            demarrerCombatV2(monstre);
            return;
        }

        if (typeof demarrerCombat === "function") {
            demarrerCombat(monstre);
            return;
        }

        GI_ajouterJournal("Attention : aucun moteur de combat disponible.");
    }

    function GI_genererCombatStandard(zone) {
        const choixMenace = GI_choisirPondere(GI_CONFIG.menaceCombatStandard);
        const monstre = GI_genererMonstre(choixMenace.id, zone);
        monstre.id = monstre.id || `combat_${Date.now()}`;
        monstre.integrationType = "combat_standard";
        GI_enregistrerMonstreDansCache(monstre);

        const etat = GI_initialiserEtat();
        if (etat?.stats) etat.stats.combatsStandards++;

        GI_ajouterJournal(`Combat : ${monstre.nom} apparaît. [${monstre.nomMenace || choixMenace.id}]`);
        GI_demarrerCombat(monstre);
    }

    function GI_cleMiniBoss(zone) { return GI_idZone(zone); }
    function GI_cleBoss(zone) { return GI_idZone(zone); }

    function GI_creerOuObtenirMiniBoss(zone) {
        const etat = GI_initialiserEtat();
        if (!etat) return { dejaVaincu: false, entree: null, monstre: null };

        const cle = GI_cleMiniBoss(zone);
        let entree = etat.miniBossUniques[cle];

        if (entree?.vaincu) return { dejaVaincu: true, entree };

        if (!entree) {
            const monstre = GI_genererMonstre("mini_boss", zone);
            monstre.id = `gi_miniboss_${cle}`;
            monstre.integrationType = "mini_boss_unique";
            monstre.integrationCle = cle;
            GI_enregistrerMonstreDansCache(monstre);

            entree = {
                cle,
                zoneId: GI_idZone(zone),
                zoneNom: GI_nomZone(zone),
                vaincu: false,
                rencontres: 0,
                defaitesJoueur: 0,
                fuites: 0,
                monstre
            };
            etat.miniBossUniques[cle] = entree;
        }

        const monstre = GI_cloner(entree.monstre);
        monstre.pv = monstre.pvMax;
        monstre.mana = monstre.manaMax ?? monstre.mana ?? 0;
        monstre.stamina = monstre.staminaMax ?? monstre.stamina ?? 0;
        monstre.integrationType = "mini_boss_unique";
        monstre.integrationCle = cle;
        GI_enregistrerMonstreDansCache(monstre);

        return { dejaVaincu: false, entree, monstre };
    }

    function GI_declencherMiniBoss(zone) {
        const etat = GI_initialiserEtat();
        const resultat = GI_creerOuObtenirMiniBoss(zone);
        if (!etat || !resultat) return;

        if (resultat.dejaVaincu) {
            GI_ajouterJournal(`Mini-boss déjà vaincu : ${GI_nomZone(zone)}.`);
            GI_genererCombatStandard(zone);
            return;
        }

        resultat.entree.rencontres++;
        etat.stats.miniBossRencontres++;
        GI_ajouterJournal(`Mini-boss unique : ${resultat.monstre.nom}`);
        GI_demarrerCombat(resultat.monstre);
    }

    function GI_creerOuObtenirBoss(zone) {
        const etat = GI_initialiserEtat();
        if (!etat) return { dejaVaincu: false, entree: null, monstre: null };

        const cle = GI_cleBoss(zone);
        let entree = etat.bossPersistants[cle];

        if (entree?.vaincu) return { dejaVaincu: true, entree };

        if (!entree) {
            const monstre = GI_genererMonstre("boss", zone);
            monstre.id = `gi_boss_${cle}`;
            monstre.integrationType = "boss_persistant";
            monstre.integrationCle = cle;
            GI_enregistrerMonstreDansCache(monstre);

            entree = {
                cle,
                zoneId: GI_idZone(zone),
                zoneNom: GI_nomZone(zone),
                vaincu: false,
                rencontres: 0,
                defaitesJoueur: 0,
                fuites: 0,
                monstre
            };
            etat.bossPersistants[cle] = entree;
        }

        const monstre = GI_cloner(entree.monstre);
        if (!GI_CONFIG.bossConservePVEntreTentatives) {
            monstre.pv = monstre.pvMax;
        } else {
            const pvMaxBoss = Math.max(1, Math.round(Number(monstre.pvMax || monstre.pv || 1)));
            monstre.pvMax = pvMaxBoss;
            monstre.pv = Math.max(1, Math.min(Math.round(Number(monstre.pv ?? entree.monstre?.pv ?? pvMaxBoss) || pvMaxBoss), pvMaxBoss));
            entree.monstre.pv = monstre.pv;
            entree.monstre.pvMax = pvMaxBoss;
        }

        monstre.mana = monstre.manaMax ?? monstre.mana ?? 0;
        monstre.stamina = monstre.staminaMax ?? monstre.stamina ?? 0;
        monstre.integrationType = "boss_persistant";
        monstre.integrationCle = cle;
        GI_enregistrerMonstreDansCache(monstre);

        return { dejaVaincu: false, entree, monstre };
    }

    function GI_declencherBoss(zone) {
        const etat = GI_initialiserEtat();
        const resultat = GI_creerOuObtenirBoss(zone);
        if (!etat || !resultat) return;

        if (resultat.dejaVaincu) {
            GI_ajouterJournal(`Boss déjà vaincu : ${GI_nomZone(zone)}.`);
            return;
        }

        resultat.entree.rencontres++;
        etat.stats.bossRencontres++;
        GI_ajouterJournal(`Boss persistant : ${resultat.monstre.nom}`);
        GI_demarrerCombat(resultat.monstre);
    }

    function GI_devraitDeclencherMiniBossDepuisCombat(zone) {
        const etat = GI_initialiserEtat();
        if (!etat) return false;

        const cle = GI_cleMiniBoss(zone);
        if (etat.miniBossUniques[cle]?.vaincu) return false;

        const chance = Number(zone?.chanceMiniBoss ?? GI_CONFIG.chanceMiniBossDepuisCombat) || 0;
        return chance > 0 && Math.random() * 100 < chance;
    }

    function GI_nettoyerId(texte) {
        return String(texte || "inconnu")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")
            .slice(0, 64) || "inconnu";
    }

    function GI_enregistrerObjetUnique(objet) {
        if (!objet?.id) return null;
        Game.data.objets ??= [];
        Game.cache ??= {};
        Game.cache.objetsParId ??= {};

        const objetExistant = Game.cache.objetsParId[objet.id] || Game.data.objets.find(o => o.id === objet.id);
        if (objetExistant) {
            Game.cache.objetsParId[objet.id] = objetExistant;
            return objetExistant;
        }

        Game.data.objets.push(objet);
        Game.cache.objetsParId[objet.id] = objet;
        return objet;
    }

    function GI_rehydraterObjetsUniques(etat) {
        if (!etat?.definitionsObjetsUniques) return;
        Object.values(etat.definitionsObjetsUniques).forEach(objet => GI_enregistrerObjetUnique(objet));
    }

    function GI_ajouterObjetInventaireSafe(idObjet, quantite = 1) {
        if (!idObjet || quantite <= 0) return;

        if (typeof ajouterObjetInventaire === "function") {
            ajouterObjetInventaire(idObjet, quantite);
            return;
        }

        const personnage = GI_obtenirPersonnage();
        if (!personnage) return;

        personnage.inventaire ??= [];
        const item = personnage.inventaire.find(entree => entree.id === idObjet);
        if (item) item.quantite += quantite;
        else personnage.inventaire.push({ id: idObjet, quantite });
    }

    function GI_creerObjetRecompenseUnique(type, entree, ennemi) {
        const zoneId = GI_nettoyerId(entree?.zoneId || entree?.zoneNom || "zone");
        const id = type === "boss" ? `gi_relique_boss_${zoneId}` : `gi_trophee_miniboss_${zoneId}`;
        const nomZone = entree?.zoneNom || "zone inconnue";
        const objet = {
            id,
            nom: type === "boss" ? `Relique du boss - ${nomZone}` : `Trophée du mini-boss - ${nomZone}`,
            type: "trophee",
            rarete: type === "boss" ? "legendaire" : "rare",
            prix: type === "boss" ? 500 : 160,
            niveauRequis: 1,
            description: type === "boss"
                ? `Relique unique obtenue après avoir vaincu le boss persistant de ${nomZone}.`
                : `Trophée unique obtenu après avoir vaincu le mini-boss de ${nomZone}.`,
            unique: true,
            recompenseUnique: true,
            menace: type === "boss" ? "boss" : "mini_boss",
            zoneId: entree?.zoneId || null,
            zoneNom: nomZone,
            source: ennemi?.nom || null
        };
        return GI_enregistrerObjetUnique(objet);
    }

    function GI_calculerBonusRecompense(type, entree, ennemi) {
        const niveau = Math.max(1, Number(ennemi?.niveau || entree?.monstre?.niveau || GI_obtenirPersonnage()?.niveau || 1));
        const xpBase = Math.max(0, Number(ennemi?.xp || entree?.monstre?.xp || 0));
        const orBase = Math.max(0, Number(ennemi?.or || entree?.monstre?.or || 0));

        if (type === "boss") {
            return {
                xp: Math.round(Math.max(80 + niveau * 18, xpBase * 0.80)),
                or: Math.round(Math.max(60 + niveau * 10, orBase))
            };
        }

        return {
            xp: Math.round(Math.max(35 + niveau * 10, xpBase * 0.45)),
            or: Math.round(Math.max(25 + niveau * 5, orBase * 0.60))
        };
    }

    function GI_obtenirConfigRecompense(type, entree) {
        const zone = GI_obtenirZoneParId(entree?.zoneId);
        if (!zone) return null;
        return type === "boss"
            ? (zone.recompenseBoss || zone.recompenseBossPersistant || null)
            : (zone.recompenseMiniBoss || zone.recompenseMiniboss || null);
    }

    function GI_listeZonesDebloqueesConfig(zone, config) {
        const valeurs = [];
        function ajouter(valeur) {
            if (!valeur) return;
            if (Array.isArray(valeur)) return valeur.forEach(ajouter);
            valeurs.push(String(valeur));
        }

        ajouter(config?.zoneDebloquee);
        ajouter(config?.zonesDebloquees);
        ajouter(config?.debloqueZone);
        ajouter(config?.debloqueZones);
        ajouter(zone?.debloqueApresBoss);
        ajouter(zone?.debloqueZonesApresBoss);
        ajouter(zone?.zoneDebloqueeApresBoss);

        return [...new Set(valeurs)];
    }

    function GI_debloquerZone(idZone, sourceTexte = "boss") {
        const personnage = GI_obtenirPersonnage();
        if (!personnage || !idZone) return false;

        personnage.zonesDebloquees ??= [];
        if (personnage.zonesDebloquees.includes(idZone)) return false;

        personnage.zonesDebloquees.push(idZone);
        const zone = GI_obtenirZoneParId(idZone);
        GI_ajouterJournal(`Zone débloquée (${sourceTexte}) : ${zone?.nom || idZone}`);
        return true;
    }

    function GI_debloquerZonesApresBoss(entree) {
        const etat = GI_initialiserEtat();
        const zone = GI_obtenirZoneParId(entree?.zoneId);
        const config = GI_obtenirConfigRecompense("boss", entree);
        let zonesADebloquer = GI_listeZonesDebloqueesConfig(zone, config);

        if (zonesADebloquer.length === 0 && Array.isArray(zone?.connexions)) {
            const personnage = GI_obtenirPersonnage();
            zonesADebloquer = zone.connexions
                .filter(idZone => !(personnage.zonesDebloquees || []).includes(idZone))
                .slice(0, 1);
        }

        if (zonesADebloquer.length === 0) {
            GI_ajouterJournal("Aucun nouveau passage débloqué par ce boss.");
            return [];
        }

        const debloquees = [];
        zonesADebloquer.forEach(idZone => {
            if (GI_debloquerZone(idZone, "boss vaincu")) debloquees.push(idZone);
        });

        if (debloquees.length > 0 && etat) {
            etat.zonesDebloqueesParBoss[entree.cle] ??= [];
            debloquees.forEach(idZone => {
                if (!etat.zonesDebloqueesParBoss[entree.cle].includes(idZone)) {
                    etat.zonesDebloqueesParBoss[entree.cle].push(idZone);
                }
            });
        }

        return debloquees;
    }

    function GI_donnerRecompenseUnique(type, entree, ennemi) {
        const etat = GI_initialiserEtat();
        if (!etat || !entree?.cle) return false;

        const cleRecompense = `${type}:${entree.cle}`;
        if (etat.recompensesUniques[cleRecompense]?.recuperee) {
            GI_ajouterJournal("Récompense unique déjà récupérée : aucun farm possible.");
            return false;
        }

        const config = GI_obtenirConfigRecompense(type, entree);
        const bonus = GI_calculerBonusRecompense(type, entree, ennemi);
        const xp = Number(config?.xpBonus ?? config?.xp ?? bonus.xp) || 0;
        const or = Number(config?.orBonus ?? config?.or ?? bonus.or) || 0;
        const objetUnique = GI_creerObjetRecompenseUnique(type, entree, ennemi);
        if (objetUnique?.id) etat.definitionsObjetsUniques[objetUnique.id] = objetUnique;

        const objets = [];
        if (objetUnique?.id) objets.push({ id: objetUnique.id, quantite: 1, unique: true });
        if (Array.isArray(config?.objets)) {
            config.objets.forEach(item => {
                if (item?.id) objets.push({ id: item.id, quantite: Math.max(1, Number(item.quantite) || 1) });
            });
        }
        if (config?.objet) objets.push({ id: config.objet, quantite: Math.max(1, Number(config.quantite) || 1) });

        const personnage = GI_obtenirPersonnage();
        if (xp > 0) personnage.xp = (Number(personnage.xp) || 0) + xp;
        if (or > 0) personnage.or = (Number(personnage.or) || 0) + or;
        objets.forEach(item => GI_ajouterObjetInventaireSafe(item.id, item.quantite));

        etat.recompensesUniques[cleRecompense] = {
            recuperee: true,
            type,
            cle: entree.cle,
            zoneId: entree.zoneId,
            zoneNom: entree.zoneNom,
            ennemiNom: ennemi?.nom || entree?.monstre?.nom || null,
            xp,
            or,
            objets,
            jour: personnage?.jour ?? null,
            niveauJoueur: personnage?.niveau ?? null
        };

        GI_ajouterJournal("━━━━━━━━━━━━━━━━━━━━");
        GI_ajouterJournal(type === "boss" ? "Récompense unique de boss obtenue !" : "Récompense unique de mini-boss obtenue !");
        if (xp > 0) GI_ajouterJournal(`Bonus unique : XP +${xp}`);
        if (or > 0) GI_ajouterJournal(`Bonus unique : Or +${or}`);
        objets.forEach(item => {
            const objet = Game.cache?.objetsParId?.[item.id] || null;
            GI_ajouterJournal(`Butin : ${objet?.nom || item.id} x${item.quantite}`);
        });
        GI_ajouterJournal("━━━━━━━━━━━━━━━━━━━━");

        if (typeof verifierNiveau === "function") verifierNiveau();
        if (typeof rafraichirInterface === "function") rafraichirInterface();
        return true;
    }

    function GI_gererVictoireIntegration(combat) {
        const ennemi = combat?.ennemi;
        if (!ennemi) return;

        const monstreCache = Game.cache?.monstresParId?.[ennemi.id] || null;
        const integrationType = monstreCache?.integrationType || ennemi.integrationType || null;
        const cle = monstreCache?.integrationCle || ennemi.integrationCle || null;
        const etat = GI_initialiserEtat();
        if (!etat || !integrationType || !cle) return;

        if (integrationType === "boss_persistant") {
            const entree = etat.bossPersistants[cle];
            if (!entree || entree.vaincu) return;

            entree.vaincu = true;
            entree.vaincuJour = GI_obtenirPersonnage()?.jour ?? null;
            entree.vaincuNiveauJoueur = GI_obtenirPersonnage()?.niveau ?? null;
            etat.stats.bossVaincus++;
            GI_ajouterJournal(`Boss persistant vaincu définitivement : ${ennemi.nom}`);
            GI_donnerRecompenseUnique("boss", entree, ennemi);
            GI_debloquerZonesApresBoss(entree, ennemi);
        }

        if (integrationType === "mini_boss_unique") {
            const entree = etat.miniBossUniques[cle];
            if (!entree || entree.vaincu) return;

            entree.vaincu = true;
            entree.vaincuJour = GI_obtenirPersonnage()?.jour ?? null;
            entree.vaincuNiveauJoueur = GI_obtenirPersonnage()?.niveau ?? null;
            etat.stats.miniBossVaincus++;
            GI_ajouterJournal(`Mini-boss unique vaincu définitivement : ${ennemi.nom}`);
            GI_donnerRecompenseUnique("mini_boss", entree, ennemi);
        }
    }

    function GI_gererEchecIntegration(combat, resultat) {
        const ennemi = combat?.ennemi;
        if (!ennemi) return;

        const monstreCache = Game.cache?.monstresParId?.[ennemi.id] || null;
        const integrationType = monstreCache?.integrationType || ennemi.integrationType || null;
        const cle = monstreCache?.integrationCle || ennemi.integrationCle || null;
        const etat = GI_initialiserEtat();
        if (!etat || !integrationType || !cle) return;

        if (integrationType === "boss_persistant") {
            const entree = etat.bossPersistants[cle];
            if (!entree || entree.vaincu) return;

            if (resultat === "fuite") entree.fuites++;
            else entree.defaitesJoueur++;

            if (GI_CONFIG.bossConservePVEntreTentatives) {
                const pvMax = Math.round(Number(ennemi.pvMax || entree.monstre.pvMax || ennemi.pv) || 1);
                const pvRestants = Math.max(1, Math.min(Math.round(Number(ennemi.pv) || 1), pvMax));
                entree.monstre.pv = pvRestants;
                entree.monstre.pvActuels = pvRestants;
                entree.monstre.derniereMiseAJourPV = Date.now();
                GI_ajouterJournal(`Le boss reste blessé : ${pvRestants}/${entree.monstre.pvMax || ennemi.pvMax || "?"} PV.`);
            } else {
                GI_ajouterJournal("Le boss reste présent. Il faudra revenir mieux préparé.");
            }
        }

        if (integrationType === "mini_boss_unique") {
            const entree = etat.miniBossUniques[cle];
            if (!entree || entree.vaincu) return;

            if (resultat === "fuite") entree.fuites++;
            else entree.defaitesJoueur++;
            if (GI_CONFIG.miniBossConservePVEntreTentatives) entree.monstre.pv = Math.max(1, Math.round(Number(ennemi.pv) || 1));
            GI_ajouterJournal("Le mini-boss est toujours présent dans la zone.");
        }
    }

    function GI_patchTerminerCombatV2() {
        if (typeof terminerCombat !== "function" || terminerCombat.__GI_patche) return;

        const originalTerminerCombat = terminerCombat;
        terminerCombat = function (resultat) {
            const combatAvant = Game.combat?.actif || null;
            originalTerminerCombat(resultat);
            if (resultat === "victoire") GI_gererVictoireIntegration(combatAvant);
            else if (resultat === "defaite" || resultat === "fuite") GI_gererEchecIntegration(combatAvant, resultat);
            if (typeof afficherPersonnage === "function") afficherPersonnage();
        };
        terminerCombat.__GI_patche = true;
    }

    function GI_patchExecuterEvenementZone() {
        if (typeof executerEvenementZone !== "function" || executerEvenementZone.__GI_patche) return;

        const originalExecuterEvenementZone = executerEvenementZone;
        executerEvenementZone = function (evenement, zone) {
            GI_initialiserEtat();

            if (evenement === "combat") {
                if (GI_devraitDeclencherMiniBossDepuisCombat(zone)) {
                    GI_declencherMiniBoss(zone);
                    return;
                }
                GI_genererCombatStandard(zone);
                return;
            }

            if (evenement === "mini_boss" || evenement === "miniboss") {
                GI_declencherMiniBoss(zone);
                return;
            }

            if (evenement === "boss") {
                GI_declencherBoss(zone);
                return;
            }

            return originalExecuterEvenementZone(evenement, zone);
        };
        executerEvenementZone.__GI_patche = true;
    }

    function GI_compterVaincus(collection) {
        return Object.values(collection || {}).filter(entree => entree?.vaincu).length;
    }

    function GI_obtenirEntreeBossZoneActuelle() {
        const etat = GI_initialiserEtat();
        const zone = GI_obtenirZoneActuelle();
        if (!etat || !zone) return null;
        return etat.bossPersistants?.[GI_cleBoss(zone)] || null;
    }

    function GI_obtenirEntreeMiniBossZoneActuelle() {
        const etat = GI_initialiserEtat();
        const zone = GI_obtenirZoneActuelle();
        if (!etat || !zone) return null;
        return etat.miniBossUniques?.[GI_cleMiniBoss(zone)] || null;
    }

    function GI_creerCarteAuberge() {
        if (!GI_obtenirPersonnage()) return "";
        return `
            <div class="item-card" id="giAubergeGratuite">
                <h3>Auberge</h3>
                <p>Repos gratuit : soigne complètement le personnage et fait passer 24 heures.</p>
                <button onclick="GI_dormirAubergeGratuite()">Dormir 24h gratuitement</button>
            </div>
        `;
    }

    function GI_creerCarteMenacesZone() {
        const zone = GI_obtenirZoneActuelle();
        const boss = GI_obtenirEntreeBossZoneActuelle();
        const mini = GI_obtenirEntreeMiniBossZoneActuelle();
        if (!zone && !boss && !mini) return "";

        let html = `<div class="item-card" id="giMenacesZone"><h3>Menaces de zone</h3>`;

        if (boss) {
            html += `
                <p>Boss : <strong>${GI_echapper(boss.monstre?.nom || "Boss inconnu")}</strong></p>
                <p>État : ${boss.vaincu ? "Vaincu" : "Présent"}</p>
                <p>PV persistants : <strong>${Math.max(0, Math.round(Number(boss.monstre?.pv ?? boss.monstre?.pvMax ?? 0)))}</strong> / ${Math.max(1, Math.round(Number(boss.monstre?.pvMax ?? boss.monstre?.pv ?? 1)))}</p>
                <p>Rencontres : ${boss.rencontres || 0} — Défaites : ${boss.defaitesJoueur || 0}</p>
            `;
            if (!boss.vaincu) html += `<button onclick="GI_relancerBossActuel()">Affronter / réessayer le boss</button>`;
        } else {
            html += `<p>Aucun boss persistant encore révélé dans cette zone.</p>`;
            html += `<button onclick="GI_declencherBossZoneActuelle()">Révéler le boss de la zone</button>`;
        }

        if (mini) {
            html += `
                <hr>
                <p>Mini-boss : <strong>${GI_echapper(mini.monstre?.nom || "Mini-boss inconnu")}</strong></p>
                <p>État : ${mini.vaincu ? "Vaincu" : "Présent"}</p>
            `;
            if (!mini.vaincu) html += `<button onclick="GI_relancerMiniBossActuel()">Affronter / réessayer le mini-boss</button>`;
        }

        html += `</div>`;
        return html;
    }

    function GI_obtenirMaxRessource(nomRessource) {
        const personnage = GI_obtenirPersonnage();
        if (!personnage) return 0;
        if (nomRessource === "pv") return typeof pvMaxTotal === "function" ? Math.max(1, Number(pvMaxTotal()) || 1) : Math.max(1, Number(personnage.pvMax || personnage.pv) || 1);
        if (nomRessource === "mana") return typeof manaMaxTotal === "function" ? Math.max(0, Number(manaMaxTotal()) || 0) : Math.max(0, Number(personnage.manaMax || personnage.mana) || 0);
        if (nomRessource === "stamina") return typeof staminaMaxTotal === "function" ? Math.max(0, Number(staminaMaxTotal()) || 0) : Math.max(0, Number(personnage.staminaMax || personnage.stamina) || 0);
        return 0;
    }

    function GI_avancerTemps24h() {
        const personnage = GI_obtenirPersonnage();
        if (!personnage) return;

        if (typeof avancerTemps === "function") {
            avancerTemps(24);
            return;
        }

        const heureActuelle = Number(personnage.heure) || 0;
        const nouvelleHeure = heureActuelle + 24;
        personnage.heure = nouvelleHeure % 24;
        personnage.jour = (Number(personnage.jour) || 1) + Math.floor(nouvelleHeure / 24);
    }

    window.GI_dormirAubergeGratuite = function () {
        const personnage = GI_obtenirPersonnage();
        if (!personnage) {
            GI_ajouterJournal("Impossible de dormir : personnage introuvable.");
            return;
        }

        personnage.pv = GI_obtenirMaxRessource("pv");
        if ("mana" in personnage) personnage.mana = GI_obtenirMaxRessource("mana");
        if ("stamina" in personnage) personnage.stamina = GI_obtenirMaxRessource("stamina");
        personnage.etatsTemporaires = [];
        personnage.status = personnage.status || {};
        GI_avancerTemps24h();

        GI_ajouterJournal("Tu dors 24 heures à l'auberge.");
        GI_ajouterJournal("PV restaurés au maximum.");
        if ("mana" in personnage) GI_ajouterJournal("Mana restaurée au maximum.");
        if ("stamina" in personnage) GI_ajouterJournal("Stamina restaurée au maximum.");
        if (typeof afficherPersonnage === "function") afficherPersonnage();
        if (typeof ouvrirExploration === "function") ouvrirExploration();
    };

    function GI_relancerMenace(type, entree, zone) {
        if (!entree) {
            if (type === "boss") GI_declencherBoss(zone);
            else GI_declencherMiniBoss(zone);
            return;
        }

        if (entree.vaincu) {
            GI_ajouterJournal(`${entree.monstre?.nom || "Cette menace"} est déjà vaincue.`);
            return;
        }

        if (type === "boss") GI_declencherBoss(zone);
        else GI_declencherMiniBoss(zone);
    }

    window.GI_relancerBossActuel = function () {
        const zone = GI_obtenirZoneActuelle();
        if (!zone) return GI_ajouterJournal("Zone actuelle introuvable.");
        const etat = GI_initialiserEtat();
        GI_relancerMenace("boss", etat?.bossPersistants?.[GI_cleBoss(zone)], zone);
    };

    window.GI_relancerMiniBossActuel = function () {
        const zone = GI_obtenirZoneActuelle();
        if (!zone) return GI_ajouterJournal("Zone actuelle introuvable.");
        const etat = GI_initialiserEtat();
        GI_relancerMenace("mini_boss", etat?.miniBossUniques?.[GI_cleMiniBoss(zone)], zone);
    };

    window.GI_relancerBossParCle = function (cle) {
        const etat = GI_initialiserEtat();
        const entree = etat?.bossPersistants?.[cle];
        if (!entree) return GI_ajouterJournal("Boss introuvable.");
        GI_relancerMenace("boss", entree, GI_obtenirZoneParId(entree.zoneId) || GI_obtenirZoneActuelle());
    };

    window.GI_relancerMiniBossParCle = function (cle) {
        const etat = GI_initialiserEtat();
        const entree = etat?.miniBossUniques?.[cle];
        if (!entree) return GI_ajouterJournal("Mini-boss introuvable.");
        GI_relancerMenace("mini_boss", entree, GI_obtenirZoneParId(entree.zoneId) || GI_obtenirZoneActuelle());
    };

    window.GI_declencherBossZoneActuelle = function () {
        const zone = GI_obtenirZoneActuelle();
        if (!zone) return GI_ajouterJournal("Zone actuelle introuvable.");
        GI_declencherBoss(zone);
    };

    window.GI_declencherMiniBossZoneActuelle = function () {
        const zone = GI_obtenirZoneActuelle();
        if (!zone) return GI_ajouterJournal("Zone actuelle introuvable.");
        GI_declencherMiniBoss(zone);
    };

    function GI_injecterCartesExploration() {
        const conteneur = document.getElementById("vuePrincipale");
        if (!conteneur || !GI_obtenirPersonnage()) return;
        if (document.getElementById("giAubergeGratuite") || document.getElementById("giMenacesZone")) return;

        const html = GI_creerCarteAuberge() + GI_creerCarteMenacesZone();
        if (!html.trim()) return;

        const wrapper = document.createElement("div");
        wrapper.id = "giGameplayIntegrationCards";
        wrapper.innerHTML = html;
        conteneur.appendChild(wrapper);
    }

    function GI_patchOuvrirExploration() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__GI_patche) return;

        const originalOuvrirExploration = ouvrirExploration;
        ouvrirExploration = function (...args) {
            const resultat = originalOuvrirExploration.apply(this, args);
            setTimeout(GI_injecterCartesExploration, 0);
            return resultat;
        };
        ouvrirExploration.__GI_patche = true;
    }

    function GI_creerCarteProgressionBoss(entree, type) {
        const nom = entree?.monstre?.nom || (type === "boss" ? "Boss inconnu" : "Mini-boss inconnu");
        const etat = entree?.vaincu ? "Vaincu" : "Présent";
        const bouton = entree?.vaincu
            ? ""
            : type === "boss"
                ? `<button onclick="GI_relancerBossParCle('${entree.cle}')">Affronter</button>`
                : `<button onclick="GI_relancerMiniBossParCle('${entree.cle}')">Affronter</button>`;

        return `
            <div class="item-card">
                <h3>${GI_echapper(nom)}</h3>
                <p>Type : ${type === "boss" ? "Boss" : "Mini-boss"}</p>
                <p>Zone : ${GI_echapper(entree?.zoneNom || entree?.zoneId || "Zone inconnue")}</p>
                <p>État : ${etat}</p>
                <p>Rencontres : ${entree?.rencontres || 0}</p>
                <p>Défaites joueur : ${entree?.defaitesJoueur || 0}</p>
                <p>Fuites : ${entree?.fuites || 0}</p>
                ${bouton}
            </div>
        `;
    }

    window.GI_ouvrirProgressionCombat = function () {
        if (typeof changerVue === "function") changerVue("progression_combat");
        const etat = GI_initialiserEtat();
        if (!etat) return;

        const boss = Object.values(etat.bossPersistants || {});
        const miniBoss = Object.values(etat.miniBossUniques || {});
        const recompenses = Object.values(etat.recompensesUniques || {});

        const html = `
            <div class="item-card">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                    <div>
                        <h2 style="margin:0;">Progression combat</h2>
                        <p style="margin:6px 0 0;">Boss persistants, mini-boss uniques et récompenses.</p>
                    </div>
                    <button onclick="ouvrirExploration()">Retour</button>
                </div>
            </div>

            <div class="item-card">
                <h3>Résumé</h3>
                <p>Combats standards : ${etat.stats.combatsStandards || 0}</p>
                <p>Boss vaincus : ${GI_compterVaincus(etat.bossPersistants)} / ${boss.length}</p>
                <p>Mini-boss vaincus : ${GI_compterVaincus(etat.miniBossUniques)} / ${miniBoss.length}</p>
                <p>Récompenses uniques récupérées : ${recompenses.filter(r => r?.recuperee).length}</p>
            </div>

            <div class="item-card">
                <h3>Boss persistants</h3>
                ${boss.length ? boss.map(entree => GI_creerCarteProgressionBoss(entree, "boss")).join("") : "<p>Aucun boss révélé.</p>"}
            </div>

            <div class="item-card">
                <h3>Mini-boss uniques</h3>
                ${miniBoss.length ? miniBoss.map(entree => GI_creerCarteProgressionBoss(entree, "mini_boss")).join("") : "<p>Aucun mini-boss révélé.</p>"}
            </div>
        `;

        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(html);
    };

    function GI_installer() {
        if (!GI_hasGame()) {
            setTimeout(GI_installer, 120);
            return;
        }

        GI_initialiserEtat();
        GI_patchExecuterEvenementZone();
        GI_patchTerminerCombatV2();
        GI_patchOuvrirExploration();
        setTimeout(GI_injecterCartesExploration, 0);
        console.log("Gameplay_Integration.js chargé — " + GI_VERSION);
    }

    window.GI_VERSION = GI_VERSION;
    window.GI_genererCombatStandard = GI_genererCombatStandard;
    window.GI_declencherMiniBoss = GI_declencherMiniBoss;
    window.GI_declencherBoss = GI_declencherBoss;
    window.GI_initialiserEtat = GI_initialiserEtat;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", GI_installer);
    } else {
        GI_installer();
    }
})();
