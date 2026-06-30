(function () {
    "use strict";

    const NV_LOOT_REWARDS_VERSION =
        "v0.9.6-exploration-loot-rewards";

    const NV_LOOT_STATE = {
        dernierCoffre: null,
        dernierLoot: []
    };

    const NV_COFFRES = {
        commun: {
            label: "coffre usé",
            chanceBase: 62,
            orMin: 4,
            orMax: 11,
            rolls: 1
        },
        solide: {
            label: "coffre solide",
            chanceBase: 25,
            orMin: 10,
            orMax: 22,
            rolls: 2
        },
        rare: {
            label: "coffre ancien",
            chanceBase: 10,
            orMin: 18,
            orMax: 38,
            rolls: 2
        },
        epique: {
            label: "coffre scellé",
            chanceBase: 3,
            orMin: 32,
            orMax: 70,
            rolls: 3
        }
    };

    const NV_LOOT_TABLES = {
        village: [
            { id: "potion_soin", poids: 42, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 35, min: 1, max: 2 },
            { id: "petite_potion_xp", poids: 10, min: 1, max: 1 },
            { id: "anneau_chance", poids: 3, min: 1, max: 1 },
            { id: "bottes_voyageur", poids: 10, min: 1, max: 1 }
        ],

        ville: [
            { id: "potion_soin", poids: 38, min: 1, max: 1 },
            { id: "potion_soin_superieure", poids: 10, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 24, min: 1, max: 2 },
            { id: "petite_potion_xp", poids: 12, min: 1, max: 1 },
            { id: "anneau_chance", poids: 4, min: 1, max: 1 },
            { id: "collier_vie", poids: 4, min: 1, max: 1 },
            { id: "bottes_voyageur", poids: 8, min: 1, max: 1 }
        ],

        exploration: [
            { id: "paquet_herbes", poids: 38, min: 1, max: 3 },
            { id: "potion_soin", poids: 24, min: 1, max: 1 },
            { id: "cristal_perdu", poids: 10, min: 1, max: 1 },
            { id: "epee_rouillee", poids: 7, min: 1, max: 1 },
            { id: "hache_bucheron", poids: 7, min: 1, max: 1 },
            { id: "armure_cuir", poids: 5, min: 1, max: 1 },
            { id: "gants_tanneur", poids: 5, min: 1, max: 1 },
            { id: "anneau_archer", poids: 4, min: 1, max: 1 }
        ],

        donjon: [
            { id: "potion_soin", poids: 28, min: 1, max: 2 },
            { id: "potion_soin_superieure", poids: 13, min: 1, max: 1 },
            { id: "cristal_perdu", poids: 18, min: 1, max: 2 },
            { id: "casque_acier", poids: 7, min: 1, max: 1 },
            { id: "armure_chevalier", poids: 5, min: 1, max: 1 },
            { id: "anneau_force", poids: 5, min: 1, max: 1 },
            { id: "anneau_mana", poids: 5, min: 1, max: 1 },
            { id: "collier_sagesse", poids: 5, min: 1, max: 1 },
            { id: "artefact_ombre", poids: 3, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 2, min: 1, max: 1 },
            { id: "cape_usee", poids: 9, min: 1, max: 1 }
        ],

        magique: [
            { id: "cristal_perdu", poids: 35, min: 1, max: 3 },
            { id: "potion_soin_superieure", poids: 12, min: 1, max: 1 },
            { id: "potion_vitalite", poids: 10, min: 1, max: 1 },
            { id: "baton_novice", poids: 8, min: 1, max: 1 },
            { id: "anneau_mana", poids: 8, min: 1, max: 1 },
            { id: "collier_sagesse", poids: 7, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 4, min: 1, max: 1 },
            { id: "artefact_dragon", poids: 1, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 15, min: 1, max: 2 }
        ],

        defaut: [
            { id: "potion_soin", poids: 35, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 30, min: 1, max: 2 },
            { id: "cristal_perdu", poids: 10, min: 1, max: 1 },
            { id: "petite_potion_xp", poids: 8, min: 1, max: 1 },
            { id: "cape_usee", poids: 8, min: 1, max: 1 },
            { id: "bottes_voyageur", poids: 9, min: 1, max: 1 }
        ]
    };

    const NV_ZONE_SPECIAL_TABLES = {
        foret_brumes: [
            { id: "paquet_herbes", poids: 48, min: 1, max: 3 },
            { id: "potion_soin", poids: 22, min: 1, max: 1 },
            { id: "anneau_archer", poids: 5, min: 1, max: 1 },
            { id: "gants_tanneur", poids: 10, min: 1, max: 1 },
            { id: "cape_usee", poids: 15, min: 1, max: 1 }
        ],

        catacombes_oubliees: [
            { id: "potion_soin", poids: 27, min: 1, max: 2 },
            { id: "potion_soin_superieure", poids: 12, min: 1, max: 1 },
            { id: "cristal_perdu", poids: 24, min: 1, max: 2 },
            { id: "artefact_ombre", poids: 7, min: 1, max: 1 },
            { id: "anneau_force", poids: 7, min: 1, max: 1 },
            { id: "cape_usee", poids: 23, min: 1, max: 1 }
        ],

        tour_mage: [
            { id: "cristal_perdu", poids: 30, min: 1, max: 2 },
            { id: "baton_novice", poids: 16, min: 1, max: 1 },
            { id: "anneau_mana", poids: 12, min: 1, max: 1 },
            { id: "collier_sagesse", poids: 10, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 4, min: 1, max: 1 },
            { id: "potion_vitalite", poids: 8, min: 1, max: 1 },
            { id: "potion_soin", poids: 20, min: 1, max: 1 }
        ],

        lac_cristallin: [
            { id: "cristal_perdu", poids: 32, min: 1, max: 3 },
            { id: "potion_soin", poids: 22, min: 1, max: 1 },
            { id: "potion_vitalite", poids: 10, min: 1, max: 1 },
            { id: "anneau_chance", poids: 6, min: 1, max: 1 },
            { id: "collier_vie", poids: 7, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 23, min: 1, max: 2 }
        ],

        sanctuaire_arcanique: [
            { id: "cristal_perdu", poids: 31, min: 1, max: 3 },
            { id: "baton_novice", poids: 11, min: 1, max: 1 },
            { id: "anneau_mana", poids: 11, min: 1, max: 1 },
            { id: "collier_sagesse", poids: 10, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 7, min: 1, max: 1 },
            { id: "artefact_dragon", poids: 1, min: 1, max: 1 },
            { id: "potion_soin_superieure", poids: 11, min: 1, max: 1 },
            { id: "potion_vitalite", poids: 18, min: 1, max: 1 }
        ],

        ruines_anciennes: [
            { id: "cristal_perdu", poids: 23, min: 1, max: 2 },
            { id: "potion_soin_superieure", poids: 13, min: 1, max: 1 },
            { id: "artefact_ombre", poids: 8, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 6, min: 1, max: 1 },
            { id: "artefact_dragon", poids: 2, min: 1, max: 1 },
            { id: "armure_chevalier", poids: 8, min: 1, max: 1 },
            { id: "anneau_force", poids: 8, min: 1, max: 1 },
            { id: "collier_vie", poids: 10, min: 1, max: 1 },
            { id: "cape_usee", poids: 22, min: 1, max: 1 }
        ],

        grotte_reliques: [
            { id: "cristal_perdu", poids: 42, min: 1, max: 3 },
            { id: "potion_soin", poids: 20, min: 1, max: 1 },
            { id: "potion_soin_superieure", poids: 7, min: 1, max: 1 },
            { id: "artefact_cristal", poids: 4, min: 1, max: 1 },
            { id: "cape_usee", poids: 12, min: 1, max: 1 },
            { id: "paquet_herbes", poids: 15, min: 1, max: 2 }
        ],

        sanctuaire_prelude: [
            { id: "paquet_herbes", poids: 32, min: 1, max: 3 },
            { id: "potion_soin", poids: 28, min: 1, max: 1 },
            { id: "potion_vitalite", poids: 10, min: 1, max: 1 },
            { id: "petite_potion_xp", poids: 10, min: 1, max: 1 },
            { id: "collier_vie", poids: 5, min: 1, max: 1 },
            { id: "anneau_chance", poids: 5, min: 1, max: 1 },
            { id: "cristal_perdu", poids: 10, min: 1, max: 1 }
        ]
    };

    function NVL_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVL_journal(message) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        }
    }

    function NVL_randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function NVL_stat(nomStat) {
        if (typeof statTotale === "function") {
            return Number(statTotale(nomStat) || 0);
        }

        return Number(Game.data.personnage?.[nomStat] || 0);
    }

    function NVL_luck() {
        return Math.max(0, NVL_stat("chance"));
    }

    function NVL_bonusOr() {
        if (typeof bonusOrTotal === "function") {
            return Math.max(0, Number(bonusOrTotal() || 0));
        }

        return NVL_luck();
    }

    function NVL_bonusLoot() {
        if (typeof bonusLootTotal === "function") {
            return Math.max(0, Number(bonusLootTotal() || 0));
        }

        return NVL_luck();
    }

    function NVL_objetExiste(idObjet) {
        if (!idObjet) return false;

        if (typeof trouverObjet === "function") {
            return Boolean(trouverObjet(idObjet));
        }

        return Boolean(Game.cache?.objetsParId?.[idObjet]);
    }

    function NVL_nomObjet(idObjet) {
        const objet =
            typeof trouverObjet === "function"
                ? trouverObjet(idObjet)
                : Game.cache?.objetsParId?.[idObjet];

        return objet?.nom || idObjet;
    }

    function NVL_ajouterObjet(idObjet, quantite = 1) {
        if (!NVL_objetExiste(idObjet)) return false;

        if (typeof ajouterObjetInventaire === "function") {
            ajouterObjetInventaire(idObjet, quantite);
            return true;
        }

        const inventaire =
            Game.data.personnage.inventaire ??= [];

        const item =
            inventaire.find(entree => entree.id === idObjet);

        if (item) {
            item.quantite =
                Number(item.quantite || 0) + quantite;
        } else {
            inventaire.push({
                id: idObjet,
                quantite
            });
        }

        return true;
    }

    function NVL_ajouterOr(montant) {
        const gain =
            Math.max(0, Math.round(montant || 0));

        Game.data.personnage.or =
            Number(Game.data.personnage.or || 0) + gain;

        return gain;
    }

    function NVL_tableZone(zone) {
        if (zone?.id && NV_ZONE_SPECIAL_TABLES[zone.id]) {
            return NV_ZONE_SPECIAL_TABLES[zone.id];
        }

        if (
            zone?.type === "village" ||
            zone?.type === "ville"
        ) {
            return NV_LOOT_TABLES[zone.type] || NV_LOOT_TABLES.village;
        }

        if (
            zone?.id?.includes("mage") ||
            zone?.id?.includes("arcanique") ||
            zone?.id?.includes("sanctuaire") ||
            zone?.id?.includes("cristal")
        ) {
            return NV_LOOT_TABLES.magique;
        }

        return NV_LOOT_TABLES[zone?.type] || NV_LOOT_TABLES.defaut;
    }

    function NVL_choisirPondere(table) {
        const valides =
            (table || [])
                .filter(entree => Number(entree.poids) > 0)
                .filter(entree => NVL_objetExiste(entree.id));

        if (!valides.length) return null;

        const total =
            valides.reduce((somme, entree) => somme + Number(entree.poids), 0);

        let tirage =
            Math.random() * total;

        for (const entree of valides) {
            tirage -= Number(entree.poids);
            if (tirage <= 0) return entree;
        }

        return valides[valides.length - 1];
    }

    function NVL_rollObjet(zone, modificateurRarete = 0) {
        const table =
            NVL_tableZone(zone);

        /*
            Avec plus de chance, on tente parfois un second tirage
            et on garde le plus "léger" en poids, donc plus rare.
        */
        const luck =
            NVL_luck() + NVL_bonusLoot() + modificateurRarete;

        const essais =
            1 + (Math.random() * 100 < Math.min(45, luck * 2.2) ? 1 : 0);

        let meilleur =
            null;

        for (let i = 0; i < essais; i++) {
            const resultat =
                NVL_choisirPondere(table);

            if (!resultat) continue;

            if (!meilleur || Number(resultat.poids) < Number(meilleur.poids)) {
                meilleur =
                    resultat;
            }
        }

        if (!meilleur) return null;

        const quantiteBase =
            NVL_randInt(meilleur.min ?? 1, meilleur.max ?? 1);

        const doubleChance =
            Math.min(35, luck * 1.4);

        const quantite =
            quantiteBase + (Math.random() * 100 < doubleChance ? 1 : 0);

        return {
            id: meilleur.id,
            quantite: Math.max(1, quantite)
        };
    }

    function NVL_rollCoffreRarete() {
        const luck =
            NVL_luck() + NVL_bonusLoot();

        const bonus =
            Math.min(18, luck * 0.65);

        const poids = {
            commun: Math.max(25, NV_COFFRES.commun.chanceBase - bonus),
            solide: NV_COFFRES.solide.chanceBase + bonus * 0.50,
            rare: NV_COFFRES.rare.chanceBase + bonus * 0.35,
            epique: NV_COFFRES.epique.chanceBase + bonus * 0.15
        };

        const total =
            Object.values(poids).reduce((somme, valeur) => somme + valeur, 0);

        let tirage =
            Math.random() * total;

        for (const [rarete, valeur] of Object.entries(poids)) {
            tirage -= valeur;
            if (tirage <= 0) return rarete;
        }

        return "commun";
    }

    function NVL_genererOr(min, max) {
        const bonus =
            Math.floor(NVL_bonusOr() * 0.35);

        const niveau =
            Math.max(1, Number(Game.data.personnage.niveau || 1));

        return NVL_randInt(min, max) + bonus + Math.floor(niveau / 3);
    }

    function NVL_donnerLoot(zone, nombreRolls, modificateurRarete = 0) {
        const recompenses =
            [];

        for (let i = 0; i < nombreRolls; i++) {
            const loot =
                NVL_rollObjet(zone, modificateurRarete);

            if (!loot) continue;

            const ajoute =
                NVL_ajouterObjet(loot.id, loot.quantite);

            if (ajoute) {
                recompenses.push(loot);
            }
        }

        NV_LOOT_STATE.dernierLoot =
            recompenses;

        return recompenses;
    }

    function NVL_resumeObjets(liste) {
        if (!Array.isArray(liste) || !liste.length) return "";

        return liste
            .map(loot => `🎁 ${NVL_nomObjet(loot.id)} x${loot.quantite}`)
            .join("<br>");
    }

    function NVL_afficherLoot(liste) {
        if (!Array.isArray(liste) || !liste.length) return;

        liste.forEach(loot => {
            NVL_journal(`🎁 ${NVL_nomObjet(loot.id)} x${loot.quantite}`);
        });
    }

    function NVL_evenementOr(zone) {
        const type =
            zone?.type || "defaut";

        const base =
            type === "village" || type === "ville"
                ? [4, 16]
                : type === "donjon"
                    ? [10, 32]
                    : [6, 22];

        const gain =
            NVL_genererOr(base[0], base[1]);

        NVL_ajouterOr(gain);

        const messages = [
            `🟡 Tu trouves ${gain} pièce(s) d'or.`,
            `🟡 Une petite bourse contient ${gain} pièce(s) d'or.`,
            `🟡 Tu récupères ${gain} pièce(s) oubliée(s).`
        ];

        NVL_journal(messages[NVL_randInt(0, messages.length - 1)]);
    }

    function NVL_evenementRessource(zone) {
        const loot =
            NVL_rollObjet(zone, 4);

        if (!loot) {
            NVL_journal("🌿 Tu fouilles les environs, mais tu ne trouves rien d'utile.");
            return;
        }

        NVL_ajouterObjet(loot.id, loot.quantite);

        const chanceDouble =
            Math.random() * 100 < Math.min(25, NVL_luck());

        if (chanceDouble) {
            const extra =
                NVL_rollObjet(zone, 6);

            if (extra) {
                NVL_ajouterObjet(extra.id, extra.quantite);
                NVL_journal(`✨ Ta chance t'aide à trouver une ressource supplémentaire.`);
                NVL_journal(`🌿 ${NVL_nomObjet(loot.id)} x${loot.quantite}`);
                NVL_journal(`🌿 ${NVL_nomObjet(extra.id)} x${extra.quantite}`);
                return;
            }
        }

        NVL_journal(`🌿 Tu récupères ${NVL_nomObjet(loot.id)} x${loot.quantite}.`);
    }

    function NVL_evenementCoffre(zone) {
        const rarete =
            NVL_rollCoffreRarete();

        const coffre =
            NV_COFFRES[rarete] || NV_COFFRES.commun;

        const or =
            NVL_genererOr(coffre.orMin, coffre.orMax);

        const loot =
            NVL_donnerLoot(
                zone,
                coffre.rolls,
                rarete === "epique"
                    ? 16
                    : rarete === "rare"
                        ? 10
                        : rarete === "solide"
                            ? 5
                            : 0
            );

        NVL_ajouterOr(or);

        NV_LOOT_STATE.dernierCoffre =
            {
                rarete,
                or,
                loot
            };

        const titre =
            rarete === "epique"
                ? `✨ Tu découvres un ${coffre.label}.`
                : rarete === "rare"
                    ? `📦 Tu découvres un ${coffre.label}.`
                    : `📦 Tu ouvres un ${coffre.label}.`;

        NVL_journal(titre);
        NVL_journal(`🟡 +${or} or`);

        if (loot.length) {
            NVL_afficherLoot(loot);
        } else {
            NVL_journal("Le coffre ne contient aucun objet utilisable.");
        }

        if (rarete === "rare" || rarete === "epique") {
            NVL_journal("🍀 Ta chance semble avoir amélioré la trouvaille.");
        }
    }

    function NVL_evenementLootCache(zone) {
        const chance =
            Math.min(65, 18 + NVL_luck() * 2.8);

        if (Math.random() * 100 > chance) {
            NVL_journal("🔎 Tu remarques une cachette, mais elle est vide.");
            return;
        }

        const loot =
            NVL_donnerLoot(zone, 1, 12);

        if (!loot.length) {
            NVL_journal("🔎 Tu fouilles une cachette, sans rien trouver d'utile.");
            return;
        }

        NVL_journal("🔎 Tu découvres une cachette discrète.");
        NVL_afficherLoot(loot);
    }

    function NVL_patchGenererEvenementZone() {
        if (typeof genererEvenementZone !== "function" || genererEvenementZone.__NVL_096_PATCH) return;

        const original =
            genererEvenementZone;

        genererEvenementZone = function (zone) {
            const evenement =
                original(zone);

            /*
                Petit bonus : parfois un événement calme devient une cachette,
                surtout avec une bonne chance.
                Ça ne casse pas la boucle, ça rend juste LUCK plus visible.
            */
            if (
                ["rien", "rien_ambiance", "indice"].includes(evenement) &&
                Math.random() * 100 < Math.min(18, 3 + NVL_luck() * 0.75)
            ) {
                return "loot_cache";
            }

            return evenement;
        };

        genererEvenementZone.__NVL_096_PATCH =
            true;
    }

    function NVL_patchExecuterEvenementZone() {
        if (typeof executerEvenementZone !== "function" || executerEvenementZone.__NVL_096_PATCH) return;

        const original =
            executerEvenementZone;

        executerEvenementZone = function (evenement, zone) {
            switch (evenement) {
                case "coffre":
                    NVL_evenementCoffre(zone);
                    break;

                case "ressource":
                    NVL_evenementRessource(zone);
                    break;

                case "or":
                    NVL_evenementOr(zone);
                    break;

                case "loot_cache":
                    NVL_evenementLootCache(zone);
                    break;

                default:
                    original(evenement, zone);
                    break;
            }

            if (typeof afficherPersonnage === "function") {
                /*
                    Pas de redraw forcé de la vue exploration ici.
                    On laisse les autres modules gérer les barres sans reset.
                */
                if (typeof NVS_regenererHorsCombatSecondes !== "function") {
                    afficherPersonnage();
                }
            }

            if (typeof NV_demanderAutosave === "function") {
                NV_demanderAutosave("exploration loot rewards");
            }
        };

        executerEvenementZone.__NVL_096_PATCH =
            true;
    }

    function NVL_injecterStyle() {
        if (document.getElementById("nvLootRewardsStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvLootRewardsStyle";

        style.textContent =
            `
                .nv-loot-note {
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.85rem;
                }
            `;

        document.head.appendChild(style);
    }

    function NVL_installer() {
        if (!NVL_hasGame()) {
            setTimeout(NVL_installer, 120);
            return;
        }

        NVL_injecterStyle();
        NVL_patchGenererEvenementZone();
        NVL_patchExecuterEvenementZone();

        console.log(`✅ Exploration_Loot_Rewards.js chargé — ${NV_LOOT_REWARDS_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVL_installer);
    } else {
        NVL_installer();
    }

    window.NV_LOOT_REWARDS_VERSION =
        NV_LOOT_REWARDS_VERSION;

    window.NV_LOOT_STATE =
        NV_LOOT_STATE;

    window.NVL_evenementCoffre =
        NVL_evenementCoffre;

    window.NVL_evenementRessource =
        NVL_evenementRessource;

    window.NVL_evenementLootCache =
        NVL_evenementLootCache;
})();
